import Link from "next/link";
import {
  getSchedulingLocationIdsForSession,
  locationsVisibleToSession,
} from "@/lib/auth/location-scope";
import { requireAdminOrManager } from "@/lib/auth/guards";
import { EmployeeUserForm } from "@/components/admin/employee-user-form";
import { getDepartmentsWithRoles } from "@/lib/queries/schedule";

export default async function ManagerNewEmployeePage() {
  const session = await requireAdminOrManager();
  const locationIds = await getSchedulingLocationIdsForSession(session);
  const [locations, departments] = await Promise.all([
    locationsVisibleToSession(session),
    getDepartmentsWithRoles({
      onlyAtLocations: locationIds ?? undefined,
    }),
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
        <h1 className="text-xl font-semibold text-slate-900 dark:text-zinc-100">Add employee</h1>
        <Link
          href="/manager/employees"
          className="text-sm text-sky-700 hover:underline"
        >
          ← Employees
        </Link>
      </div>
      <p className="text-sm text-slate-600 dark:text-zinc-400">
        New accounts are created as employees. Admins can change roles under
        Admin → Users. To have them set password, PIN, and payroll info
        themselves, use{" "}
        <Link href="/manager/employees/invite" className="text-sky-700 hover:underline">
          Invite employee
        </Link>
        .
      </p>

      <div className="surface-card p-6">
        <EmployeeUserForm
          mode="create"
          isAdminContext={false}
          successRedirect="/manager/employees"
          departments={deptOptions}
          locations={locations}
        />
      </div>
    </div>
  );
}
