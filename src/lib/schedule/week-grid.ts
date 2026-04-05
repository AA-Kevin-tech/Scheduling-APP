import { addDays } from "date-fns";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";

export type WeekDayColumn = {
  /** Calendar date in the schedule timezone (YYYY-MM-DD). */
  isoKey: string;
  /** UTC instant for that day at 00:00 in the zone (for legacy helpers). */
  date: Date;
  weekdayShort: string;
  dayNum: number;
};

/** Seven columns Mon–Sun for the week starting at `weekStartUtc` (Monday 00:00 in `timeZone`). */
export function buildWeekColumns(
  weekStartUtc: Date,
  timeZone: string,
): WeekDayColumn[] {
  const out: WeekDayColumn[] = [];
  const zMonday = toZonedTime(weekStartUtc, timeZone);
  for (let i = 0; i < 7; i++) {
    const zDay = addDays(zMonday, i);
    const isoKey = formatInTimeZone(zDay, timeZone, "yyyy-MM-dd");
    const date = new Date(zDay.getTime());
    out.push({
      isoKey,
      date,
      weekdayShort: formatInTimeZone(zDay, timeZone, "EEE"),
      dayNum: Number(formatInTimeZone(zDay, timeZone, "d")),
    });
  }
  return out;
}

export function formatShiftTimeRange(
  startsAt: Date,
  endsAt: Date,
  timeZone: string,
): string {
  const a = formatInTimeZone(startsAt, timeZone, "h:mm a");
  const b = formatInTimeZone(endsAt, timeZone, "h:mm a");
  return `${a} – ${b}`;
}

/** Whole-shift hours (for row totals). */
export function shiftHours(startsAt: Date, endsAt: Date): number {
  return Math.round(((endsAt.getTime() - startsAt.getTime()) / 3600000) * 10) / 10;
}
