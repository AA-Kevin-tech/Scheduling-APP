import { shiftsWhereForLocations } from "@/lib/auth/location-scope";
import { prisma } from "@/lib/db";
import { missingClockInAfterMinutes } from "@/lib/time-clock/constants";
import { formatInTimeZone } from "date-fns-tz";
import { getDefaultScheduleTimezone } from "@/lib/schedule/tz";

const userSelect = { select: { name: true, email: true } } as const;

const shiftInclude = {
  department: { select: { name: true, locationId: true } },
  location: { select: { name: true, id: true } },
  role: { select: { name: true } },
} as const;

export type OpenPunchPastEndRow = {
  punchId: string;
  employeeId: string;
  employeeLabel: string;
  departmentName: string;
  venueId: string;
  shiftStartsAt: Date;
  shiftEndsAt: Date;
  clockInAt: Date;
};

export type MissingClockInRow = {
  assignmentId: string;
  employeeId: string;
  employeeLabel: string;
  departmentName: string;
  venueId: string;
  shiftStartsAt: Date;
  shiftEndsAt: Date;
  minutesSinceStart: number;
};

export type MissedShiftNoPunchRow = {
  assignmentId: string;
  employeeId: string;
  employeeLabel: string;
  departmentName: string;
  venueId: string;
  shiftStartsAt: Date;
  shiftEndsAt: Date;
};

function labelEmployee(name: string | null, email: string) {
  return name?.trim() || email;
}

function venueIdFromShift(s: {
  locationId: string | null;
  department: { locationId: string };
}): string {
  return s.locationId ?? s.department.locationId;
}

export async function getOpenPunchesPastShiftEnd(
  now: Date,
  /** `null`/`undefined` = all venues (e.g. notifications cron). */
  locationIds?: string[] | null,
): Promise<OpenPunchPastEndRow[]> {
  const shiftBase = {
    endsAt: { lt: now },
    publishedAt: { not: null },
  } as const;
  const shiftWhere =
    locationIds === undefined || locationIds === null
      ? shiftBase
      : { AND: [shiftBase, shiftsWhereForLocations(locationIds)] };

  const rows = await prisma.shiftTimePunch.findMany({
    where: {
      clockOutAt: null,
      assignment: {
        shift: shiftWhere,
      },
    },
    include: {
      assignment: {
        include: {
          employee: { include: { user: userSelect } },
          shift: { include: shiftInclude },
        },
      },
    },
    orderBy: { clockInAt: "asc" },
  });

  return rows.map((p) => {
    const u = p.assignment.employee.user;
    const sh = p.assignment.shift;
    return {
      punchId: p.id,
      employeeId: p.assignment.employeeId,
      employeeLabel: labelEmployee(u.name, u.email),
      departmentName: sh.department.name,
      venueId: venueIdFromShift(sh),
      shiftStartsAt: sh.startsAt,
      shiftEndsAt: sh.endsAt,
      clockInAt: p.clockInAt,
    };
  });
}

export async function getMissingClockInsDuringShift(
  now: Date,
  locationIds?: string[] | null,
): Promise<MissingClockInRow[]> {
  const afterMs = missingClockInAfterMinutes() * 60 * 1000;
  const shiftBase = {
    publishedAt: { not: null },
    startsAt: { lt: new Date(now.getTime() - afterMs) },
    endsAt: { gt: now },
  } as const;
  const shiftWhere =
    locationIds === undefined || locationIds === null
      ? shiftBase
      : { AND: [shiftBase, shiftsWhereForLocations(locationIds)] };

  const rows = await prisma.shiftAssignment.findMany({
    where: {
      timePunches: { none: {} },
      shift: shiftWhere,
    },
    include: {
      employee: { include: { user: userSelect } },
      shift: { include: shiftInclude },
    },
    orderBy: { shift: { startsAt: "asc" } },
  });

  return rows.map((a) => {
    const u = a.employee.user;
    const minutesSinceStart = Math.max(
      0,
      Math.round((now.getTime() - a.shift.startsAt.getTime()) / 60000),
    );
    return {
      assignmentId: a.id,
      employeeId: a.employeeId,
      employeeLabel: labelEmployee(u.name, u.email),
      departmentName: a.shift.department.name,
      venueId: venueIdFromShift(a.shift),
      shiftStartsAt: a.shift.startsAt,
      shiftEndsAt: a.shift.endsAt,
      minutesSinceStart,
    };
  });
}

export async function getMissedShiftsWithoutPunch(
  now: Date,
  locationIds?: string[] | null,
): Promise<MissedShiftNoPunchRow[]> {
  const recentStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const shiftBase = {
    publishedAt: { not: null },
    endsAt: { lt: now, gte: recentStart },
  } as const;
  const shiftWhere =
    locationIds === undefined || locationIds === null
      ? shiftBase
      : { AND: [shiftBase, shiftsWhereForLocations(locationIds)] };

  const rows = await prisma.shiftAssignment.findMany({
    where: {
      timePunches: { none: {} },
      shift: shiftWhere,
    },
    include: {
      employee: { include: { user: userSelect } },
      shift: { include: shiftInclude },
    },
    orderBy: { shift: { endsAt: "desc" } },
    take: 200,
  });

  return rows.map((a) => {
    const u = a.employee.user;
    return {
      assignmentId: a.id,
      employeeId: a.employeeId,
      employeeLabel: labelEmployee(u.name, u.email),
      departmentName: a.shift.department.name,
      venueId: venueIdFromShift(a.shift),
      shiftStartsAt: a.shift.startsAt,
      shiftEndsAt: a.shift.endsAt,
    };
  });
}

export function formatShiftRange(
  startsAt: Date,
  endsAt: Date,
  tz = getDefaultScheduleTimezone(),
): string {
  const d0 = formatInTimeZone(startsAt, tz, "MMM d");
  const t0 = formatInTimeZone(startsAt, tz, "h:mm a");
  const t1 = formatInTimeZone(endsAt, tz, "h:mm a");
  return `${d0}, ${t0} – ${t1}`;
}

export async function getTimeClockIssueCounts(
  now: Date,
  locationIds?: string[] | null,
) {
  const [openPast, missing, missed] = await Promise.all([
    getOpenPunchesPastShiftEnd(now, locationIds),
    getMissingClockInsDuringShift(now, locationIds),
    getMissedShiftsWithoutPunch(now, locationIds),
  ]);
  return {
    openPastEnd: openPast.length,
    missingClockIn: missing.length,
    missedNoPunch: missed.length,
    total: openPast.length + missing.length + missed.length,
  };
}
