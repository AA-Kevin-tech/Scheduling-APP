import { formatInTimeZone } from "date-fns-tz";
import type {
  ScheduleWeekBlock,
  ScheduleWeekRow,
} from "@/components/schedule/schedule-week-grid";
import { getPublishedShiftsInRange } from "@/lib/queries/schedule";
import { formatShiftTimeRange, shiftHours } from "@/lib/schedule/week-grid";
import type { WeekDayColumn } from "@/lib/schedule/week-grid";

export type PublishedTeamShift = Awaited<
  ReturnType<typeof getPublishedShiftsInRange>
>[number];

type EmpRow = {
  id: string;
  user: { name: string | null; email: string };
  departments: { departmentId: string }[];
  locations: { locationId: string }[];
};

export function displayName(emp: EmpRow): string {
  return emp.user.name?.trim() || emp.user.email;
}

function shiftDayIso(shift: PublishedTeamShift, scheduleTz: string): string {
  return formatInTimeZone(shift.startsAt, scheduleTz, "yyyy-MM-dd");
}

function shiftToTeamBlock(
  shift: PublishedTeamShift,
  variant: "assigned" | "open",
  scheduleTz: string,
  viewerEmployeeId: string,
  opts?: { employee?: EmpRow },
): ScheduleWeekBlock {
  const dayIso = shiftDayIso(shift, scheduleTz);
  const loc = shift.location?.name;
  const sub = [shift.role?.name, shift.department.name, loc]
    .filter(Boolean)
    .join(" · ");
  const viewerAssigned = shift.assignments.some(
    (a) => a.employeeId === viewerEmployeeId,
  );

  const base: ScheduleWeekBlock = {
    key: shift.id + (variant === "open" ? "-open" : ""),
    kind: "shift",
    href:
      variant === "assigned" && viewerAssigned
        ? `/employee/shifts/${shift.id}`
        : undefined,
    line1: formatShiftTimeRange(shift.startsAt, shift.endsAt, scheduleTz),
    line2: sub || undefined,
    variant,
    dayIso,
    isDraft: false,
  };

  if (variant === "open") {
    return { ...base };
  }

  const emp = opts?.employee;
  const outOfDepartment =
    !!emp &&
    !emp.departments.some((ed) => ed.departmentId === shift.departmentId);

  return { ...base, outOfDepartment };
}

function sortShiftsChronological(shifts: PublishedTeamShift[]): PublishedTeamShift[] {
  return [...shifts].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

export function buildEmployeeTeamScheduleRows(opts: {
  viewerEmployeeId: string;
  shifts: PublishedTeamShift[];
  employees: EmpRow[];
  weekDays: WeekDayColumn[];
  scheduleTz: string;
}): ScheduleWeekRow[] {
  const { viewerEmployeeId, shifts, employees, weekDays, scheduleTz } = opts;

  const staff = [...employees].sort((a, b) =>
    displayName(a).localeCompare(displayName(b), undefined, {
      sensitivity: "base",
    }),
  );

  const emptyDays = (): Record<string, ScheduleWeekBlock[]> => {
    const m: Record<string, ScheduleWeekBlock[]> = {};
    for (const d of weekDays) m[d.isoKey] = [];
    return m;
  };

  const openByDay = new Map<string, PublishedTeamShift[]>();
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
    ).map((s) => shiftToTeamBlock(s, "open", scheduleTz, viewerEmployeeId));
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

    const byDay = new Map<string, PublishedTeamShift[]>();
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
      ).map((s) =>
        shiftToTeamBlock(s, "assigned", scheduleTz, viewerEmployeeId, {
          employee: emp,
        }),
      );
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

  const empRows = empRowsUnfiltered.filter((row) => {
    const hasShift = weekDays.some(
      (d) => (row.blocksByDay[d.isoKey]?.length ?? 0) > 0,
    );
    return hasShift;
  });

  return [openRow, ...empRows];
}

export function buildTeamFooterHoursByDay(
  shifts: PublishedTeamShift[],
  weekDays: WeekDayColumn[],
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
