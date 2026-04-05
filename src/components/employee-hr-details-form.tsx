"use client";

import { useActionState } from "react";
import type { EmploymentType } from "@prisma/client";
import { updateEmployeeHrDetails } from "@/actions/employee-hr-details";

function rateInputValue(rate: { toString(): string } | null | undefined): string {
  if (rate == null) return "";
  const n = Number(rate.toString());
  return Number.isFinite(n) ? String(n) : "";
}

export function EmployeeHrDetailsForm({
  employeeId,
  initialManagerNotes,
  initialHourlyRate,
  initialEmploymentType,
  adminUserIdForRevalidate,
}: {
  employeeId: string;
  initialManagerNotes: string | null;
  initialHourlyRate: { toString(): string } | null | undefined;
  initialEmploymentType: EmploymentType;
  adminUserIdForRevalidate?: string;
}) {
  const [state, formAction, pending] = useActionState(
    updateEmployeeHrDetails,
    {} as { ok?: boolean; error?: string },
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="employeeId" value={employeeId} />
      {adminUserIdForRevalidate ? (
        <input
          type="hidden"
          name="adminUserIdForRevalidate"
          value={adminUserIdForRevalidate}
        />
      ) : null}

      <label className="block text-sm">
        <span className="text-slate-600">Manager notes</span>
        <textarea
          name="managerNotes"
          rows={4}
          defaultValue={initialManagerNotes ?? ""}
          placeholder="Private notes — not visible to the employee"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-slate-600">Hourly rate (USD)</span>
          <input
            name="hourlyRate"
            type="number"
            min={0}
            step={0.01}
            placeholder="—"
            defaultValue={rateInputValue(initialHourlyRate)}
            className="mt-1 w-full min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-base"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-600">Employment</span>
          <select
            name="employmentType"
            defaultValue={initialEmploymentType}
            className="mt-1 w-full min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-base"
          >
            <option value="FULL_TIME">Full time</option>
            <option value="PART_TIME">Part time</option>
          </select>
        </label>
      </div>

      {state?.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
      {state?.ok && <p className="text-sm text-emerald-700">Saved.</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-800 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save HR details"}
      </button>
    </form>
  );
}
