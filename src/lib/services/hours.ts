import { HourLimitScope } from "@prisma/client";
import { prisma } from "@/lib/db";

function limitMatchesMembership(
  limit: { departmentId: string | null; roleId: string | null },
  m: { departmentId: string; roleId: string | null },
): boolean {
  if (limit.departmentId !== m.departmentId) return false;
  if (limit.roleId == null) return true;
  if (m.roleId == null) return false;
  return limit.roleId === m.roleId;
}

function mergeHourCapRows(
  rows: { weeklyMaxMinutes: number | null }[],
): { weeklyMaxMinutes: number | null } {
  let weeklyMaxMinutes: number | null = null;
  for (const l of rows) {
    if (l.weeklyMaxMinutes != null) {
      weeklyMaxMinutes =
        weeklyMaxMinutes == null
          ? l.weeklyMaxMinutes
          : Math.min(weeklyMaxMinutes, l.weeklyMaxMinutes);
    }
  }
  return { weeklyMaxMinutes };
}

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

/** Effective hour caps: tightest of employee-scoped and matching department/role limits. */
export async function getEffectiveHourCaps(employeeId: string): Promise<{
  weeklyMaxMinutes: number | null;
}> {
  const memberships = await prisma.employeeDepartment.findMany({
    where: { employeeId },
    select: { departmentId: true, roleId: true },
  });

  const deptIds = [...new Set(memberships.map((m) => m.departmentId))];

  const [employeeLimits, deptRoleLimits] = await Promise.all([
    prisma.hourLimit.findMany({
      where: { scope: HourLimitScope.EMPLOYEE, employeeId },
      orderBy: { createdAt: "desc" },
    }),
    deptIds.length
      ? prisma.hourLimit.findMany({
          where: {
            scope: HourLimitScope.DEPARTMENT_ROLE,
            departmentId: { in: deptIds },
          },
        })
      : Promise.resolve([]),
  ]);

  const applicableDept = deptRoleLimits.filter((l) =>
    memberships.some((m) => limitMatchesMembership(l, m)),
  );

  return mergeHourCapRows([...employeeLimits, ...applicableDept]);
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
