"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import { z } from "zod";
import {
  getSchedulingLocationIdsForSession,
  sessionMayAccessVenue,
  shiftVenueId,
  shiftsWhereForLocations,
} from "@/lib/auth/location-scope";
import { requireManager } from "@/lib/auth/guards";
import { getSchedulingEditAllowedForSession } from "@/lib/permissions/scheduling-edit";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/services/audit";
import { notifyUsersSchedulePublished } from "@/lib/services/notifications";
import { validateShiftAssignment } from "@/lib/services/shift-assignment";
import {
  addCalendarWeeksPreservingLocalTime,
  normalizeIanaTimezone,
  parseDatetimeLocalInTimezone,
} from "@/lib/schedule/tz";

async function employeeTiedToVenue(
  employeeId: string,
  venueId: string,
): Promise<boolean> {
  const [atLoc, inDept] = await Promise.all([
    prisma.employeeLocation.findFirst({
      where: { employeeId, locationId: venueId },
    }),
    prisma.employeeDepartment.findFirst({
      where: { employeeId, department: { locationId: venueId } },
    }),
  ]);
  return !!(atLoc || inDept);
}

async function assertManagerVenue(session: Session, venueId: string) {
  if (!(await sessionMayAccessVenue(session, venueId))) {
    return { error: "You do not manage this venue." } as const;
  }
  return null;
}

const SCHEDULE_VIEW_ONLY_ERROR = "Schedule is view-only for your role.";

async function assertSchedulingEditAllowed(session: Session) {
  if (!(await getSchedulingEditAllowedForSession(session))) {
    return { error: SCHEDULE_VIEW_ONLY_ERROR } as const;
  }
  return null;
}

const createShiftSchema = z.object({
  departmentId: z.string().min(1),
  roleId: z.string().nullable().optional(),
  zoneId: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  scheduleTimeZone: z.string().optional(),
  repeatWeeks: z.coerce.number().int().min(1).max(26).optional().default(1),
});

export async function createShift(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const session = await requireManager();
  const schedGate = await assertSchedulingEditAllowed(session);
  if (schedGate) return schedGate;
  const parsed = createShiftSchema.safeParse({
    departmentId: formData.get("departmentId"),
    roleId: emptyToNull(formData.get("roleId")),
    zoneId: emptyToNull(formData.get("zoneId")),
    title: emptyToNull(formData.get("title")),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    scheduleTimeZone: formData.get("scheduleTimeZone"),
    repeatWeeks: formData.get("repeatWeeks"),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().formErrors.join(", ") };
  }

  const { departmentId, roleId, zoneId, title, repeatWeeks } = parsed.data;
  const tz = normalizeIanaTimezone(parsed.data.scheduleTimeZone);
  const startsAt =
    parseDatetimeLocalInTimezone(parsed.data.startsAt, tz) ??
    new Date(parsed.data.startsAt);
  const endsAt =
    parseDatetimeLocalInTimezone(parsed.data.endsAt, tz) ??
    new Date(parsed.data.endsAt);

  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return { error: "Invalid start or end time." };
  }
  if (endsAt <= startsAt) {
    return { error: "End time must be after start time." };
  }

  const recurrenceMeta =
    repeatWeeks > 1
      ? JSON.stringify({ repeatWeeks, anchorStartsAt: startsAt.toISOString() })
      : null;

  const dept = await prisma.department.findUnique({
    where: { id: departmentId },
    select: { id: true, locationId: true },
  });
  if (!dept) {
    return { error: "Department not found." };
  }
  const venueErr = await assertManagerVenue(session, dept.locationId);
  if (venueErr) return venueErr;

  const root = await prisma.shift.create({
    data: {
      departmentId,
      locationId: dept.locationId,
      roleId: roleId ?? null,
      zoneId: zoneId ?? null,
      title: title ?? null,
      startsAt,
      endsAt,
      publishedAt: null,
      recurrenceRule: recurrenceMeta,
      parentShiftId: null,
    },
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    entityType: "Shift",
    entityId: root.id,
    action: "CREATE",
    payload: { departmentId, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() },
  });

  for (let w = 1; w < repeatWeeks; w++) {
    const child = await prisma.shift.create({
      data: {
        departmentId,
        locationId: dept.locationId,
        roleId: roleId ?? null,
        zoneId: zoneId ?? null,
        title: title ?? null,
        startsAt: addCalendarWeeksPreservingLocalTime(startsAt, w, tz),
        endsAt: addCalendarWeeksPreservingLocalTime(endsAt, w, tz),
        publishedAt: null,
        parentShiftId: root.id,
      },
    });
    await writeAuditLog({
      actorUserId: session.user.id,
      entityType: "Shift",
      entityId: child.id,
      action: "CREATE_SERIES",
      payload: { parentId: root.id, weekOffset: w },
    });
  }

  revalidatePath("/manager/schedule");
  revalidatePath("/manager/coverage");
  revalidatePath("/employee/schedule");
  return { ok: true };
}

