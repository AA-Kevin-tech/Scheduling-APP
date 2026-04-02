"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireEmployeeProfile, requireManager } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/services/audit";
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

  const startsAt = new Date(parsed.data.startsAt);
  const endsAt = new Date(parsed.data.endsAt);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return { error: "Invalid dates." };
  }
  if (endsAt <= startsAt) {
    return { error: "End must be after start." };
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
