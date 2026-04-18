import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guards";
import { OnboardingEmailTemplateForm } from "@/components/admin/onboarding-email-template-form";
import { deleteOnboardingEmailTemplate } from "@/actions/onboarding-email-templates";
import { getOnboardingEmailTemplateById } from "@/lib/queries/onboarding-email-templates";

type Props = { params: Promise<{ id: string }> };

export default async function EditOnboardingEmailTemplatePage(props: Props) {
  await requireAdmin();
  const { id } = await props.params;
  const row = await getOnboardingEmailTemplateById(id);
  if (!row) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-zinc-100">
          Edit template
        </h1>
        <Link
          href="/admin/onboarding-email-templates"
          className="text-sm text-sky-700 hover:underline"
        >
          ← Templates
        </Link>
      </div>

      <div className="surface-card p-6 space-y-6">
        <OnboardingEmailTemplateForm
          mode="edit"
          templateId={row.id}
          initial={{
            name: row.name,
            subject: row.subject,
            htmlBody: row.htmlBody,
          }}
        />

        <div className="border-t border-slate-100 pt-6 dark:border-zinc-800">
          <h2 className="text-sm font-medium text-slate-800 dark:text-zinc-200">
            Danger zone
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">
            Deletes this template. Invites that already used it keep their sent
            copy; new invites can no longer select this template.
          </p>
          <form action={deleteOnboardingEmailTemplate} className="mt-3">
            <input type="hidden" name="id" value={row.id} />
            <button
              type="submit"
              className="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              Delete template
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
