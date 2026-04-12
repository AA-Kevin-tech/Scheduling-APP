import { formatInTimeZone } from "date-fns-tz";
import {
  formatShiftRange,
  type MissingClockInRow,
  type MissedShiftNoPunchRow,
  type OpenPunchPastEndRow,
} from "@/lib/queries/time-clock-issues";
import { getDefaultScheduleTimezone } from "@/lib/schedule/tz";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="surface-card p-4">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">{title}</h2>
      <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">{description}</p>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function TimeClockIssuesPanel({
  openPastEnd,
  missingClockIn,
  missedNoPunch,
}: {
  openPastEnd: OpenPunchPastEndRow[];
  missingClockIn: MissingClockInRow[];
  missedNoPunch: MissedShiftNoPunchRow[];
}) {
  const tz = getDefaultScheduleTimezone();

  return (
    <div className="space-y-6">
      <Section
        title="Still clocked in after shift ended"
        description="Employee has an open punch but the scheduled shift has already ended. They should clock out at the kiosk."
      >
        {openPastEnd.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-zinc-500">None right now.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {openPastEnd.map((r) => (
              <li key={r.punchId} className="py-3 first:pt-0">
                <p className="font-medium text-slate-900 dark:text-zinc-100">{r.employeeLabel}</p>
                <p className="text-xs text-slate-500 dark:text-zinc-500">{r.departmentName}</p>
                <p className="mt-1 text-slate-600 dark:text-zinc-400">
                  Shift {formatShiftRange(r.shiftStartsAt, r.shiftEndsAt, tz)}
                </p>
                <p className="mt-1 text-xs text-amber-700">
                  Clocked in at{" "}
                  {formatInTimeZone(r.clockInAt, tz, "h:mm a")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        title="No clock-in yet (shift in progress)"
        description="Shift started and the grace window passed, but there is no punch on record."
      >
        {missingClockIn.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-zinc-500">None right now.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {missingClockIn.map((r) => (
              <li key={r.assignmentId} className="py-3 first:pt-0">
                <p className="font-medium text-slate-900 dark:text-zinc-100">{r.employeeLabel}</p>
                <p className="text-xs text-slate-500 dark:text-zinc-500">{r.departmentName}</p>
                <p className="mt-1 text-slate-600 dark:text-zinc-400">
                  {formatShiftRange(r.shiftStartsAt, r.shiftEndsAt, tz)}
                </p>
                <p className="mt-1 text-xs text-amber-700">
                  {r.minutesSinceStart} min since scheduled start
                </p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        title="Shift ended — no punch"
        description="Payroll-relevant: the shift is over and there is no time punch for this assignment."
      >
        {missedNoPunch.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-zinc-500">None in the recent window.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {missedNoPunch.map((r) => (
              <li key={r.assignmentId} className="py-3 first:pt-0">
                <p className="font-medium text-slate-900 dark:text-zinc-100">{r.employeeLabel}</p>
                <p className="text-xs text-slate-500 dark:text-zinc-500">{r.departmentName}</p>
                <p className="mt-1 text-slate-600 dark:text-zinc-400">
                  {formatShiftRange(r.shiftStartsAt, r.shiftEndsAt, tz)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
