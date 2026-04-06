import { prisma } from "@/lib/db";
import { validateEmployeeTakingShift } from "@/lib/services/swap-context";

export async function validateCompleteSwapRequest(input: {
  requesterEmployeeId: string;
  targetEmployeeId: string;
  fromAssignmentId: string;
  toAssignmentId: string | null;
}): Promise<{ ok: boolean; reasons: string[] }> {
  const from = await prisma.shiftAssignment.findUnique({
    where: { id: input.fromAssignmentId },
    include: { shift: { include: { department: true, role: true } } },
  });

  if (!from || from.employeeId !== input.requesterEmployeeId) {
    return { ok: false, reasons: ["You can only offer shifts that are assigned to you."] };
  }

  if (!from.shift.publishedAt) {
    return {
      ok: false,
      reasons: ["Draft shifts cannot be swapped. Publish the schedule first."],
    };
  }

  if (!input.toAssignmentId) {
    return validateEmployeeTakingShift({
      takerEmployeeId: input.targetEmployeeId,
      shift: from.shift,
      dropAssignmentId: null,
    });
  }

  const to = await prisma.shiftAssignment.findUnique({
    where: { id: input.toAssignmentId },
    include: { shift: { include: { department: true, role: true } } },
  });

  if (!to || to.employeeId !== input.targetEmployeeId) {
    return {
      ok: false,
      reasons: ["The selected exchange shift must belong to the other employee."],
    };
  }

  if (!to.shift.publishedAt) {
    return {
      ok: false,
      reasons: ["Draft shifts cannot be swapped. Publish the schedule first."],
    };
  }

  const targetTakesRequesterShift = await validateEmployeeTakingShift({
    takerEmployeeId: input.targetEmployeeId,
    shift: from.shift,
    dropAssignmentId: to.id,
  });

  const requesterTakesTargetShift = await validateEmployeeTakingShift({
    takerEmployeeId: input.requesterEmployeeId,
    shift: to.shift,
    dropAssignmentId: from.id,
  });

  const reasons = [
    ...targetTakesRequesterShift.reasons,
    ...requesterTakesTargetShift.reasons,
  ];
  return { ok: reasons.length === 0, reasons };
}

export async function executeApprovedSwap(
  swapId: string,
  managerUserId: string,
  managerOverrideReason: string | null,
) {
  await prisma.$transaction(async (tx) => {
    const swap = await tx.swapRequest.findUnique({
      where: { id: swapId },
      include: {
        fromAssignment: true,
        toAssignment: true,
      },
    });

    if (!swap) throw new Error("Swap not found");
    if (swap.status !== "ACCEPTED_BY_TARGET") {
      throw new Error("Swap is not ready for execution");
    }

    if (!swap.targetEmployeeId) throw new Error("Missing target");

    const requesterId = swap.requesterEmployeeId;
    const targetId = swap.targetEmployeeId;

    if (swap.toAssignmentId) {
      await tx.shiftAssignment.update({
        where: { id: swap.fromAssignmentId },
        data: { employeeId: targetId },
      });
      await tx.shiftAssignment.update({
        where: { id: swap.toAssignmentId },
        data: { employeeId: requesterId },
      });
    } else {
      await tx.shiftAssignment.update({
        where: { id: swap.fromAssignmentId },
        data: { employeeId: targetId },
      });
    }

    await tx.swapRequest.update({
      where: { id: swapId },
      data: {
        status: "APPROVED_BY_MANAGER",
        decidedAt: new Date(),
        decidedByUserId: managerUserId,
        managerOverrideReason: managerOverrideReason ?? null,
      },
    });
  });
}
