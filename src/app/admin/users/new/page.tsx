import Link from "next/link";
import { auth } from "@/auth";
import { getSchedulingLocationIdsForSession } from "@/lib/auth/location-scope";
import { requireAdmin } from "@/lib/auth/guards";
import { EmployeeUserForm } from "@/components/admin/employee-user-form";
import { getLocationsForScope } from "@/lib/queries/admin";
import { getDepartmentsWithRoles } from "@/lib/queries/schedule";

export default async function AdminNewUserPage() {
  await requireAdmin();
  const session = await auth();
  const venueScope =
    session != null ? await getSchedulingLocationIdsForSession(session) : null;

  const [locations, departments] = await Promise.all([
    getLocationsForScope(venueScope),
    getDepartmentsWithRoles(
      venueScope != null && venueScope.length > 0
        ? { onlyAtLocations: venueScope }
        : undefined,
    ),
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
        <h1 className="text-xl font-semibold text-slate-900">Add employee</h1>
        <Link
          href="/admin/users"
          className="text-sm text-sky-700 hover:underline"
        >
          ← Users
        </Link>
      </div>

      <p className="text-sm text-slate-600">
        Use this for staff who already work with you and need an account right
        away. For a self-service link instead,{" "}
        <Link href="/admin/users/invite" className="text-sky-700 hover:underline">
          invite by email
        </Link>
        .
      </p>

      {venueScope != null && venueScope.length > 0 ? (
        <p className="text-sm text-slate-600">
          Locations and departments match the venue switcher. Use{" "}
          <span className="font-medium">All venues</span> to assign multiple
          sites in one step.
        </p>
      ) : null}

      <div className="surface-card p-6">
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
