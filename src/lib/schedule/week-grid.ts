import { addDaysUtc, toIsoDate } from "@/lib/datetime";

export type WeekDayColumn = {
  isoKey: string;
  date: Date;
  weekdayShort: string;
  dayNum: number;
};

/** Monday–Sunday UTC columns for the week starting `weekStart`. */
export function buildWeekColumns(weekStart: Date): WeekDayColumn[] {
  const out: WeekDayColumn[] = [];
  for (let i = 0; i < 7; i++) {
    const date = addDaysUtc(weekStart, i);
    const isoKey = toIsoDate(date);
    out.push({
      isoKey,
      date,
      weekdayShort: date.toLocaleDateString(undefined, { weekday: "short", timeZone: "UTC" }),
      dayNum: date.getUTCDate(),
    });
  }
  return out;
}

export function formatShiftTimeRange(startsAt: Date, endsAt: Date): string {
  const opts: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  };
  const a = startsAt.toLocaleTimeString(undefined, opts);
  const b = endsAt.toLocaleTimeString(undefined, opts);
  return `${a} – ${b}`;
}

/** Whole-shift hours (for row totals). */
export function shiftHours(startsAt: Date, endsAt: Date): number {
  return Math.round(((endsAt.getTime() - startsAt.getTime()) / 3600000) * 10) / 10;
}

export function shiftStartsOnDayUtc(startsAt: Date, isoKey: string): boolean {
  return toIsoDate(startsAt) === isoKey;
}
