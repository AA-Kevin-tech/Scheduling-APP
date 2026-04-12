import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import { WeekAnnouncementStrip } from "@/components/schedule/week-announcement-strip";
import { requireEmployeeProfile } from "@/lib/auth/guards";
import { addWeeksUtc, startOfWeekMondayUtc } from "@/lib/datetime";
import { prisma } from "@/lib/db";
import {
  listScheduleAnnotationsOverlappingYmdRange,
  toScheduleAnnotationDto,
} from "@/lib/queries/schedule-annotations";
import {
  getEffectiveHourCaps,
  sumPublishedAssignedMinutesInRange,
} from "@/lib/services/hours";
import { addCalendarDaysInZone, normalizeIanaTimezone } from "@/lib/schedule/tz";
import { sumWorkedMinutesInRange } from "@/lib/time-clock/worked-minutes";
import { EmployeeHomeClockSection } from "@/components/employee/employee-home-clock";
import { getTerminalDashboard } from "@/lib/queries/time-clock-dashboard";
import { getEmployeeAccountClockEnabled } from "@/lib/queries/organization-settings";

/** Payroll-style decimal hours from whole minutes (e.g. 7.50). */
function formatDecimalHoursFromMinutes(minutes: number): string {
  return (minutes / 60).toFixed(2);
}

export default async function EmployeeHomePage() {
  const { session, employeeId } = await requireEmployeeProfile();
  const name = session.user.name ?? session.user.email ?? "there";

  const empVenues = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: {
      timezone: true,
      locations: { select: { locationId: true } },
      departments: { select: { department: { select: { locationId: true } } } },
    },
  });
  const empTz = normalizeIanaTimezone(empVenues?.timezone);
  const venueIds = [
    ...new Set([
      ...(empVenues?.locations.map((l) => l.locationId) ?? []),
      ...(empVenues?.departments.map((d) => d.department.locationId) ?? []),
    ]),
  ];
  const todayYmd = formatInTimeZone(new Date(), empTz, "yyyy-MM-dd");
  const throughYmd = addCalendarDaysInZone(todayYmd, 8, empTz);
  const homeAnnouncements =
    venueIds.length > 0
      ? (
          await listScheduleAnnotationsOverlappingYmdRange(
            venueIds,
            todayYmd,
            throughYmd,
          )
        )
          .map(toScheduleAnnotationDto)
          .filter((a) => a.showAnnouncement)
          .sort((a, b) => {
            const byDate = a.startsOnYmd.localeCompare(b.startsOnYmd);
            if (byDate !== 0) return byDate;
            return a.title.localeCompare(b.title);
          })
      : [];

  const now = new Date();
  const weekStart = startOfWeekMondayUtc(now);
  const weekEnd = addWeeksUtc(weekStart, 1);
  const [workedMinutes, scheduledMinutes, caps, allowWebClock] = await Promise.all([
    sumWorkedMinutesInRange(employeeId, weekStart, weekEnd, now),
    sumPublishedAssignedMinutesInRange(employeeId, weekStart, weekEnd),
    getEffectiveHourCaps(employeeId),
    getEmployeeAccountClockEnabled(),
  ]);
  const clockDash = allowWebClock
    ? await getTerminalDashboard(employeeId)
    : null;
  const weeklyCap = caps.weeklyMaxMinutes;
  const hoursWorked = formatDecimalHoursFromMinutes(workedMinutes);
  const hoursScheduled = formatDecimalHoursFromMinutes(scheduledMinutes);
  const capH =
    weeklyCap != null ? formatDecimalHoursFromMinutes(weeklyCap) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-zinc-100">Hello, {name}</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">
          Your upcoming shifts and actions in one place.
        </p>
      </div>

      <WeekAnnouncementStrip
        items={homeAnnouncements}
        title="Schedule notes (next several days)"
      />

      <EmployeeHomeClockSection
        allowWebClock={allowWebClock}
        dash={clockDash}
      />

      <section className="surface-card p-4">
        <h2 className="text-sm font-medium text-slate-500 dark:text-zinc-500">Hours this week (UTC)</h2>
        <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-900 dark:text-zinc-100">
          {hoursWorked}h worked
          {capH != null ? ` / ${capH}h cap` : ""}
        </p>
        <p className="mt-1 text-base font-medium tabular-nums text-slate-700 dark:text-zinc-300">
          {hoursScheduled}h scheduled this week
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">
          {weeklyCap != null && workedMinutes > weeklyCap * 0.9 && (
            <span className="font-medium text-amber-800">Near weekly limit · </span>
          )}
          Week of {weekStart.toLocaleDateString()}
        </p>
      </section>

      <ul className="grid gap-3">
        <li>
          <Link
            href="/employee/schedule"
            className="surface-card block min-h-[52px] p-4 text-left active:bg-slate-50 hover:border-sky-300 dark:active:bg-slate-800 dark:hover:border-sky-600"
          >
            <span className="font-medium text-slate-900 dark:text-zinc-100">Schedule</span>
            <span className="mt-1 block text-sm text-slate-600 dark:text-zinc-400">
              Your week and shift details; use <strong>Full location</strong> there
              to see everyone published at your site (all departments).
            </span>
          </Link>
        </li>
        <li>
          <Link
            href="/terminal"
            className="surface-card block min-h-[52px] p-4 text-left active:bg-slate-50 hover:border-sky-300 dark:active:bg-slate-800 dark:hover:border-sky-600"
          >
            <span className="font-medium text-slate-900 dark:text-zinc-100">Time clock</span>
            <span className="mt-1 block text-sm text-slate-600 dark:text-zinc-400">
              Use your time clock PIN on the work computer
            </span>
          </Link>
        </li>
        <li>
          <Link
            href="/employee/availability"
            className="surface-card block min-h-[52px] p-4 text-left active:bg-slate-50 hover:border-sky-300 dark:active:bg-slate-800 dark:hover:border-sky-600"
          >
            <span className="font-medium text-slate-900 dark:text-zinc-100">Can&apos;t work</span>
            <span className="mt-1 block text-sm text-slate-600 dark:text-zinc-400">
              Recurring times you are not available
            </span>
          </Link>
        </li>
        <li>
          <Link
            href="/employee/time-off"
            className="surface-card block min-h-[52px] p-4 text-left active:bg-slate-50 hover:border-sky-300 dark:active:bg-slate-800 dark:hover:border-sky-600"
          >
            <span className="font-medium text-slate-900 dark:text-zinc-100">Time off</span>
            <span className="mt-1 block text-sm text-slate-600 dark:text-zinc-400">
              Request and track PTO-style time away
            </span>
          </Link>
        </li>
        <li>
          <Link
            href="/employee/swaps"
            className="surface-card block min-h-[52px] p-4 text-left active:bg-slate-50 hover:border-sky-300 dark:active:bg-slate-800 dark:hover:border-sky-600"
          >
            <span className="font-medium text-slate-900 dark:text-zinc-100">Shift swaps</span>
            <span className="mt-1 block text-sm text-slate-600 dark:text-zinc-400">
              Request and respond to swaps
            </span>
          </Link>
        </li>
        <li>
          <Link
            href="/employee/notifications"
            className="surface-card block min-h-[52px] p-4 text-left active:bg-slate-50 hover:border-sky-300 dark:active:bg-slate-800 dark:hover:border-sky-600"
          >
            <span className="font-medium text-slate-900 dark:text-zinc-100">Notifications</span>
            <span className="mt-1 block text-sm text-slate-600 dark:text-zinc-400">
              Swaps and schedule updates
            </span>
          </Link>
        </li>
      </ul>
    </div>
  );
}
