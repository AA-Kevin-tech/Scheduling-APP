import Link from "next/link";
import { requireEmployeeProfile } from "@/lib/auth/guards";
import { listTimeOffForEmployee } from "@/lib/queries/time-off";
import { TimeOffRequestForm } from "@/components/employee/time-off-request-form";
import { CancelTimeOffButton } from "@/components/employee/cancel-time-off-button";

function statusClass(status: string) {
  switch (status) {
    case "PENDING":
      return "bg-amber-50 text-amber-900 border-amber-200";
    case "APPROVED":
      return "bg-emerald-50 text-emerald-900 border-emerald-200";
    case "DENIED":
      return "bg-rose-50 text-rose-900 border-rose-200";
    case "CANCELLED":
      return "bg-slate-100 text-slate-600 border-slate-200";
    default:
      return "bg-slate-50 text-slate-800 border-slate-200";
  }
}

export default async function EmployeeTimeOffPage() {
  const { employeeId } = await requireEmployeeProfile();
  const requests = await listTimeOffForEmployee(employeeId);

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/employee"
          className="text-sm text-sky-700 hover:underline"
        >
          ← Home
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Time off</h1>
        <p className="mt-1 text-sm text-slate-600">
          Request time away. Managers are notified to approve or deny.
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-medium text-slate-800">New request</h2>
        <div className="mt-4">
          <TimeOffRequestForm />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium text-slate-800">Your requests</h2>
        {requests.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No requests yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {requests.map((r) => (
              <li
                key={r.id}
                className={`rounded-lg border px-4 py-3 text-sm ${statusClass(r.status)}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {r.startsAt.toLocaleString()} → {r.endsAt.toLocaleString()}
                    </p>
                    {r.reason ? (
                      <p className="mt-1 text-slate-700">{r.reason}</p>
                    ) : null}
                    <p className="mt-1 text-xs opacity-80">
                      Status: {r.status}
                      {r.decidedAt
                        ? ` · ${r.decidedAt.toLocaleString()}`
                        : ""}
                    </p>
                  </div>
                  {r.status === "PENDING" ? (
                    <CancelTimeOffButton id={r.id} />
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
