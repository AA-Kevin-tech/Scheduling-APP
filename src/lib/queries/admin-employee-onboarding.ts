import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export type OnboardingInviteView =
  | "all"
  | "active"
  | "started"
  | "invited"
  | "completed"
  | "expired";

const includeInvitedBy = {
  invitedBy: { select: { id: true, name: true, email: true } },
} satisfies Prisma.EmployeeInviteInclude;

export type EmployeeOnboardingInviteRow = Prisma.EmployeeInviteGetPayload<{
  include: typeof includeInvitedBy;
}>;

export async function getEmployeeOnboardingInvites(opts: {
  view: OnboardingInviteView;
  /** If set (e.g. manager), only invites this user sent. */
  invitedByUserId?: string;
  /** When non-null and non-empty, only invites that include at least one of these venue ids. */
  onlyAtLocations?: string[] | null;
  take?: number;
}): Promise<EmployeeOnboardingInviteRow[]> {
  const now = new Date();
  const take = opts.take ?? 300;
  const base: Prisma.EmployeeInviteWhereInput = opts.invitedByUserId
    ? { invitedById: opts.invitedByUserId }
    : {};

  let where: Prisma.EmployeeInviteWhereInput = base;

  switch (opts.view) {
    case "completed":
      where = { ...base, consumedAt: { not: null } };
      break;
    case "expired":
      where = { ...base, consumedAt: null, expiresAt: { lt: now } };
      break;
    case "active":
      where = { ...base, consumedAt: null, expiresAt: { gte: now } };
      break;
    case "started":
      where = {
        ...base,
        consumedAt: null,
        expiresAt: { gte: now },
        stage: "STARTED",
      };
      break;
    case "invited":
      where = {
        ...base,
        consumedAt: null,
        expiresAt: { gte: now },
        stage: "INVITED",
      };
      break;
    default:
      break;
  }

  const scope = opts.onlyAtLocations;
  if (scope != null && scope.length > 0) {
    where = { AND: [where, { locationIds: { hasSome: scope } }] };
  }

  const orderBy: Prisma.EmployeeInviteOrderByWithRelationInput =
    opts.view === "completed"
      ? { consumedAt: "desc" }
      : { createdAt: "desc" };

  return prisma.employeeInvite.findMany({
    where,
    include: includeInvitedBy,
    orderBy,
    take,
  });
}

export async function mapEmailsToUserIds(
  emails: string[],
): Promise<Map<string, string>> {
  const lower = [...new Set(emails.map((e) => e.toLowerCase().trim()))];
  if (lower.length === 0) return new Map();
  const users = await prisma.user.findMany({
    where: { email: { in: lower } },
    select: { id: true, email: true },
  });
  return new Map(users.map((u) => [u.email.toLowerCase(), u.id]));
}

export async function mapEmailsToEmployeeIds(
  emails: string[],
): Promise<Map<string, string>> {
  const lower = [...new Set(emails.map((e) => e.toLowerCase().trim()))];
  if (lower.length === 0) return new Map();
  const rows = await prisma.employee.findMany({
    where: { user: { email: { in: lower } } },
    select: { id: true, user: { select: { email: true } } },
  });
  return new Map(
    rows.map((r) => [r.user.email.toLowerCase(), r.id]),
  );
}
