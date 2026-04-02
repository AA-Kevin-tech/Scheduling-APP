import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function writeAuditLog(input: {
  actorUserId: string | null;
  entityType: string;
  entityId: string;
  action: string;
  payload?: Prisma.InputJsonValue;
  reason?: string | null;
}) {
  await prisma.auditLog.create({
    data: {
      actorUserId: input.actorUserId,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      payload: input.payload,
      reason: input.reason ?? null,
    },
  });
}
