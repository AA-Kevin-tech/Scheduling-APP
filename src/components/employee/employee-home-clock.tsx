"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { TerminalDashboard } from "@/lib/queries/time-clock-dashboard";
import {
  employeeAccountClockIn,
  employeeAccountClockOut,
} from "@/actions/time-clock";

function PendingButton({
  label,
  pendingLabel,
  className,
}: {
  label: string;
  pendingLabel: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={
        className ??
        "min-h-[52px] w-full rounded-xl bg-sky-700 px-4 text-base font-medium text-white hover:bg-sky-800 disabled:opacity-60"
      }
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

export function EmployeeHomeClockSection({
  allowWebClock,
  dash,
}: {
  allowWebClock: boolean;
  dash: TerminalDashboard | null;
}) {
  if (!allowWebClock) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-medium text-slate-800">Time clock</h2>
        <p className="mt-2 text-sm text-slate-600">
          Your organization requires clock in and out at the work kiosk using your
          time clock PIN. Use the kiosk or ask a manager if you need help.
        </p>
      </section>
    );
  }

  if (!dash) {
    return null;
  }

  return <EmployeeHomeClockInteractive dash={dash} />;
}

function EmployeeHomeClockInteractive({ dash }: { dash: TerminalDashboard }) {
  const router = useRouter();
  const [clockInState, clockInAction] = useFormState(employeeAccountClockIn, {});
  const [clockOutState, clockOutAction] = useFormState(
    employeeAccountClockOut,
    {},
  );

  useEffect(() => {
    if (!clockInState.ok && !clockOutState.ok) return;
    router.refresh();
  }, [clockInState.ok, clockOutState.ok, router]);

  return (
    <section className="rounded-xl border-2 border-sky-200 bg-sky-50/80 p-4 shadow-sm">
      <h2 className="text-sm font-medium text-sky-950">Time clock</h2>
      <p className="mt-1 text-xs text-sky-900/80">
        Same rules as the kiosk: published shifts in the clock-in window only.
      </p>

      {dash.openPunch ? (
        <div className="mt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-sky-900">
            On shift
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {dash.openPunch.shiftLabel}
          </p>
          <p className="text-sm text-slate-700">{dash.openPunch.departmentName}</p>
          {dash.openPunch.locationName ? (
            <p className="text-xs text-slate-600">{dash.openPunch.locationName}</p>
          ) : null}
          <p className="mt-3 text-sm text-slate-600">
            Clocked in at{" "}
            <time dateTime={dash.openPunch.clockInAt}>
              {new Date(dash.openPunch.clockInAt).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </time>
          </p>

          <form action={clockOutAction} className="mt-4 space-y-3">
            <label htmlFor="employee-home-clockOutNote" className="sr-only">
              Note (optional)
            </label>
            <textarea
              id="employee-home-clockOutNote"
              name="note"
              rows={2}
              placeholder="Optional note for your manager"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
            />
            {clockOutState.error ? (
              <p className="text-sm text-red-700">{clockOutState.error}</p>
            ) : null}
            <PendingButton
              label="Clock out"
              pendingLabel="Clocking out…"
              className="min-h-[56px] w-full rounded-xl bg-slate-900 px-4 text-lg font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            />
          </form>
        </div>
      ) : null}

      {!dash.openPunch && dash.clockInOptions.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">
          No shifts available to clock in right now. Check with your manager if
          this looks wrong.
        </p>
      ) : null}

      {!dash.openPunch && dash.clockInOptions.length > 0 ? (
        <div className="mt-4 space-y-3">
          {dash.clockInOptions.map((opt) => (
            <div
              key={opt.assignmentId}
              className="rounded-xl border border-white/80 bg-white p-3 shadow-sm"
            >
              <form action={clockInAction} className="space-y-3">
                <input type="hidden" name="assignmentId" value={opt.assignmentId} />
                <div>
                  <p className="font-medium text-slate-900">{opt.title}</p>
                  <p className="text-sm text-slate-600">{opt.departmentName}</p>
                  {opt.locationName ? (
                    <p className="text-xs text-slate-500">{opt.locationName}</p>
                  ) : null}
                  <p className="mt-2 text-sm text-slate-700">
                    {opt.startsAtLabel} – {opt.endsAtLabel}
                  </p>
                </div>
                <label htmlFor={`employee-home-note-${opt.assignmentId}`} className="sr-only">
                  Note (optional)
                </label>
                <textarea
                  id={`employee-home-note-${opt.assignmentId}`}
                  name="note"
                  rows={2}
                  placeholder="Optional note"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                />
                <PendingButton label="Clock in" pendingLabel="Clocking in…" />
              </form>
            </div>
          ))}
          {clockInState.error ? (
            <p className="text-sm text-red-700">{clockInState.error}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