const updateShiftSchema = z.object({
  id: z.string().min(1),
  departmentId: z.string().min(1),
  roleId: z.string().nullable().optional(),
  zoneId: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  scheduleTimeZone: z.string().optional(),
});

export async function updateShift(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const session = await requireManager();
  const schedGate = await assertSchedulingEditAllowed(session);
  if (schedGate) return schedGate;
  const parsed = updateShiftSchema.safeParse({
    id: formData.get("id"),
    departmentId: formData.get("departmentId"),
    roleId: emptyToNull(formData.get("roleId")),
    zoneId: emptyToNull(formData.get("zoneId")),
    title: emptyToNull(formData.get("title")),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    scheduleTimeZone: formData.get("scheduleTimeZone"),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().formErrors.join(", ") };
  }

  const tz = normalizeIanaTimezone(parsed.data.scheduleTimeZone);
  const startsAt =
    parseDatetimeLocalInTimezone(parsed.data.startsAt, tz) ??
    new Date(parsed.data.startsAt);
  const endsAt =
    parseDatetimeLocalInTimezone(parsed.data.endsAt, tz) ??
    new Date(parsed.data.endsAt);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return { error: "Invalid start or end time." };
  }
  if (endsAt <= startsAt) {
    return { error: "End time must be after start time." };
  }

  const existing = await prisma.shift.findUnique({
    where: { id: parsed.data.id },
    include: { department: { select: { locationId: true } } },
  });
  if (!existing) {
    return { error: "Shift not found." };
  }
  const oldVenue = shiftVenueId(existing);
  const oldVenueErr = await assertManagerVenue(session, oldVenue);
  if (oldVenueErr) return oldVenueErr;

  const newDept = await prisma.department.findUnique({
    where: { id: parsed.data.departmentId },
    select: { locationId: true },
  });
  if (!newDept) {
    return { error: "Department not found." };
  }
  const newVenueErr = await assertManagerVenue(session, newDept.locationId);
  if (newVenueErr) return newVenueErr;

  await prisma.shift.update({
    where: { id: parsed.data.id },
    data: {
      departmentId: parsed.data.departmentId,
      locationId: newDept.locationId,
      roleId: parsed.data.roleId ?? null,
      zoneId: parsed.data.zoneId ?? null,
      title: parsed.data.title ?? null,
      startsAt,
      endsAt,
    },
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    entityType: "Shift",
    entityId: parsed.data.id,
    action: "UPDATE",
    payload: { startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() },
  });

  revalidatePath("/manager/schedule");
  revalidatePath(`/manager/shifts/${parsed.data.id}`);
  revalidatePath("/manager/coverage");
  revalidatePath("/employee/schedule");
  revalidatePath(`/employee/shifts/${parsed.data.id}`);
  return { ok: true };
}

export async function deleteShift(formData: FormData): Promise<void> {
  const session = await requireManager();
  if (!(await getSchedulingEditAllowedForSession(session))) {
    redirect("/manager/schedule");
  }
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return;

  const row = await prisma.shift.findUnique({
    where: { id },
    include: { department: { select: { locationId: true } } },
  });
  if (!row) return;
  if (!(await sessionMayAccessVenue(session, shiftVenueId(row)))) return;

  await prisma.shift.delete({ where: { id } });

  await writeAuditLog({
    actorUserId: session.user.id,
    entityType: "Shift",
    entityId: id,
    action: "DELETE",
  });

  revalidatePath("/manager/schedule");
  revalidatePath("/manager/coverage");
  revalidatePath("/employee/schedule");
  redirect("/manager/schedule");
}

