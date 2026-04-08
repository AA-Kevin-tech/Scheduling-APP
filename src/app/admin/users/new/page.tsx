import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guards";
import { EmployeeUserForm } from "@/components/admin/employee-user-form";
import { getLocations } from "@/lib/queries/admin";
import { getDepartmentsWithRoles } from "@/lib/queries/schedule";

export default async function AdminNewUserPage() {
  await requireAdmin();
  const [locations, departments] = await Promise.all([
    getLocations(),
    getDepartmentsWithRoles(),
  ]);

  const deptOptions = departments.map((d) => ({
    id: d.id,
    name: d.location ? `${d.name} (${d.location.name})` : d.name,
    roles: d.roles.map((r) => ({ id: r.id, name: r.name })),
  }));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-slate-900">Add user</h1>
        <Link
          href="/admin/users"
          className="text-sm text-sky-700 hover:underline"
        >
          ← Users
        </Link>
      </div>

      <p className="text-sm text-slate-600">
        Prefer self-service onboarding?{" "}
        <Link href="/admin/users/invite" className="text-sky-700 hover:underline">
          Invite employee by email
        </Link>
        .
      </p>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <EmployeeUserForm
          mode="create"
          isAdminContext
          successRedirect="/admin/users"
          departments={deptOptions}
          locations={locations}
        />
      </div>
    </div>
  );
}
