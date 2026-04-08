"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/services/audit";
import {
  getDefaultScheduleTimezone,
  parseDatetimeLocalInTimezone,
} from "@/lib/schedule/tz";

const reasonSchema = z
  .string()
  .min(8, "Correction reason must be at least 8 characters.")
  .max(4000);

function emptyNotes(raw: FormDataEntryValue | null): string | null {
  if (raw === null || raw === "") return null;
  const s = String(raw).trim();
  return s.length ? s : null;
}

export async function adminCorrectTimePunch(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  void _prev;
  const session = await requireAdmin();
  const tz = getDefaultScheduleTimezone();

  const punchId = String(formData.get("punchId") ?? "").trim();
  const clockInRaw = String(formData.get("clockInAt") ?? "").trim();
  const clockOutRaw = String(formData.get("clockOutAt") ?? "").trim();
  const clockInNote = emptyNotes(formData.get("clockInNote"));
  const clockOutNote = emptyNotes(formData.get("clockOutNote"));
  const reasonParsed = reasonSchema.safeParse(
    String(formData.get("correctionReason") ?? "").trim(),
  );
  if (!reasonParsed.success) {
    return { error: reasonParsed.error.flatten().formErrors.join(" ") };
  }
  if (!punchId || !clockInRaw) {
    return { error: "Punch and clock-in time are required." };
  }

  const clockInAt =
    parseDatetimeLocalInTimezone(clockInRaw, tz) ?? new Date(clockInRaw);
  let clockOutAt: Date | null = null;
  if (clockOutRaw) {
    clockOutAt =
      parseDatetimeLocalInTimezone(clockOutRaw, tz) ?? new Date(clockOutRaw);
  }
  if (Number.isNaN(clockInAt.getTime())) {
    return { error: "Invalid clock-in time." };
  }
  if (clockOutAt && Number.isNaN(clockOutAt.getTime())) {
    return { error: "Invalid clock-out time." };
  }
  if (clockOutAt && clockOutAt <= clockInAt) {
    return { error: "Clock-out must be after clock-in." };
  }

  const existing = await prisma.shiftTimePunch.findUnique({
    where: { id: punchId },
  });
  if (!existing) {
    return { error: "Time punch not found." };
  }

  const before = {
    clockInAt: existing.clockInAt.toISOString(),
    clockOutAt: existing.clockOutAt?.toISOString() ?? null,
    clockInNote: existing.clockInNote,
    clockOutNote: existing.clockOutNote,
  };

  await prisma.shiftTimePunch.update({
    where: { id: punchId },
    data: {
      clockInAt,
      clockOutAt,
      clockInNote,
      clockOutNote,
    },
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    entityType: "ShiftTimePunch",
    entityId: punchId,
    action: "ADMIN_CORRECT_TIME_PUNCH",
    reason: reasonParsed.data,
    payload: {
      before,
      after: {
        clockInAt: clockInAt.toISOString(),
        clockOutAt: clockOutAt?.toISOString() ?? null,
        clockInNote,
        clockOutNote,
      },
    },
  });

  revalidatePath("/admin/payroll-corrections");
  revalidatePath("/manager/time-clock");
  revalidatePath("/manager/attendance/timesheets");
  revalidatePath("/manager/attendance/time-tracker");
  revalidatePath("/employee/attendance");
  return { ok: true };
}

export async function adminCreateTimePunch(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  void _prev;
  const session = await requireAdmin();
  const tz = getDefaultScheduleTimezone();

  const assignmentId = String(formData.get("assignmentId") ?? "").trim();
  const clockInRaw = String(formData.get("clockInAt") ?? "").trim();
  const clockOutRaw = String(formData.get("clockOutAt") ?? "").trim();
  const clockInNote = emptyNotes(formData.get("clockInNote"));
  const clockOutNote = emptyNotes(formData.get("clockOutNote"));
  const reasonParsed = reasonSchema.safeParse(
    String(formData.get("correctionReason") ?? "").trim(),
  );
  if (!reasonParsed.success) {
    return { error: reasonParsed.error.flatten().formErrors.join(" ") };
  }
  if (!assignmentId || !clockInRaw) {
    return { error: "Assignment and clock-in time are required." };
  }

  const clockInAt =
    parseDatetimeLocalInTimezone(clockInRaw, tz) ?? new Date(clockInRaw);
  let clockOutAt: Date | null = null;
  if (clockOutRaw) {
    clockOutAt =
      parseDatetimeLocalInTimezone(clockOutRaw, tz) ?? new Date(clockOutRaw);
  }
  if (Number.isNaN(clockInAt.getTime())) {
    return { error: "Invalid clock-in time." };
  }
  if (clockOutAt && Number.isNaN(clockOutAt.getTime())) {
    return { error: "Invalid clock-out time." };
  }
  if (clockOutAt && clockOutAt <= clockInAt) {
    return { error: "Clock-out must be after clock-in." };
  }

  const assignment = await prisma.shiftAssignment.findUnique({
    where: { id: assignmentId },
    include: { timePunch: { select: { id: true } }, shift: true },
  });
  if (!assignment) {
    return { error: "Assignment not found." };
  }
  if (assignment.timePunch) {
    return { error: "This assignment already has a time punch." };
  }
  if (assignment.shift.publishedAt == null) {
    return { error: "Only published shifts can receive a retroactive punch." };
  }

  const punch = await prisma.shiftTimePunch.create({
    data: {
      shiftAssignmentId: assignmentId,
      clockInAt,
      clockOutAt,
      clockInNote,
      clockOutNote,
    },
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    entityType: "ShiftTimePunch",
    entityId: punch.id,
    action: "ADMIN_CREATE_TIME_PUNCH",
    reason: reasonParsed.data,
    payload: {
      shiftAssignmentId: assignmentId,
      after: {
        clockInAt: clockInAt.toISOString(),
        clockOutAt: clockOutAt?.toISOString() ?? null,
        clockInNote,
        clockOutNote,
      },
    },
  });

  revalidatePath("/admin/payroll-corrections");
  revalidatePath("/manager/time-clock");
  revalidatePath("/manager/attendance/timesheets");
  revalidatePath("/manager/attendance/time-tracker");
  revalidatePath("/employee/attendance");
  return { ok: true };
}
