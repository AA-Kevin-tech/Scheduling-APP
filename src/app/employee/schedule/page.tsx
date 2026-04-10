import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import { requireEmployeeProfile } from "@/lib/auth/guards";
import { getSchedulingLocationIdsForSession } from "@/lib/auth/location-scope";
import {
  ScheduleWeekGrid,
  type ScheduleWeekBlock,
  type ScheduleWeekRow,
} from "@/components/schedule/schedule-week-grid";
import { intervalsOverlap } from "@/lib/datetime";
import { prisma } from "@/lib/db";
import {
  getEmployeesWithDepartments,
  getPublishedShiftsInRange,
  getShiftsForEmployee,
} from "@/lib/queries/schedule";
import {
  listScheduleAnnotationsOverlappingYmdRange,
  toScheduleAnnotationDto,
} from "@/lib/queries/schedule-annotations";
import { getApprovedTimeOffOverlappingRange } from "@/lib/queries/time-off";
import {
  buildEmployeeTeamScheduleRows,
  buildTeamFooterHoursByDay,
} from "@/lib/schedule/employee-team-grid";
import {
  buildWeekColumns,
  formatShiftTimeRange,
  shiftHours,
} from "@/lib/schedule/week-grid";
import {
  addWeeksToMondayIso,
  normalizeIanaTimezone,
  resolveWeekRangeFromQuery,
  todayIsoInZone,
  zonedDayBoundsUtc,
} from "@/lib/schedule/tz";
import { WeekAnnouncementStrip } from "@/components/schedule/week-announcement-strip";
import { firstSearchParam } from "@/lib/search-params";

/** `team` = published shifts for everyone at your venue(s) (all departments). */
export type EmployeeScheduleView = "me" | "team" | "department";

function parseScheduleView(raw: string | undefined): EmployeeScheduleView {
  if (raw === "department") return "department";
  /** Legacy: location was narrower than venues; both now map to full venue team view. */
  if (
    raw === "full" ||
    raw === "team" ||
    raw === "location" ||
    raw === "venues" ||
    raw === "venue"
  ) {
    return "team";
  }
  return "me";
}

function viewSearchParam(view: EmployeeScheduleView): string | undefined {
  if (view === "me") return undefined;
  if (view === "team") return "full";
  return "department";
}

function weekHref(mondayIso: string, view: EmployeeScheduleView): string {
  const p = new URLSearchParams();
  p.set("week", mondayIso);
  const v = viewSearchParam(view);
  if (v) p.set("view", v);
  return `/employee/schedule?${p.toString()}`;
}

