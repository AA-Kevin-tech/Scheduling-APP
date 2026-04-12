"use client";

import { useActionState } from "react";
import { updateEmployeePhoneByStaff } from "@/actions/employee-phone-staff";
import { FieldRow, formControlClassName } from "@/components/ui/field-row";

export function EmployeePhoneStaffForm({
  employeeId,
  currentPhone,
  adminUserIdForRevalidate,
}: {
  employeeId: string;
  currentPhone: string | null;
  adminUserIdForRevalidate?: string;
}) {
  const [state, formAction, pending] = useActionState(
    updateEmployeePhoneByStaff,
    {} as { ok?: boolean; error?: string },
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="employeeId" value={employeeId} />
      {adminUserIdForRevalidate ? (
        <input
          type="hidden"
          name="adminUserIdForRevalidate"
          value={adminUserIdForRevalidate}
        />
      ) : null}

      <FieldRow label="Phone">
        <div className="space-y-2">
          <input
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="off"
            placeholder="e.g. (512) 555-0100"
            defaultValue={currentPhone ?? ""}
            className={formControlClassName}
          />
          <p className="text-xs text-slate-500 dark:text-zinc-500">
            Contact number for SMS alerts when they opt in. Digits, spaces, dashes, +,
            and parentheses only.
          </p>
          {state?.error ? (
            <p className="text-sm text-red-600" role="alert">
              {state.error}
            </p>
          ) : null}
          {state?.ok ? (
            <p className="text-sm text-emerald-700">Phone saved.</p>
          ) : null}
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save phone"}
          </button>
        </div>
      </FieldRow>
    </form>
  );
}
