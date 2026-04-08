import type { Prisma } from "@prisma/client";
import { shiftsWhereForLocations } from "@/lib/auth/location-scope";
import { prisma } from "@/lib/db";

function shiftAndForRange(
  rangeStart: Date,
  rangeEnd: Date,
  locationIds: string[] | null,
): Prisma.ShiftWhereInput {
  const locWhere = shiftsWhereForLocations(locationIds);
  const andClause: Prisma.ShiftWhereInput[] = [
    { publishedAt: { not: null } },
    { startsAt: { lt: rangeEnd } },
    { endsAt: { gt: rangeStart } },
  ];
  if (Object.keys(locWhere).length > 0) {
    andClause.push(locWhere);
  }
  return { AND: andClause };
}

/** Published shift assignments for one employee overlapping the range, scoped by venue (manager view). */
export async function getTimesheetAssignmentsForEmployee(params: {
  employeeId: string;
  rangeStart: Date;
  rangeEnd: Date;
  locationIds: string[] | null;
}) {
  return prisma.shiftAssignment.findMany({
    where: {
      employeeId: params.employeeId,
      shift: shiftAndForRange(
        params.rangeStart,
        params.rangeEnd,
        params.locationIds,
      ),
    },
    include: {
      timePunch: true,
      shift: {
        include: {
          department: { select: { name: true } },
          role: { select: { name: true } },
          location: { select: { name: true } },
        },
      },
    },
    orderBy: { shift: { startsAt: "asc" } },
  });
}

/** Shifts overlapping a calendar day (UTC bounds from zoned day), for time-tracker grid. */
export async function getPublishedShiftsOverlappingDayForLocations(params: {
  dayStartUtc: Date;
  dayEndUtc: Date;
  locationIds: string[] | null;
}) {
  return prisma.shift.findMany({
    where: shiftAndForRange(
      params.dayStartUtc,
      params.dayEndUtc,
      params.locationIds,
    ),
    include: {
      department: { select: { name: true } },
      role: { select: { name: true } },
      assignments: {
        include: {
          employee: {
            include: { user: { select: { name: true, email: true } } },
          },
          timePunch: true,
        },
      },
    },
    orderBy: [{ startsAt: "asc" }, { id: "asc" }],
  });
}
