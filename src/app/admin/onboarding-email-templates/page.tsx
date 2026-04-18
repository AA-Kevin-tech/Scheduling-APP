import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guards";
import { deleteOnboardingEmailTemplate } from "@/actions/onboarding-email-templates";
import { listOnboardingEmailTemplateSummaries } from "@/lib/queries/onboarding-email-templates";

type PageProps = { searchParams?: Promise<{ err?: string }> };

export default async function OnboardingEmailTemplatesPage(props: PageProps) {
  await requireAdmin();
  const sp = (await props.searchParams) ?? {};
  const err = sp.err?.trim() || null;
  const templates = await listOnboardingEmailTemplateSummaries();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-zinc-100">
          Onboarding email templates
        </h1>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/onboarding-email-templates/new"
            className="rounded-md bg-sky-700 px-3 py-2 text-sm font-medium text-white hover:bg-sky-800"
          >
            New template
          </Link>
          <Link href="/admin/users/invite" className="text-sm text-sky-700 hover:underline">
            ← Invite employee
          </Link>
        </div>
      </div>

      {err ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
          {err}
        </p>
      ) : null}

      <p className="text-sm text-slate-600 dark:text-zinc-400">
        Templates drive the subject and HTML body of the invite email. Use
        placeholders{" "}
        <code className="rounded bg-slate-100 px-1 dark:bg-zinc-800">
          {"{{onboardingUrl}}"}
        </code>
        ,{" "}
        <code className="rounded bg-slate-100 px-1 dark:bg-zinc-800">
          {"{{employeeFirstName}}"}
        </code>
        ,{" "}
        <code className="rounded bg-slate-100 px-1 dark:bg-zinc-800">
          {"{{employeeLastName}}"}
        </code>
        , and{" "}
        <code className="rounded bg-slate-100 px-1 dark:bg-zinc-800">
          {"{{complianceLinksHtml}}"}
        </code>{" "}
        for the Texas / federal link block when those rows are selected on the
        invite form.
      </p>

      <section className="surface-card p-6">
        {templates.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-zinc-500">
            No custom templates yet. The built-in default is used until you add
            one.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-zinc-800">
            {templates.map((t) => (
              <li
                key={t.id}
                className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 dark:text-zinc-100">
                    {t.name}
                  </p>
                  <p className="truncate text-sm text-slate-600 dark:text-zinc-400">
                    {t.subject}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-zinc-500">
                    Updated {t.updatedAt.toLocaleString()}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Link
                    href={`/admin/onboarding-email-templates/${t.id}/edit`}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-zinc-600 dark:hover:bg-zinc-800"
                  >
                    Edit
                  </Link>
                  <form action={deleteOnboardingEmailTemplate}>
                    <input type="hidden" name="id" value={t.id} />
                    <button
                      type="submit"
                      className="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/40"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
