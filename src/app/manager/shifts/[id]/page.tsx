import Link from "next/link";
import { notFound } from "next/navigation";
import { requireManager } from "@/lib/auth/guards";
import { departmentBadgeClass } from "@/lib/departments/theme";
import {
  getDepartmentsWithRoles,
  getEmployeesWithDepartments,
  getShiftById,
} from "@/lib/queries/schedule";
import { deleteShift, removeShiftAssignment } from "@/actions/shifts";
import { AssignEmployeeForm } from "@/components/manager/assign-employee-form";
import { EditShiftForm } from "@/components/manager/edit-shift-form";

export default async function ShiftDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireManager();
  const { id } = await params;
  const [shift, departments, employees] = await Promise.all([
    getShiftById(id),
    getDepartmentsWithRoles(),
    getEmployeesWithDepartments(),
  ]);

  if (!shift) notFound();

  const badge = departmentBadgeClass(shift.department.slug);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="flex flex-wrap items-center gap-4">
        <Link
          href="/manager/schedule"
          className="text-sm text-sky-700 hover:underline"
        >
          ← Schedule
        </Link>
      </div>

      <div>
        <span
          className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${badge}`}
        >
          {shift.department.name}
        </span>
        <h1 className="mt-2 text-xl font-semibold text-slate-900">
          {shift.title || "Shift"}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {shift.startsAt.toLocaleString()} → {shift.endsAt.toLocaleString()}
        </p>
        {shift.role && (
          <p className="text-sm text-slate-500">Role: {shift.role.name}</p>
        )}
        {shift.zone && (
          <p className="text-sm text-slate-500">Zone: {shift.zone.name}</p>
        )}
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-medium text-slate-800">Edit shift</h2>
        <div className="mt-4">
          <EditShiftForm shift={shift} departments={departments} />
        </div>
        <form action={deleteShift} className="mt-6 border-t border-slate-100 pt-4">
          <input type="hidden" name="id" value={shift.id} />
          <button
            type="submit"
            className="text-sm text-red-700 hover:underline"
            formNoValidate
          >
            Delete shift
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-medium text-slate-800">Assignments</h2>
        <ul className="mt-3 divide-y divide-slate-100">
          {shift.assignments.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
            >
              <span>
                {a.employee.user.name ?? a.employee.user.email}
                {a.managerOverrideReason && (
                  <span className="ml-2 text-amber-700" title={a.managerOverrideReason}>
                    (override)
                  </span>
                )}
              </span>
              <form action={removeShiftAssignment}>
                <input type="hidden" name="assignmentId" value={a.id} />
                <button type="submit" className="text-sky-700 hover:underline">
                  Remove
                </button>
              </form>
            </li>
          ))}
          {shift.assignments.length === 0 && (
            <li className="py-2 text-sm text-slate-500">No one assigned yet.</li>
          )}
        </ul>

        <AssignEmployeeForm shiftId={shift.id} employees={employees} />
      </section>
    </div>
  );
}
