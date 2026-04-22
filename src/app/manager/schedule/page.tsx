import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import { getSchedulingLocationIdsForSession } from "@/lib/auth/location-scope";
import { requireManager } from "@/lib/auth/guards";
import { getSchedulingEditAllowedForSession } from "@/lib/permissions/scheduling-edit";
import {
  ScheduleWeekGrid,
  type ScheduleWeekBlock,
  type ScheduleWeekRow,
} from "@/components/schedule/schedule-week-grid";
import {
  addWeeksToMondayIso,
  getDefaultScheduleTimezone,
  resolveWeekRangeFromQuery,
  todayIsoInZone,
} from "@/lib/schedule/tz";
import {
  buildWeekColumns,
  formatShiftTimeRange,
  shiftHours,
} from "@/lib/schedule/week-grid";
import { prisma } from "@/lib/db";
import {
  getDepartmentsWithRoles,
  getEmployeesWithDepartments,
  getShiftsForRange,
} from "@/lib/queries/schedule";
import {
  listScheduleAnnotationsOverlappingYmdRange,
  toScheduleAnnotationDto,
} from "@/lib/queries/schedule-annotations";
import { firstSearchParam } from "@/lib/search-params";
import { PublishScheduleBar } from "@/components/manager/publish-schedule-bar";
import { ScheduleBulkToolbar } from "@/components/manager/schedule-bulk-toolbar";
import { buildManagerPositionGridRows } from "@/lib/schedule/manager-position-grid";

type ManagerScheduleLayout = "people" | "positions";

function parseScheduleLayout(raw: string | undefined): ManagerScheduleLayout {
  return raw === "positions" ? "positions" : "people";
}

