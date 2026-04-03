"use client";

import { useActionState } from "react";
import { updateAvailabilitySlot } from "@/actions/availability";

const DAYS = [
  { v: 0, label: "Sunday" },
  { v: 1, label: "Monday" },
  { v: 2, label: "Tuesday" },
  { v: 3, label: "Wednesday" },
  { v: 4, label: "Thursday" },
  { v: 5, label: "Friday" },
  { v: 6, label: "Saturday" },
];

export function AvailabilitySlotForm({
  id,
  dayOfWeek,
  startsAt,
  endsAt,
}: {
  id: string;
  dayOfWeek: number;
  startsAt: string;
  endsAt: string;
}) {
  const [state, formAction, pending] = useActionState(updateAvailabilitySlot, {});

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="id" value={id} />
      <label className="text-xs text-slate-600">
        Day
        <select
          name="dayOfWeek"
          defaultValue={dayOfWeek}
          className="mt-0.5 block rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        >
          {DAYS.map((d) => (
            <option key={d.v} value={d.v}>
              {d.label}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs text-slate-600">
        From
        <input
          name="startsAt"
          type="time"
          required
          defaultValue={startsAt}
          className="mt-0.5 block rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />
      </label>
      <label className="text-xs text-slate-600">
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
          className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-200 disabled:opacity-50"
        >
          {pending ? "…" : "Save"}
        </button>
      </div>
    </form>
  );
}
