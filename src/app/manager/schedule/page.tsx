import Link from "next/link";
import { requireManager } from "@/lib/auth/guards";
import {
  ScheduleWeekGrid,
  type ScheduleWeekBlock,
  type ScheduleWeekRow,
} from "@/components/schedule/schedule-week-grid";
import {
  addDaysUtc,
  addWeeksUtc,
  parseDateParam,
  startOfWeekMondayUtc,
  toIsoDate,
} from "@/lib/datetime";
import {
  buildWeekColumns,
  formatShiftTimeRange,
  shiftHours,
} from "@/lib/schedule/week-grid";
import {
  getDepartmentsWithRoles,
  getEmployeesWithDepartments,
  getShiftsForRange,
} from "@/lib/queries/schedule";

export default async function ManagerSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{
    week?: string;
    departmentId?: string;
    roleId?: string;
  }>;
}) {
  await requireManager();
  const params = await searchParams;

  const anchor = parseDateParam(params.week, new Date());
  const weekStart = startOfWeekMondayUtc(anchor);
  const weekEnd = addWeeksUtc(weekStart, 1);
  const weekLast = addDaysUtc(weekStart, 6);

  const [shifts, departments, employees] = await Promise.all([
    getShiftsForRange({
      from: weekStart,
      to: weekEnd,
      departmentId: params.departmentId,
      roleId: params.roleId,
    }),
    getDepartmentsWithRoles(),
    getEmployeesWithDepartments(),
  ]);

  const prevWeek = addWeeksUtc(weekStart, -1);
  const nextWeek = addWeeksUtc(weekStart, 1);

  const baseQuery = new URLSearchParams();
  if (params.departmentId) baseQuery.set("departmentId", params.departmentId);
  if (params.roleId) baseQuery.set("roleId", params.roleId);

  function weekHref(w: Date) {
    const q = new URLSearchParams(baseQuery);
    q.set("week", toIsoDate(w));
    return `/manager/schedule?${q.toString()}`;
  }

  const weekDays = buildWeekColumns(weekStart);
  const todayIso = toIsoDate(new Date());

  const rows = buildManagerGridRows({
    shifts,
    employees,
    weekDays,
    departmentId: params.departmentId,
    roleId: params.roleId,
  });

  const footerHoursByDay = buildFooterHoursByDay(shifts, weekDays);

  const rangeLabel = `${weekStart.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })} – ${weekLast.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })}`;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-slate-900">Schedule</h1>
        <Link
          href="/manager/shifts/new"
          className="rounded-md bg-sky-700 px-3 py-2 text-sm font-medium text-white hover:bg-sky-800"
        >
          Create shift
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={weekHref(prevWeek)}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
          aria-label="Previous week"
        >
          ←
        </Link>
        <span className="min-w-[200px] text-center text-sm font-semibold text-slate-800">
          {rangeLabel}{" "}
          <span className="font-normal text-slate-500">(UTC)</span>
        </span>
        <Link
          href={weekHref(nextWeek)}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
          aria-label="Next week"
        >
          →
        </Link>
        <Link
          href={weekHref(startOfWeekMondayUtc(new Date()))}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          Today
        </Link>
      </div>

      <form
        method="get"
        className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <input type="hidden" name="week" value={toIsoDate(weekStart)} />
        <label className="text-sm">
          <span className="block text-slate-600">Department</span>
          <select
            name="departmentId"
            defaultValue={params.departmentId ?? ""}
            className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">All</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="block text-slate-600">Role</span>
          <select
            name="roleId"
            defaultValue={params.roleId ?? ""}
            className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">All</option>
            {departments.flatMap((d) =>
              d.roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {d.name}: {r.name}
                </option>
              )),
            )}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-md bg-slate-800 px-3 py-2 text-sm text-white hover:bg-slate-900"
        >
          Apply filters
        </button>
      </form>

      <ScheduleWeekGrid
        weekDays={weekDays}
        todayIso={todayIso}
        rows={rows}
        footerHoursByDay={footerHoursByDay}
        emptyMessage={
          shifts.length === 0
            ? "No shifts this week. Create one to get started."
            : undefined
        }
      />
    </div>
  );
}

function employeeMatchesFilters(
  emp: {
    departments: { departmentId: string; roleId: string | null }[];
  },
  departmentId?: string,
  roleId?: string,
): boolean {
  if (!departmentId && !roleId) return false;
  return emp.departments.some((ed) => {
    if (departmentId && ed.departmentId !== departmentId) return false;
    if (roleId && ed.roleId !== roleId) return false;
    return true;
  });
}

