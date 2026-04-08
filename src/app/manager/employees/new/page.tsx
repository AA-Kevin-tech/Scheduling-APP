import Link from "next/link";
import { requireAdminOrManager } from "@/lib/auth/guards";
import { EmployeeUserForm } from "@/components/admin/employee-user-form";
import { getLocations } from "@/lib/queries/admin";
import { getDepartmentsWithRoles } from "@/lib/queries/schedule";

export default async function ManagerNewEmployeePage() {
  await requireAdminOrManager();
  const [locations, departments] = await Promise.all([
    getLocations(),
    getDepartmentsWithRoles(),
  ]);

  const deptOptions = departments.map((d) => ({
    id: d.id,
    name: d.name,
    roles: d.roles.map((r) => ({ id: r.id, name: r.name })),
  }));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-slate-900">Add employee</h1>
        <Link
          href="/manager/employees"
          className="text-sm text-sky-700 hover:underline"
        >
          ← Employees
        </Link>
      </div>
      <p className="text-sm text-slate-600">
        New accounts are created as employees. Admins can change roles under
        Admin → Users. To have them set password, PIN, and payroll info
        themselves, use{" "}
        <Link href="/manager/employees/invite" className="text-sky-700 hover:underline">
          Invite employee
        </Link>
        .
      </p>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
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
