import { addDays, startOfWeek } from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

/** Org default for manager schedule board and shift-create defaults. */
export function getDefaultScheduleTimezone(): string {
  return process.env.NEXT_PUBLIC_DEFAULT_SCHEDULE_TIMEZONE ?? "America/Chicago";
}

/** Validate IANA id; fallback to default if invalid. */
export function normalizeIanaTimezone(raw: string | null | undefined): string {
  const fallback = getDefaultScheduleTimezone();
  if (!raw?.trim()) return fallback;
  const tz = raw.trim();
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return tz;
  } catch {
    return fallback;
  }
}

export function parseYmdTime(
  ymd: string,
  hh: number,
  mm: number,
  ss: number,
): Date {
  const [y, mo, d] = ymd.split("-").map(Number);
  return new Date(y, mo - 1, d, hh, mm, ss, 0);
}

/** Monday 00:00 (wall) in `tz` → UTC instant, for the week containing `instant`. */
export function startOfWeekMondayUtcInZone(instant: Date, tz: string): Date {
  const zoned = toZonedTime(instant, tz);
  const monday = startOfWeek(zoned, { weekStartsOn: 1 });
  monday.setHours(0, 0, 0, 0);
  return fromZonedTime(monday, tz);
}

/** `[from, to)` where `from` is Monday 00:00 in zone and `to` is the next Monday 00:00. */
export function weekRangeUtcForZoneAnchor(anchorUtc: Date, tz: string): {
  from: Date;
  to: Date;
} {
  const from = startOfWeekMondayUtcInZone(anchorUtc, tz);
  const zMonday = toZonedTime(from, tz);
  const nextMondayZ = addDays(zMonday, 7);
  nextMondayZ.setHours(0, 0, 0, 0);
  const to = fromZonedTime(nextMondayZ, tz);
  return { from, to };
}

/**
 * `week` query: `YYYY-MM-DD` = any day in that week (in `tz`), or omit → current instant.
 * Returns UTC range for DB queries and the Monday `YYYY-MM-DD` in `tz` for URLs.
 */
export function resolveWeekRangeFromQuery(
  weekParam: string | undefined,
  tz: string,
  now: Date,
): { from: Date; to: Date; mondayIso: string } {
  const anchor =
    weekParam && /^\d{4}-\d{2}-\d{2}$/.test(weekParam)
      ? fromZonedTime(parseYmdTime(weekParam, 12, 0, 0), tz)
      : now;
  const { from, to } = weekRangeUtcForZoneAnchor(anchor, tz);
  const mondayIso = formatInTimeZone(from, tz, "yyyy-MM-dd");
  return { from, to, mondayIso };
}

export function todayIsoInZone(now: Date, tz: string): string {
  return formatInTimeZone(now, tz, "yyyy-MM-dd");
}

/** Parse `datetime-local` value as wall time in `tz` → UTC `Date`. */
export function parseDatetimeLocalInTimezone(
  raw: string,
  tz: string,
): Date | null {
  const s = raw.trim();
  if (!s) return null;
  const normalized = s.includes("T") ? s : s.replace(" ", "T");
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(normalized);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const hh = Number(m[4]);
  const mm = Number(m[5]);
  return fromZonedTime(new Date(y, mo - 1, d, hh, mm, 0, 0), tz);
}

/** Format UTC instant as `yyyy-MM-ddTHH:mm` for `<input type="datetime-local" />` in `tz`. */
export function formatDatetimeLocalInTimezone(instant: Date, tz: string): string {
  return formatInTimeZone(instant, tz, "yyyy-MM-dd'T'HH:mm");
}

/** Start/end of a calendar day (`isoKey`) in `tz`, as UTC instants (for overlap checks). */
export function zonedDayBoundsUtc(
  isoKey: string,
  tz: string,
): { start: Date; end: Date } {
  const [y, mo, d] = isoKey.split("-").map(Number);
  const start = fromZonedTime(new Date(y, mo - 1, d, 0, 0, 0, 0), tz);
  const end = fromZonedTime(new Date(y, mo - 1, d, 23, 59, 59, 999), tz);
  return { start, end };
}

/** Move a Monday `YYYY-MM-DD` by `deltaWeeks` in `tz` (keeps Monday 00:00 alignment). */
export function addWeeksToMondayIso(
  mondayIso: string,
  deltaWeeks: number,
  tz: string,
): string {
  const from = fromZonedTime(parseYmdTime(mondayIso, 0, 0, 0), tz);
  const z = toZonedTime(from, tz);
  const shifted = addDays(z, deltaWeeks * 7);
  shifted.setHours(0, 0, 0, 0);
  return formatInTimeZone(fromZonedTime(shifted, tz), tz, "yyyy-MM-dd");
}
