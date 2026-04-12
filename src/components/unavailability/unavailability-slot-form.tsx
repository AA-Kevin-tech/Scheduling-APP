"use client";

import { useActionState } from "react";
import { DAYS_OF_WEEK_OPTIONS } from "./days-of-week";

export function UnavailabilitySlotForm({
  id,
  dayOfWeek,
  startsAt,
  endsAt,
  updateSlot,
  children,
}: {
  id: string;
  dayOfWeek: number;
  startsAt: string;
  endsAt: string;
  updateSlot: (
    _prev: { error?: string } | undefined,
    formData: FormData,
  ) => Promise<{ error?: string }>;
  children?: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(updateSlot, {});

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      {children}
      <input type="hidden" name="id" value={id} />
      <label className="text-xs text-slate-600 dark:text-zinc-400">
        Day
        <select
          name="dayOfWeek"
          defaultValue={dayOfWeek}
          className="mt-0.5 block rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        >
          {DAYS_OF_WEEK_OPTIONS.map((d) => (
            <option key={d.v} value={d.v}>
              {d.label}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs text-slate-600 dark:text-zinc-400">
        From
        <input
          name="startsAt"
          type="time"
          required
          defaultValue={startsAt}
          className="mt-0.5 block rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />
      </label>
      <label className="text-xs text-slate-600 dark:text-zinc-400">
        To
        <input
          name="endsAt"
          type="time"
          required
          defaultValue={endsAt}
          className="mt-0.5 block rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />
      </label>
      <div className="flex flex-col gap-1">
        {state.error ? (
          <p className="text-xs text-red-600" role="alert">
            {state.error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-zinc-200 hover:bg-slate-200 disabled:opacity-50"
        >
          {pending ? "…" : "Save"}
        </button>
      </div>
    </form>
  );
}
