import { formatInTimeZone } from "date-fns-tz";
import { startOfWeekMondayUtc, toIsoDate } from "@/lib/datetime";
import { prisma } from "@/lib/db";
import {
  formatShiftRange,
  getMissingClockInsDuringShift,
  getMissedShiftsWithoutPunch,
  getOpenPunchesPastShiftEnd,
} from "@/lib/queries/time-clock-issues";
import { getDefaultScheduleTimezone } from "@/lib/schedule/tz";
import { weeklyHourCapWarnPercent } from "@/lib/time-clock/constants";
import { notifyManagersExcept } from "@/lib/services/notifications";

async function alreadyNotified(type: string, dedupeFragment: string) {
  const row = await prisma.notification.findFirst({
    where: { type, body: { contains: dedupeFragment } },
    select: { id: true },
  });
  return Boolean(row);
}

/**
 * Creates one notification per stale issue (deduped globally) so managers/payroll admins
 * see alerts in Notifications without polling this page.
 */
export async function ensureTimeClockIssueNotifications(now = new Date()) {
  const tz = getDefaultScheduleTimezone();
  const [openPast, missing, missed] = await Promise.all([
    getOpenPunchesPastShiftEnd(now),
    getMissingClockInsDuringShift(now),
    getMissedShiftsWithoutPunch(now),
  ]);

  for (const row of openPast) {
    const dedupe = `punch:${row.punchId}`;
    if (await alreadyNotified("TIME_CLOCK_OPEN_PAST_END", dedupe)) continue;
    await notifyManagersExcept(
      null,
      "Time clock: open punch after shift ended",
      `${row.employeeLabel} (${row.departmentName}) is still clocked in after the scheduled end (${formatShiftRange(row.shiftStartsAt, row.shiftEndsAt, tz)}). [${dedupe}]`,
      "TIME_CLOCK_OPEN_PAST_END",
    );
  }

  for (const row of missing) {
    const dedupe = `assignment:${row.assignmentId}`;
    if (await alreadyNotified("TIME_CLOCK_MISSING_CLOCK_IN", dedupe)) continue;
    await notifyManagersExcept(
      null,
      "Time clock: no clock-in yet",
      `${row.employeeLabel} (${row.departmentName}) has not clocked in for a shift that started ${row.minutesSinceStart} min ago (${formatShiftRange(row.shiftStartsAt, row.shiftEndsAt, tz)}). [${dedupe}]`,
      "TIME_CLOCK_MISSING_CLOCK_IN",
    );
  }

  for (const row of missed) {
    const dedupe = `assignment:${row.assignmentId}`;
    if (await alreadyNotified("TIME_CLOCK_MISSED_NO_PUNCH", dedupe)) continue;
    await notifyManagersExcept(
      null,
      "Time clock: ended shift with no punch",
      `${row.employeeLabel} (${row.departmentName}) has no clock-in/out for a shift that already ended (${formatShiftRange(row.shiftStartsAt, row.shiftEndsAt, tz)}). [${dedupe}]`,
      "TIME_CLOCK_MISSED_NO_PUNCH",
    );
  }
}

export async function notifyLateClockIn(opts: {
  employeeLabel: string;
  departmentName: string;
  scheduledStart: Date;
  minutesAfterStart: number;
}) {
  const tz = getDefaultScheduleTimezone();
  const startLabel = formatInTimeZone(opts.scheduledStart, tz, "MMM d, h:mm a");
  await notifyManagersExcept(
    null,
    "Time clock: late clock-in",
    `${opts.employeeLabel} (${opts.departmentName}) clocked in ${opts.minutesAfterStart} min after the scheduled start (${startLabel}).`,
    "TIME_CLOCK_LATE_IN",
  );
}

export async function notifyWeeklyHourCap(opts: {
  employeeLabel: string;
  workedMinutes: number;
  weeklyMaxMinutes: number;
  exceeded: boolean;
  dedupeFragment?: string;
}) {
  const hrs = (opts.workedMinutes / 60).toFixed(1);
  const capHrs = (opts.weeklyMaxMinutes / 60).toFixed(1);
  const title = opts.exceeded
    ? "Time clock: weekly hour limit exceeded"
    : "Time clock: approaching weekly hour limit";
  const pct =
    opts.weeklyMaxMinutes > 0
      ? Math.round((opts.workedMinutes / opts.weeklyMaxMinutes) * 100)
      : 0;
  const body = opts.exceeded
    ? `${opts.employeeLabel} has ${hrs} hrs worked this week vs a cap of ${capHrs} hrs (configured hour limit).${opts.dedupeFragment ? ` ${opts.dedupeFragment}` : ""}`
    : `${opts.employeeLabel} has ${hrs} hrs worked this week (${pct}% of the ${capHrs} hr weekly cap).${opts.dedupeFragment ? ` ${opts.dedupeFragment}` : ""}`;
  await notifyManagersExcept(null, title, body, "TIME_CLOCK_WEEKLY_CAP");
}

/** After a clock-out, notify if weekly worked time crosses hour limits (deduped for “approach” per employee per week). */
export async function notifyWeeklyHourCapAfterClockOut(opts: {
  employeeId: string;
  employeeLabel: string;
  workedMinutes: number;
  weeklyMaxMinutes: number;
  now: Date;
}) {
  const { workedMinutes, weeklyMaxMinutes } = opts;
  if (weeklyMaxMinutes <= 0) return;

  const weekStart = startOfWeekMondayUtc(opts.now);

  if (workedMinutes > weeklyMaxMinutes) {
    const dedupe = `emp:${opts.employeeId}:${toIsoDate(weekStart)}:exceeded`;
    if (await alreadyNotified("TIME_CLOCK_WEEKLY_CAP", dedupe)) return;
    await notifyWeeklyHourCap({
      employeeLabel: opts.employeeLabel,
      workedMinutes,
      weeklyMaxMinutes,
      exceeded: true,
      dedupeFragment: dedupe,
    });
    return;
  }

  const warnPct = weeklyHourCapWarnPercent();
  if (
    workedMinutes >= (weeklyMaxMinutes * warnPct) / 100 &&
    workedMinutes <= weeklyMaxMinutes
  ) {
    const dedupe = `emp:${opts.employeeId}:${toIsoDate(weekStart)}:warn`;
    if (await alreadyNotified("TIME_CLOCK_WEEKLY_CAP", dedupe)) return;
    await notifyWeeklyHourCap({
      employeeLabel: opts.employeeLabel,
      workedMinutes,
      weeklyMaxMinutes,
      exceeded: false,
      dedupeFragment: dedupe,
    });
  }
}
