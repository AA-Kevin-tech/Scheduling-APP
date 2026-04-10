"use server";

import { formatInTimeZone } from "date-fns-tz";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { sessionMayAccessTimeOffRequest } from "@/lib/auth/location-scope";
import { requireEmployeeProfile, requireManager } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/services/audit";
import {
  leadTimeBlockLastYmd,
  timeOffOverlapsBlackout,
  timeOffOverlapsMinimumLeadTimeBlock,
  timeOffOverlapsScheduleAnnotationBlock,
} from "@/lib/services/time-off-rules";
import {
  getDefaultScheduleTimezone,
  parseDatetimeLocalInTimezone,
} from "@/lib/schedule/tz";
import {
  createNotification,
  notifyManagersExcept,
} from "@/lib/services/notifications";

const createSchema = z.object({
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  reason: z.string().nullable().optional(),
});

export async function createTimeOffRequest(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  const { session, employeeId } = await requireEmployeeProfile();

  const parsed = createSchema.safeParse({
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    reason: emptyToNull(formData.get("reason")),
  });
  if (!parsed.success) return { error: "Check start and end times." };

  const scheduleTz = getDefaultScheduleTimezone();
  const startsAt = parseDatetimeLocalInTimezone(parsed.data.startsAt, scheduleTz);
  const endsAt = parseDatetimeLocalInTimezone(parsed.data.endsAt, scheduleTz);
  if (!startsAt || !endsAt) {
    return { error: "Invalid dates." };
  }
  if (endsAt <= startsAt) {
    return { error: "End must be after start." };
  }

  const now = new Date();
  if (startsAt < now) {
    return { error: "Start time cannot be in the past." };
  }

  if (timeOffOverlapsMinimumLeadTimeBlock(startsAt, endsAt, now, scheduleTz)) {
    const through = leadTimeBlockLastYmd(now, scheduleTz);
    return {
      error: `Time off cannot include dates from today through ${through} (org schedule time). Choose times starting after that.`,
    };
  }

  const blackouts = await prisma.timeOffBlackout.findMany({
    select: { startsOnYmd: true, endsOnYmd: true },
  });
  if (timeOffOverlapsBlackout(startsAt, endsAt, scheduleTz, blackouts)) {
    return {
      error:
        "That period includes a blackout date when time off cannot be requested. Ask an admin if you need an exception.",
    };
  }

  const reqStartYmd = formatInTimeZone(startsAt, scheduleTz, "yyyy-MM-dd");
  const reqEndYmd = formatInTimeZone(endsAt, scheduleTz, "yyyy-MM-dd");

  const empForVenues = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: {
      locations: { select: { locationId: true } },
      departments: {
        select: { department: { select: { locationId: true } } },
      },
    },
  });
  const employeeLocationIds = [
    ...new Set([
      ...(empForVenues?.locations.map((l) => l.locationId) ?? []),
      ...(empForVenues?.departments.map((d) => d.department.locationId) ?? []),
    ]),
  ];

  if (employeeLocationIds.length > 0) {
    const annotationBlocks = await prisma.scheduleAnnotation.findMany({
      where: {
        blockTimeOffRequests: true,
        locationId: { in: employeeLocationIds },
        startsOnYmd: { lte: reqEndYmd },
        endsOnYmd: { gte: reqStartYmd },
      },
      select: {
        startsOnYmd: true,
        endsOnYmd: true,
        locationId: true,
        blockTimeOffRequests: true,
      },
    });
    if (
      timeOffOverlapsScheduleAnnotationBlock(
        startsAt,
        endsAt,
        scheduleTz,
        annotationBlocks,
        employeeLocationIds,
      )
    ) {
      return {
        error:
          "That period includes dates when your site has blocked new time off requests. Ask a manager if you need an exception.",
      };
    }
  }

  const emp = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { user: { select: { name: true, email: true } } },
  });
  if (!emp) return { error: "Profile not found." };

  const row = await prisma.timeOffRequest.create({
    data: {
      employeeId,
      startsAt,
      endsAt,
      reason: parsed.data.reason?.trim() || null,
      status: "PENDING",
    },
  });

  const label = emp.user.name ?? emp.user.email;
  await notifyManagersExcept(
    null,
    "Time off request",
    `${label} requested time off (${fmtRange(startsAt, endsAt)}).`,
    "TIME_OFF_REQUEST",
  );

  await writeAuditLog({
    actorUserId: session.user.id,
    entityType: "TimeOffRequest",
    entityId: row.id,
    action: "CREATE",
    payload: {
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
    },
  });

  revalidatePath("/employee/time-off");
  revalidatePath("/manager/time-off");
  revalidatePath("/manager");
  revalidatePath("/employee");
  return {};
}

