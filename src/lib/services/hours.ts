import { HourLimitScope } from "@prisma/client";
import { prisma } from "@/lib/db";
import { intervalsOverlap } from "@/lib/datetime";

/** Sum shift minutes for an employee across assignments overlapping [rangeStart, rangeEnd). */
export async function sumAssignedMinutesInRange(
  employeeId: string,
  rangeStart: Date,
  rangeEnd: Date,
  excludeAssignmentIds: string[] = [],
): Promise<number> {
  const assignments = await prisma.shiftAssignment.findMany({
    where: {
      employeeId,
      ...(excludeAssignmentIds.length
        ? { id: { notIn: excludeAssignmentIds } }
        : {}),
    },
    include: {
      shift: { select: { startsAt: true, endsAt: true } },
    },
  });

  let total = 0;
  for (const a of assignments) {
    const s = a.shift.startsAt;
    const e = a.shift.endsAt;
    if (s < rangeEnd && e > rangeStart) {
      const overlapStart = s > rangeStart ? s : rangeStart;
      const overlapEnd = e < rangeEnd ? e : rangeEnd;
      if (overlapEnd > overlapStart) {
        total += Math.round((overlapEnd.getTime() - overlapStart.getTime()) / 60000);
      }
    }
  }
  return total;
}

export function shiftDurationMinutes(startsAt: Date, endsAt: Date): number {
  return Math.max(0, Math.round((endsAt.getTime() - startsAt.getTime()) / 60000));
}

/** Calendar day in local terms: use UTC date bucket for consistency with existing code. */
export async function sumAssignedMinutesOnCalendarDay(
  employeeId: string,
  day: Date,
  excludeAssignmentIds: string[] = [],
): Promise<number> {
  const start = new Date(day);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  const assignments = await prisma.shiftAssignment.findMany({
    where: {
      employeeId,
      ...(excludeAssignmentIds.length
        ? { id: { notIn: excludeAssignmentIds } }
        : {}),
    },
    include: {
      shift: { select: { startsAt: true, endsAt: true } },
    },
  });

  let total = 0;
  for (const a of assignments) {
    if (
      intervalsOverlap(a.shift.startsAt, a.shift.endsAt, start, end)
    ) {
      const overlapStart =
        a.shift.startsAt > start ? a.shift.startsAt : start;
      const overlapEnd = a.shift.endsAt < end ? a.shift.endsAt : end;
      if (overlapEnd > overlapStart) {
        total += Math.round(
          (overlapEnd.getTime() - overlapStart.getTime()) / 60000,
        );
      }
    }
  }
  return total;
}

/** Effective hour caps for an employee (employee-scoped limits preferred). */
export async function getEffectiveHourCaps(employeeId: string): Promise<{
  weeklyMaxMinutes: number | null;
  dailyMaxMinutes: number | null;
}> {
  const limits = await prisma.hourLimit.findMany({
    where: {
      scope: HourLimitScope.EMPLOYEE,
      employeeId,
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  let weeklyMaxMinutes: number | null = null;
  let dailyMaxMinutes: number | null = null;

  for (const l of limits) {
    if (weeklyMaxMinutes == null && l.weeklyMaxMinutes != null) {
      weeklyMaxMinutes = l.weeklyMaxMinutes;
    }
    if (dailyMaxMinutes == null && l.dailyMaxMinutes != null) {
      dailyMaxMinutes = l.dailyMaxMinutes;
    }
  }

  return { weeklyMaxMinutes, dailyMaxMinutes };
}

export async function getRestAnchorsForEmployee(
  employeeId: string,
  proposedStart: Date,
  proposedEnd: Date,
  excludeAssignmentIds: string[],
): Promise<{ priorShiftEnd: Date | null; nextShiftStart: Date | null }> {
  const assignments = await prisma.shiftAssignment.findMany({
    where: {
      employeeId,
      ...(excludeAssignmentIds.length
        ? { id: { notIn: excludeAssignmentIds } }
        : {}),
    },
    include: {
      shift: { select: { startsAt: true, endsAt: true } },
    },
  });

  let priorShiftEnd: Date | null = null;
  let nextShiftStart: Date | null = null;

  for (const a of assignments) {
    const { startsAt, endsAt } = a.shift;
    if (endsAt <= proposedStart) {
      if (!priorShiftEnd || endsAt > priorShiftEnd) priorShiftEnd = endsAt;
    }
    if (startsAt >= proposedEnd) {
      if (!nextShiftStart || startsAt < nextShiftStart) nextShiftStart = startsAt;
    }
  }

  return { priorShiftEnd, nextShiftStart };
}
