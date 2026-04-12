import Link from "next/link";
import { requireAdminOrManager } from "@/lib/auth/guards";
import { EmployeeOnboardingTrackerTable } from "@/components/admin/employee-onboarding-tracker-table";
import {
  getEmployeeOnboardingInvites,
  mapEmailsToEmployeeIds,
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

export default async function ManagerEmployeeOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string | string[] }>;
}) {
  const session = await requireAdminOrManager();
  const raw = await searchParams;
  const view = parseView(firstSearchParam(raw.view));

  const actorId = session.user.id;
  const isManagerOnly = session.user.role === "MANAGER";

  const rows = await getEmployeeOnboardingInvites({
    view,
    invitedByUserId: isManagerOnly ? actorId : undefined,
  });

  const completedEmails = rows
    .filter((r) => r.consumedAt)
    .map((r) => r.email);
  const employeeIdByEmail = await mapEmailsToEmployeeIds(completedEmails);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-zinc-100">
            Employee onboarding
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">
            {isManagerOnly
              ? "Invites you sent and their progress."
              : "All invites across the organization (you are signed in as admin)."}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link
            href="/manager/employees/invite"
            className="text-sky-700 hover:underline"
          >
            Send invite
          </Link>
          <Link
            href="/manager/employees"
            className="text-sky-700 hover:underline"
          >
            ← Employees
          </Link>
        </div>
      </div>

      <EmployeeOnboardingTrackerTable
        rows={rows}
        basePath="/manager/employees/onboarding"
        activeView={view}
        accountHrefForEmail={(emailLower) => {
          const id = employeeIdByEmail.get(emailLower);
          return id ? `/manager/employees/${id}` : null;
        }}
      />
    </div>
  );
}
