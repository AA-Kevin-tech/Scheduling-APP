"use client";

import { useActionState } from "react";
import {
  clearEmployeeTimeClockPin,
  updateEmployeeTimeClockPin,
} from "@/actions/employee-time-clock-pin";
import { FieldRow, formControlClassName } from "@/components/ui/field-row";

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

  const pinClass = `${formControlClassName} tracking-widest`;

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500 dark:text-zinc-500">
        Employees sign in at the time clock with this PIN only (no email or account
        password). Use 4–8 digits. Each PIN must be unique.
      </p>

      <FieldRow label="Status">
        <p className="text-sm text-slate-700 dark:text-zinc-300">
          <span
            className={hasPin ? "font-medium text-emerald-800" : "text-slate-500 dark:text-zinc-500"}
          >
            {hasPin ? "PIN is set" : "No PIN — terminal sign-in disabled"}
          </span>
        </p>
      </FieldRow>

      <form action={saveAction} className="space-y-3">
        <input type="hidden" name="employeeId" value={employeeId} />
        {adminUserIdForRevalidate ? (
          <input
            type="hidden"
            name="adminUserIdForRevalidate"
            value={adminUserIdForRevalidate}
          />
        ) : null}

        <FieldRow label="New PIN">
          <input
            name="pin"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            placeholder="4–8 digits"
            className={pinClass}
          />
        </FieldRow>
        <FieldRow label="Confirm PIN">
          <input
            name="pinConfirm"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            placeholder="Repeat PIN"
            className={pinClass}
          />
        </FieldRow>

        {saveState?.error && (
          <p className="text-sm text-red-600 sm:pl-[12rem]" role="alert">
            {saveState.error}
          </p>
        )}
        {saveState?.ok && (
          <p className="text-sm text-emerald-700 sm:pl-[12rem]">PIN saved.</p>
        )}
        <div className="sm:pl-[12rem]">
          <button
            type="submit"
            disabled={savePending}
            className="rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-800 disabled:opacity-50"
          >
            {savePending ? "Saving…" : "Save PIN"}
          </button>
        </div>
      </form>

      {hasPin ? (
        <form action={clearAction} className="sm:pl-[12rem]">
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
            className="text-sm font-medium text-slate-600 dark:text-zinc-400 underline hover:text-slate-900 dark:hover:text-zinc-100 dark:text-zinc-100 dark:hover:text-zinc-100 dark:text-zinc-100 disabled:opacity-50"
          >
            {clearPending ? "Removing…" : "Remove PIN"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
