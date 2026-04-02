import { prisma } from "@/lib/db";

export async function listTimeOffForEmployee(employeeId: string) {
  return prisma.timeOffRequest.findMany({
    where: { employeeId },
    orderBy: [{ startsAt: "desc" }],
  });
}

export async function listPendingTimeOffForManager() {
  return prisma.timeOffRequest.findMany({
    where: { status: "PENDING" },
    orderBy: [{ createdAt: "asc" }],
    include: {
      employee: {
        include: { user: { select: { name: true, email: true } } },
      },
    },
  });
}

export async function countPendingTimeOffRequests() {
  return prisma.timeOffRequest.count({
    where: { status: "PENDING" },
  });
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
