"use client";

import { useTransition } from "react";
import { setSchedulingActiveVenue } from "@/actions/scheduling-venue";
import type { VenueSwitcherPayload } from "@/lib/auth/location-scope";

type Props = {
  /** From `getVenueSwitcherPayload` */
  payload: VenueSwitcherPayload;
  /** Optional label for accessibility / layout */
  label?: string;
  compact?: boolean;
};

export function VenueScopeSwitcher({
  payload,
  label = "Venue",
  compact,
}: Props) {
  const [pending, startTransition] = useTransition();
  const items = [
    { id: "__all__" as const, name: "All venues" },
    ...payload.locations.map((l) => ({ id: l.id, name: l.name })),
  ];

  function pick(next: "__all__" | string) {
    startTransition(async () => {
      await setSchedulingActiveVenue(next);
    });
  }

  if (compact) {
    return (
      <label className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        <select
          className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 disabled:opacity-60"
          value={payload.selected}
          disabled={pending}
          onChange={(e) =>
            pick(e.target.value === "__all__" ? "__all__" : e.target.value)
          }
        >
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <div
        role="tablist"
        aria-label={label}
        className="flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-100/80 p-1"
      >
        {items.map((item) => {
          const on = payload.selected === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={on}
              disabled={pending}
              onClick={() => pick(item.id)}
              className={
                on
                  ? "rounded-md bg-white px-3 py-1.5 text-sm font-medium text-sky-900 shadow-sm"
                  : "rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-white/70"
              }
            >
              {item.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
