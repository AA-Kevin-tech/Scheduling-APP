"use client";

import { useActionState, useState, type ReactNode } from "react";
import type {
  CompensationType,
  EmploymentType,
} from "@prisma/client";
import { updateEmployeeHrDetails } from "@/actions/employee-hr-details";

function moneyInputValue(v: { toString(): string } | null | undefined): string {
  if (v == null) return "";
  const n = Number(v.toString());
  return Number.isFinite(n) ? String(n) : "";
}

/** Label + control row: labels share one column width so inputs line up. */
function FieldRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-[11rem_1fr] sm:items-center sm:gap-x-4">
      <span className="text-sm text-slate-600 sm:pt-0">{label}</span>
      <div className="min-w-0 max-w-md">{children}</div>
    </div>
  );
}

export function EmployeeHrDetailsForm({
  employeeId,
  initialManagerNotes,
  initialCompensationType,
  initialHourlyRate,
  initialAnnualSalary,
  initialEmploymentType,
  adminUserIdForRevalidate,
}: {
  employeeId: string;
  initialManagerNotes: string | null;
  initialCompensationType: CompensationType;
  initialHourlyRate: { toString(): string } | null | undefined;
  initialAnnualSalary: { toString(): string } | null | undefined;
  initialEmploymentType: EmploymentType;
  adminUserIdForRevalidate?: string;
}) {
  const [compensationType, setCompensationType] =
    useState<CompensationType>(initialCompensationType);

  const [state, formAction, pending] = useActionState(
    updateEmployeeHrDetails,
    {} as { ok?: boolean; error?: string },
  );

  const controlClass =
    "w-full min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-base";

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
          className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-base"
        />
      </label>

      <div className="space-y-3">
        <FieldRow label="Compensation">
          <select
            name="compensationType"
            value={compensationType}
            onChange={(e) =>
              setCompensationType(e.target.value as CompensationType)
            }
            className={controlClass}
          >
            <option value="HOURLY">Hourly</option>
            <option value="SALARY">Salary (annual)</option>
          </select>
        </FieldRow>

        {compensationType === "HOURLY" ? (
          <FieldRow label="Hourly rate (USD)">
            <input
              name="hourlyRate"
              type="number"
              min={0}
              step={0.01}
              placeholder="—"
              defaultValue={moneyInputValue(initialHourlyRate)}
              className={controlClass}
            />
          </FieldRow>
        ) : (
          <FieldRow label="Annual salary (USD)">
            <input
              name="annualSalary"
              type="number"
              min={0}
              step={100}
              placeholder="—"
              defaultValue={moneyInputValue(initialAnnualSalary)}
              className={controlClass}
            />
          </FieldRow>
        )}

        <FieldRow label="Employment">
          <select
            name="employmentType"
            defaultValue={initialEmploymentType}
            className={controlClass}
          >
            <option value="FULL_TIME">Full time</option>
            <option value="PART_TIME">Part time</option>
          </select>
        </FieldRow>
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
