"use client";

import { useFormState } from "react-dom";
import { updateOrganizationTimeClockSettings } from "@/actions/admin/organization-settings";

export function AdminTimeClockSettingsForm({
  employeeAccountClockEnabled,
}: {
  employeeAccountClockEnabled: boolean;
}) {
  const [state, action] = useFormState(updateOrganizationTimeClockSettings, {});

  return (
    <form action={action} className="space-y-4">
      <fieldset>
        <legend className="text-sm font-medium text-slate-900">
          Where may employees clock in and out?
        </legend>
        <p className="mt-1 text-xs text-slate-500">
          The kiosk always works when a manager has activated it. This setting
          controls whether staff may also use the Clock in / Clock out controls
          while signed in to their own employee account (for example on a phone).
        </p>
        <div className="mt-3 space-y-2">
          <label className="flex cursor-pointer gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 hover:bg-slate-50">
            <input
              type="radio"
              name="employeeAccountClockEnabled"
              value="false"
              defaultChecked={!employeeAccountClockEnabled}
              className="mt-1"
            />
            <span>
              <span className="font-medium text-slate-900">Kiosk only</span>
              <span className="mt-0.5 block text-sm text-slate-600">
                Employees must use the time clock PIN on the work terminal. Their
                signed-in account cannot start or end shifts.
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 hover:bg-slate-50">
            <input
              type="radio"
              name="employeeAccountClockEnabled"
              value="true"
              defaultChecked={employeeAccountClockEnabled}
              className="mt-1"
            />
            <span>
              <span className="font-medium text-slate-900">
                Kiosk and employee account
              </span>
              <span className="mt-0.5 block text-sm text-slate-600">
                Employees may clock in/out from the kiosk or from their employee
                home screen while logged in.
              </span>
            </span>
          </label>
        </div>
      </fieldset>

      {state.error ? (
        <p className="text-sm text-red-700" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p className="text-sm text-emerald-800" role="status">
          Saved.
        </p>
      ) : null}

      <button
        type="submit"
        className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800"
      >
        Save
      </button>
    </form>
  );
}
