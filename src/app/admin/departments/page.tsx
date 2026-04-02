import { requireAdmin } from "@/lib/auth/guards";
import { DepartmentCreateForm } from "@/components/admin/department-create-form";
import { DepartmentEditForm } from "@/components/admin/department-edit-form";
import { getDepartmentsWithRoles } from "@/lib/queries/schedule";

export default async function AdminDepartmentsPage() {
  await requireAdmin();
  const departments = await getDepartmentsWithRoles();

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <h1 className="text-xl font-semibold text-slate-900">Departments</h1>
      <p className="text-sm text-slate-600">
        New departments get default roles (Attendant, Lead). Delete is only
        allowed when no shifts, employees, or coverage rules reference the
        department.
      </p>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-medium text-slate-800">Add department</h2>
        <DepartmentCreateForm />
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium text-slate-800">All departments</h2>
        <ul className="space-y-4">
          {departments.map((d) => (
            <DepartmentEditForm key={d.id} d={d} />
          ))}
        </ul>
      </section>
    </div>
  );
}
