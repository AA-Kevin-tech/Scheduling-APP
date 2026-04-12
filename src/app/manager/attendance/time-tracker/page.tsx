import Link from "next/link";
import { getSchedulingLocationIdsForSession } from "@/lib/auth/location-scope";
import { requireManager } from "@/lib/auth/guards";
import { getPublishedShiftsOverlappingDayForLocations } from "@/lib/queries/manager-attendance";
import {
  addCalendarDaysInZone,
  getDefaultScheduleTimezone,
  todayIsoInZone,
  zonedDayBoundsUtc,
} from "@/lib/schedule/tz";
import { firstSearchParam } from "@/lib/search-params";
import {
  type TimeTrackerRow,
  type TimeTrackerSegment,
  TimeTrackerDayGrid,
} from "@/components/manager/time-tracker-day-grid";

function employeeLabel(name: string | null | undefined, email: string): string {
  return name?.trim() || email;
}

export default async function ManagerTimeTrackerPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string | string[] }>;
}) {
  const session = await requireManager();
  const locationIds = await getSchedulingLocationIdsForSession(session);
  const tz = getDefaultScheduleTimezone();
  const now = new Date();
  const raw = await searchParams;
  const dateRaw = firstSearchParam(raw.date);
  const isoKey =
    dateRaw && /^\d{4}-\d{2}-\d{2}$/.test(dateRaw)
      ? dateRaw
      : todayIsoInZone(now, tz);

  const prevIso = addCalendarDaysInZone(isoKey, -1, tz);
  const nextIso = addCalendarDaysInZone(isoKey, 1, tz);

  const { start: dayStart, end: dayEnd } = zonedDayBoundsUtc(isoKey, tz);

  const shifts = await getPublishedShiftsOverlappingDayForLocations({
    dayStartUtc: dayStart,
    dayEndUtc: dayEnd,
    locationIds,
  });

  const byEmployee = new Map<
    string,
    { label: string; segments: TimeTrackerSegment[] }
  >();

  for (const shift of shifts) {
    const title = [shift.department.name, shift.role?.name]
      .filter(Boolean)
      .join(" · ");
    for (const asg of shift.assignments) {
      const u = asg.employee.user;
      const label = employeeLabel(u.name, u.email);
      let row = byEmployee.get(asg.employeeId);
      if (!row) {
        row = { label, segments: [] };
        byEmployee.set(asg.employeeId, row);
      }
      row.segments.push({
        kind: "scheduled",
        start: shift.startsAt,
        end: shift.endsAt,
        title,
      });
      for (const p of asg.timePunches) {
        row.segments.push({
          kind: "punched",
          start: p.clockInAt,
          end: p.clockOutAt ?? now,
          open: p.clockOutAt == null,
          title,
        });
      }
    }
  }

  const rows: TimeTrackerRow[] = [...byEmployee.entries()]
    .map(([employeeId, v]) => ({
      employeeId,
      label: v.label,
      segments: v.segments,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  function dayHref(d: string) {
    return `/manager/attendance/time-tracker?date=${encodeURIComponent(d)}`;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Time tracker</h1>
          <p className="mt-1 text-sm text-slate-600">
            One day at a time: scheduled shifts (gray) vs actual punches (blue
            complete, green open). Respects your location scope.
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
          href={dayHref(prevIso)}
          className="rounded-md border border-slate-200 px-2 py-1 text-slate-700 hover:bg-slate-50"
        >
          ← Prev day
        </Link>
        <span className="font-medium tabular-nums text-slate-800">{isoKey}</span>
        <Link
          href={dayHref(nextIso)}
          className="rounded-md border border-slate-200 px-2 py-1 text-slate-700 hover:bg-slate-50"
        >
          Next day →
        </Link>
        <Link
          href={dayHref(todayIsoInZone(now, tz))}
          className="ml-2 rounded-md bg-slate-900 px-2 py-1 text-white hover:bg-slate-800"
        >
          Today
        </Link>
      </div>

      <div className="surface-card p-4">
        <TimeTrackerDayGrid
          rows={rows}
          dayStart={dayStart}
          dayEnd={dayEnd}
          tzLabel={tz}
        />
      </div>
    </div>
  );
}
