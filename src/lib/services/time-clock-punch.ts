import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import {
  findOpenPunchForEmployee,
  getShiftAssignmentForEmployee,
} from "@/lib/queries/time-clock";
import { getEffectiveHourCaps } from "@/lib/services/hours";
import {
  notifyLateClockIn,
  notifyWeeklyHourCapAfterClockOut,
} from "@/lib/services/time-clock-notify";
import { writeAuditLog } from "@/lib/services/audit";
import {
  clockInEarlyMinutes,
  clockInLateAfterMinutes,
} from "@/lib/time-clock/constants";
import { sumWorkedMinutesInIsoWeek } from "@/lib/time-clock/worked-minutes";
import { validateEmployeeWebClockGeofence } from "@/lib/services/time-clock-geofence";

export type TimeClockPunchOrigin =
  | { source: "terminal" }
  | { source: "employee_account"; actorUserId: string };

export function revalidateTimeClockAffectedPaths() {
  revalidatePath("/terminal");
  revalidatePath("/manager/attendance/time-tracker");
  revalidatePath("/manager/attendance/timesheets");
  revalidatePath("/employee");
  revalidatePath("/employee/attendance");
}

/**
 * Shared clock-in: kiosk and employee-account flows use the same rules and persistence.
 */
export async function performClockIn(input: {
  employeeId: string;
  assignmentId: string;
  note: string | null;
  now: Date;
  origin: TimeClockPunchOrigin;
  /** Browser WGS84 coordinates for employee-account punches when a geofence applies. */
  clientLatitude?: number | null;
  clientLongitude?: number | null;
}): Promise<{ ok: true } | { error: string }> {
  const { employeeId, assignmentId, note, now, origin } = input;

  const open = await findOpenPunchForEmployee(employeeId);
  if (open) {
    return { error: "Clock out of your current shift first." };
  }

  const assignment = await getShiftAssignmentForEmployee(
    assignmentId,
    employeeId,
  );
  if (!assignment) {
    return { error: "Shift not found." };
  }
  const openOnAssignment = assignment.timePunches.some(
    (p) => p.clockOutAt == null,
  );
  if (openOnAssignment) {
    return {
      error:
        "This shift already has an open punch. Clock out before clocking in again.",
    };
  }

  const earlyMs = clockInEarlyMinutes() * 60 * 1000;
  const early = new Date(assignment.shift.startsAt.getTime() - earlyMs);
  if (now < early || now > assignment.shift.endsAt) {
    return { error: "Clock-in is not allowed for this shift right now." };
  }

  if (origin.source === "employee_account") {
    const geo = await validateEmployeeWebClockGeofence({
      employeeId,
      shift: assignment.shift,
      latitude: input.clientLatitude ?? null,
      longitude: input.clientLongitude ?? null,
    });
    if ("error" in geo) return geo;
  }

  const punch = await prisma.shiftTimePunch.create({
    data: {
      shiftAssignmentId: assignment.id,
      clockInAt: now,
      clockInNote: note,
    },
  });

  const auditActor =
    origin.source === "employee_account" ? origin.actorUserId : null;
  await writeAuditLog({
    actorUserId: auditActor,
    entityType: "ShiftTimePunch",
    entityId: punch.id,
    action: "TIME_CLOCK_IN",
    payload: {
      employeeId,
      shiftAssignmentId: assignment.id,
      source: origin.source,
    },
  });

  const lateMs = clockInLateAfterMinutes() * 60 * 1000;
  if (now.getTime() > assignment.shift.startsAt.getTime() + lateMs) {
    const u = assignment.employee.user;
    const employeeLabel = u.name?.trim() || u.email;
    const sh = assignment.shift;
    const venueId = sh.locationId ?? sh.department.locationId;
    await notifyLateClockIn({
      employeeLabel,
      departmentName: sh.department.name,
      venueId,
      scheduledStart: sh.startsAt,
      minutesAfterStart: Math.round(
        (now.getTime() - sh.startsAt.getTime()) / 60000,
      ),
    });
  }

  revalidateTimeClockAffectedPaths();
  return { ok: true };
}

/**
 * Shared clock-out: kiosk and employee-account flows use the same rules and persistence.
 */
export async function performClockOut(input: {
  employeeId: string;
  note: string | null;
  now: Date;
  origin: TimeClockPunchOrigin;
  clientLatitude?: number | null;
  clientLongitude?: number | null;
}): Promise<{ ok: true } | { error: string }> {
  const { employeeId, note, now, origin } = input;

  const open = await findOpenPunchForEmployee(employeeId);
  if (!open || open.assignment.employeeId !== employeeId) {
    return { error: "You are not clocked in." };
  }

  if (origin.source === "employee_account") {
    const geo = await validateEmployeeWebClockGeofence({
      employeeId,
      shift: open.assignment.shift,
      latitude: input.clientLatitude ?? null,
      longitude: input.clientLongitude ?? null,
    });
    if ("error" in geo) return geo;
  }

  await prisma.shiftTimePunch.update({
    where: { id: open.id },
    data: { clockOutAt: now, clockOutNote: note },
  });

  const auditActor =
    origin.source === "employee_account" ? origin.actorUserId : null;
  await writeAuditLog({
    actorUserId: auditActor,
    entityType: "ShiftTimePunch",
    entityId: open.id,
    action: "TIME_CLOCK_OUT",
    payload: {
      employeeId,
      shiftAssignmentId: open.shiftAssignmentId,
      source: origin.source,
    },
  });

  const [empRow, caps, workedWeek] = await Promise.all([
    prisma.employee.findUnique({
      where: { id: employeeId },
      include: { user: { select: { name: true, email: true } } },
    }),
    getEffectiveHourCaps(employeeId),
    sumWorkedMinutesInIsoWeek(employeeId, now),
  ]);
  if (empRow && caps.weeklyMaxMinutes != null) {
    const employeeLabel =
      empRow.user.name?.trim() || empRow.user.email || "Employee";
    await notifyWeeklyHourCapAfterClockOut({
      employeeId,
      employeeLabel,
      workedMinutes: workedWeek,
      weeklyMaxMinutes: caps.weeklyMaxMinutes,
      now,
    });
  }

  revalidateTimeClockAffectedPaths();
  return { ok: true };
}
