import { prisma } from "@/lib/db";

export type OnboardingInviteMeta =
  | { ok: true; email: string }
  | { ok: false; reason: "invalid" | "used" | "expired" };

export async function getOnboardingInviteMeta(
  token: string,
): Promise<OnboardingInviteMeta> {
  const row = await prisma.employeeInvite.findUnique({
    where: { token },
    select: { email: true, consumedAt: true, expiresAt: true },
  });
  if (!row) return { ok: false, reason: "invalid" };
  if (row.consumedAt) return { ok: false, reason: "used" };
  if (row.expiresAt < new Date()) return { ok: false, reason: "expired" };
  return { ok: true, email: row.email };
}
