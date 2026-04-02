"use client";

import { useActionState, useMemo } from "react";
import { createTimeOffRequest } from "@/actions/time-off";

export function TimeOffRequestForm() {
  const [state, formAction, pending] = useActionState(
    createTimeOffRequest,
    undefined as { error?: string } | undefined,
  );

  const defaultStart = useMemo(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return toLocalDatetimeValue(d);
  }, []);

  const defaultEnd = useMemo(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setDate(d.getDate() + 1);
    d.setHours(17, 0, 0, 0);
    return toLocalDatetimeValue(d);
  }, []);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-slate-600">Starts</span>
          <input
            name="startsAt"
            type="datetime-local"
            required
            defaultValue={defaultStart}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-600">Ends</span>
          <input
            name="endsAt"
            type="datetime-local"
            required
            defaultValue={defaultEnd}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
      </div>
      <label className="block text-sm">
        <span className="text-slate-600">Reason (optional)</span>
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

function toLocalDatetimeValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
