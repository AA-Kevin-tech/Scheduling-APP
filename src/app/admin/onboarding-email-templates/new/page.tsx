import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guards";
import { OnboardingEmailTemplateForm } from "@/components/admin/onboarding-email-template-form";

export default async function NewOnboardingEmailTemplatePage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-zinc-100">
          New onboarding email template
        </h1>
        <Link
          href="/admin/onboarding-email-templates"
          className="text-sm text-sky-700 hover:underline"
        >
          ← Templates
        </Link>
      </div>

      <div className="surface-card p-6">
        <OnboardingEmailTemplateForm mode="create" />
      </div>
    </div>
  );
}
