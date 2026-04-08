import type { EmployeeInviteStage } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * When an employee loads a valid onboarding page, move INVITED → STARTED once.
 */
export async function recordEmployeeInviteOpened(token: string): Promise<void> {
  const now = new Date();
  await prisma.employeeInvite.updateMany({
    where: {
      token,
      consumedAt: null,
      expiresAt: { gt: now },
      stage: "INVITED",
    },
    data: {
      stage: "STARTED",
      startedAt: now,
    },
  });
}

export type InvitePipelineStatus =
  | "completed"
  | "expired"
  | "in_progress"
  | "invite_sent";

export function deriveInvitePipelineStatus(row: {
  consumedAt: Date | null;
  expiresAt: Date;
  stage: EmployeeInviteStage;
}): InvitePipelineStatus {
  if (row.consumedAt) return "completed";
  if (row.expiresAt < new Date()) return "expired";
  if (row.stage === "STARTED") return "in_progress";
  return "invite_sent";
}

export function inviteStageLabel(stage: EmployeeInviteStage): string {
  switch (stage) {
    case "INVITED":
      return "Invite sent";
    case "STARTED":
      return "Opened link";
    case "COMPLETED":
      return "Submitted";
    default:
      return stage;
  }
}

export function pipelineStatusLabel(status: InvitePipelineStatus): string {
  switch (status) {
    case "completed":
      return "Completed";
    case "expired":
      return "Expired";
    case "in_progress":
      return "In progress";
    case "invite_sent":
      return "Awaiting open";
    default:
      return status;
  }
}
