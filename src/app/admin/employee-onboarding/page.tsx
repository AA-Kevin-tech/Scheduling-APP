import Link from "next/link";
import { auth } from "@/auth";
import { getSchedulingLocationIdsForSession } from "@/lib/auth/location-scope";
import { requireAdmin } from "@/lib/auth/guards";
import { EmployeeOnboardingTrackerTable } from "@/components/admin/employee-onboarding-tracker-table";
import {
  getEmployeeOnboardingInvites,
  mapEmailsToUserIds,
  type OnboardingInviteView,
} from "@/lib/queries/admin-employee-onboarding";
import { firstSearchParam } from "@/lib/search-params";

const VIEW_SET = new Set<string>([
  "all",
  "active",
  "started",
  "invited",
  "completed",
  "expired",
]);

function parseView(raw: string | undefined): OnboardingInviteView {
  if (raw && VIEW_SET.has(raw)) return raw as OnboardingInviteView;
  return "all";
}

export default async function AdminEmployeeOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string | string[] }>;
}) {
  await requireAdmin();
  const session = await auth();
  const venueScope =
    session != null ? await getSchedulingLocationIdsForSession(session) : null;
  const scoped =
    venueScope != null && venueScope.length > 0 ? venueScope : null;

  const raw = await searchParams;
  const view = parseView(firstSearchParam(raw.view));

  const rows = await getEmployeeOnboardingInvites({
    view,
    onlyAtLocations: scoped ?? undefined,
  });
  const completedEmails = rows
    .filter((r) => r.consumedAt)
    .map((r) => r.email);
  const userIdByEmail = await mapEmailsToUserIds(completedEmails);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-zinc-100">
            Employee onboarding
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">
            Track invite links: who was emailed, who opened the form, and who
            finished. Stages update when they load the onboarding page and when
            they submit.
          </p>
          {scoped ? (
            <p className="mt-2 text-sm text-slate-600 dark:text-zinc-400">
              Showing invites that include the selected venue(s). Switch to{" "}
              <span className="font-medium">All venues</span> to see every
              invite.
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link
            href="/admin/users/invite"
            className="text-sky-700 hover:underline"
          >
            Invite by email
          </Link>
          <Link href="/admin/users" className="text-sky-700 hover:underline">
            ← Users
          </Link>
        </div>
      </div>

      <EmployeeOnboardingTrackerTable
        rows={rows}
        basePath="/admin/employee-onboarding"
        activeView={view}
        accountHrefForEmail={(emailLower) => {
          const id = userIdByEmail.get(emailLower);
          return id ? `/admin/users/${id}` : null;
        }}
      />
    </div>
  );
}