const assignSchema = z.object({
  shiftId: z.string().min(1),
  employeeId: z.string().min(1),
  managerOverrideReason: z.string().nullable().optional(),
});

export async function assignEmployeeToShift(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const session = await requireManager();
  const schedGate = await assertSchedulingEditAllowed(session);
  if (schedGate) return schedGate;
  const parsed = assignSchema.safeParse({
    shiftId: formData.get("shiftId"),
    employeeId: formData.get("employeeId"),
    managerOverrideReason: emptyToNull(formData.get("managerOverrideReason")),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().formErrors.join(", ") };
  }

  const { shiftId, employeeId, managerOverrideReason } = parsed.data;

  const shift = await prisma.shift.findUnique({
    where: { id: shiftId },
    include: { department: { select: { locationId: true } } },
  });
  if (!shift) {
    return { error: "Shift not found." };
  }
  const venueId = shiftVenueId(shift);
  const venueErr = await assertManagerVenue(session, venueId);
  if (venueErr) return venueErr;

  const dup = await prisma.shiftAssignment.findFirst({
    where: { shiftId, employeeId },
  });
  if (dup) {
    return { error: "Employee is already assigned to this shift." };
  }

  const atVenue = await employeeTiedToVenue(employeeId, venueId);
  if (!atVenue && !managerOverrideReason?.trim()) {
    return {
      error:
        "This employee is not assigned to this venue. Add a matching work location or department, or enter an override reason.",
    };
  }

  const check = await validateShiftAssignment({ employeeId, shiftId });
  if (!check.ok) {
    if (!managerOverrideReason?.trim()) {
      return { error: check.reasons.join(" ") };
    }
  }

  const assignment = await prisma.shiftAssignment.create({
    data: {
      shiftId,
      employeeId,
      assignedByUserId: session.user.id,
      managerOverrideReason: managerOverrideReason?.trim() || null,
    },
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    entityType: "ShiftAssignment",
    entityId: assignment.id,
    action: check.ok ? "ASSIGN" : "ASSIGN_OVERRIDE",
    payload: { employeeId, shiftId },
    reason: managerOverrideReason?.trim() || null,
  });

  revalidatePath("/manager/schedule");
  revalidatePath(`/manager/shifts/${shiftId}`);
  revalidatePath("/employee/schedule");
  revalidatePath("/manager/coverage");
  return { ok: true };
}

export async function removeShiftAssignment(formData: FormData): Promise<void> {
  const session = await requireManager();
  if (!(await getSchedulingEditAllowedForSession(session))) {
    redirect("/manager/schedule");
  }
  const assignmentId = formData.get("assignmentId");
  if (typeof assignmentId !== "string" || !assignmentId) return;

  const row = await prisma.shiftAssignment.findUnique({
    where: { id: assignmentId },
    select: {
      shiftId: true,
      shift: {
        select: {
          locationId: true,
          department: { select: { locationId: true } },
        },
      },
    },
  });
  if (!row) return;
  if (
    !(await sessionMayAccessVenue(session, shiftVenueId(row.shift)))
  ) {
    return;
  }

  await prisma.shiftAssignment.delete({ where: { id: assignmentId } });

  await writeAuditLog({
    actorUserId: session.user.id,
    entityType: "ShiftAssignment",
    entityId: assignmentId,
    action: "UNASSIGN",
    payload: { shiftId: row.shiftId },
  });

  revalidatePath("/manager/schedule");
  revalidatePath(`/manager/shifts/${row.shiftId}`);
  revalidatePath("/employee/schedule");
  revalidatePath("/manager/coverage");
}

const publishRangeSchema = z.object({
  weekStart: z.string().min(1),
  weekEnd: z.string().min(1),
  departmentId: z.string().optional(),
  roleId: z.string().optional(),
});

