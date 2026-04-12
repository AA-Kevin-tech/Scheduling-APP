"use client";

import { useActionState } from "react";
import type { Location } from "@prisma/client";
import {
  deleteLocation,
  updateLocation,
} from "@/actions/admin/locations";
import { DeleteResourceForm } from "@/components/admin/delete-resource-form";

export function LocationEditForm({ loc }: { loc: Location }) {
  const [state, formAction, pending] = useActionState(updateLocation, null);

  return (
    <li className="surface-card p-4">
      <form
        action={formAction}
        className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
      >
        <input type="hidden" name="id" value={loc.id} />
        <div className="min-w-[10rem] flex-1">
          <label className="text-xs font-medium text-slate-600 dark:text-zinc-400">Name</label>
          <input
            name="name"
            defaultValue={loc.name}
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="min-w-[12rem] flex-[2]">
          <label className="text-xs font-medium text-slate-600 dark:text-zinc-400">Address</label>
          <input
            name="address"
            defaultValue={loc.address ?? ""}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="w-24">
          <label className="text-xs font-medium text-slate-600 dark:text-zinc-400">Order</label>
          <input
            name="sortOrder"
            type="number"
            defaultValue={loc.sortOrder}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 dark:text-zinc-200 hover:bg-slate-50 disabled:opacity-50"
        >
          {pending ? "…" : "Save"}
        </button>
      </form>
      {state?.error ? (
        <p className="mt-2 text-sm text-red-600">{state.error}</p>
      ) : null}
      <div className="mt-3 border-t border-slate-100 pt-3">
        <DeleteResourceForm action={deleteLocation} id={loc.id} />
      </div>
    </li>
  );
}
