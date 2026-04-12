import Link from "next/link";
import type { UserRole } from "@prisma/client";
import {
  AdminCorrectPunchForm,
  AdminCreatePunchForm,
} from "@/components/admin/payroll-correction-forms";
import { getSchedulingLocationIdsForSession } from "@/lib/auth/location-scope";
import { canAccessAdminRoutes } from "@/lib/auth/roles";
import { requireManager } from "@/lib/auth/guards";
import { overlapMinutes } from "@/lib/datetime";
import { getEmployeesWithDepartments } from "@/lib/queries/schedule";
import { getTimesheetAssignmentsForEmployee } from "@/lib/queries/manager-attendance";
import type {
  AdminAssignmentNoPunchRow,
  AdminPunchRow,
} from "@/lib/queries/admin-payroll-corrections";
import {
  addWeeksToMondayIso,
  formatDatetimeLocalInTimezone,
  getDefaultScheduleTimezone,
  resolveWeekRangeFromQuery,
} from "@/lib/schedule/tz";
import { firstSearchParam } from "@/lib/search-params";

function formatHm(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function employeeLabel(name: string | null | undefined, email: string): string {
  return name?.trim() || email;
}

export default async function ManagerTimesheetsPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string | string[]; employee?: string | string[] }>;
}) {
  const session = await requireManager();
  const locationIds = await getSchedulingLocationIdsForSession(session);
  const tz = getDefaultScheduleTimezone();
  const now = new Date();
  const raw = await searchParams;
  const weekParam = firstSearchParam(raw.week);
  const { from: rangeStart, to: rangeEnd, mondayIso } = resolveWeekRangeFromQuery(
    weekParam,
    tz,
    now,
  );
  const prevMonday = addWeeksToMondayIso(mondayIso, -1, tz);
  const nextMonday = addWeeksToMondayIso(mondayIso, 1, tz);

  const employees = await getEmployeesWithDepartments({
    onlyAtLocations: locationIds ?? undefined,
  });

  const employeeParam = firstSearchParam(raw.employee);
  const selectedId =
    employeeParam && employees.some((e) => e.id === employeeParam)
      ? employeeParam
      : employees[0]?.id ?? null;

  const canEditPunches = canAccessAdminRoutes(session.user.role as UserRole);

  const assignments =
    selectedId != null
      ? await getTimesheetAssignmentsForEmployee({
          employeeId: selectedId,
          rangeStart,
          rangeEnd,
          locationIds,
        })
      : [];

  const selectedEmp = employees.find((e) => e.id === selectedId);
  const label =
    selectedEmp?.user != null
      ? employeeLabel(selectedEmp.user.name, selectedEmp.user.email)
      : null;

  let totalSchedMin = 0;
  let totalWorkMin = 0;
  for (const a of assignments) {
    const s = a.shift.startsAt;
    const e = a.shift.endsAt;
    totalSchedMin += overlapMinutes(s, e, rangeStart, rangeEnd);
    for (const punch of a.timePunches) {
      const end = punch.clockOutAt ?? now;
      totalWorkMin += overlapMinutes(punch.clockInAt, end, rangeStart, rangeEnd);
    }
  }

  function weekHref(mon: string, emp: string | null) {
    const p = new URLSearchParams();
    p.set("week", mon);
    if (emp) p.set("employee", emp);
    return `/manager/attendance/timesheets?${p.toString()}`;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Timesheets</h1>
          <p className="mt-1 text-sm text-slate-600">
            Published shifts and time clock punches by employee and week (
            {tz}). Managers view; only administrators can correct or add punches.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href="/manager/attendance" className="text-sky-700 hover:underline">
            ← Attendance
          </Link>
          <Link href="/manager" className="text-sky-700 hover:underline">
            Dashboard
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
        <Link
          href={weekHref(prevMonday, selectedId)}
          className="rounded-md border border-slate-200 px-2 py-1 text-slate-700 hover:bg-slate-50"
        >
          ← Prev week
        </Link>
        <span className="font-medium tabular-nums text-slate-800">
          Week of {mondayIso}
        </span>
        <Link
          href={weekHref(nextMonday, selectedId)}
          className="rounded-md border border-slate-200 px-2 py-1 text-slate-700 hover:bg-slate-50"
        >
          Next week →
        </Link>
      </div>

      {employees.length === 0 ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          No employees in your current location scope.
        </p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,220px)_1fr]">
          <aside className="surface-card p-3">
            <h2 className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Employee
            </h2>
            <ul className="mt-2 max-h-[min(60vh,28rem)] space-y-1 overflow-y-auto text-sm">
              {employees.map((e) => {
                const name = employeeLabel(e.user?.name, e.user?.email ?? "");
                const active = e.id === selectedId;
                return (
                  <li key={e.id}>
                    <Link
                      href={weekHref(mondayIso, e.id)}
                      className={`block rounded-md px-2 py-1.5 ${
                        active
                          ? "bg-sky-100 font-medium text-sky-950"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </aside>

          <div className="space-y-4">
            {label ? (
              <p className="text-sm text-slate-700">
                <span className="font-medium text-slate-900">{label}</span>
                <span className="text-slate-500"> · punches from kiosk / terminal</span>
              </p>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
                <p className="text-xs text-slate-500">Scheduled (in week)</p>
                <p className="text-lg font-semibold tabular-nums text-slate-900">
                  {formatHm(totalSchedMin)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
                <p className="text-xs text-slate-500">Worked (punched, in week)</p>
                <p className="text-lg font-semibold tabular-nums text-slate-900">
                  {formatHm(totalWorkMin)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
                <p className="text-xs text-slate-500">Difference</p>
                <p
                  className={`text-lg font-semibold tabular-nums ${
                    totalWorkMin - totalSchedMin > 0
                      ? "text-amber-800"
                      : totalWorkMin - totalSchedMin < 0
                        ? "text-slate-800"
                        : "text-slate-900"
                  }`}
                >
                  {totalWorkMin - totalSchedMin >= 0 ? "+" : ""}
                  {formatHm(totalWorkMin - totalSchedMin)}
                </p>
              </div>
            </div>

            {assignments.length === 0 ? (
              <p className="surface-card p-6 text-sm text-slate-600">
                No published assignments overlap this week for this employee.
              </p>
            ) : (
              <ul className="space-y-4">
                {assignments.map((a) => {
                  const sh = a.shift;
                  const schedInWeek = overlapMinutes(
                    sh.startsAt,
                    sh.endsAt,
                    rangeStart,
                    rangeEnd,
                  );
                  const punches = a.timePunches;
                  const workInWeek = punches.reduce((sum, punch) => {
                    const segEnd = punch.clockOutAt ?? now;
                    return (
                      sum +
                      overlapMinutes(
                        punch.clockInAt,
                        segEnd,
                        rangeStart,
                        rangeEnd,
                      )
                    );
                  }, 0);
                  const hasOpenPunch = punches.some((p) => p.clockOutAt == null);
                  const diffMin =
                    punches.length > 0 ? workInWeek - schedInWeek : null;
                  const dept = sh.department.name;
                  const roleName = sh.role?.name;
                  const locName = sh.location?.name;

                  const createRow: AdminAssignmentNoPunchRow = {
                    assignmentId: a.id,
                    employeeLabel: label ?? "—",
                    departmentName: dept,
                    shiftStartsAt: sh.startsAt,
                    shiftEndsAt: sh.endsAt,
                  };

                  return (
                    <li
                      key={a.id}
                      className="surface-card p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {sh.startsAt.toLocaleString(undefined, {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                          <p className="mt-1 text-xs text-slate-600">
                            {dept}
                            {roleName ? ` · ${roleName}` : ""}
                            {locName ? ` · ${locName}` : ""}
                          </p>
                        </div>
                        <div className="text-right text-xs text-slate-600">
                          <p>
                            <span className="text-slate-500">Scheduled </span>
                            <span className="font-medium tabular-nums text-slate-800">
                              {formatHm(schedInWeek)}
                            </span>
                          </p>
                          <p className="mt-0.5">
                            <span className="text-slate-500">Worked </span>
                            <span className="font-medium tabular-nums text-slate-800">
                              {punches.length > 0 ? formatHm(workInWeek) : "—"}
                            </span>
                          </p>
                          {diffMin != null ? (
                            <p
                              className={`mt-0.5 font-medium tabular-nums ${
                                diffMin > 0 ? "text-amber-800" : "text-slate-800"
                              }`}
                            >
                              Δ {diffMin >= 0 ? "+" : ""}
                              {formatHm(diffMin)}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                        <div>
                          <span className="text-slate-500">Shift </span>
                          <span className="tabular-nums">
                            {sh.startsAt.toLocaleString()} →{" "}
                            {sh.endsAt.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">Punched </span>
                          {punches.length === 0 ? (
                            <span className="text-amber-800">No punch</span>
                          ) : (
                            <ul className="mt-1 list-inside list-disc space-y-1">
                              {punches.map((punch) => (
                                <li key={punch.id} className="tabular-nums">
                                  {punch.clockInAt.toLocaleString()}
                                  {" → "}
                                  {punch.clockOutAt ? (
                                    punch.clockOutAt.toLocaleString()
                                  ) : (
                                    <span className="font-medium text-amber-800">
                                      open
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>

                      {canEditPunches
                        ? punches.map((punch) => {
                            const punchRow: AdminPunchRow = {
                              punchId: punch.id,
                              assignmentId: a.id,
                              employeeLabel: label ?? "—",
                              departmentName: dept,
                              shiftStartsAt: sh.startsAt,
                              shiftEndsAt: sh.endsAt,
                              clockInAt: punch.clockInAt,
                              clockOutAt: punch.clockOutAt,
                              clockInNote: punch.clockInNote,
                              clockOutNote: punch.clockOutNote,
                            };
                            return (
                              <AdminCorrectPunchForm
                                key={punch.id}
                                row={punchRow}
                                clockInLocal={formatDatetimeLocalInTimezone(
                                  punchRow.clockInAt,
                                  tz,
                                )}
                                clockOutLocal={
                                  punchRow.clockOutAt
                                    ? formatDatetimeLocalInTimezone(
                                        punchRow.clockOutAt,
                                        tz,
                                      )
                                    : ""
                                }
                              />
                            );
                          })
                        : null}
                      {canEditPunches && !hasOpenPunch ? (
                        <div
                          className={
                            punches.length > 0
                              ? "mt-4 border-t border-slate-100 pt-4"
                              : "mt-3"
                          }
                        >
                          {punches.length > 0 ? (
                            <p className="mb-2 text-xs text-slate-500">
                              Add another segment (e.g. after a break).
                            </p>
                          ) : null}
                          <AdminCreatePunchForm
                            row={createRow}
                            defaultClockInLocal={formatDatetimeLocalInTimezone(
                              sh.startsAt,
                              tz,
                            )}
                            defaultClockOutLocal={formatDatetimeLocalInTimezone(
                              sh.endsAt,
                              tz,
                            )}
                          />
                        </div>
                      ) : null}
                      {!canEditPunches && punches.length === 0 ? (
                        <p className="mt-2 text-xs text-slate-500">
                          Ask an administrator to add a punch if this shift was worked.
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
