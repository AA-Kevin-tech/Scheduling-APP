"use client";

import { useActionState } from "react";
import type { CompanyHoliday } from "@prisma/client";
import {
  createCompanyHoliday,
  deleteCompanyHoliday,
  updateCompanyHoliday,
} from "@/actions/admin/company-holidays";
import { DeleteResourceForm } from "@/components/admin/delete-resource-form";

function moneyStr(v: { toString(): string } | null | undefined): string {
  if (v == null) return "";
  const n = Number(v.toString());
  return Number.isFinite(n) ? String(n) : "";
}

export function AddCompanyHolidayForm() {
  const [state, formAction, pending] = useActionState(
    createCompanyHoliday,
    null as { ok?: boolean; error?: string } | null,
  );

  return (
    <form
      action={formAction}
      className="mt-6 space-y-3 rounded-lg border border-slate-200 bg-slate-50/80 p-4"
    >
      <h3 className="text-sm font-medium text-slate-800">Add company holiday</h3>
      <div className="flex flex-wrap gap-3">
        <label className="text-xs font-medium text-slate-600">
          <span className="block">Date</span>
          <input
            name="holidayDateYmd"
            type="date"
            required
            className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="min-w-[12rem] flex-1 text-xs font-medium text-slate-600">
          <span className="block">Name</span>
          <input
            name="name"
            required
            placeholder="e.g. Christmas Day"
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs font-medium text-slate-600">
          <span className="block">Work premium ×</span>
          <input
            name="workPremiumMultiplier"
            type="number"
            min={1}
            max={10}
            step={0.01}
            defaultValue={1.5}
            required
            className="mt-1 w-24 rounded-md border border-slate-300 px-2 py-1.5 text-sm tabular-nums"
          />
        </label>
        <label className="text-xs font-medium text-slate-600">
          <span className="block">Paid hours if off</span>
          <input
            name="paidAbsenceHours"
            type="number"
            min={0}
            max={24}
            step={0.25}
            placeholder="—"
            className="mt-1 w-24 rounded-md border border-slate-300 px-2 py-1.5 text-sm tabular-nums"
          />
        </label>
      </div>
      <label className="block text-xs font-medium text-slate-600">
        <span className="block">Notes (optional)</span>
        <input
          name="notes"
          type="text"
          className="mt-1 w-full max-w-xl rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-slate-800 px-3 py-2 text-sm text-white hover:bg-slate-900 disabled:opacity-50"
      >
        {pending ? "…" : "Add holiday"}
      </button>
      {state?.error ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : null}
    </form>
  );
}

export function EditCompanyHolidayForm({ h }: { h: CompanyHoliday }) {
  const [state, formAction, pending] = useActionState(
    updateCompanyHoliday,
    null as { ok?: boolean; error?: string } | null,
  );
  const formId = `edit-company-holiday-${h.id}`;

  return (
    <div className="space-y-2">
      <form id={formId} action={formAction} className="space-y-2">
        <input type="hidden" name="id" value={h.id} />
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs font-medium text-slate-600">
            <span className="block">Date</span>
            <input
              name="holidayDateYmd"
              type="date"
              required
              defaultValue={h.holidayDateYmd}
              className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="min-w-[10rem] flex-1 text-xs font-medium text-slate-600">
            <span className="block">Name</span>
            <input
              name="name"
              required
              defaultValue={h.name}
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-slate-600">
            <span className="block">Premium ×</span>
            <input
              name="workPremiumMultiplier"
              type="number"
              min={1}
              max={10}
              step={0.01}
              required
              defaultValue={moneyStr(h.workPremiumMultiplier) || "1"}
              className="mt-1 w-24 rounded-md border border-slate-300 px-2 py-1.5 text-sm tabular-nums"
            />
          </label>
          <label className="text-xs font-medium text-slate-600">
            <span className="block">Paid if off</span>
            <input
              name="paidAbsenceHours"
              type="number"
              min={0}
              max={24}
              step={0.25}
              placeholder="—"
              defaultValue={moneyStr(h.paidAbsenceHours)}
              className="mt-1 w-24 rounded-md border border-slate-300 px-2 py-1.5 text-sm tabular-nums"
            />
          </label>
        </div>
        <label className="block text-xs font-medium text-slate-600">
          <span className="block">Notes</span>
          <input
            name="notes"
            type="text"
            defaultValue={h.notes ?? ""}
            className="mt-1 w-full max-w-xl rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
      </form>
      <div className="flex flex-wrap items-center gap-3">
        <button
          form={formId}
          type="submit"
          disabled={pending}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
        >
          {pending ? "…" : "Save"}
        </button>
        <DeleteResourceForm
          action={deleteCompanyHoliday}
          id={h.id}
          label="Delete"
        />
      </div>
      {state?.error ? (
        <p className="text-xs text-red-600">{state.error}</p>
      ) : null}
    </div>
  );
}
