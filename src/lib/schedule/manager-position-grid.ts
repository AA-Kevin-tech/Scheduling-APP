import { formatInTimeZone } from "date-fns-tz";
import type {
  NewShiftQueryContext,
  ScheduleWeekBlock,
  ScheduleWeekRow,
} from "@/components/schedule/schedule-week-grid";
import {
  buildWeekColumns,
  formatShiftTimeRange,
} from "@/lib/schedule/week-grid";
import {
  getDepartmentsWithRoles,
  getEmployeesWithDepartments,
  getShiftsForRange,
} from "@/lib/queries/schedule";

type ShiftRow = Awaited<ReturnType<typeof getShiftsForRange>>[number];
type EmpRow = Awaited<ReturnType<typeof getEmployeesWithDepartments>>[number];
type DeptRow = Awaited<ReturnType<typeof getDepartmentsWithRoles>>[number];
type WeekDay = ReturnType<typeof buildWeekColumns>[number];

export function roleScheduleAccent(seed: string): {
  swatch: string;
  cardBg: string;
  cardBorder: string;
} {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return {
    swatch: `hsl(${hue} 58% 42%)`,
    cardBg: `hsl(${hue} 42% 91%)`,
    cardBorder: `hsl(${hue} 38% 68%)`,
  };
}

function displayName(emp: EmpRow): string {
  return emp.user.name?.trim() || emp.user.email;
}

function abbrevFirstName(emp: EmpRow): string {
  const n = displayName(emp);
  const first = n.split(/\s+/)[0] ?? n;
  if (first.length <= 7) return first;
  return `${first.slice(0, 6)}…`;
}

function shiftDayIso(shift: ShiftRow, scheduleTz: string): string {
  return formatInTimeZone(shift.startsAt, scheduleTz, "yyyy-MM-dd");
}

