"use client";

import { useActionState } from "react";
import {
  adminCorrectTimePunch,
  adminCreateTimePunch,
} from "@/actions/admin/payroll-corrections";
import type { AdminAssignmentNoPunchRow, AdminPunchRow } from "@/lib/queries/admin-payroll-corrections";

function SubmitRow({ label, pending }: { label: string; pending: boolean }) {
  return (
    <div className="flex flex-wrap items-end gap-3 border-t border-slate-100 pt-3">
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Saving…" : label}
      </button>
    </div>
  );
}

export function AdminCorrectPunchForm({
  row,
  clockInLocal,
  clockOutLocal,
}: {
  row: AdminPunchRow;
  clockInLocal: string;
  clockOutLocal: string;
}) {
  const [state, formAction, pending] = useActionState(adminCorrectTimePunch, null as
    | { ok?: boolean; error?: string }
    | null);

  return (
    <form action={formAction} className="mt-3 space-y-3 rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-sm">
      <input type="hidden" name="punchId" value={row.punchId} />
      <p className="text-xs font-medium text-slate-700 dark:text-zinc-300">Correct punch (audit log)</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-slate-600 dark:text-zinc-400">Clock in</span>
          <input
            name="clockInAt"
            type="datetime-local"
            required
            defaultValue={clockInLocal}
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5"
          />
        </label>
        <label className="block">
          <span className="text-slate-600 dark:text-zinc-400">Clock out (optional — leave empty if still open)</span>
          <input
            name="clockOutAt"
            type="datetime-local"
            defaultValue={clockOutLocal}
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-slate-600 dark:text-zinc-400">Clock-in note</span>
          <input
            name="clockInNote"
            type="text"
            defaultValue={row.clockInNote ?? ""}
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-slate-600 dark:text-zinc-400">Clock-out note</span>
          <input
            name="clockOutNote"
            type="text"
            defaultValue={row.clockOutNote ?? ""}
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-slate-600 dark:text-zinc-400">Reason for correction (required)</span>
          <textarea
            name="correctionReason"
            required
            rows={2}
            minLength={8}
            placeholder="e.g. Employee forgot to clock out; adjusted to actual end time per manager."
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5"
          />
        </label>
      </div>
      {state?.error ? (
        <p className="text-sm text-red-700" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.ok ? (
        <p className="text-sm text-emerald-800">Saved.</p>
      ) : null}
      <SubmitRow label="Save correction" pending={pending} />
    </form>
  );
}

export function AdminCreatePunchForm({
  row,
  defaultClockInLocal,
  defaultClockOutLocal,
}: {
  row: AdminAssignmentNoPunchRow;
  defaultClockInLocal: string;
  defaultClockOutLocal: string;
}) {
  const [state, formAction, pending] = useActionState(adminCreateTimePunch, null as
    | { ok?: boolean; error?: string }
    | null);

  return (
    <form action={formAction} className="mt-2 space-y-3 rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-sm">
      <input type="hidden" name="assignmentId" value={row.assignmentId} />
      <p className="text-xs font-medium text-amber-950">
        Add missing punch (defaults match scheduled shift — adjust as needed)
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-slate-600 dark:text-zinc-400">Clock in</span>
          <input
            name="clockInAt"
            type="datetime-local"
            required
            defaultValue={defaultClockInLocal}
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5"
          />
        </label>
        <label className="block">
          <span className="text-slate-600 dark:text-zinc-400">Clock out</span>
          <input
            name="clockOutAt"
            type="datetime-local"
            defaultValue={defaultClockOutLocal}
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-slate-600 dark:text-zinc-400">Clock-in note</span>
          <input name="clockInNote" type="text" className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5" />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-slate-600 dark:text-zinc-400">Clock-out note</span>
          <input name="clockOutNote" type="text" className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5" />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-slate-600 dark:text-zinc-400">Reason (required)</span>
          <textarea
            name="correctionReason"
            required
            rows={2}
            minLength={8}
            placeholder="e.g. Kiosk was offline; hours confirmed with supervisor."
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5"
          />
        </label>
      </div>
      {state?.error ? (
        <p className="text-sm text-red-700" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.ok ? (
        <p className="text-sm text-emerald-800">Punch created.</p>
      ) : null}
      <SubmitRow label="Create punch" pending={pending} />
    </form>
  );
}
