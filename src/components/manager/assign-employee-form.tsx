"use client";

import { useActionState } from "react";
import { assignEmployeeToShift } from "@/actions/shifts";

type EmployeeOption = {
  id: string;
  employeeNumber: string | null;
  user: { name: string | null; email: string | null };
};

export function AssignEmployeeForm({
  shiftId,
  employees,
}: {
  shiftId: string;
  employees: EmployeeOption[];
}) {
  const [state, formAction, pending] = useActionState(
    assignEmployeeToShift,
    {} as { ok?: boolean; error?: string },
  );

  return (
    <form action={formAction} className="mt-4 space-y-3 border-t border-slate-100 pt-4">
      <input type="hidden" name="shiftId" value={shiftId} />
      <label className="block text-sm">
        <span className="text-slate-600">Assign employee</span>
        <select
          name="employeeId"
          required
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Select…</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.user.name ?? e.user.email} ({e.employeeNumber ?? e.id.slice(0, 6)})
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="text-slate-600">
          Override reason (required if qualification, overlap, hours, or rest
          rules block assignment)
        </span>
        <input
          name="managerOverrideReason"
          type="text"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="Explain why this assign is allowed despite rule violations"
        />
      </label>
      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="text-sm text-emerald-700">Assigned.</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Assign"}
      </button>
    </form>
  );
}
