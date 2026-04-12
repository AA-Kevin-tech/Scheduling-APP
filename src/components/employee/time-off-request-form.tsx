"use client";

import { useActionState } from "react";
import { createTimeOffRequest } from "@/actions/time-off";

export function TimeOffRequestForm({
  defaultStart,
  defaultEnd,
  minDatetimeLocal,
}: {
  defaultStart: string;
  defaultEnd: string;
  minDatetimeLocal: string;
}) {
  const [state, formAction, pending] = useActionState(
    createTimeOffRequest,
    undefined as { error?: string } | undefined,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-slate-600 dark:text-zinc-400">Starts</span>
          <input
            name="startsAt"
            type="datetime-local"
            required
            min={minDatetimeLocal}
            defaultValue={defaultStart}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-600 dark:text-zinc-400">Ends</span>
          <input
            name="endsAt"
            type="datetime-local"
            required
            min={minDatetimeLocal}
            defaultValue={defaultEnd}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
      </div>
      <label className="block text-sm">
        <span className="text-slate-600 dark:text-zinc-400">Reason (optional)</span>
        <textarea
          name="reason"
          rows={2}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="e.g. appointment, travel…"
        />
      </label>
      {state?.error ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800 disabled:opacity-50"
      >
        {pending ? "Submitting…" : "Submit request"}
      </button>
    </form>
  );
}
