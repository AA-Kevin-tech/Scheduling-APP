"use client";

import { useActionState } from "react";
import { updateNotificationPreferences } from "@/actions/notification-preferences";

export function NotificationPreferencesForm({
  notifyEmail,
  notifySms,
  smsOptInAt,
}: {
  notifyEmail: boolean;
  notifySms: boolean;
  smsOptInAt: Date | null;
}) {
  const [state, formAction, pending] = useActionState(updateNotificationPreferences, null as {
    ok?: boolean;
    error?: string;
  } | null);

  return (
    <form action={formAction} className="mt-3 space-y-3">
      <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          name="notifyEmail"
          defaultChecked={notifyEmail}
          className="mt-1 rounded border-slate-300"
        />
        <span>
          <span className="font-medium text-slate-800">Email</span>
          <span className="block text-xs text-slate-500">
            Send scheduling alerts to your login email when the server has mail
            configured.
          </span>
        </span>
      </label>
      <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          name="notifySms"
          defaultChecked={notifySms}
          className="mt-1 rounded border-slate-300"
        />
        <span>
          <span className="font-medium text-slate-800">Text (SMS)</span>
          <span className="block text-xs text-slate-500">
            Short message to your profile mobile (employees) or account mobile
            (manager-only accounts). Requires consent below and Twilio on the
            server.
          </span>
        </span>
      </label>
      <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          name="smsOptIn"
          defaultChecked={!!smsOptInAt}
          className="mt-1 rounded border-slate-300"
        />
        <span>
          <span className="font-medium text-slate-800">SMS consent</span>
          <span className="block text-xs text-slate-500">
            I agree to receive automated scheduling alerts by text. Message and
            data rates may apply. Turn off SMS above to stop.
            {smsOptInAt ? (
              <span className="mt-1 block text-slate-400">
                Consent recorded{" "}
                {smsOptInAt.toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
                .
              </span>
            ) : null}
          </span>
        </span>
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-slate-800 px-3 py-2 text-sm text-white hover:bg-slate-900 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save alert preferences"}
        </button>
        {state?.error ? (
          <p className="text-sm text-red-600" role="alert">
            {state.error}
          </p>
        ) : null}
        {state?.ok ? (
          <p className="text-sm text-emerald-700">Saved.</p>
        ) : null}
      </div>
    </form>
  );
}
