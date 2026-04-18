"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import {
  createOnboardingEmailTemplate,
  updateOnboardingEmailTemplate,
} from "@/actions/onboarding-email-templates";
import {
  defaultOnboardingInviteEmailHtml,
  defaultOnboardingInviteEmailSubject,
} from "@/lib/email";

type Mode = "create" | "edit";

type Props = {
  mode: Mode;
  templateId?: string;
  initial?: {
    name: string;
    subject: string;
    htmlBody: string;
  };
};

export function OnboardingEmailTemplateForm(props: Props) {
  const { mode, templateId, initial } = props;
  const action =
    mode === "create" ? createOnboardingEmailTemplate : updateOnboardingEmailTemplate;
  const [state, formAction, pending] = useActionState(action, null);

  useEffect(() => {
    if (state?.ok && mode === "create" && "id" in state && state.id) {
      window.location.href = `/admin/onboarding-email-templates/${state.id}/edit`;
    }
  }, [state, mode]);

  return (
    <form action={formAction} className="space-y-5">
      {mode === "edit" && templateId ? (
        <input type="hidden" name="id" value={templateId} />
      ) : null}

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300">
          Template name
        </label>
        <input
          name="name"
          required
          maxLength={120}
          defaultValue={initial?.name ?? ""}
          placeholder="e.g. Texas hourly onboarding"
          className="mt-1 w-full max-w-lg rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300">
          Email subject
        </label>
        <input
          name="subject"
          required
          maxLength={200}
          defaultValue={initial?.subject ?? defaultOnboardingInviteEmailSubject()}
          className="mt-1 w-full max-w-lg rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
        />
        <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">
          Plain text. You may use the same placeholders as the body;{" "}
          <code>{"{{complianceLinksHtml}}"}</code> is removed in the subject.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300">
          HTML body
        </label>
        <textarea
          name="htmlBody"
          required
          rows={16}
          defaultValue={initial?.htmlBody ?? defaultOnboardingInviteEmailHtml()}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs leading-relaxed dark:border-zinc-600 dark:bg-zinc-900"
        />
        <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">
          Placeholders:{" "}
          <code>{"{{onboardingUrl}}"}</code>,{" "}
          <code>{"{{employeeFirstName}}"}</code>,{" "}
          <code>{"{{employeeLastName}}"}</code>,{" "}
          <code>{"{{complianceLinksHtml}}"}</code>
        </p>
      </div>

      {state?.error ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.ok && mode === "edit" ? (
        <p className="text-sm text-emerald-700">Saved.</p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800 disabled:opacity-50"
        >
          {pending ? "Saving…" : mode === "create" ? "Create template" : "Save changes"}
        </button>
        <Link
          href="/admin/onboarding-email-templates"
          className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 dark:border-zinc-600 dark:hover:bg-zinc-800"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
