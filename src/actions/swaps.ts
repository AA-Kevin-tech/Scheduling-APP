"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { sessionMayAccessSwapRequest } from "@/lib/auth/location-scope";
import { requireEmployeeProfile, requireManager } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/services/audit";
import { createNotification, notifyManagersExcept } from "@/lib/services/notifications";
import { executeApprovedSwap, validateCompleteSwapRequest } from "@/lib/services/swap-engine";

const createSchema = z.object({
  fromAssignmentId: z.string().min(1),
  toAssignmentId: z.string().nullable().optional(),
  targetEmployeeId: z.string().min(1),
});

export async function createSwapRequest(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  const { session, employeeId } = await requireEmployeeProfile();

  const parsed = createSchema.safeParse({
    fromAssignmentId: formData.get("fromAssignmentId"),
    toAssignmentId: emptyToNull(formData.get("toAssignmentId")),
    targetEmployeeId: formData.get("targetEmployeeId"),
  });

  if (!parsed.success) return { error: "Invalid form." };

  const { fromAssignmentId, toAssignmentId, targetEmployeeId } = parsed.data;

  if (targetEmployeeId === employeeId) {
    return { error: "Choose a different employee." };
  }

  if (toAssignmentId) {
    const to = await prisma.shiftAssignment.findUnique({
      where: { id: toAssignmentId },
    });
    if (!to || to.employeeId !== targetEmployeeId) {
      return { error: "The selected exchange shift must belong to the other employee." };
    }
  }

  const check = await validateCompleteSwapRequest({
    requesterEmployeeId: employeeId,
    targetEmployeeId,
    fromAssignmentId,
    toAssignmentId: toAssignmentId ?? null,
  });

  if (!check.ok) {
    return { error: check.reasons.join(" ") };
  }

  const swap = await prisma.swapRequest.create({
    data: {
      requesterEmployeeId: employeeId,
      targetEmployeeId,
      fromAssignmentId,
      toAssignmentId: toAssignmentId ?? null,
      status: "PENDING",
    },
  });

  const targetUser = await prisma.employee.findUnique({
    where: { id: targetEmployeeId },
    select: { userId: true },
  });

  if (targetUser) {
    await createNotification({
      userId: targetUser.userId,
      title: "Shift swap request",
      body: "Someone requested a shift swap with you. Review it under Swaps.",
      type: "SWAP_REQUEST",
    });
  }

  await notifyManagersExcept(
    session.user.id,
    "New swap request",
    "A shift swap request was submitted.",
    "SWAP_PENDING",
  );

  await writeAuditLog({
    actorUserId: session.user.id,
    entityType: "SwapRequest",
    entityId: swap.id,
    action: "CREATE",
    payload: { fromAssignmentId, toAssignmentId, targetEmployeeId },
  });

  revalidatePath("/employee/swaps");
  revalidatePath("/manager/swaps");
  return {};
}

export async function acceptSwapAsTarget(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  const { session, employeeId } = await requireEmployeeProfile();
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { error: "Missing id." };

  const swap = await prisma.swapRequest.findFirst({
    where: { id, targetEmployeeId: employeeId, status: "PENDING" },
  });
  if (!swap) return { error: "Request not found." };

  const check = await validateCompleteSwapRequest({
    requesterEmployeeId: swap.requesterEmployeeId,
    targetEmployeeId: employeeId,
    fromAssignmentId: swap.fromAssignmentId,
    toAssignmentId: swap.toAssignmentId,
  });

  if (!check.ok) {
    return { error: check.reasons.join(" ") };
  }

  await prisma.swapRequest.update({
    where: { id },
    data: { status: "ACCEPTED_BY_TARGET" },
  });

  const requester = await prisma.employee.findUnique({
    where: { id: swap.requesterEmployeeId },
    select: { userId: true },
  });
  if (requester) {
    await createNotification({
      userId: requester.userId,
      title: "Swap accepted",
      body: "The other employee accepted your swap. A manager will finalize it.",
      type: "SWAP_ACCEPTED",
    });
  }

  await notifyManagersExcept(
    session.user.id,
    "Swap accepted by employee",
    "A swap is ready for manager approval.",
    "SWAP_READY",
  );

  await writeAuditLog({
    actorUserId: session.user.id,
    entityType: "SwapRequest",
    entityId: id,
    action: "ACCEPT_TARGET",
  });

  revalidatePath("/employee/swaps");
  revalidatePath("/manager/swaps");
  return {};
}

