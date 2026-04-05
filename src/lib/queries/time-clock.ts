import { compare } from "bcryptjs";
import { prisma } from "@/lib/db";
import { clockInEarlyMinutes } from "@/lib/time-clock/constants";

const shiftInclude = {
  department: true,
  role: true,
  zone: true,
  location: true,
} as const;

const assignmentTerminalInclude = {
  shift: { include: shiftInclude },
  timePunch: true,
  employee: { include: { user: { select: { name: true, email: true } } } },
} as const;

/** Resolve employee by time clock PIN (bcrypt compare against hashed PINs). */
export async function findEmployeeByTimeClockPin(raw: string) {
  const pin = raw.trim();
  if (!/^\d{4,8}$/.test(pin)) return null;

  const rows = await prisma.employee.findMany({
    where: { archivedAt: null, timeClockPinHash: { not: null } },
    select: {
      id: true,
      userId: true,
      timezone: true,
      timeClockPinHash: true,
    },
  });

  for (const r of rows) {
    if (
      r.timeClockPinHash &&
      (await compare(pin, r.timeClockPinHash))
    ) {
      return {
        id: r.id,
        userId: r.userId,
        timezone: r.timezone,
      };
    }
  }
  return null;
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
    include: assignmentTerminalInclude,
  });
}
