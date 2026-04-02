import type { SwapRequestStatus } from "@prisma/client";
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

export async function listSwapRequestsForManager(status?: SwapRequestStatus[]) {
  return prisma.swapRequest.findMany({
    where: status?.length ? { status: { in: status } } : undefined,
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
    where: { employeeId },
    orderBy: { shift: { startsAt: "asc" } },
    include: {
      shift: {
        include: { department: true, role: true },
      },
    },
  });
}

export async function countPendingSwapsForManager() {
  const pending = await prisma.swapRequest.count({
    where: { status: "PENDING" },
  });
  const awaitingManager = await prisma.swapRequest.count({
    where: { status: "ACCEPTED_BY_TARGET" },
  });
  return { pending, awaitingManager };
}