export async function publishDraftShiftsForRange(
  _prev: { ok?: boolean; error?: string; count?: number },
  formData: FormData,
): Promise<{ ok?: boolean; error?: string; count?: number }> {
  const session = await requireManager();
  const schedGate = await assertSchedulingEditAllowed(session);
  if (schedGate) return schedGate;
  const parsed = publishRangeSchema.safeParse({
    weekStart: formData.get("weekStart"),
    weekEnd: formData.get("weekEnd"),
    departmentId: emptyToNull(formData.get("departmentId")) ?? undefined,
    roleId: emptyToNull(formData.get("roleId")) ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.flatten().formErrors.join(", ") };
  }

  const rangeStart = new Date(parsed.data.weekStart);
  const rangeEnd = new Date(parsed.data.weekEnd);
  if (
    Number.isNaN(rangeStart.getTime()) ||
    Number.isNaN(rangeEnd.getTime())
  ) {
    return { error: "Invalid week range." };
  }

  const { departmentId, roleId } = parsed.data;
  const scope = await getSchedulingLocationIdsForSession(session);
  const locWhere = shiftsWhereForLocations(scope);

  const draftWhere = {
    AND: [
      { publishedAt: null },
      { startsAt: { lt: rangeEnd } },
      { endsAt: { gt: rangeStart } },
      ...(departmentId ? [{ departmentId } as const] : []),
      ...(roleId ? [{ roleId } as const] : []),
      locWhere,
    ],
  };

  const toPublish = await prisma.shift.findMany({
    where: draftWhere,
    include: {
      assignments: {
        include: { employee: { select: { userId: true } } },
      },
    },
  });

  const notifyUserIds = new Set<string>();
  for (const s of toPublish) {
    for (const a of s.assignments) {
      notifyUserIds.add(a.employee.userId);
    }
  }

  const result = await prisma.shift.updateMany({
    where: draftWhere,
    data: { publishedAt: new Date() },
  });

  await notifyUsersSchedulePublished([...notifyUserIds], false);

  await writeAuditLog({
    actorUserId: session.user.id,
    entityType: "Shift",
    entityId: "batch",
    action: "PUBLISH_RANGE",
    payload: {
      count: result.count,
      rangeStart: rangeStart.toISOString(),
      rangeEnd: rangeEnd.toISOString(),
      departmentId: departmentId ?? null,
      roleId: roleId ?? null,
    },
  });

  revalidatePath("/manager/schedule");
  revalidatePath("/manager/coverage");
  revalidatePath("/employee/schedule");
  revalidatePath("/employee/notifications");
  revalidatePath("/employee/swaps");
  revalidatePath("/terminal");
  return { ok: true, count: result.count };
}

export async function publishShift(
  _prev: { ok?: boolean; error?: string },
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const session = await requireManager();
  const schedGate = await assertSchedulingEditAllowed(session);
  if (schedGate) return schedGate;
  const id = formData.get("id");
  if (typeof id !== "string" || !id) {
    return { error: "Missing shift id." };
  }

  const shift = await prisma.shift.findUnique({
    where: { id },
    include: {
      department: { select: { locationId: true } },
      assignments: {
        include: { employee: { select: { userId: true } } },
      },
    },
  });
  if (!shift) return { error: "Shift not found." };
  if (shift.publishedAt) return { error: "Shift is already published." };
  const pubVenueErr = await assertManagerVenue(
    session,
    shiftVenueId(shift),
  );
  if (pubVenueErr) return pubVenueErr;

  await prisma.shift.update({
    where: { id },
    data: { publishedAt: new Date() },
  });

  const userIds = shift.assignments.map((a) => a.employee.userId);
  await notifyUsersSchedulePublished(userIds, true);

  await writeAuditLog({
    actorUserId: session.user.id,
    entityType: "Shift",
    entityId: id,
    action: "PUBLISH",
    payload: {},
  });

  revalidatePath("/manager/schedule");
  revalidatePath(`/manager/shifts/${id}`);
  revalidatePath("/manager/coverage");
  revalidatePath("/employee/schedule");
  revalidatePath("/employee/notifications");
  revalidatePath("/employee/swaps");
  revalidatePath("/terminal");
  return { ok: true };
}

function emptyToNull(v: FormDataEntryValue | null): string | null {
  if (v === null || v === "") return null;
  return String(v);
}
