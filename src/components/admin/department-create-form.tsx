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

export function DepartmentCreateForm() {
  const [state, formAction, pending] = useActionState(createDepartment, null);

  return (
    <form
      action={formAction}
      className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
    >
      <div className="min-w-[10rem] flex-1">
        <label className="text-xs font-medium text-slate-600">Name</label>
        <input
          name="name"
          required
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="w-36">
        <label className="text-xs font-medium text-slate-600">Color</label>
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
        <label className="text-xs font-medium text-slate-600">Order</label>
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
