"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireManager } from "@/lib/auth/guards";
import { addWeeksUtc } from "@/lib/datetime";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/services/audit";
import { validateShiftAssignment } from "@/lib/services/shift-assignment";

const createShiftSchema = z.object({
  departmentId: z.string().min(1),
  roleId: z.string().nullable().optional(),
  zoneId: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  repeatWeeks: z.coerce.number().int().min(1).max(26).optional().default(1),
});

export async function createShift(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const session = await requireManager();
  const parsed = createShiftSchema.safeParse({
    departmentId: formData.get("departmentId"),
    roleId: emptyToNull(formData.get("roleId")),
    zoneId: emptyToNull(formData.get("zoneId")),
    title: emptyToNull(formData.get("title")),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    repeatWeeks: formData.get("repeatWeeks"),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().formErrors.join(", ") };
  }

  const { departmentId, roleId, zoneId, title, repeatWeeks } = parsed.data;
  const startsAt = new Date(parsed.data.startsAt);
  const endsAt = new Date(parsed.data.endsAt);

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

  const root = await prisma.shift.create({
    data: {
      departmentId,
      roleId: roleId ?? null,
      zoneId: zoneId ?? null,
      title: title ?? null,
      startsAt,
      endsAt,
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
        roleId: roleId ?? null,
        zoneId: zoneId ?? null,
        title: title ?? null,
        startsAt: addWeeksUtc(startsAt, w),
        endsAt: addWeeksUtc(endsAt, w),
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
});

export async function updateShift(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const session = await requireManager();
  const parsed = updateShiftSchema.safeParse({
    id: formData.get("id"),
    departmentId: formData.get("departmentId"),
    roleId: emptyToNull(formData.get("roleId")),
    zoneId: emptyToNull(formData.get("zoneId")),
    title: emptyToNull(formData.get("title")),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().formErrors.join(", ") };
  }

  const startsAt = new Date(parsed.data.startsAt);
  const endsAt = new Date(parsed.data.endsAt);
  if (endsAt <= startsAt) {
    return { error: "End time must be after start time." };
  }

  await prisma.shift.update({
    where: { id: parsed.data.id },
    data: {
      departmentId: parsed.data.departmentId,
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
  return { ok: true };
}

export async function deleteShift(formData: FormData): Promise<void> {
  const session = await requireManager();
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return;

  await prisma.shift.delete({ where: { id } });

  await writeAuditLog({
    actorUserId: session.user.id,
    entityType: "Shift",
    entityId: id,
    action: "DELETE",
  });

  revalidatePath("/manager/schedule");
  revalidatePath("/manager/coverage");
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
  const parsed = assignSchema.safeParse({
    shiftId: formData.get("shiftId"),
    employeeId: formData.get("employeeId"),
    managerOverrideReason: emptyToNull(formData.get("managerOverrideReason")),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().formErrors.join(", ") };
  }

  const { shiftId, employeeId, managerOverrideReason } = parsed.data;

  const dup = await prisma.shiftAssignment.findFirst({
    where: { shiftId, employeeId },
  });
  if (dup) {
    return { error: "Employee is already assigned to this shift." };
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
  const assignmentId = formData.get("assignmentId");
  if (typeof assignmentId !== "string" || !assignmentId) return;

  const row = await prisma.shiftAssignment.findUnique({
    where: { id: assignmentId },
    select: { shiftId: true },
  });
  if (!row) return;

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

function emptyToNull(v: FormDataEntryValue | null): string | null {
  if (v === null || v === "") return null;
  return String(v);
}
