import Link from "next/link";
import {
  getSchedulingLocationIdsForSession,
  locationsVisibleToSession,
} from "@/lib/auth/location-scope";
import { requireAdminOrManager } from "@/lib/auth/guards";
import { EmployeeInviteForm } from "@/components/admin/employee-invite-form";
import { getDepartmentsWithRoles } from "@/lib/queries/schedule";
import { listOnboardingEmailTemplateSummaries } from "@/lib/queries/onboarding-email-templates";

export default async function ManagerInviteEmployeePage() {
  const session = await requireAdminOrManager();
  const locationIds = await getSchedulingLocationIdsForSession(session);
  const [locations, departments, emailTemplates] = await Promise.all([
    locationsVisibleToSession(session),
    getDepartmentsWithRoles({
      onlyAtLocations: locationIds ?? undefined,
    }),
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
          Invite employee
        </h1>
        <Link
          href="/manager/employees"
          className="text-sm text-sky-700 hover:underline"
        >
          ← Employees
        </Link>
      </div>

      <div className="surface-card p-6">
        <EmployeeInviteForm
          departments={deptOptions}
          locations={locations}
          emailTemplates={emailTemplates.map((t) => ({
            id: t.id,
            name: t.name,
          }))}
          successRedirect="/manager/employees?invited=1"
        />
      </div>
    </div>
  );
}
