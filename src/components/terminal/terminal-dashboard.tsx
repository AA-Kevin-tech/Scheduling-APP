"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { TerminalDashboard } from "@/lib/queries/time-clock-dashboard";
import {
  terminalClockIn,
  terminalClockOut,
  terminalSignOut,
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

const KIOSK_RESET_SECONDS = 20;

export function TerminalDashboardView({ dash }: { dash: TerminalDashboard }) {
  const router = useRouter();
  const [clockInState, clockInAction] = useFormState(terminalClockIn, {});
  const [clockOutState, clockOutAction] = useFormState(terminalClockOut, {});
  const [resetCountdown, setResetCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (!clockInState.ok && !clockOutState.ok) return;

    router.refresh();
    setResetCountdown(KIOSK_RESET_SECONDS);

    const intervalId = window.setInterval(() => {
      setResetCountdown((s) =>
        s === null ? null : s <= 1 ? 0 : s - 1,
      );
    }, 1000);

    const signOutId = window.setTimeout(() => {
      void terminalSignOut();
    }, KIOSK_RESET_SECONDS * 1000);

    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(signOutId);
    };
  }, [clockInState.ok, clockOutState.ok, router]);

  return (
    <div className="mx-auto max-w-lg space-y-8">
      {resetCountdown !== null && resetCountdown > 0 ? (
        <div
          className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-center text-sm text-sky-950"
          role="status"
        >
          Returning to PIN entry in{" "}
          <span className="font-semibold tabular-nums">{resetCountdown}</span>s
          for the next person.
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <p className="text-sm text-slate-500">Signed in</p>
          <p className="text-xl font-semibold text-slate-900">{dash.displayName}</p>
        </div>
        <form action={terminalSignOut}>
          <button
            type="submit"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Sign out
          </button>
        </form>
      </div>

      {dash.openPunch ? (
        <section className="rounded-2xl border-2 border-sky-200 bg-sky-50 p-6 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-wide text-sky-900">
            On shift
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">
            {dash.openPunch.shiftLabel}
          </h2>
          <p className="mt-1 text-slate-700">{dash.openPunch.departmentName}</p>
          {dash.openPunch.locationName ? (
            <p className="text-sm text-slate-600">{dash.openPunch.locationName}</p>
          ) : null}
          <p className="mt-4 text-sm text-slate-600">
            Clocked in at{" "}
            <time dateTime={dash.openPunch.clockInAt}>
              {new Date(dash.openPunch.clockInAt).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </time>
          </p>

          <form action={clockOutAction} className="mt-6 space-y-3">
            <label htmlFor="clockOutNote" className="sr-only">
              Note (optional)
            </label>
            <textarea
              id="clockOutNote"
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
        </section>
      ) : null}

      {!dash.openPunch && dash.clockInOptions.length === 0 ? (
        <p className="text-center text-slate-600">
          No shifts available to clock in right now. Check with your manager if
          this looks wrong.
        </p>
      ) : null}

      {!dash.openPunch && dash.clockInOptions.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Clock in</h2>
          <ul className="space-y-3">
            {dash.clockInOptions.map((opt) => (
              <li
                key={opt.assignmentId}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
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
                  <label htmlFor={`note-${opt.assignmentId}`} className="sr-only">
                    Note (optional)
                  </label>
                  <textarea
                    id={`note-${opt.assignmentId}`}
                    name="note"
                    rows={2}
                    placeholder="Optional note"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                  />
                  <PendingButton label="Clock in" pendingLabel="Clocking in…" />
                </form>
              </li>
            ))}
          </ul>
          {clockInState.error ? (
            <p className="text-sm text-red-700">{clockInState.error}</p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
