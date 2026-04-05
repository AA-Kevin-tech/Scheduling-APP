"use client";

import { useActionState } from "react";
import { updateEmployeeTimezone } from "@/actions/employee-profile";
import { SCHEDULE_TIMEZONE_OPTIONS } from "@/lib/schedule/timezones";

export function ProfileTimezoneForm({ currentTimezone }: { currentTimezone: string }) {
  const [state, formAction, pending] = useActionState(updateEmployeeTimezone, null as {
    ok?: boolean;
    error?: string;
  } | null);

  return (
    <form action={formAction} className="mt-3 flex flex-wrap items-end gap-3">
      <label className="text-sm">
        <span className="block text-slate-600">Time zone</span>
        <select
          name="timezone"
          defaultValue={currentTimezone}
          className="mt-1 min-w-[240px] rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          {SCHEDULE_TIMEZONE_OPTIONS.map((z) => (
            <option key={z.value} value={z.value}>
              {z.label}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-slate-800 px-3 py-2 text-sm text-white hover:bg-slate-900 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Update"}
      </button>
      {state?.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="text-sm text-emerald-700">Saved.</p>
      )}
    </form>
  );
}
