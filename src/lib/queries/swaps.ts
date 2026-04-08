import type { Prisma, SwapRequestStatus } from "@prisma/client";
import { swapRequestTouchesLocationsWhere } from "@/lib/auth/location-scope";
import { prisma } from "@/lib/db";

const swapInclude = {
  requester: {
    include: { user: { select: { name: true, email: true } } },
  },
  target: {
    include: { user: { select: { name: true, email: true } } },
  },
  fromAssignment: {
    include: {
      shift: {
        include: { department: true, role: true },
      },
    },
  },
  toAssignment: {
    include: {
      shift: {
        include: { department: true, role: true },
      },
    },
  },
} as const;

export async function listSwapRequestsForManager(
  status?: SwapRequestStatus[],
  /** `null` = all venues (admin). Omit = same as null. */
  locationIds?: string[] | null,
) {
  const scope = swapRequestTouchesLocationsWhere(
    locationIds === undefined ? null : locationIds,
  );
  const where: Prisma.SwapRequestWhereInput = {
    ...(status?.length ? { status: { in: status } } : {}),
    ...scope,
  };
  return prisma.swapRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: swapInclude,
  });
}

export async function listSwapRequestsForEmployee(employeeId: string) {
  return prisma.swapRequest.findMany({
    where: {
      OR: [
        { requesterEmployeeId: employeeId },
        { targetEmployeeId: employeeId },
      ],
    },
    orderBy: { createdAt: "desc" },
    include: swapInclude,
  });
}

export async function getSwapRequestById(id: string) {
  return prisma.swapRequest.findUnique({
    where: { id },
    include: swapInclude,
  });
}

export async function getAssignmentsForEmployee(employeeId: string) {
  return prisma.shiftAssignment.findMany({
    where: { employeeId, shift: { publishedAt: { not: null } } },
    orderBy: { shift: { startsAt: "asc" } },
    include: {
      shift: {
        include: { department: true, role: true },
      },
    },
  });
}

export async function countPendingSwapsForManager(
  locationIds: string[] | null,
) {
  const scope = swapRequestTouchesLocationsWhere(locationIds);
  const pending = await prisma.swapRequest.count({
    where: { status: "PENDING", ...scope },
  });
  const awaitingManager = await prisma.swapRequest.count({
    where: { status: "ACCEPTED_BY_TARGET", ...scope },
  });
  return { pending, awaitingManager };
}
