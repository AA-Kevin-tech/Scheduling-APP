"use client";

import { useActionState } from "react";
import { createDepartment } from "@/actions/admin/departments";

const COLORS = [
  "emerald",
  "amber",
  "violet",
  "teal",
  "rose",
  "slate",
  "sky",
] as const;

type LocationOption = { id: string; name: string; slug: string };

export function DepartmentCreateForm(props: { locations: LocationOption[] }) {
  const [state, formAction, pending] = useActionState(createDepartment, null);

  if (props.locations.length === 0) {
    return (
      <p className="text-sm text-amber-800">
        Add a venue under Admin → Locations before creating departments.
      </p>
    );
  }

  return (
    <form
      action={formAction}
      className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
    >
      <div className="min-w-[10rem] flex-1">
        <label className="text-xs font-medium text-slate-600 dark:text-zinc-400">Venue</label>
        <select
          name="locationId"
          required
          defaultValue={props.locations[0]?.id ?? ""}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          {props.locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </div>
      <div className="min-w-[10rem] flex-1">
        <label className="text-xs font-medium text-slate-600 dark:text-zinc-400">Name</label>
        <input
          name="name"
          required
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="w-36">
        <label className="text-xs font-medium text-slate-600 dark:text-zinc-400">Color</label>
        <select
          name="colorToken"
          defaultValue="slate"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          {COLORS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div className="w-24">
        <label className="text-xs font-medium text-slate-600 dark:text-zinc-400">Order</label>
        <input
          name="sortOrder"
          type="number"
          defaultValue={0}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      {state?.error ? (
        <p className="w-full text-sm text-red-600">{state.error}</p>
      ) : null}
      {state?.ok ? (
        <p className="w-full text-sm text-emerald-700">Created.</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Create"}
      </button>
    </form>
  );
}
