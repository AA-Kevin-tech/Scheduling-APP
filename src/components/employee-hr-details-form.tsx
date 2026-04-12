"use client";

import { useActionState, useState } from "react";
import type {
  CompensationType,
  EmploymentType,
} from "@prisma/client";
import { updateEmployeeHrDetails } from "@/actions/employee-hr-details";
import { FieldRow, formControlClassName } from "@/components/ui/field-row";

function moneyInputValue(v: { toString(): string } | null | undefined): string {
  if (v == null) return "";
  const n = Number(v.toString());
  return Number.isFinite(n) ? String(n) : "";
}

export function EmployeeHrDetailsForm({
  employeeId,
  initialManagerNotes,
  initialCompensationType,
  initialHourlyRate,
  initialAnnualSalary,
  initialEmploymentType,
  initialHolidayPayEligible,
  adminUserIdForRevalidate,
}: {
  employeeId: string;
  initialManagerNotes: string | null;
  initialCompensationType: CompensationType;
  initialHourlyRate: { toString(): string } | null | undefined;
  initialAnnualSalary: { toString(): string } | null | undefined;
  initialEmploymentType: EmploymentType;
  initialHolidayPayEligible?: boolean;
  adminUserIdForRevalidate?: string;
}) {
  const [compensationType, setCompensationType] =
    useState<CompensationType>(initialCompensationType);

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

      <FieldRow label="Manager notes" fullWidthControl alignTop>
        <textarea
          name="managerNotes"
          rows={4}
          defaultValue={initialManagerNotes ?? ""}
          placeholder="Private notes — not visible to the employee"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base"
        />
      </FieldRow>

      <div className="space-y-3">
        <FieldRow label="Compensation">
          <select
            name="compensationType"
            value={compensationType}
            onChange={(e) =>
              setCompensationType(e.target.value as CompensationType)
            }
            className={formControlClassName}
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
              className={formControlClassName}
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
              className={formControlClassName}
            />
          </FieldRow>
        )}

        <FieldRow label="Employment">
          <select
            name="employmentType"
            defaultValue={initialEmploymentType}
            className={formControlClassName}
          >
            <option value="FULL_TIME">Full time</option>
            <option value="PART_TIME">Part time</option>
          </select>
        </FieldRow>

        <FieldRow label="Holiday pay" alignTop>
          <div className="space-y-1">
            <label className="flex items-center gap-2 text-sm text-slate-800 dark:text-zinc-200">
              <input
                type="checkbox"
                name="holidayPayEligible"
                value="on"
                defaultChecked={initialHolidayPayEligible !== false}
                className="rounded border-slate-300"
              />
              Eligible for company holiday rules
            </label>
            <p className="text-xs text-slate-500 dark:text-zinc-500">
              Paid holiday hours (when not working) and work premiums use admin
              holiday settings. Uncheck for contractors or others excluded from
              holiday pay.
            </p>
          </div>
        </FieldRow>
      </div>

      <div className="space-y-2 sm:pl-[12rem]">
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
      </div>
    </form>
  );
}
