"use client";

import { useActionState } from "react";
import { adminSetUserPassword } from "@/actions/admin/users";

type State = { ok?: boolean; error?: string } | null;

type Props = {
  userId: string;
  /** When true, the signed-in admin is editing their own account (sessions end after reset). */
  isSelf: boolean;
};

export function AdminSetPasswordSection({ userId, isSelf }: Props) {
  const [state, formAction, pending] = useActionState(
    adminSetUserPassword,
    null as State,
  );

  return (
    <section className="surface-card p-6">
      <h2 className="text-sm font-medium text-slate-800 dark:text-zinc-200">Sign-in password</h2>
      <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">
        Sets the password used on the login page. All active sessions for this user end
        immediately after a successful change.
        {isSelf ? (
          <>
            {" "}
            Because this is your account, you will need to sign in again afterward.
          </>
        ) : null}
      </p>
      <form action={formAction} className="mt-4 max-w-md space-y-3">
        <input type="hidden" name="userId" value={userId} />
        <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300">
          New password
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 dark:text-zinc-100 shadow-sm"
          />
        </label>
        <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300">
          Confirm new password
          <input
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 dark:text-zinc-100 shadow-sm"
          />
        </label>
        {state?.error ? (
          <p className="text-sm text-red-600" role="alert">
            {state.error}
          </p>
        ) : null}
        {state?.ok ? (
          <p className="text-sm text-emerald-700" role="status">
            Password updated.
            {isSelf ? " Sign in again to continue." : null}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-50"
        >
          {pending ? "Updating…" : "Set password"}
        </button>
      </form>
    </section>
  );
}
