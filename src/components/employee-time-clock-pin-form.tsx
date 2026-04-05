"use client";

import { useActionState } from "react";
import {
  clearEmployeeTimeClockPin,
  updateEmployeeTimeClockPin,
} from "@/actions/employee-time-clock-pin";

export function EmployeeTimeClockPinForm({
  employeeId,
  hasPin,
  adminUserIdForRevalidate,
}: {
  employeeId: string;
  hasPin: boolean;
  adminUserIdForRevalidate?: string;
}) {
  const [saveState, saveAction, savePending] = useActionState(
    updateEmployeeTimeClockPin,
    {} as { ok?: boolean; error?: string },
  );
  const [clearState, clearAction, clearPending] = useActionState(
    clearEmployeeTimeClockPin,
    {} as { ok?: boolean; error?: string },
  );

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">
        Employees sign in at the time clock with this PIN only (no email or account
        password). Use 4–8 digits. Each PIN must be unique.
      </p>
      <p className="text-sm text-slate-700">
        Status:{" "}
        <span className={hasPin ? "font-medium text-emerald-800" : "text-slate-500"}>
          {hasPin ? "PIN is set" : "No PIN — terminal sign-in disabled"}
        </span>
      </p>

      <form action={saveAction} className="space-y-3">
        <input type="hidden" name="employeeId" value={employeeId} />
        {adminUserIdForRevalidate ? (
          <input
            type="hidden"
            name="adminUserIdForRevalidate"
            value={adminUserIdForRevalidate}
          />
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-slate-600">New PIN</span>
            <input
              name="pin"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              placeholder="4–8 digits"
              className="mt-1 w-full min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-base tracking-widest"
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">Confirm PIN</span>
            <input
              name="pinConfirm"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              placeholder="Repeat PIN"
              className="mt-1 w-full min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-base tracking-widest"
            />
          </label>
        </div>
        {saveState?.error && (
          <p className="text-sm text-red-600" role="alert">
            {saveState.error}
          </p>
        )}
        {saveState?.ok && (
          <p className="text-sm text-emerald-700">PIN saved.</p>
        )}
        <button
          type="submit"
          disabled={savePending}
          className="rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-800 disabled:opacity-50"
        >
          {savePending ? "Saving…" : "Save PIN"}
        </button>
      </form>

      {hasPin ? (
        <form action={clearAction}>
          <input type="hidden" name="employeeId" value={employeeId} />
          {adminUserIdForRevalidate ? (
            <input
              type="hidden"
              name="adminUserIdForRevalidate"
              value={adminUserIdForRevalidate}
            />
          ) : null}
          {clearState?.error && (
            <p className="mb-2 text-sm text-red-600" role="alert">
              {clearState.error}
            </p>
          )}
          {clearState?.ok && (
            <p className="mb-2 text-sm text-emerald-700">PIN removed.</p>
          )}
          <button
            type="submit"
            disabled={clearPending}
            className="text-sm font-medium text-slate-600 underline hover:text-slate-900 disabled:opacity-50"
          >
            {clearPending ? "Removing…" : "Remove PIN"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
