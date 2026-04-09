import { compare } from "bcryptjs";
import { prisma } from "@/lib/db";
import { clockInEarlyMinutes } from "@/lib/time-clock/constants";
import { timeClockPinLookupDigest } from "@/lib/time-clock/pin-lookup";

const shiftInclude = {
  department: true,
  role: true,
  zone: true,
  location: true,
} as const;

const assignmentTerminalInclude = {
  shift: { include: shiftInclude },
  timePunches: { orderBy: { clockInAt: "asc" as const } },
  employee: { include: { user: { select: { name: true, email: true } } } },
} as const;

export type TimeClockPinResolve =
  | {
      kind: "ok";
      employee: { id: string; userId: string; timezone: string };
    }
  | { kind: "not_found" }
  | { kind: "ambiguous" };

/** Resolve employee by time clock PIN (indexed lookup + bcrypt; legacy rows scan hashes only). */
export async function findEmployeeByTimeClockPin(
  raw: string,
): Promise<TimeClockPinResolve> {
  const pin = raw.trim();
  if (!/^\d{4,8}$/.test(pin)) return { kind: "not_found" };

  let digest: string;
  try {
    digest = timeClockPinLookupDigest(pin);
  } catch {
    return { kind: "not_found" };
  }

  const withLookup = await prisma.employee.findMany({
    where: { archivedAt: null, timeClockPinLookup: digest },
    select: {
      id: true,
      userId: true,
      timezone: true,
      timeClockPinHash: true,
    },
  });

  const lookupMatches: { id: string; userId: string; timezone: string }[] = [];
  for (const r of withLookup) {
    if (r.timeClockPinHash && (await compare(pin, r.timeClockPinHash))) {
      lookupMatches.push({
        id: r.id,
        userId: r.userId,
        timezone: r.timezone,
      });
    }
  }
  if (lookupMatches.length > 1) return { kind: "ambiguous" };
  if (lookupMatches.length === 1) {
    return { kind: "ok", employee: lookupMatches[0] };
  }

  const legacy = await prisma.employee.findMany({
    where: {
      archivedAt: null,
      timeClockPinHash: { not: null },
      timeClockPinLookup: null,
    },
    select: {
      id: true,
      userId: true,
      timezone: true,
      timeClockPinHash: true,
    },
  });

  const legacyMatches: { id: string; userId: string; timezone: string }[] = [];
  for (const r of legacy) {
    if (r.timeClockPinHash && (await compare(pin, r.timeClockPinHash))) {
      legacyMatches.push({
        id: r.id,
        userId: r.userId,
        timezone: r.timezone,
      });
    }
  }
  if (legacyMatches.length > 1) return { kind: "ambiguous" };
  if (legacyMatches.length === 1) {
    return { kind: "ok", employee: legacyMatches[0] };
  }
  return { kind: "not_found" };
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
        publishedAt: { not: null },
      },
    },
    include: {
      shift: { include: shiftInclude },
      timePunches: { orderBy: { clockInAt: "asc" } },
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
    where: {
      id: assignmentId,
      employeeId,
      shift: { publishedAt: { not: null } },
    },
    include: assignmentTerminalInclude,
  });
}
