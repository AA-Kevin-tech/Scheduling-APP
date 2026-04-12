import Link from "next/link";
import { requireEmployeeProfile } from "@/lib/auth/guards";
import { listTimeOffForEmployee } from "@/lib/queries/time-off";
import { TimeOffRequestForm } from "@/components/employee/time-off-request-form";
import { CancelTimeOffButton } from "@/components/employee/cancel-time-off-button";
import { getDefaultScheduleTimezone } from "@/lib/schedule/tz";
import { prisma } from "@/lib/db";
import {
  defaultTimeOffDraftDatetimeLocals,
  leadTimeBlockLastYmd,
  TIME_OFF_BLOCKED_DAYS_AFTER_TODAY,
} from "@/lib/services/time-off-rules";

function statusClass(status: string) {
  switch (status) {
    case "PENDING":
      return "bg-amber-50 text-amber-900 border-amber-200";
    case "APPROVED":
      return "bg-emerald-50 text-emerald-900 border-emerald-200";
    case "DENIED":
      return "bg-rose-50 text-rose-900 border-rose-200";
    case "CANCELLED":
      return "bg-slate-100 text-slate-600 dark:text-zinc-400 border-slate-200";
    default:
      return "bg-slate-50 text-slate-800 dark:text-zinc-200 border-slate-200";
  }
}

export default async function EmployeeTimeOffPage() {
  const { employeeId } = await requireEmployeeProfile();
  const [requests, blackouts, scheduleTz] = await Promise.all([
    listTimeOffForEmployee(employeeId),
    prisma.timeOffBlackout.findMany({
      orderBy: [{ startsOnYmd: "asc" }, { endsOnYmd: "asc" }],
    }),
    Promise.resolve(getDefaultScheduleTimezone()),
  ]);

  const now = new Date();
  const draft = defaultTimeOffDraftDatetimeLocals(now, scheduleTz);
  const blockedThrough = leadTimeBlockLastYmd(now, scheduleTz);

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/employee"
          className="text-sm text-sky-700 hover:underline"
        >
          ← Home
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-zinc-100">Time off</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">
          Request time away. Managers are notified to approve or deny. You
          cannot request time off on today through{" "}
          <span className="font-medium tabular-nums">{blockedThrough}</span>{" "}
          inclusive (today plus the next {TIME_OFF_BLOCKED_DAYS_AFTER_TODAY}{" "}
          calendar days in {scheduleTz}, same as the form). The earliest dates
          you can choose begin the day after that. Times are interpreted in that
          timezone.
        </p>
        {blackouts.length > 0 ? (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-sm text-amber-950">
            <p className="font-medium">Blackout dates (requests not allowed)</p>
            <ul className="mt-1 list-inside list-disc text-amber-900/90">
              {blackouts.map((b) => (
                <li key={b.id}>
                  {b.startsOnYmd === b.endsOnYmd
                    ? b.startsOnYmd
                    : `${b.startsOnYmd} → ${b.endsOnYmd}`}
                  {b.label ? ` — ${b.label}` : ""}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <section className="surface-card p-4">
        <h2 className="text-sm font-medium text-slate-800 dark:text-zinc-200">New request</h2>
        <div className="mt-4">
          <TimeOffRequestForm
            defaultStart={draft.start}
            defaultEnd={draft.end}
            minDatetimeLocal={draft.min}
          />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium text-slate-800 dark:text-zinc-200">Your requests</h2>
        {requests.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500 dark:text-zinc-500">No requests yet.</p>
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
                      <p className="mt-1 text-slate-700 dark:text-zinc-300">{r.reason}</p>
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
