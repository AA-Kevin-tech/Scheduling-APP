import { prisma } from "@/lib/db";
import { userDisplayName } from "@/lib/user-display-name";

export type OnboardingInviteMeta =
  | {
      ok: true;
      email: string;
      inviteDisplayName: string | null;
      defaultFirstName: string | null;
      defaultLastName: string | null;
    }
  | { ok: false; reason: "invalid" | "used" | "expired" };

export async function getOnboardingInviteMeta(
  token: string,
): Promise<OnboardingInviteMeta> {
  const row = await prisma.employeeInvite.findUnique({
    where: { token },
    select: {
      email: true,
      consumedAt: true,
      expiresAt: true,
      firstName: true,
      lastName: true,
    },
  });
  if (!row) return { ok: false, reason: "invalid" };
  if (row.consumedAt) return { ok: false, reason: "used" };
  if (row.expiresAt < new Date()) return { ok: false, reason: "expired" };
  const fn = row.firstName?.trim() ?? "";
  const ln = row.lastName?.trim() ?? "";
  const inviteDisplayName =
    fn || ln
      ? userDisplayName({ firstName: fn, lastName: ln || null })
      : null;
  return {
    ok: true,
    email: row.email,
    inviteDisplayName,
    defaultFirstName: fn || null,
    defaultLastName: ln || null,
  };
}