export async function cancelTimeOffRequest(formData: FormData): Promise<void> {
  const { session, employeeId } = await requireEmployeeProfile();
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return;

  const row = await prisma.timeOffRequest.findFirst({
    where: { id, employeeId, status: "PENDING" },
  });
  if (!row) return;

  await prisma.timeOffRequest.update({
    where: { id },
    data: { status: "CANCELLED" },
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    entityType: "TimeOffRequest",
    entityId: id,
    action: "CANCEL",
  });

  revalidatePath("/employee/time-off");
  revalidatePath("/manager/time-off");
  revalidatePath("/manager");
}

export async function approveTimeOffRequest(formData: FormData): Promise<void> {
  const session = await requireManager();
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return;

  const row = await prisma.timeOffRequest.findFirst({
    where: { id, status: "PENDING" },
    include: {
      employee: { include: { user: { select: { id: true } } } },
    },
  });
  if (!row) return;
  if (!(await sessionMayAccessTimeOffRequest(session, id))) return;

  await prisma.timeOffRequest.update({
    where: { id },
    data: {
      status: "APPROVED",
      decidedById: session.user.id,
      decidedAt: new Date(),
    },
  });

  await createNotification({
    userId: row.employee.user.id,
    title: "Time off approved",
    body: `Your request for ${fmtRange(row.startsAt, row.endsAt)} was approved.`,
    type: "TIME_OFF_DECIDED",
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    entityType: "TimeOffRequest",
    entityId: id,
    action: "APPROVE",
  });

  revalidatePath("/employee/time-off");
  revalidatePath("/manager/time-off");
  revalidatePath("/manager");
  revalidatePath("/employee/notifications");
  revalidatePath("/manager/notifications");
}

export async function denyTimeOffRequest(formData: FormData): Promise<void> {
  const session = await requireManager();
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return;

  const row = await prisma.timeOffRequest.findFirst({
    where: { id, status: "PENDING" },
    include: {
      employee: { include: { user: { select: { id: true } } } },
    },
  });
  if (!row) return;
  if (!(await sessionMayAccessTimeOffRequest(session, id))) return;

  await prisma.timeOffRequest.update({
    where: { id },
    data: {
      status: "DENIED",
      decidedById: session.user.id,
      decidedAt: new Date(),
    },
  });

  await createNotification({
    userId: row.employee.user.id,
    title: "Time off not approved",
    body: `Your request for ${fmtRange(row.startsAt, row.endsAt)} was denied.`,
    type: "TIME_OFF_DECIDED",
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    entityType: "TimeOffRequest",
    entityId: id,
    action: "DENY",
  });

  revalidatePath("/employee/time-off");
  revalidatePath("/manager/time-off");
  revalidatePath("/manager");
  revalidatePath("/employee/notifications");
  revalidatePath("/manager/notifications");
}

function emptyToNull(v: FormDataEntryValue | null): string | null {
  if (v === null || v === "") return null;
  return String(v);
}

function fmtRange(a: Date, b: Date) {
  return `${a.toLocaleString()} → ${b.toLocaleString()}`;
}
