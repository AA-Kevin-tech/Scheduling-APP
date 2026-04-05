"use client";

import { useActionState } from "react";
import { updateEmployeeHourLimits } from "@/actions/employee-hour-limits";

function minutesToHoursField(m: number | null): string {
  if (m == null) return "";
  return String(m / 60);
}

export function EmployeeHourLimitsForm({
  employeeId,
  initialWeeklyMaxMinutes,
  adminUserIdForRevalidate,
}: {
  employeeId: string;
  initialWeeklyMaxMinutes: number | null;
  /** When embedded on Admin → user edit, revalidate that page after save. */
  adminUserIdForRevalidate?: string;
}) {
  const [state, formAction, pending] = useActionState(
    updateEmployeeHourLimits,
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
        <span className="text-slate-600">Weekly cap (hours)</span>
        <input
          name="weeklyMaxHours"
          type="number"
          min={0.5}
          max={168}
          step={0.5}
          placeholder="No employee-specific weekly cap"
          defaultValue={minutesToHoursField(initialWeeklyMaxMinutes)}
          className="mt-1 w-full min-h-11 max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-base"
        />
      </label>
      <p className="text-xs text-slate-500">
        Leave blank to clear employee-only caps. Department or role limits may
        still apply; scheduling uses the strictest effective weekly cap.
      </p>
      {state?.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="text-sm text-emerald-700">Saved.</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-800 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save hour limits"}
      </button>
    </form>
  );
}
