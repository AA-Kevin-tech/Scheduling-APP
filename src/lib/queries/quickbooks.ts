import "server-only";

import { prisma } from "@/lib/db";

const SINGLETON_ID = "singleton";

export type QuickBooksIntegrationSummary = {
  realmId: string;
  companyName: string | null;
  connectedAt: Date;
  accessTokenExpiresAt: Date;
  scope: string | null;
};

export async function getQuickBooksIntegrationSummary(): Promise<QuickBooksIntegrationSummary | null> {
  const row = await prisma.quickBooksConnection.findUnique({
    where: { id: SINGLETON_ID },
    select: {
      realmId: true,
      companyName: true,
      connectedAt: true,
      accessTokenExpiresAt: true,
      scope: true,
    },
  });
  return row;
}
