import type { ReactNode } from "react";
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

const navLinkClass =
  "block rounded-xl px-3 py-3 text-left transition active:bg-slate-100 hover:bg-slate-50 dark:active:bg-slate-800/80 dark:hover:bg-slate-800/60";

function HomePanel({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="surface-card flex flex-col overflow-hidden p-1">
      <h2 className="sr-only">{title}</h2>
      <div className="flex flex-col gap-1">{children}</div>
    </section>
  );
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <HomePanel title="Schedule and time clock">
          <Link
            href="/employee/schedule"
            className={navLinkClass}
          >
            <span className="font-medium text-slate-900 dark:text-zinc-100">Schedule</span>
            <span className="mt-1 block text-sm leading-snug text-slate-600 dark:text-zinc-400">
              Your week and shifts; use <strong className="font-semibold">Full location</strong> to see
              everyone at your site.
            </span>
          </Link>
          <Link href="/terminal" className={navLinkClass}>
            <span className="font-medium text-slate-900 dark:text-zinc-100">Time clock</span>
            <span className="mt-1 block text-sm leading-snug text-slate-600 dark:text-zinc-400">
              Use your time clock PIN on the work computer
            </span>
          </Link>
        </HomePanel>

        <HomePanel title="Availability and time off">
          <Link href="/employee/availability" className={navLinkClass}>
            <span className="font-medium text-slate-900 dark:text-zinc-100">Can&apos;t work</span>
            <span className="mt-1 block text-sm leading-snug text-slate-600 dark:text-zinc-400">
              Recurring times you are not available
            </span>
          </Link>
          <Link href="/employee/time-off" className={navLinkClass}>
            <span className="font-medium text-slate-900 dark:text-zinc-100">Time off</span>
            <span className="mt-1 block text-sm leading-snug text-slate-600 dark:text-zinc-400">
              Request and track PTO-style time away
            </span>
          </Link>
        </HomePanel>

        <HomePanel title="Swaps and notifications">
          <Link href="/employee/swaps" className={navLinkClass}>
            <span className="font-medium text-slate-900 dark:text-zinc-100">Shift swaps</span>
            <span className="mt-1 block text-sm leading-snug text-slate-600 dark:text-zinc-400">
              Request and respond to swaps
            </span>
          </Link>
          <Link href="/employee/notifications" className={navLinkClass}>
            <span className="font-medium text-slate-900 dark:text-zinc-100">Notifications</span>
            <span className="mt-1 block text-sm leading-snug text-slate-600 dark:text-zinc-400">
              Swaps and schedule updates
            </span>
          </Link>
        </HomePanel>

        <HomePanel title="Settings">
          <Link href="/employee/profile" className={navLinkClass}>
            <span className="font-medium text-slate-900 dark:text-zinc-100">Settings</span>
            <span className="mt-1 block text-sm leading-snug text-slate-600 dark:text-zinc-400">
              Profile, contact info, and account updates
            </span>
          </Link>
        </HomePanel>
      </div>
    </div>
  );
}
