import Link from "next/link";
import { requireEmployeeProfile } from "@/lib/auth/guards";
import {
  ScheduleWeekGrid,
  type ScheduleWeekBlock,
  type ScheduleWeekRow,
} from "@/components/schedule/schedule-week-grid";
import {
  addDaysUtc,
  addWeeksUtc,
  endOfDayUtc,
  intervalsOverlap,
  parseDateParam,
  startOfDayUtc,
  startOfWeekMondayUtc,
  toIsoDate,
} from "@/lib/datetime";
import { getApprovedTimeOffOverlappingRange } from "@/lib/queries/time-off";
import {
  buildWeekColumns,
  formatShiftTimeRange,
  shiftHours,
} from "@/lib/schedule/week-grid";
import { getShiftsForEmployee } from "@/lib/queries/schedule";

export default async function EmployeeSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { session, employeeId } = await requireEmployeeProfile();
  const user = session.user;
  const params = await searchParams;

  const anchor = parseDateParam(params.week, new Date());
  const weekStart = startOfWeekMondayUtc(anchor);
  const weekEnd = addWeeksUtc(weekStart, 1);
  const weekLast = addDaysUtc(weekStart, 6);

  const [shifts, timeOff] = await Promise.all([
    getShiftsForEmployee({
      employeeId,
      from: weekStart,
      to: weekEnd,
    }),
    getApprovedTimeOffOverlappingRange(employeeId, weekStart, weekEnd),
  ]);

  const prevWeek = addWeeksUtc(weekStart, -1);
  const nextWeek = addWeeksUtc(weekStart, 1);

  const weekDays = buildWeekColumns(weekStart);
  const todayIso = toIsoDate(new Date());

  const name = user.name?.trim() || user.email || "Me";

  const rows = buildEmployeeGridRow({
    name,
    shifts,
    timeOff,
    weekDays,
  });

  const footerHoursByDay = buildEmployeeFooterHours(shifts, weekDays);

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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-slate-900">My schedule</h1>
        <Link
          href="/employee/availability"
          className="text-sm text-sky-700 hover:underline"
        >
          Availability
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/employee/schedule?week=${toIsoDate(prevWeek)}`}
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
          href={`/employee/schedule?week=${toIsoDate(nextWeek)}`}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
          aria-label="Next week"
        >
          →
        </Link>
        <Link
          href={`/employee/schedule?week=${toIsoDate(startOfWeekMondayUtc(new Date()))}`}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          Today
        </Link>
      </div>

      <ScheduleWeekGrid
        weekDays={weekDays}
        todayIso={todayIso}
        rows={rowsWithDetail}
        footerHoursByDay={footerHoursByDay}
        emptyMessage={
          shifts.length === 0 && timeOff.length === 0
            ? "Nothing scheduled this week."
            : undefined
        }
      />
    </div>
  );
}

type ShiftEmp = Awaited<ReturnType<typeof getShiftsForEmployee>>[number];
type TimeOffRow = Awaited<
  ReturnType<typeof getApprovedTimeOffOverlappingRange>
>[number];
type WeekDay = ReturnType<typeof buildWeekColumns>[number];

function buildEmployeeGridRow(opts: {
  name: string;
  shifts: ShiftEmp[];
  timeOff: TimeOffRow[];
  weekDays: WeekDay[];
}): ScheduleWeekRow[] {
  const { name, shifts, timeOff, weekDays } = opts;

  const emptyDays = (): Record<string, ScheduleWeekBlock[]> => {
    const m: Record<string, ScheduleWeekBlock[]> = {};
    for (const d of weekDays) m[d.isoKey] = [];
    return m;
  };

  const blocksByDay = emptyDays();

  const byDay = new Map<string, ShiftEmp[]>();
  for (const d of weekDays) byDay.set(d.isoKey, []);
  for (const s of shifts) {
    const day = toIsoDate(s.startsAt);
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
      line1: formatShiftTimeRange(s.startsAt, s.endsAt),
      line2:
        [s.role?.name, s.department.name].filter(Boolean).join(" · ") ||
        undefined,
      variant: "assigned" as const,
    }));

    const dayStart = startOfDayUtc(d.date);
    const dayEnd = endOfDayUtc(d.date);
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
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const d of weekDays) out[d.isoKey] = 0;
  for (const s of shifts) {
    const day = toIsoDate(s.startsAt);
    if (out[day] === undefined) continue;
    out[day] += shiftHours(s.startsAt, s.endsAt);
  }
  for (const k of Object.keys(out)) {
    out[k] = Math.round(out[k] * 10) / 10;
  }
  return out;
}