function sortShiftsChronological(shifts: ShiftRow[]): ShiftRow[] {
  return [...shifts].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

function positionLabel(
  roleName: string,
  dept: DeptRow,
  singleDepartmentContext: boolean,
): string {
  if (singleDepartmentContext) return roleName;
  const loc = dept.location?.name;
  const bits = [dept.name, loc].filter(Boolean);
  if (bits.length === 0) return roleName;
  return `${roleName} · ${bits.join(" · ")}`;
}

function shiftToPositionBlock(
  shift: ShiftRow,
  variant: "assigned" | "open",
  scheduleTz: string,
  employeesById: Map<string, EmpRow>,
  accent: { cardBg: string; cardBorder: string },
): ScheduleWeekBlock {
  const dayIso = shiftDayIso(shift, scheduleTz);
  const cardAccent = {
    background: accent.cardBg,
    borderColor: accent.cardBorder,
  };

  const base: ScheduleWeekBlock = {
    key: shift.id + (variant === "open" ? "-open" : ""),
    kind: "shift",
    href: `/manager/shifts/${shift.id}`,
    line1: formatShiftTimeRange(shift.startsAt, shift.endsAt, scheduleTz),
    line2: variant === "open" ? "Open" : undefined,
    variant,
    dayIso,
    isDraft: shift.publishedAt == null,
    cardAccent,
  };

  if (variant === "open") {
    return { ...base, shiftId: shift.id };
  }

  const names = shift.assignments
    .map((a) => employeesById.get(a.employeeId))
    .filter(Boolean)
    .map((e) => abbrevFirstName(e!))
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

  const line2 =
    names.length > 0 ? names.join(", ") : "Assigned";

  const firstEmp = shift.assignments
    .map((a) => employeesById.get(a.employeeId))
    .find(Boolean);

  const outOfDepartment =
    !!firstEmp &&
    !firstEmp.departments.some((ed) => ed.departmentId === shift.departmentId);

  return { ...base, line2, outOfDepartment };
}

type PositionDef = {
  rowId: string;
  departmentId: string;
  roleId: string | null;
  label: string;
  sortKey: string;
};

export function buildManagerPositionGridRows(opts: {
  shifts: ShiftRow[];
  employees: EmpRow[];
  departments: DeptRow[];
  weekDays: WeekDay[];
  scheduleTz: string;
  departmentId?: string;
  roleId?: string;
  searchQ: string;
  baseNewShiftQuery: NewShiftQueryContext;
}): ScheduleWeekRow[] {
  const {
    shifts,
    employees,
    departments,
    weekDays,
    scheduleTz,
    departmentId,
    roleId,
    searchQ,
    baseNewShiftQuery,
  } = opts;

  const employeesById = new Map(employees.map((e) => [e.id, e]));

  const singleDepartmentContext = Boolean(departmentId);

  const positions: PositionDef[] = [];

  for (const d of departments) {
    if (departmentId && d.id !== departmentId) continue;
    for (const r of d.roles) {
      if (roleId && r.id !== roleId) continue;
      positions.push({
        rowId: `role:${r.id}`,
        departmentId: d.id,
        roleId: r.id,
        label: positionLabel(r.name, d, singleDepartmentContext),
        sortKey: `${d.name} ${r.name}`.toLowerCase(),
      });
    }
  }

  const noRoleShiftsFiltered = shifts.filter((s) => {
    if (s.roleId != null) return false;
    if (departmentId && s.departmentId !== departmentId) return false;
    return true;
  });
  if (noRoleShiftsFiltered.length > 0 && !roleId) {
    positions.push({
      rowId: "role:none",
      departmentId: noRoleShiftsFiltered[0]!.departmentId,
      roleId: null,
      label: "No position",
      sortKey: "zzzz-no-position",
    });
  }

  positions.sort((a, b) => a.sortKey.localeCompare(b.sortKey));

  const q = searchQ.trim().toLowerCase();
  const filteredPositions = q
    ? positions.filter((p) => p.label.toLowerCase().includes(q))
    : positions;

  const emptyDays = (): Record<string, ScheduleWeekBlock[]> => {
    const m: Record<string, ScheduleWeekBlock[]> = {};
    for (const d of weekDays) m[d.isoKey] = [];
    return m;
  };

  const rows: ScheduleWeekRow[] = [];

  for (const pos of filteredPositions) {
    if (!pos.departmentId) continue;

    const accent = roleScheduleAccent(pos.roleId ?? `dept:${pos.departmentId}`);
    const blocksByDay = emptyDays();
    const daySummaries: Record<string, string> = {};
    let weekMinutes = 0;

    for (const d of weekDays) {
      const dayIso = d.isoKey;
      const dayShifts = sortShiftsChronological(
        shifts.filter((s) => {
          if (shiftDayIso(s, scheduleTz) !== dayIso) return false;
          if (pos.roleId == null) {
            if (s.roleId != null) return false;
            if (departmentId && s.departmentId !== departmentId) return false;
            return true;
          }
          return s.roleId === pos.roleId && s.departmentId === pos.departmentId;
        }),
      );

      let assigned = 0;
      let open = 0;
      const blocks: ScheduleWeekBlock[] = [];

      for (const s of dayShifts) {
        weekMinutes += (s.endsAt.getTime() - s.startsAt.getTime()) / 60000;
        if (s.assignments.length === 0) {
          open += 1;
          blocks.push(
            shiftToPositionBlock(s, "open", scheduleTz, employeesById, accent),
          );
        } else {
          assigned += 1;
          blocks.push(
            shiftToPositionBlock(
              s,
              "assigned",
              scheduleTz,
              employeesById,
              accent,
            ),
          );
        }
      }

      blocksByDay[dayIso] = blocks;
      if (assigned > 0 || open > 0) {
        daySummaries[dayIso] = `${assigned} A | ${open} O`;
      }
    }

    const hrs = Math.round((weekMinutes / 60) * 10) / 10;
    const detail =
      weekMinutes > 0 ? `${hrs} hrs this week` : undefined;

    rows.push({
      rowId: pos.rowId,
      name: pos.label,
      detail,
      blocksByDay,
      rowSwatchColor: accent.swatch,
      daySummaries,
      newShiftQueryOverride: {
        ...baseNewShiftQuery,
        departmentId: pos.departmentId,
        ...(pos.roleId ? { roleId: pos.roleId } : {}),
      },
      acceptsDrop: false,
      isPositionRow: true,
    });
  }

  return rows;
}
