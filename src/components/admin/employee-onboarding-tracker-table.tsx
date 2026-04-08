import Link from "next/link";
import { format } from "date-fns";
import type { EmployeeOnboardingInviteRow } from "@/lib/queries/admin-employee-onboarding";
import {
  deriveInvitePipelineStatus,
  inviteStageLabel,
  pipelineStatusLabel,
} from "@/lib/services/employee-invite-progress";

type Props = {
  rows: EmployeeOnboardingInviteRow[];
  /** Base path for filter tabs, e.g. `/admin/employee-onboarding` */
  basePath: string;
  activeView: string;
  /** When provided, show an "Account" column (admin user or manager employee profile). */
  accountHrefForEmail?: (emailLower: string) => string | null;
};

const VIEWS: { id: string; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "invited", label: "Awaiting open" },
  { id: "started", label: "In progress" },
  { id: "completed", label: "Completed" },
  { id: "expired", label: "Expired" },
];

function badgeClass(status: ReturnType<typeof deriveInvitePipelineStatus>) {
  switch (status) {
    case "completed":
      return "bg-emerald-100 text-emerald-900";
    case "expired":
      return "bg-slate-200 text-slate-700";
    case "in_progress":
      return "bg-amber-100 text-amber-900";
    case "invite_sent":
      return "bg-sky-100 text-sky-900";
    default:
      return "bg-slate-100 text-slate-800";
  }
}

export function EmployeeOnboardingTrackerTable(props: Props) {
  const { rows, basePath, activeView, accountHrefForEmail } = props;
  const showAccountCol = Boolean(accountHrefForEmail);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {VIEWS.map((v) => {
          const href =
            v.id === "all"
              ? basePath
              : `${basePath}?view=${encodeURIComponent(v.id)}`;
          const on = activeView === v.id;
          return (
            <Link
              key={v.id}
              href={href}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                on
                  ? "bg-slate-900 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {v.label}
            </Link>
          );
        })}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Stage</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Invited by</th>
              <th className="px-3 py-2">Sent</th>
              <th className="px-3 py-2">First opened</th>
              <th className="px-3 py-2">Expires</th>
              <th className="px-3 py-2">Finished</th>
              {showAccountCol ? <th className="px-3 py-2">Account</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={showAccountCol ? 9 : 8}
                  className="px-3 py-8 text-center text-slate-500"
                >
                  No invites match this filter.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const pipeline = deriveInvitePipelineStatus(row);
                const accountHref = accountHrefForEmail?.(
                  row.email.toLowerCase(),
                );
                return (
                  <tr
                    key={row.id}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-3 py-2 font-medium text-slate-900">
                      <span className="block">{row.email}</span>
                      {row.employeeNumber ? (
                        <span className="text-xs font-normal text-slate-500">
                          #{row.employeeNumber}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {inviteStageLabel(row.stage)}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass(pipeline)}`}
                      >
                        {pipelineStatusLabel(pipeline)}
                      </span>
                    </td>
                    <td className="max-w-[10rem] truncate px-3 py-2 text-slate-600">
                      {row.invitedBy.name ?? row.invitedBy.email}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                      {format(row.createdAt, "MMM d, yyyy h:mm a")}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                      {row.startedAt
                        ? format(row.startedAt, "MMM d, yyyy h:mm a")
                        : "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                      {format(row.expiresAt, "MMM d, yyyy h:mm a")}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                      {row.consumedAt
                        ? format(row.consumedAt, "MMM d, yyyy h:mm a")
                        : "—"}
                    </td>
                    {showAccountCol ? (
                      <td className="px-3 py-2">
                        {accountHref ? (
                          <Link
                            href={accountHref}
                            className="text-sky-700 hover:underline"
                          >
                            Open
                          </Link>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    ) : null}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