function displayName(emp: {
  user: { name: string | null; email: string };
}): string {
  return emp.user.name?.trim() || emp.user.email;
}

type ShiftRow = Awaited<ReturnType<typeof getShiftsForRange>>[number];
type EmpRow = Awaited<ReturnType<typeof getEmployeesWithDepartments>>[number];
type WeekDay = ReturnType<typeof buildWeekColumns>[number];

function shiftToBlock(shift: ShiftRow, variant: "assigned" | "open"): ScheduleWeekBlock {
  const sub = [shift.role?.name, shift.department.name].filter(Boolean).join(" · ");
  return {
    key: shift.id + (variant === "open" ? "-open" : ""),
    kind: "shift",
    href: `/manager/shifts/${shift.id}`,
    line1: formatShiftTimeRange(shift.startsAt, shift.endsAt),
    line2: sub || undefined,
    variant,
  };
}

function sortShiftsChronological(shifts: ShiftRow[]): ShiftRow[] {
  return [...shifts].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

function buildManagerGridRows(opts: {
  shifts: ShiftRow[];
  employees: EmpRow[];
  weekDays: WeekDay[];
  departmentId?: string;
  roleId?: string;
}): ScheduleWeekRow[] {
  const { shifts, employees, weekDays, departmentId, roleId } = opts;

  let staff: EmpRow[];
  if (departmentId || roleId) {
    staff = employees.filter((e) =>
      employeeMatchesFilters(e, departmentId, roleId),
    );
  } else {
    staff = employees;
  }

  staff = [...staff].sort((a, b) =>
    displayName(a).localeCompare(displayName(b), undefined, {
      sensitivity: "base",
    }),
  );

  const emptyDays = (): Record<string, ScheduleWeekBlock[]> => {
    const m: Record<string, ScheduleWeekBlock[]> = {};
    for (const d of weekDays) m[d.isoKey] = [];
    return m;
  };

  const openByDay = new Map<string, ShiftRow[]>();
  for (const d of weekDays) openByDay.set(d.isoKey, []);
  for (const s of shifts) {
    if (s.assignments.length > 0) continue;
    const day = toIsoDate(s.startsAt);
    const list = openByDay.get(day);
    if (list) list.push(s);
  }
  const openBlocks = emptyDays();
  for (const d of weekDays) {
    openBlocks[d.isoKey] = sortShiftsChronological(
      openByDay.get(d.isoKey) ?? [],
    ).map((s) => shiftToBlock(s, "open"));
  }

  const openRow: ScheduleWeekRow = {
    rowId: "open",
    rowTone: "open",
    name: "Open shifts",
    detail: "Unassigned",
    blocksByDay: openBlocks,
  };

  const empRows: ScheduleWeekRow[] = staff.map((emp) => {
    const blocksByDay = emptyDays();
    let weekMinutes = 0;

    const byDay = new Map<string, ShiftRow[]>();
    for (const d of weekDays) byDay.set(d.isoKey, []);

    for (const s of shifts) {
      if (!s.assignments.some((a) => a.employeeId === emp.id)) continue;
      const day = toIsoDate(s.startsAt);
      const list = byDay.get(day);
      if (list) list.push(s);
      weekMinutes += (s.endsAt.getTime() - s.startsAt.getTime()) / 60000;
    }

    for (const d of weekDays) {
      blocksByDay[d.isoKey] = sortShiftsChronological(
        byDay.get(d.isoKey) ?? [],
      ).map((s) => shiftToBlock(s, "assigned"));
    }

    const hrs = Math.round((weekMinutes / 60) * 10) / 10;
    const detail = weekMinutes > 0 ? `${hrs} hrs scheduled` : undefined;

    return {
      rowId: emp.id,
      name: displayName(emp),
      detail,
      blocksByDay,
    };
  });

  return [openRow, ...empRows];
}

function buildFooterHoursByDay(
  shifts: ShiftRow[],
  weekDays: WeekDay[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const d of weekDays) out[d.isoKey] = 0;

  for (const s of shifts) {
    if (s.assignments.length === 0) continue;
    const day = toIsoDate(s.startsAt);
    if (out[day] === undefined) continue;
    out[day] += shiftHours(s.startsAt, s.endsAt);
  }

  for (const k of Object.keys(out)) {
    out[k] = Math.round(out[k] * 10) / 10;
  }
  return out;
}
