import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getSchedulingLocationIdsForSession,
  sessionMayAccessVenue,
  shiftVenueId,
} from "@/lib/auth/location-scope";
import { requireManager } from "@/lib/auth/guards";
import { departmentBadgeClass } from "@/lib/departments/theme";
import {
  getDepartmentsWithRoles,
  getEmployeesWithDepartments,
  getShiftById,
} from "@/lib/queries/schedule";
import { listEligibilityForShift } from "@/lib/services/eligible-employees";
import { deleteShift, removeShiftAssignment } from "@/actions/shifts";
import { AssignEmployeeForm } from "@/components/manager/assign-employee-form";
import { EditShiftForm } from "@/components/manager/edit-shift-form";
import { PublishShiftForm } from "@/components/manager/publish-shift-form";
import {
  formatDatetimeLocalInTimezone,
  getDefaultScheduleTimezone,
} from "@/lib/schedule/tz";

export default async function ShiftDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireManager();
  const locationIds = await getSchedulingLocationIdsForSession(session);
  const { id } = await params;
  const [shift, departments, employees, eligible] = await Promise.all([
    getShiftById(id),
    getDepartmentsWithRoles({
      onlyAtLocations: locationIds ?? undefined,
    }),
    getEmployeesWithDepartments({
      onlyAtLocations: locationIds ?? undefined,
    }),
    listEligibilityForShift(id),
  ]);

  if (!shift) notFound();
  if (!(await sessionMayAccessVenue(session, shiftVenueId(shift)))) {
    notFound();
  }

  const scheduleTz = getDefaultScheduleTimezone();
  const defaultStartsAtLocal = formatDatetimeLocalInTimezone(
    shift.startsAt,
    scheduleTz,
  );
  const defaultEndsAtLocal = formatDatetimeLocalInTimezone(shift.endsAt, scheduleTz);

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
        <h1 className="mt-2 text-xl font-semibold text-slate-900 dark:text-zinc-100">
          {shift.title || "Shift"}
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">
          {shift.startsAt.toLocaleString()} → {shift.endsAt.toLocaleString()}
        </p>
        {shift.role && (
          <p className="text-sm text-slate-500 dark:text-zinc-500">Role: {shift.role.name}</p>
        )}
        {shift.zone && (
          <p className="text-sm text-slate-500 dark:text-zinc-500">Zone: {shift.zone.name}</p>
        )}
        {shift.publishedAt == null ? (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            <p className="font-medium">Draft</p>
            <p className="mt-1 text-xs text-amber-900/85">
              This shift is not visible to assigned staff until you publish it.
            </p>
            <PublishShiftForm shiftId={shift.id} />
          </div>
        ) : (
          <p className="mt-3 text-xs text-slate-500 dark:text-zinc-500">
            Published{" "}
            {shift.publishedAt.toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        )}
      </div>

      <section className="surface-card p-6">
        <h2 className="text-sm font-medium text-slate-800 dark:text-zinc-200">Edit shift</h2>
        <div className="mt-4">
          <EditShiftForm
            shift={shift}
            departments={departments}
            scheduleTimeZone={scheduleTz}
            defaultStartsAtLocal={defaultStartsAtLocal}
            defaultEndsAtLocal={defaultEndsAtLocal}
          />
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

      <section className="surface-card p-6">
        <h2 className="text-sm font-medium text-slate-800 dark:text-zinc-200">Assignments</h2>
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
            <li className="py-2 text-sm text-slate-500 dark:text-zinc-500">No one assigned yet.</li>
          )}
        </ul>

        <AssignEmployeeForm shiftId={shift.id} employees={employees} />
      </section>

      <section className="surface-card p-6">
        <h2 className="text-sm font-medium text-slate-800 dark:text-zinc-200">
          Eligibility suggestions
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">
          Who can take this shift under current rules (qualification, hours, rest).
        </p>
        <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto text-sm">
          {eligible.map((row) => (
            <li
              key={row.employeeId}
              className={`rounded-lg border px-2 py-2 ${
                row.ok ? "border-emerald-200 bg-emerald-50" : "border-slate-200"
              }`}
            >
              <span className="font-medium text-slate-900 dark:text-zinc-100">
                {row.name ?? row.email}
              </span>
              {!row.ok && (
                <span className="mt-1 block text-xs text-red-700">
                  {row.reasons.join(" · ")}
                </span>
              )}
              {row.ok && (
                <span className="ml-2 text-xs text-emerald-800">Eligible</span>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
