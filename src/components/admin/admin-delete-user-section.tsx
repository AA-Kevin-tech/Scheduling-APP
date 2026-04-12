"use client";

import { useActionState } from "react";
import { deleteUserFromAdmin } from "@/actions/admin/users";

type State = { ok?: boolean; error?: string } | null;

type Props = {
  userId: string;
  userEmail: string;
};

export function AdminDeleteUserSection({ userId, userEmail }: Props) {
  const [state, formAction, pending] = useActionState(
    deleteUserFromAdmin,
    null as State,
  );

  return (
    <section className="rounded-xl border border-red-200 bg-red-50/40 p-6 shadow-sm">
      <h2 className="text-sm font-medium text-red-900">Delete user permanently</h2>
      <p className="mt-1 text-xs text-red-800/90">
        This removes the account and related data (assignments, punches, notifications) from
        the database. Open shifts stay; this person&apos;s assignments are removed. For
        keeping history while blocking access, use{" "}
        <span className="font-medium">Archive employee</span> instead — managers can only
        archive, not delete.
      </p>
      <form action={formAction} className="mt-4 space-y-3">
        <input type="hidden" name="userId" value={userId} />
        <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300">
          Type the user&apos;s email to confirm
          <input
            name="confirmEmail"
            type="email"
            autoComplete="off"
            placeholder={userEmail}
            className="mt-1 w-full max-w-md rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:text-zinc-100 shadow-sm"
            required
            aria-required
          />
        </label>
        {state?.error ? (
          <p className="text-sm text-red-700" role="alert">
            {state.error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-50"
        >
          {pending ? "Deleting…" : "Delete user permanently"}
        </button>
      </form>
    </section>
  );
}
