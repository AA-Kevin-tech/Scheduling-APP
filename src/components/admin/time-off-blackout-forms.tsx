"use client";

import { useActionState } from "react";
import type { TimeOffBlackout } from "@prisma/client";
import {
  createTimeOffBlackout,
  deleteTimeOffBlackout,
  updateTimeOffBlackout,
} from "@/actions/admin/time-off-blackouts";
import { DeleteResourceForm } from "@/components/admin/delete-resource-form";

export function AddTimeOffBlackoutForm() {
  const [state, formAction, pending] = useActionState(
    createTimeOffBlackout,
    null as { ok?: boolean; error?: string } | null,
  );

  return (
    <form
      action={formAction}
      className="mt-6 space-y-3 rounded-lg border border-slate-200 bg-slate-50/80 p-4"
    >
      <h3 className="text-sm font-medium text-slate-800">Add blackout</h3>
      <div className="flex flex-wrap gap-3">
        <label className="text-xs font-medium text-slate-600">
          <span className="block">From (date)</span>
          <input
            name="startsOnYmd"
            type="date"
            required
            className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs font-medium text-slate-600">
          <span className="block">Through (date)</span>
          <input
            name="endsOnYmd"
            type="date"
            required
            className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="min-w-[12rem] flex-1 text-xs font-medium text-slate-600">
          <span className="block">Label (optional)</span>
          <input
            name="label"
            placeholder="e.g. Peak season"
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
      </div>
      {state?.error ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Add blackout"}
      </button>
    </form>
  );
}

export function EditTimeOffBlackoutForm({ row }: { row: TimeOffBlackout }) {
  const [state, formAction, pending] = useActionState(
    updateTimeOffBlackout,
    null as { ok?: boolean; error?: string } | null,
  );
  const formId = `edit-time-off-blackout-${row.id}`;

  return (
    <div className="pt-4">
      <form
        id={formId}
        action={formAction}
        className="flex flex-wrap items-end gap-3"
      >
        <input type="hidden" name="id" value={row.id} />
        <label className="text-xs font-medium text-slate-600">
          <span className="block">From</span>
          <input
            name="startsOnYmd"
            type="date"
            required
            defaultValue={row.startsOnYmd}
            className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs font-medium text-slate-600">
          <span className="block">Through</span>
          <input
            name="endsOnYmd"
            type="date"
            required
            defaultValue={row.endsOnYmd}
            className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="min-w-[10rem] flex-1 text-xs font-medium text-slate-600">
          <span className="block">Label</span>
          <input
            name="label"
            defaultValue={row.label ?? ""}
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
      </form>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button
          form={formId}
          type="submit"
          disabled={pending}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
        >
          {pending ? "…" : "Save"}
        </button>
        <DeleteResourceForm action={deleteTimeOffBlackout} id={row.id} />
      </div>
      {state?.error ? (
        <p className="mt-2 w-full text-sm text-red-600">{state.error}</p>
      ) : null}
    </div>
  );
}
