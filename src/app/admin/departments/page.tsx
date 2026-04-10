import { auth } from "@/auth";
import { getSchedulingLocationIdsForSession } from "@/lib/auth/location-scope";
import { requireAdmin } from "@/lib/auth/guards";
import { DepartmentCreateForm } from "@/components/admin/department-create-form";
import { DepartmentEditForm } from "@/components/admin/department-edit-form";
import { getLocationsForScope } from "@/lib/queries/admin";
import { getDepartmentsWithRoles } from "@/lib/queries/schedule";

export default async function AdminDepartmentsPage() {
  await requireAdmin();
  const session = await auth();
  const venueScope =
    session != null ? await getSchedulingLocationIdsForSession(session) : null;

  const [departments, locations] = await Promise.all([
    getDepartmentsWithRoles(
      venueScope != null && venueScope.length > 0
        ? { onlyAtLocations: venueScope }
        : undefined,
    ),
    getLocationsForScope(venueScope),
  ]);

  const scoped =
    venueScope != null && venueScope.length > 0 ? venueScope : null;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <h1 className="text-xl font-semibold text-slate-900">Departments</h1>
      {scoped ? (
        <p className="text-sm text-slate-600">
          Showing departments for the venue(s) selected in the switcher above.
          Choose <span className="font-medium">All venues</span> to manage every
          site.
        </p>
      ) : null}
      <p className="text-sm text-slate-600">
        Each department belongs to one venue. The same department name can exist
        at different venues with separate rosters and schedules. New departments
        get default roles (Attendant, Lead). Add zones and coverage minimums per
        department; managers see gaps on the Coverage page for their venues only.
        Deleting a department is only allowed when no shifts or employees
        reference it.
      </p>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-medium text-slate-800">Add department</h2>
        <DepartmentCreateForm locations={locations} />
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium text-slate-800">
          {scoped ? "Departments at selected venue(s)" : "All departments"}
        </h2>
        <ul className="space-y-4">
          {departments.map((d) => (
            <DepartmentEditForm key={d.id} d={d} />
          ))}
        </ul>
      </section>
    </div>
  );
}
