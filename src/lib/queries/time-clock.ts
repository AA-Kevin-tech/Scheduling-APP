import { prisma } from "@/lib/db";
import { clockInEarlyMinutes } from "@/lib/time-clock/constants";

const shiftInclude = {
  department: true,
  role: true,
  zone: true,
  location: true,
} as const;

export async function findEmployeeByTerminalIdentifier(raw: string) {
  const s = raw.trim();
  if (!s) return null;
  if (s.includes("@")) {
    return prisma.employee.findFirst({
      where: { user: { email: s.toLowerCase() } },
      select: { id: true, userId: true, timezone: true },
    });
  }
  return prisma.employee.findFirst({
    where: { employeeNumber: s },
    select: { id: true, userId: true, timezone: true },
  });
}

/** Open punch (clocked in, not out) for this employee on any assignment. */
export async function findOpenPunchForEmployee(employeeId: string) {
  return prisma.shiftTimePunch.findFirst({
    where: {
      clockOutAt: null,
      assignment: { employeeId },
    },
    include: {
      assignment: {
        include: {
          shift: { include: shiftInclude },
        },
      },
    },
  });
}

export async function getClockableAssignmentsForEmployee(
  employeeId: string,
  now: Date,
) {
  const earlyMs = clockInEarlyMinutes() * 60 * 1000;

  const assignments = await prisma.shiftAssignment.findMany({
    where: {
      employeeId,
      shift: {
        endsAt: { gt: now },
      },
    },
    include: {
      shift: { include: shiftInclude },
      timePunch: true,
    },
    orderBy: { shift: { startsAt: "asc" } },
  });

  return assignments.filter((a) => {
    const early = new Date(a.shift.startsAt.getTime() - earlyMs);
    return now >= early;
  });
}

export async function getShiftAssignmentForEmployee(
  assignmentId: string,
  employeeId: string,
) {
  return prisma.shiftAssignment.findFirst({
    where: { id: assignmentId, employeeId },
    include: {
      shift: { include: shiftInclude },
      timePunch: true,
    },
  });
}
