import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guards";
import { EmployeeUserForm } from "@/components/admin/employee-user-form";
import { getLocations, getUserForAdminEdit } from "@/lib/queries/admin";
import { getDepartmentsWithRoles } from "@/lib/queries/schedule";

export default async function AdminEditUserPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  await requireAdmin();
  const { userId } = await params;

  const [user, locations, departments] = await Promise.all([
    getUserForAdminEdit(userId),
    getLocations(),
    getDepartmentsWithRoles(),
  ]);

  if (!user?.employee) notFound();

  const deptOptions = departments.map((d) => ({
    id: d.id,
    name: d.name,
    roles: d.roles.map((r) => ({ id: r.id, name: r.name })),
  }));

  const initial = {
    email: user.email,
    name: user.name ?? "",
    role: user.role,
    employeeNumber: user.employee.employeeNumber,
    locationIds: user.employee.locations.map((l) => l.locationId),
    assignments: user.employee.departments.map((ed) => ({
      departmentId: ed.departmentId,
      roleId: ed.roleId,
      isPrimary: ed.isPrimary,
    })),
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-slate-900">Edit user</h1>
        <Link
          href="/admin/users"
          className="text-sm text-sky-700 hover:underline"
        >
          ← Users
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <EmployeeUserForm
          mode="edit"
          userId={user.id}
          isAdminContext
          initial={initial}
          departments={deptOptions}
          locations={locations}
        />
      </div>
    </div>
  );
}
