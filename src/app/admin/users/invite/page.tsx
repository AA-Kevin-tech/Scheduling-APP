import Link from "next/link";
import { auth } from "@/auth";
import { getSchedulingLocationIdsForSession } from "@/lib/auth/location-scope";
import { requireAdmin } from "@/lib/auth/guards";
import { EmployeeInviteForm } from "@/components/admin/employee-invite-form";
import { getLocationsForScope } from "@/lib/queries/admin";
import { getDepartmentsWithRoles } from "@/lib/queries/schedule";
import { listOnboardingEmailTemplateSummaries } from "@/lib/queries/onboarding-email-templates";

export default async function AdminInviteUserPage() {
  await requireAdmin();
  const session = await auth();
  const venueScope =
    session != null ? await getSchedulingLocationIdsForSession(session) : null;

  const [locations, departments, emailTemplates] = await Promise.all([
    getLocationsForScope(venueScope),
    getDepartmentsWithRoles(
      venueScope != null && venueScope.length > 0
        ? { onlyAtLocations: venueScope }
        : undefined,
    ),
    listOnboardingEmailTemplateSummaries(),
  ]);

  const deptOptions = departments.map((d) => ({
    id: d.id,
    locationId: d.locationId,
    name: d.location ? `${d.name} (${d.location.name})` : d.name,
    roles: d.roles.map((r) => ({ id: r.id, name: r.name })),
  }));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-zinc-100">
          Invite by email
        </h1>
        <Link
          href="/admin/users"
          className="text-sm text-sky-700 hover:underline"
        >
          ← Users
        </Link>
      </div>

      <p className="text-sm text-slate-600 dark:text-zinc-400">
        They receive a link to create their password and complete onboarding
        (payroll and profile fields). You can attach official forms (for example
        IRS W-4), Texas compliance links, custom files, and pick an email
        template. Manage templates under{" "}
        <Link
          href="/admin/onboarding-email-templates"
          className="text-sky-700 hover:underline"
        >
          Admin → Onboarding emails
        </Link>
        . To create the account yourself instead, use{" "}
        <Link href="/admin/users/new" className="text-sky-700 hover:underline">
          Add employee
        </Link>
        .
      </p>

      {venueScope != null && venueScope.length > 0 ? (
        <p className="text-sm text-slate-600 dark:text-zinc-400">
          Locations and departments match the venue switcher. Use{" "}
          <span className="font-medium">All venues</span> to include multiple
          sites on the invite.
        </p>
      ) : null}

      <div className="surface-card p-6">
        <EmployeeInviteForm
          departments={deptOptions}
          locations={locations}
          emailTemplates={emailTemplates.map((t) => ({
            id: t.id,
            name: t.name,
          }))}
          manageTemplatesHref="/admin/onboarding-email-templates"
          successRedirect="/admin/users?invited=1"
        />
      </div>
    </div>
  );
}
