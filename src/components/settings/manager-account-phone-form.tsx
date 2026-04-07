"use client";

import { useActionState } from "react";
import { updateManagerAccountPhone } from "@/actions/notification-preferences";

/** Phone for SMS when this login has no Employee row; value shown is raw saved E.164 or empty. */
export function ManagerAccountPhoneForm({
  currentPhoneE164,
}: {
  currentPhoneE164: string | null;
}) {
  const [state, formAction, pending] = useActionState(updateManagerAccountPhone, null as {
    ok?: boolean;
    error?: string;
  } | null);

  return (
    <form action={formAction} className="mt-3 space-y-2">
      <label className="text-sm">
        <span className="block text-slate-600">Mobile for text alerts</span>
        <input
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="e.g. (512) 555-0100"
          defaultValue={currentPhoneE164 ?? ""}
          className="mt-1 w-full max-w-sm rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-slate-800 px-3 py-2 text-sm text-white hover:bg-slate-900 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save mobile"}
        </button>
        {state?.error ? (
          <p className="text-sm text-red-600" role="alert">
            {state.error}
          </p>
        ) : null}
        {state?.ok ? <p className="text-sm text-emerald-700">Saved.</p> : null}
      </div>
      <p className="text-xs text-slate-500">
        Stored in E.164 for Twilio. Clear the field and save to remove.
      </p>
    </form>
  );
}
