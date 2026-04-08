import Link from "next/link";
import { requireAdminOrManager } from "@/lib/auth/guards";
import { EmployeeInviteForm } from "@/components/admin/employee-invite-form";
import { getLocations } from "@/lib/queries/admin";
import { getDepartmentsWithRoles } from "@/lib/queries/schedule";

export default async function ManagerInviteEmployeePage() {
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
        <h1 className="text-xl font-semibold text-slate-900">
          Invite employee
        </h1>
        <Link
          href="/manager/employees"
          className="text-sm text-sky-700 hover:underline"
        >
          ← Employees
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <EmployeeInviteForm
          departments={deptOptions}
          locations={locations}
          successRedirect="/manager/employees?invited=1"
        />
      </div>
    </div>
  );
}