export default async function ManagerSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{
    week?: string | string[];
    departmentId?: string | string[];
    roleId?: string | string[];
    roster?: string | string[];
    q?: string | string[];
    layout?: string | string[];
  }>;
}) {
  const session = await requireManager();
  const canEditSchedule = await getSchedulingEditAllowedForSession(session);
  const locationIds = await getSchedulingLocationIdsForSession(session);
  const raw = await searchParams;
  const week = firstSearchParam(raw.week);
  const departmentId = firstSearchParam(raw.departmentId);
  const roleId = firstSearchParam(raw.roleId);
  const roster = firstSearchParam(raw.roster);
  const q = firstSearchParam(raw.q);
  const layout = parseScheduleLayout(firstSearchParam(raw.layout));

  const scheduleTz = getDefaultScheduleTimezone();
  const now = new Date();

  const { from: weekStart, to: weekEnd, mondayIso } = resolveWeekRangeFromQuery(
    week,
    scheduleTz,
    now,
  );

  const [shifts, departments, employees] = await Promise.all([
    getShiftsForRange({
      from: weekStart,
      to: weekEnd,
      departmentId,
      roleId,
      locationIds,
    }),
    getDepartmentsWithRoles({
      onlyAtLocations: locationIds ?? undefined,
    }),
    getEmployeesWithDepartments({
      onlyAtLocations: locationIds ?? undefined,
    }),
  ]);

  const rosterMode = roster === "all" ? "all" : "scheduled";
  const searchQ = (q ?? "").trim().toLowerCase();

  const baseQuery = new URLSearchParams();
  if (departmentId) baseQuery.set("departmentId", departmentId);
  if (roleId) baseQuery.set("roleId", roleId);
  if (rosterMode === "all") baseQuery.set("roster", "all");
  if (searchQ) baseQuery.set("q", q ?? "");
  if (layout === "positions") baseQuery.set("layout", "positions");

  function weekHref(monday: string) {
    const next = new URLSearchParams(baseQuery);
    next.set("week", monday);
    return `/manager/schedule?${next.toString()}`;
  }

  function weekHrefWithLayout(
    monday: string,
    targetLayout: ManagerScheduleLayout,
  ) {
    const next = new URLSearchParams(baseQuery);
    next.set("week", monday);
    if (targetLayout === "positions") next.set("layout", "positions");
    else next.delete("layout");
    return `/manager/schedule?${next.toString()}`;
  }

  const prevMonday = addWeeksToMondayIso(mondayIso, -1, scheduleTz);
  const nextMonday = addWeeksToMondayIso(mondayIso, 1, scheduleTz);
  const thisWeekMonday = resolveWeekRangeFromQuery(undefined, scheduleTz, now)
    .mondayIso;

  const weekDays = buildWeekColumns(weekStart, scheduleTz);
  const todayIso = todayIsoInZone(now, scheduleTz);

  const weekStartYmd = weekDays[0]!.isoKey;
  const weekEndYmd = weekDays[6]!.isoKey;
  const annotationLocationIdsForQuery: string[] | null = departmentId
    ? (() => {
        const dept = departments.find((d) => d.id === departmentId);
        return dept ? [dept.locationId] : locationIds;
      })()
    : locationIds;

  const [annotationRows, annotationLocationRows, scheduleTemplates] =
    await Promise.all([
    listScheduleAnnotationsOverlappingYmdRange(
      annotationLocationIdsForQuery,
      weekStartYmd,
      weekEndYmd,
    ),
    prisma.location.findMany({
      where:
        locationIds === null
          ? undefined
          : locationIds.length === 0
            ? { id: { in: [] } }
            : { id: { in: locationIds } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.scheduleTemplate.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  const scheduleAnnotationDtos = annotationRows.map(toScheduleAnnotationDto);
  const defaultAnnotationLocationId = departmentId
    ? (departments.find((d) => d.id === departmentId)?.locationId ?? null)
    : (annotationLocationRows[0]?.id ?? null);

  const lastCol = weekDays[6];
  const rangeLabel = `${formatInTimeZone(weekStart, scheduleTz, "MMM d, yyyy")} – ${formatInTimeZone(
    lastCol?.date ?? weekStart,
    scheduleTz,
    "MMM d, yyyy",
  )}`;

  const rows =
    layout === "positions"
      ? buildManagerPositionGridRows({
          shifts,
          employees,
          departments,
          weekDays,
          scheduleTz,
          departmentId,
          roleId,
          searchQ,
          baseNewShiftQuery: {
            weekMondayIso: mondayIso,
            ...(departmentId ? { departmentId } : {}),
            ...(roleId ? { roleId } : {}),
          },
        })
      : buildManagerGridRows({
          shifts,
          employees,
          weekDays,
          scheduleTz,
          departmentId,
          roleId,
          rosterMode,
          searchQ,
        });

  const footerHoursByDay = buildFooterHoursByDay(shifts, weekDays, scheduleTz);
  const draftCount = shifts.filter((s) => s.publishedAt == null).length;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {!canEditSchedule ? (
        <div
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100"
          role="status"
        >
          Schedule is <span className="font-semibold">read-only</span> for your
          role. You can review the week but cannot create or change shifts.
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-zinc-100">Schedule</h1>
        {canEditSchedule ? (
          <Link
            href="/manager/shifts/new"
            className="rounded-md bg-sky-700 px-3 py-2 text-sm font-medium text-white hover:bg-sky-800"
          >
            Create shift
          </Link>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={weekHref(prevMonday)}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
          aria-label="Previous week"
        >
          ←
        </Link>
        <span className="min-w-[220px] text-center text-sm font-semibold text-slate-800 dark:text-zinc-200">
          {rangeLabel}
        </span>
        <Link
          href={weekHref(nextMonday)}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
          aria-label="Next week"
        >
          →
        </Link>
        <Link
          href={weekHref(thisWeekMonday)}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          Today
        </Link>
      </div>

      <div
        className="flex flex-wrap items-center gap-2 text-sm"
        role="group"
        aria-label="Schedule row grouping"
      >
        <span className="text-slate-500 dark:text-zinc-500">View as</span>
        <Link
          href={weekHrefWithLayout(mondayIso, "people")}
          className={`rounded-md px-3 py-1.5 font-medium ${
            layout === "people"
              ? "bg-sky-700 text-white"
              : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          }`}
        >
          Staff
        </Link>
        <Link
          href={weekHrefWithLayout(mondayIso, "positions")}
          className={`rounded-md px-3 py-1.5 font-medium ${
            layout === "positions"
              ? "bg-sky-700 text-white"
              : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          }`}
        >
          Positions
        </Link>
      </div>

      <form
        method="get"
        className="flex flex-wrap items-end gap-3 surface-card p-4"
      >
        <input type="hidden" name="week" value={mondayIso} />
        {layout === "positions" ? (
          <input type="hidden" name="layout" value="positions" />
        ) : null}
        <label className="text-sm">
          <span className="block text-slate-600 dark:text-zinc-400">Department</span>
          <select
            name="departmentId"
            defaultValue={departmentId ?? ""}
            className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">All</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.location ? `${d.name} (${d.location.name})` : d.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="block text-slate-600 dark:text-zinc-400">Role</span>
          <select
            name="roleId"
            defaultValue={roleId ?? ""}
            className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">All</option>
            {departments.flatMap((d) =>
              d.roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {d.location ? `${d.name} (${d.location.name})` : d.name}:{" "}
                  {r.name}
                </option>
              )),
            )}
          </select>
        </label>
        {layout === "people" ? (
          <label className="text-sm">
            <span className="block text-slate-600 dark:text-zinc-400">
              Staff rows
            </span>
            <select
              name="roster"
              defaultValue={rosterMode === "all" ? "all" : ""}
              className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Scheduled this week (default)</option>
              <option value="all">All staff</option>
            </select>
          </label>
        ) : null}
        <label className="text-sm">
          <span className="block text-slate-600 dark:text-zinc-400">
            {layout === "positions" ? "Search positions" : "Search name"}
          </span>
          <input
            name="q"
            type="search"
            defaultValue={q ?? ""}
            placeholder={layout === "positions" ? "Filter positions" : "Filter rows"}
            className="mt-1 w-44 rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          className="rounded-md bg-slate-800 px-3 py-2 text-sm text-white hover:bg-slate-900"
        >
          Apply
        </button>
      </form>

      {canEditSchedule ? (
        <ScheduleBulkToolbar
          mondayIso={mondayIso}
          {...(departmentId ? { departmentId } : {})}
          {...(roleId ? { roleId } : {})}
          templates={scheduleTemplates}
        />
      ) : null}

      <PublishScheduleBar
        draftCount={draftCount}
        weekStartIso={weekStart.toISOString()}
        weekEndIso={weekEnd.toISOString()}
        {...(departmentId ? { departmentId } : {})}
        {...(roleId ? { roleId } : {})}
        canPublish={canEditSchedule}
      />

      <ScheduleWeekGrid
        weekDays={weekDays}
        todayIso={todayIso}
        rows={rows}
        footerHoursByDay={footerHoursByDay}
        timezoneLabel={scheduleTz}
        scheduleViewMode={layout === "positions" ? "positions" : "people"}
        newShiftQuery={{
          weekMondayIso: mondayIso,
          ...(departmentId ? { departmentId } : {}),
          ...(roleId ? { roleId } : {}),
        }}
        enableDragAssign={canEditSchedule && layout === "people"}
        allowScheduleEdits={canEditSchedule}
        scheduleAnnotations={scheduleAnnotationDtos}
        annotationLocations={annotationLocationRows}
        defaultAnnotationLocationId={defaultAnnotationLocationId}
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

function shiftDayIso(shift: ShiftRow, scheduleTz: string): string {
  return formatInTimeZone(shift.startsAt, scheduleTz, "yyyy-MM-dd");
}

function shiftToBlock(
  shift: ShiftRow,
  variant: "assigned" | "open",
  scheduleTz: string,
  opts?: { employee?: EmpRow },
): ScheduleWeekBlock {
  const dayIso = shiftDayIso(shift, scheduleTz);
  const sub = [shift.role?.name, shift.department.name].filter(Boolean).join(" · ");
  const base: ScheduleWeekBlock = {
    key: shift.id + (variant === "open" ? "-open" : ""),
    kind: "shift",
    href: `/manager/shifts/${shift.id}`,
    line1: formatShiftTimeRange(shift.startsAt, shift.endsAt, scheduleTz),
    line2: sub || undefined,
    variant,
    dayIso,
    isDraft: shift.publishedAt == null,
  };

  if (variant === "open") {
    return { ...base, shiftId: shift.id };
  }

  const emp = opts?.employee;
  const outOfDepartment =
    !!emp &&
    !emp.departments.some((ed) => ed.departmentId === shift.departmentId);

  return { ...base, outOfDepartment };
}

function sortShiftsChronological(shifts: ShiftRow[]): ShiftRow[] {
  return [...shifts].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

function buildManagerGridRows(opts: {
  shifts: ShiftRow[];
  employees: EmpRow[];
  weekDays: WeekDay[];
  scheduleTz: string;
  departmentId?: string;
  roleId?: string;
  rosterMode: "all" | "scheduled";
  searchQ: string;
}): ScheduleWeekRow[] {
  const {
    shifts,
    employees,
    weekDays,
    scheduleTz,
    departmentId,
    roleId,
    rosterMode,
    searchQ,
  } = opts;

  let staff: EmpRow[];
  if (departmentId || roleId) {
    staff = employees.filter((e) =>
      employeeMatchesFilters(e, departmentId, roleId),
    );
  } else {
    staff = employees;
  }

  if (searchQ) {
    staff = staff.filter((e) => {
      const n = displayName(e).toLowerCase();
      return n.includes(searchQ) || e.user.email.toLowerCase().includes(searchQ);
    });
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
    const day = shiftDayIso(s, scheduleTz);
    const list = openByDay.get(day);
    if (list) list.push(s);
  }
  const openBlocks = emptyDays();
  for (const d of weekDays) {
    openBlocks[d.isoKey] = sortShiftsChronological(
      openByDay.get(d.isoKey) ?? [],
    ).map((s) => shiftToBlock(s, "open", scheduleTz));
  }

  const openRow: ScheduleWeekRow = {
    rowId: "open",
    rowTone: "open",
    name: "Open shifts",
    detail: "Unassigned",
    blocksByDay: openBlocks,
  };

  const empRowsUnfiltered: ScheduleWeekRow[] = staff.map((emp) => {
    const blocksByDay = emptyDays();
    let weekMinutes = 0;

    const byDay = new Map<string, ShiftRow[]>();
    for (const d of weekDays) byDay.set(d.isoKey, []);

    for (const s of shifts) {
      if (!s.assignments.some((a) => a.employeeId === emp.id)) continue;
      const day = shiftDayIso(s, scheduleTz);
      const list = byDay.get(day);
      if (list) list.push(s);
      weekMinutes += (s.endsAt.getTime() - s.startsAt.getTime()) / 60000;
    }

    for (const d of weekDays) {
      blocksByDay[d.isoKey] = sortShiftsChronological(
        byDay.get(d.isoKey) ?? [],
      ).map((s) => shiftToBlock(s, "assigned", scheduleTz, { employee: emp }));
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

  const empRows =
    rosterMode === "all"
      ? empRowsUnfiltered
      : empRowsUnfiltered.filter((row) => {
          const hasShift = weekDays.some(
            (d) => (row.blocksByDay[d.isoKey]?.length ?? 0) > 0,
          );
          return hasShift;
        });

  return [openRow, ...empRows];
}

function buildFooterHoursByDay(
  shifts: ShiftRow[],
  weekDays: WeekDay[],
  scheduleTz: string,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const d of weekDays) out[d.isoKey] = 0;

  for (const s of shifts) {
    if (s.assignments.length === 0) continue;
    const day = shiftDayIso(s, scheduleTz);
    if (out[day] === undefined) continue;
    out[day] += shiftHours(s.startsAt, s.endsAt);
  }

  for (const k of Object.keys(out)) {
    out[k] = Math.round(out[k] * 10) / 10;
  }
  return out;
}