export async function rejectSwapAsTarget(formData: FormData): Promise<void> {
  const { session, employeeId } = await requireEmployeeProfile();
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return;

  const row = await prisma.swapRequest.findFirst({
    where: { id, targetEmployeeId: employeeId, status: "PENDING" },
  });
  if (!row) return;

  await prisma.swapRequest.update({
    where: { id: row.id },
    data: {
      status: "REJECTED_BY_TARGET",
      decidedAt: new Date(),
      decidedByUserId: session.user.id,
    },
  });

  const swap = await prisma.swapRequest.findUnique({ where: { id } });
  if (swap) {
    const requester = await prisma.employee.findUnique({
      where: { id: swap.requesterEmployeeId },
      select: { userId: true },
    });
    if (requester) {
      await createNotification({
        userId: requester.userId,
        title: "Swap declined",
        body: "The other employee declined your swap request.",
        type: "SWAP_REJECTED",
      });
    }
  }

  await writeAuditLog({
    actorUserId: session.user.id,
    entityType: "SwapRequest",
    entityId: id,
    action: "REJECT_TARGET",
  });

  revalidatePath("/employee/swaps");
  revalidatePath("/manager/swaps");
}

const approveSchema = z.object({
  id: z.string().min(1),
  managerOverrideReason: z.string().optional(),
});

export async function approveSwapAsManager(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  const session = await requireManager();

  const parsed = approveSchema.safeParse({
    id: formData.get("id"),
    managerOverrideReason: formData.get("managerOverrideReason") ?? undefined,
  });
  if (!parsed.success) return { error: "Invalid." };

  const swap = await prisma.swapRequest.findUnique({
    where: { id: parsed.data.id },
  });
  if (!swap || swap.status !== "ACCEPTED_BY_TARGET") {
    return { error: "Swap not found or not ready." };
  }

  if (!(await sessionMayAccessSwapRequest(session, parsed.data.id))) {
    return { error: "Swap not found." };
  }

  if (!swap.targetEmployeeId) return { error: "Missing target." };

  const check = await validateCompleteSwapRequest({
    requesterEmployeeId: swap.requesterEmployeeId,
    targetEmployeeId: swap.targetEmployeeId,
    fromAssignmentId: swap.fromAssignmentId,
    toAssignmentId: swap.toAssignmentId,
  });

  const override = parsed.data.managerOverrideReason?.trim();
  if (!check.ok && !override) {
    return { error: check.reasons.join(" ") };
  }

  await executeApprovedSwap(swap.id, session.user.id, override || null);

  const reqUser = await prisma.employee.findUnique({
    where: { id: swap.requesterEmployeeId },
    select: { userId: true },
  });
  const tgtUser = await prisma.employee.findUnique({
    where: { id: swap.targetEmployeeId },
    select: { userId: true },
  });

  if (reqUser) {
    await createNotification({
      userId: reqUser.userId,
      title: "Swap approved",
      body: "Your manager approved the shift swap. Shifts are updated.",
      type: "SWAP_APPROVED",
    });
  }
  if (tgtUser) {
    await createNotification({
      userId: tgtUser.userId,
      title: "Swap approved",
      body: "Your manager approved the shift swap. Shifts are updated.",
      type: "SWAP_APPROVED",
    });
  }

  await writeAuditLog({
    actorUserId: session.user.id,
    entityType: "SwapRequest",
    entityId: swap.id,
    action: "APPROVE_MANAGER",
    reason: override || null,
  });

  revalidatePath("/employee/swaps");
  revalidatePath("/employee/schedule");
  revalidatePath("/manager/swaps");
  revalidatePath("/manager/schedule");
  return {};
}

export async function denySwapAsManager(formData: FormData): Promise<void> {
  const session = await requireManager();
  const id = formData.get("id");
  const note = formData.get("managerNote");
  if (typeof id !== "string" || !id) return;

  const swap = await prisma.swapRequest.findFirst({
    where: {
      id,
      status: { in: ["PENDING", "ACCEPTED_BY_TARGET"] },
    },
  });
  if (!swap) return;
  if (!(await sessionMayAccessSwapRequest(session, id))) return;

  await prisma.swapRequest.update({
    where: { id },
    data: {
      status: "DENIED_BY_MANAGER",
      decidedAt: new Date(),
      decidedByUserId: session.user.id,
      managerNote: typeof note === "string" ? note : null,
    },
  });

  const reqUser = await prisma.employee.findUnique({
    where: { id: swap.requesterEmployeeId },
    select: { userId: true },
  });
  const tgtUser = swap.targetEmployeeId
    ? await prisma.employee.findUnique({
        where: { id: swap.targetEmployeeId },
        select: { userId: true },
      })
    : null;

  if (reqUser) {
    await createNotification({
      userId: reqUser.userId,
      title: "Swap denied",
      body: "Your manager did not approve the swap request.",
      type: "SWAP_DENIED",
    });
  }
  if (tgtUser) {
    await createNotification({
      userId: tgtUser.userId,
      title: "Swap denied",
      body: "Your manager did not approve the swap request.",
      type: "SWAP_DENIED",
    });
  }

  await writeAuditLog({
    actorUserId: session.user.id,
    entityType: "SwapRequest",
    entityId: id,
    action: "DENY_MANAGER",
  });

  revalidatePath("/employee/swaps");
  revalidatePath("/manager/swaps");
}

function emptyToNull(v: FormDataEntryValue | null): string | null {
  if (v === null || v === "") return null;
  return String(v);
}
