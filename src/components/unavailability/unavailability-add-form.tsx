"use client";

import { useActionState } from "react";
import { DAYS_OF_WEEK_OPTIONS } from "./days-of-week";

export function UnavailabilityAddForm({
  createSlot,
  children,
}: {
  createSlot: (
    _prev: { error?: string } | undefined,
    formData: FormData,
  ) => Promise<{ error?: string }>;
  children?: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(createSlot, {});

  return (
    <form action={formAction} className="mt-3">
      {children}
      <div className="grid gap-3 sm:grid-cols-4">
      <label className="text-sm">
        <span className="text-slate-600">Day</span>
        <select
          name="dayOfWeek"
          required
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          {DAYS_OF_WEEK_OPTIONS.map((d) => (
            <option key={d.v} value={d.v}>
              {d.label}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        <span className="text-slate-600">From</span>
        <input
          name="startsAt"
          type="time"
          required
          defaultValue="09:00"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </label>
      <label className="text-sm">
        <span className="text-slate-600">To</span>
        <input
          name="endsAt"
          type="time"
          required
          defaultValue="17:00"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </label>
      <div className="flex flex-col justify-end gap-1">
        {state.error && (
          <p className="text-xs text-red-600" role="alert">
            {state.error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-sky-700 px-3 py-2 text-sm font-medium text-white hover:bg-sky-800 disabled:opacity-50"
        >
          {pending ? "Adding…" : "Add"}
        </button>
      </div>
      </div>
    </form>
  );
}
