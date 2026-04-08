import type { Prisma } from "@prisma/client";
import { employeeTiedToLocationsWhere } from "@/lib/auth/location-scope";
import { prisma } from "@/lib/db";

export async function listTimeOffForEmployee(employeeId: string) {
  return prisma.timeOffRequest.findMany({
    where: { employeeId },
    orderBy: [{ startsAt: "desc" }],
  });
}

export async function listPendingTimeOffForManager(
  locationIds: string[] | null,
) {
  const empWhere = employeeTiedToLocationsWhere(locationIds);
  const where: Prisma.TimeOffRequestWhereInput = {
    status: "PENDING",
    ...(Object.keys(empWhere).length > 0 ? { employee: empWhere } : {}),
  };
  return prisma.timeOffRequest.findMany({
    where,
    orderBy: [{ createdAt: "asc" }],
    include: {
      employee: {
        include: { user: { select: { name: true, email: true } } },
      },
    },
  });
}

export async function countPendingTimeOffRequests(locationIds: string[] | null) {
  const empWhere = employeeTiedToLocationsWhere(locationIds);
  const where: Prisma.TimeOffRequestWhereInput = {
    status: "PENDING",
    ...(Object.keys(empWhere).length > 0 ? { employee: empWhere } : {}),
  };
  return prisma.timeOffRequest.count({ where });
}

export async function countOverlappingAssignments(
  employeeId: string,
  startsAt: Date,
  endsAt: Date,
) {
  return prisma.shiftAssignment.count({
    where: {
      employeeId,
      shift: {
        AND: [
          { startsAt: { lt: endsAt } },
          { endsAt: { gt: startsAt } },
        ],
      },
    },
  });
}

export async function getOverlapCountForRequest(requestId: string) {
  const row = await prisma.timeOffRequest.findUnique({
    where: { id: requestId },
  });
  if (!row) return 0;
  return countOverlappingAssignments(
    row.employeeId,
    row.startsAt,
    row.endsAt,
  );
}

export async function getApprovedTimeOffOverlappingRange(
  employeeId: string,
  from: Date,
  to: Date,
) {
  return prisma.timeOffRequest.findMany({
    where: {
      employeeId,
      status: "APPROVED",
      AND: [{ startsAt: { lt: to } }, { endsAt: { gt: from } }],
    },
    orderBy: { startsAt: "asc" },
  });
}