export default async function EmployeeSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{
    week?: string | string[];
    view?: string | string[];
  }>;
}) {
  const { session, employeeId } = await requireEmployeeProfile();
  const user = session.user;
  const raw = await searchParams;
  const week = firstSearchParam(raw.week);
  const view = parseScheduleView(firstSearchParam(raw.view));

  const empRow = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: {
      timezone: true,
      locations: { select: { locationId: true } },
      departments: {
        select: {
          departmentId: true,
          department: { select: { locationId: true } },
        },
      },
    },
  });
  const scheduleTz = normalizeIanaTimezone(empRow?.timezone);

  const myLocationIds = [...new Set(empRow?.locations.map((l) => l.locationId) ?? [])];
  const myDepartmentIds = [
    ...new Set(empRow?.departments.map((d) => d.departmentId) ?? []),
  ];
  const myVenueIds = [
    ...new Set([
      ...myLocationIds,
      ...(empRow?.departments.map((d) => d.department.locationId) ?? []),
    ]),
  ];

  const schedulingScope = await getSchedulingLocationIdsForSession(session);
  const venueScopeList = schedulingScope ?? [];
  /** Respects header “Location” switcher when you have multiple venues. */
  const effectiveVenueIds: string[] =
    venueScopeList.length > 0 ? venueScopeList : myVenueIds;

  const now = new Date();
  const { from: weekStart, to: weekEnd, mondayIso } = resolveWeekRangeFromQuery(
    week,
    scheduleTz,
    now,
  );

  const prevMonday = addWeeksToMondayIso(mondayIso, -1, scheduleTz);
  const nextMonday = addWeeksToMondayIso(mondayIso, 1, scheduleTz);
  const thisWeekMonday = resolveWeekRangeFromQuery(undefined, scheduleTz, now)
    .mondayIso;

  const weekDays = buildWeekColumns(weekStart, scheduleTz);
  const todayIso = todayIsoInZone(now, scheduleTz);

  const weekStartYmd = weekDays[0]!.isoKey;
  const weekEndYmd = weekDays[6]!.isoKey;
  const scheduleAnnotationPayload =
    myVenueIds.length > 0
      ? (
          await listScheduleAnnotationsOverlappingYmdRange(
            myVenueIds,
            weekStartYmd,
            weekEndYmd,
          )
        ).map(toScheduleAnnotationDto)
      : [];
  const weekAnnouncements = scheduleAnnotationPayload.filter(
    (a) =>
      a.showAnnouncement &&
      a.endsOnYmd >= weekStartYmd &&
      a.startsOnYmd <= weekEndYmd,
  );

  const name = user.name?.trim() || user.email || "Me";

  const lastCol = weekDays[6];
  const rangeLabel = `${formatInTimeZone(weekStart, scheduleTz, "MMM d, yyyy")} – ${formatInTimeZone(
    lastCol?.date ?? weekStart,
    scheduleTz,
    "MMM d, yyyy",
  )}`;

  if (view === "me") {
    const [shifts, timeOff] = await Promise.all([
      getShiftsForEmployee({
        employeeId,
        from: weekStart,
        to: weekEnd,
      }),
      getApprovedTimeOffOverlappingRange(employeeId, weekStart, weekEnd),
    ]);

    const rows = buildEmployeeGridRow({
      name,
      shifts,
      timeOff,
      weekDays,
      scheduleTz,
    });

    const footerHoursByDay = buildEmployeeFooterHours(shifts, weekDays, scheduleTz);

    let weekMinutes = 0;
    for (const s of shifts) {
      weekMinutes += (s.endsAt.getTime() - s.startsAt.getTime()) / 60000;
    }
    const weekHrs = Math.round((weekMinutes / 60) * 10) / 10;
    const detail =
      weekMinutes > 0 ? `${weekHrs} hrs scheduled` : "No shifts this week";

    const rowsWithDetail = rows.map((r) =>
      r.rowId === "me" ? { ...r, detail } : r,
    );

    return (
      <SchedulePageShell
        view={view}
        mondayIso={mondayIso}
        rangeLabel={rangeLabel}
        prevMonday={prevMonday}
        nextMonday={nextMonday}
        thisWeekMonday={thisWeekMonday}
        blurb="Your assigned shifts and approved time off. When managers publish the schedule, you get an in-app alert under Alerts."
      >
        <WeekAnnouncementStrip items={weekAnnouncements} />
        <ScheduleWeekGrid
          weekDays={weekDays}
          todayIso={todayIso}
          rows={rowsWithDetail}
          footerHoursByDay={footerHoursByDay}
          timezoneLabel={scheduleTz}
          scheduleAnnotations={scheduleAnnotationPayload}
          emptyMessage={
            shifts.length === 0 && timeOff.length === 0
              ? "Nothing scheduled this week."
              : undefined
          }
        />
      </SchedulePageShell>
    );
  }

  let teamShifts: Awaited<ReturnType<typeof getPublishedShiftsInRange>> = [];
  let teamEmployees: Awaited<ReturnType<typeof getEmployeesWithDepartments>> = [];
  let viewTitle = "";
  let viewBlurb = "";

  if (view === "department") {
    if (myDepartmentIds.length === 0) {
      return (
        <SchedulePageShell
          view={view}
          mondayIso={mondayIso}
          rangeLabel={rangeLabel}
          prevMonday={prevMonday}
          nextMonday={nextMonday}
          thisWeekMonday={thisWeekMonday}
          blurb=""
        >
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            You are not assigned to a department yet. Ask a manager to add you
            to a department to use this view, or stay on <strong>My schedule</strong>.
          </p>
        </SchedulePageShell>
      );
    }
    teamShifts = await getPublishedShiftsInRange({
      from: weekStart,
      to: weekEnd,
      departmentIds: myDepartmentIds,
    });
    const deptSet = new Set(myDepartmentIds);
    const all = await getEmployeesWithDepartments({
      onlyAtLocations:
        effectiveVenueIds.length > 0 ? effectiveVenueIds : undefined,
    });
    teamEmployees = all.filter((e) =>
      e.departments.some((d) => deptSet.has(d.departmentId)),
    );
    viewTitle = "Department schedule";
    viewBlurb =
      "Published shifts in departments you belong to. Open shifts and coworkers; tap a block only when it is your shift.";
  } else if (view === "team") {
    if (myVenueIds.length === 0 && myDepartmentIds.length === 0) {
      return (
        <SchedulePageShell
          view={view}
          mondayIso={mondayIso}
          rangeLabel={rangeLabel}
          prevMonday={prevMonday}
          nextMonday={nextMonday}
          thisWeekMonday={thisWeekMonday}
          title="Full location schedule"
          blurb=""
        >
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            Add at least one work location or department on your profile (ask a
            manager) to see who is scheduled across departments, or use{" "}
            <strong>My schedule</strong>.
          </p>
        </SchedulePageShell>
      );
    }
    teamShifts = await getPublishedShiftsInRange({
      from: weekStart,
      to: weekEnd,
      locationScope: {
        locationIds: effectiveVenueIds,
        departmentIdsForUnlocated: myDepartmentIds,
      },
    });
    teamEmployees = await getEmployeesWithDepartments({
      onlyAtLocations:
        effectiveVenueIds.length > 0 ? effectiveVenueIds : undefined,
    });
    viewTitle = "Full location schedule";
    viewBlurb =
      "Everyone’s published shifts at your location(s), every department. Role and department show on each block. Use the Location control in the header when you work at more than one site. Only your own shifts are clickable.";
  }

  const rows = buildEmployeeTeamScheduleRows({
    viewerEmployeeId: employeeId,
    shifts: teamShifts,
    employees: teamEmployees,
    weekDays,
    scheduleTz,
  });

  const footerHoursByDay = buildTeamFooterHoursByDay(
    teamShifts,
    weekDays,
    scheduleTz,
  );

  const openCount = teamShifts.filter((s) => s.assignments.length === 0).length;

  return (
    <SchedulePageShell
      view={view}
      mondayIso={mondayIso}
      rangeLabel={rangeLabel}
      prevMonday={prevMonday}
      nextMonday={nextMonday}
      thisWeekMonday={thisWeekMonday}
      title={viewTitle}
      blurb={`${viewBlurb} Managers publish drafts before they appear here. When they publish, assigned staff receive an in-app alert (Alerts).`}
    >
      <WeekAnnouncementStrip items={weekAnnouncements} />
      <ScheduleWeekGrid
        weekDays={weekDays}
        todayIso={todayIso}
        rows={rows}
        footerHoursByDay={footerHoursByDay}
        timezoneLabel={scheduleTz}
        scheduleAnnotations={scheduleAnnotationPayload}
        emptyMessage={
          teamShifts.length === 0
            ? "No published shifts match this view for this week."
            : undefined
        }
      />
      {openCount > 0 && (
        <p className="text-xs text-slate-500">
          {openCount} open shift{openCount === 1 ? "" : "s"} this week — ask a
          manager if you want to pick one up.
        </p>
      )}
    </SchedulePageShell>
  );
}

