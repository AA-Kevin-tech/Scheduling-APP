"use client";

import { useActionState } from "react";
import { updateEmployeePhone } from "@/actions/employee-profile";

export function ProfilePhoneForm({ currentPhone }: { currentPhone: string | null }) {
  const [state, formAction, pending] = useActionState(updateEmployeePhone, null as {
    ok?: boolean;
    error?: string;
  } | null);

  return (
    <form action={formAction} className="mt-3 space-y-2">
      <label className="text-sm">
        <span className="block text-slate-600 dark:text-zinc-400">Mobile or best contact number</span>
        <input
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="e.g. (512) 555-0100"
          defaultValue={currentPhone ?? ""}
          className="mt-1 w-full max-w-sm rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-slate-800 px-3 py-2 text-sm text-white hover:bg-slate-900 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save phone"}
        </button>
        {state?.error && (
          <p className="text-sm text-red-600" role="alert">
            {state.error}
          </p>
        )}
        {state?.ok && (
          <p className="text-sm text-emerald-700">Saved.</p>
        )}
      </div>
      <p className="text-xs text-slate-500 dark:text-zinc-500">
        Optional. Used so your team can reach you about shifts. Digits, spaces, dashes,
        +, and parentheses only.
      </p>
    </form>
  );
}
