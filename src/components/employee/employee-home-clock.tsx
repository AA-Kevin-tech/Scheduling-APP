"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { TerminalDashboard } from "@/lib/queries/time-clock-dashboard";
import {
  employeeAccountClockIn,
  employeeAccountClockOut,
} from "@/actions/time-clock";

function getGeoPosition(): Promise<{ lat: number; lng: number } | null> {
  if (typeof window === "undefined" || !navigator.geolocation) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 },
    );
  });
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
      <section className="surface-card p-4">
        <h2 className="text-sm font-medium text-slate-800 dark:text-zinc-200">Time clock</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-zinc-400">
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
  const [pending, setPending] = useState(false);
  const [clockInError, setClockInError] = useState<string | null>(null);
  const [clockOutError, setClockOutError] = useState<string | null>(null);

  async function runClockIn(form: HTMLFormElement) {
    setClockInError(null);
    setPending(true);
    try {
      const fd = new FormData(form);
      const pos = await getGeoPosition();
      if (pos) {
        fd.set("latitude", String(pos.lat));
        fd.set("longitude", String(pos.lng));
      }
      const r = await employeeAccountClockIn(undefined, fd);
      if (r?.error) {
        setClockInError(r.error);
        return;
      }
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function runClockOut(form: HTMLFormElement, ev: React.FormEvent<HTMLFormElement>) {
    setClockOutError(null);
    setPending(true);
    try {
      const fd = new FormData(form);
      const submitter = (ev.nativeEvent as SubmitEvent).submitter;
      if (
        submitter instanceof HTMLButtonElement &&
        submitter.name === "lunchBreak" &&
        submitter.value === "1"
      ) {
        fd.set("lunchBreak", "1");
      }
      const pos = await getGeoPosition();
      if (pos) {
        fd.set("latitude", String(pos.lat));
        fd.set("longitude", String(pos.lng));
      }
      const r = await employeeAccountClockOut(undefined, fd);
      if (r?.error) {
        setClockOutError(r.error);
        return;
      }
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-xl border-2 border-sky-200 bg-sky-50/80 p-4 shadow-sm">
      <h2 className="text-sm font-medium text-sky-950">Time clock</h2>
      <p className="mt-1 text-xs text-sky-900/80">
        Same rules as the kiosk: published shifts in the clock-in window only.
        If your site uses a geofence, allow location when prompted.
      </p>

      {dash.openPunch ? (
        <div className="mt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-sky-900">
            On shift
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-zinc-100">
            {dash.openPunch.shiftLabel}
          </p>
          <p className="text-sm text-slate-700 dark:text-zinc-300">{dash.openPunch.departmentName}</p>
          {dash.openPunch.locationName ? (
            <p className="text-xs text-slate-600 dark:text-zinc-400">{dash.openPunch.locationName}</p>
          ) : null}
          <p className="mt-3 text-sm text-slate-600 dark:text-zinc-400">
            Clocked in at{" "}
            <time dateTime={dash.openPunch.clockInAt}>
              {new Date(dash.openPunch.clockInAt).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </time>
          </p>

          <form
            className="mt-4 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void runClockOut(e.currentTarget, e);
            }}
          >
            <label htmlFor="employee-home-clockOutNote" className="sr-only">
              Note (optional)
            </label>
            <textarea
              id="employee-home-clockOutNote"
              name="note"
              rows={2}
              placeholder="Optional note for your manager"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:text-zinc-100 placeholder:text-slate-400"
            />
            {clockOutError ? (
              <p className="text-sm text-red-700">{clockOutError}</p>
            ) : null}
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="submit"
                name="lunchBreak"
                value="1"
                disabled={pending}
                className="min-h-[52px] flex-1 rounded-xl border-2 border-amber-400 bg-amber-50 px-4 text-base font-semibold text-amber-950 hover:bg-amber-100 disabled:opacity-60"
              >
                {pending ? "Starting lunch…" : "Start lunch break"}
              </button>
              <button
                type="submit"
                disabled={pending}
                className="min-h-[56px] flex-1 rounded-xl bg-slate-900 px-4 text-lg font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {pending ? "Clocking out…" : "Clock out"}
              </button>
            </div>
            <p className="text-xs text-sky-900/80">
              Lunch break ends your current clocked-in segment. When you return, use{" "}
              <span className="font-medium">End lunch break</span> below if shown.
            </p>
          </form>
        </div>
      ) : null}

      {!dash.openPunch && dash.clockInOptions.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600 dark:text-zinc-400">
          No shifts available to clock in right now. Check with your manager if
          this looks wrong.
        </p>
      ) : null}

      {!dash.openPunch && dash.resumeLunchBreak ? (
        <div className="mt-4 rounded-xl border-2 border-amber-300 bg-amber-50/90 p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-950">Lunch break</p>
          <p className="mt-2 font-medium text-slate-900 dark:text-zinc-100">
            {dash.resumeLunchBreak.title}
          </p>
          <p className="text-sm text-slate-600 dark:text-zinc-400">
            {dash.resumeLunchBreak.departmentName}
          </p>
          {dash.resumeLunchBreak.locationName ? (
            <p className="text-xs text-slate-500 dark:text-zinc-500">{dash.resumeLunchBreak.locationName}</p>
          ) : null}
          <p className="mt-2 text-sm text-slate-700 dark:text-zinc-300">
            {dash.resumeLunchBreak.startsAtLabel} – {dash.resumeLunchBreak.endsAtLabel}
          </p>
          <form
            className="mt-4 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void runClockIn(e.currentTarget);
            }}
          >
            <input type="hidden" name="assignmentId" value={dash.resumeLunchBreak.assignmentId} />
            <label htmlFor="employee-home-resume-lunch-note" className="sr-only">
              Note (optional)
            </label>
            <textarea
              id="employee-home-resume-lunch-note"
              name="note"
              rows={2}
              placeholder="Optional note"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:text-zinc-100 placeholder:text-slate-400"
            />
            {clockInError ? (
              <p className="text-sm text-red-700">{clockInError}</p>
            ) : null}
            <button
              type="submit"
              disabled={pending}
              className="min-h-[52px] w-full rounded-xl bg-sky-700 px-4 text-base font-semibold text-white hover:bg-sky-800 disabled:opacity-60"
            >
              {pending ? "Clocking in…" : "End lunch break"}
            </button>
          </form>
        </div>
      ) : null}

      {!dash.openPunch &&
      dash.clockInOptions.length > 0 &&
      (!dash.resumeLunchBreak ||
        dash.clockInOptions.some(
          (o) => o.assignmentId !== dash.resumeLunchBreak?.assignmentId,
        )) ? (
        <div className="mt-4 space-y-3">
          {dash.clockInOptions
            .filter(
              (opt) =>
                !dash.resumeLunchBreak ||
                opt.assignmentId !== dash.resumeLunchBreak.assignmentId,
            )
            .map((opt) => (
              <div
                key={opt.assignmentId}
                className="rounded-xl border border-white/80 bg-white p-3 shadow-sm"
              >
                <form
                  className="space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void runClockIn(e.currentTarget);
                  }}
                >
                  <input type="hidden" name="assignmentId" value={opt.assignmentId} />
                  <div>
                    <p className="font-medium text-slate-900 dark:text-zinc-100">{opt.title}</p>
                    <p className="text-sm text-slate-600 dark:text-zinc-400">{opt.departmentName}</p>
                    {opt.locationName ? (
                      <p className="text-xs text-slate-500 dark:text-zinc-500">{opt.locationName}</p>
                    ) : null}
                    <p className="mt-2 text-sm text-slate-700 dark:text-zinc-300">
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
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 dark:text-zinc-100 placeholder:text-slate-400"
                  />
                  <button
                    type="submit"
                    disabled={pending}
                    className="min-h-[52px] w-full rounded-xl bg-sky-700 px-4 text-base font-medium text-white hover:bg-sky-800 disabled:opacity-60"
                  >
                    {pending ? "Clocking in…" : "Clock in"}
                  </button>
                </form>
              </div>
            ))}
          {clockInError && !dash.resumeLunchBreak ? (
            <p className="text-sm text-red-700">{clockInError}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
