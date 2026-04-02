"use client";

import { useActionState } from "react";
import { createAvailabilitySlot } from "@/actions/availability";

const DAYS = [
  { v: 0, label: "Sunday" },
  { v: 1, label: "Monday" },
  { v: 2, label: "Tuesday" },
  { v: 3, label: "Wednesday" },
  { v: 4, label: "Thursday" },
  { v: 5, label: "Friday" },
  { v: 6, label: "Saturday" },
];

export function AvailabilityAddForm() {
  const [state, formAction, pending] = useActionState(createAvailabilitySlot, {});

  return (
    <form action={formAction} className="mt-3 grid gap-3 sm:grid-cols-4">
      <label className="text-sm">
        <span className="text-slate-600">Day</span>
        <select
          name="dayOfWeek"
          required
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          {DAYS.map((d) => (
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
          className="w-full rounded-md bg-sky-700 py-2 text-sm font-medium text-white hover:bg-sky-800 disabled:opacity-50"
        >
          {pending ? "…" : "Add"}
        </button>
      </div>
    </form>
  );
}
