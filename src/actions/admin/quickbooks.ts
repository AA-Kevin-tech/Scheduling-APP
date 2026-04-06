"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guards";
import {
  isIntuitOAuthConfigured,
  revokeIntuitToken,
} from "@/lib/integrations/intuit-oauth";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/services/audit";

const SINGLETON_ID = "singleton";

export async function disconnectQuickBooksAction() {
  const session = await requireAdmin();

  const row = await prisma.quickBooksConnection.findUnique({
    where: { id: SINGLETON_ID },
    select: { refreshToken: true, realmId: true },
  });

  if (row?.refreshToken && isIntuitOAuthConfigured()) {
    try {
      await revokeIntuitToken(row.refreshToken);
    } catch {
      // Still remove local row; revoke is best-effort.
    }
  }

  await prisma.quickBooksConnection.deleteMany({
    where: { id: SINGLETON_ID },
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    entityType: "QUICKBOOKS",
    entityId: SINGLETON_ID,
    action: "DISCONNECTED",
    payload: row ? { realmId: row.realmId } : undefined,
  });

  revalidatePath("/admin/integrations");
  redirect("/admin/integrations?qb_disconnected=1");
}
