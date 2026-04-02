"use client";

import { useActionState } from "react";
import { createLocation } from "@/actions/admin/locations";

export function LocationCreateForm() {
  const [state, formAction, pending] = useActionState(createLocation, null);

  return (
    <form action={formAction} className="mt-4 grid gap-3 sm:grid-cols-2">
      <div>
        <label className="text-xs font-medium text-slate-600">Name</label>
        <input
          name="name"
          required
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="Main building"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-slate-600">Sort order</label>
        <input
          name="sortOrder"
          type="number"
          defaultValue={0}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="sm:col-span-2">
        <label className="text-xs font-medium text-slate-600">
          Address (optional)
        </label>
        <input
          name="address"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      {state?.error ? (
        <p className="sm:col-span-2 text-sm text-red-600">{state.error}</p>
      ) : null}
      {state?.ok ? (
        <p className="sm:col-span-2 text-sm text-emerald-700">Saved.</p>
      ) : null}
      <div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Create"}
        </button>
      </div>
    </form>
  );
}