function SchedulePageShell({
  children,
  view,
  mondayIso,
  rangeLabel,
  prevMonday,
  nextMonday,
  thisWeekMonday,
  title,
  blurb,
}: {
  children: React.ReactNode;
  view: EmployeeScheduleView;
  mondayIso: string;
  rangeLabel: string;
  prevMonday: string;
  nextMonday: string;
  thisWeekMonday: string;
  title?: string;
  blurb: string;
}) {
  const viewLabel: Record<EmployeeScheduleView, string> = {
    me: "My schedule",
    team: "Full location",
    department: "My departments",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-slate-900">
          {title ?? "My schedule"}
        </h1>
        <Link
          href="/employee/availability"
          className="text-sm text-sky-700 hover:underline"
        >
          Can&apos;t work
        </Link>
      </div>

      <nav
        className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm"
        aria-label="Schedule view"
      >
        {(
          [
            ["me", viewLabel.me],
            ["team", viewLabel.team],
            ["department", viewLabel.department],
          ] as const
        ).map(([v, label]) => (
          <Link
            key={v}
            href={weekHref(mondayIso, v)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              view === v
                ? "bg-sky-700 text-white"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>

      {blurb ? <p className="text-sm text-slate-600">{blurb}</p> : null}

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={weekHref(prevMonday, view)}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
          aria-label="Previous week"
        >
          ←
        </Link>
        <span className="min-w-[220px] text-center text-sm font-semibold text-slate-800">
          {rangeLabel}
        </span>
        <Link
          href={weekHref(nextMonday, view)}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
          aria-label="Next week"
        >
          →
        </Link>
        <Link
          href={weekHref(thisWeekMonday, view)}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          Today
        </Link>
      </div>

      {children}
    </div>
  );
}

type ShiftEmp = Awaited<ReturnType<typeof getShiftsForEmployee>>[number];
type TimeOffRow = Awaited<
  ReturnType<typeof getApprovedTimeOffOverlappingRange>
>[number];
type WeekDay = ReturnType<typeof buildWeekColumns>[number];

function shiftDayIso(shift: ShiftEmp, scheduleTz: string): string {
  return formatInTimeZone(shift.startsAt, scheduleTz, "yyyy-MM-dd");
}

function buildEmployeeGridRow(opts: {
  name: string;
  shifts: ShiftEmp[];
  timeOff: TimeOffRow[];
  weekDays: WeekDay[];
  scheduleTz: string;
}): ScheduleWeekRow[] {
  const { name, shifts, timeOff, weekDays, scheduleTz } = opts;

  const emptyDays = (): Record<string, ScheduleWeekBlock[]> => {
    const m: Record<string, ScheduleWeekBlock[]> = {};
    for (const d of weekDays) m[d.isoKey] = [];
    return m;
  };

  const blocksByDay = emptyDays();

  const byDay = new Map<string, ShiftEmp[]>();
  for (const d of weekDays) byDay.set(d.isoKey, []);
  for (const s of shifts) {
    const day = shiftDayIso(s, scheduleTz);
    const list = byDay.get(day);
    if (list) list.push(s);
  }

  for (const d of weekDays) {
    const sorted = [...(byDay.get(d.isoKey) ?? [])].sort(
      (a, b) => a.startsAt.getTime() - b.startsAt.getTime(),
    );
    const shiftBlocks: ScheduleWeekBlock[] = sorted.map((s) => ({
      key: s.id,
      kind: "shift" as const,
      href: `/employee/shifts/${s.id}`,
      line1: formatShiftTimeRange(s.startsAt, s.endsAt, scheduleTz),
      line2:
        [s.role?.name, s.department.name].filter(Boolean).join(" · ") ||
        undefined,
      variant: "assigned" as const,
    }));

    const { start: dayStart, end: dayEnd } = zonedDayBoundsUtc(
      d.isoKey,
      scheduleTz,
    );
    const offBlocks: ScheduleWeekBlock[] = [];
    for (const t of timeOff) {
      if (!intervalsOverlap(t.startsAt, t.endsAt, dayStart, dayEnd)) continue;
      offBlocks.push({
        key: `to-${t.id}-${d.isoKey}`,
        kind: "time_off",
        line1: "Time off",
        line2: t.reason
          ? t.reason.length > 40
            ? `${t.reason.slice(0, 37)}…`
            : t.reason
          : undefined,
        variant: "time_off",
      });
    }

    blocksByDay[d.isoKey] = [...shiftBlocks, ...offBlocks];
  }

  return [
    {
      rowId: "me",
      name,
      blocksByDay,
    },
  ];
}

function buildEmployeeFooterHours(
  shifts: ShiftEmp[],
  weekDays: WeekDay[],
  scheduleTz: string,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const d of weekDays) out[d.isoKey] = 0;
  for (const s of shifts) {
    const day = shiftDayIso(s, scheduleTz);
    if (out[day] === undefined) continue;
    out[day] += shiftHours(s.startsAt, s.endsAt);
  }
  for (const k of Object.keys(out)) {
    out[k] = Math.round(out[k] * 10) / 10;
  }
  return out;
}
