import { addDays } from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import type { TimeOffBlackout } from "@prisma/client";
import {
  formatDatetimeLocalInTimezone,
  parseYmdTime,
  zonedDayBoundsUtc,
} from "@/lib/schedule/tz";

/**
 * Calendar days after "today" (in org schedule TZ) that are still blocked, not counting today.
 * With value 14: today through today+14 inclusive are blocked (e.g. Apr 7 → blocked through Apr 21;
 * first selectable calendar day is Apr 22).
 */
export const TIME_OFF_BLOCKED_DAYS_AFTER_TODAY = 14;

function addCalendarDaysToYmd(
  ymd: string,
  deltaDays: number,
  tz: string,
): string {
  const anchor = fromZonedTime(parseYmdTime(ymd, 12, 0, 0), tz);
  const z = toZonedTime(anchor, tz);
  const shifted = addDays(z, deltaDays);
  return formatInTimeZone(fromZonedTime(shifted, tz), tz, "yyyy-MM-dd");
}

/** Last calendar date (YMD in org TZ) that employees cannot include in a new request. */
export function leadTimeBlockLastYmd(now: Date, scheduleTz: string): string {
  const todayYmd = formatInTimeZone(now, scheduleTz, "yyyy-MM-dd");
  return addCalendarDaysToYmd(
    todayYmd,
    TIME_OFF_BLOCKED_DAYS_AFTER_TODAY,
    scheduleTz,
  );
}

/** First calendar date (YMD) when new requests may begin (start of that day in org TZ, UTC). */
export function firstAllowedTimeOffDayStartUtc(
  now: Date,
  scheduleTz: string,
): Date {
  const todayYmd = formatInTimeZone(now, scheduleTz, "yyyy-MM-dd");
  const firstAllowedYmd = addCalendarDaysToYmd(
    todayYmd,
    TIME_OFF_BLOCKED_DAYS_AFTER_TODAY + 1,
    scheduleTz,
  );
  return zonedDayBoundsUtc(firstAllowedYmd, scheduleTz).start;
}

/**
 * True if [startsAt, endsAt] touches any calendar day in the rolling block
 * [today … today + TIME_OFF_BLOCKED_DAYS_AFTER_TODAY] in org schedule TZ.
 */
export function timeOffOverlapsMinimumLeadTimeBlock(
  startsAt: Date,
  endsAt: Date,
  now: Date,
  scheduleTz: string,
): boolean {
  const todayYmd = formatInTimeZone(now, scheduleTz, "yyyy-MM-dd");
  const blockLastYmd = leadTimeBlockLastYmd(now, scheduleTz);
  const reqStartYmd = formatInTimeZone(startsAt, scheduleTz, "yyyy-MM-dd");
  const reqEndYmd = formatInTimeZone(endsAt, scheduleTz, "yyyy-MM-dd");
  return reqStartYmd <= blockLastYmd && reqEndYmd >= todayYmd;
}

/**
 * Request overlaps a blackout if any calendar day (in schedule TZ) touched by [startsAt, endsAt]
 * falls within an inclusive YMD range.
 */
export function timeOffOverlapsBlackout(
  startsAt: Date,
  endsAt: Date,
  scheduleTz: string,
  blackouts: Pick<TimeOffBlackout, "startsOnYmd" | "endsOnYmd">[],
): boolean {
  if (blackouts.length === 0) return false;
  const reqStartYmd = formatInTimeZone(startsAt, scheduleTz, "yyyy-MM-dd");
  const reqEndYmd = formatInTimeZone(endsAt, scheduleTz, "yyyy-MM-dd");
  return blackouts.some(
    (b) => reqStartYmd <= b.endsOnYmd && reqEndYmd >= b.startsOnYmd,
  );
}

export function defaultTimeOffDraftDatetimeLocals(
  now: Date,
  scheduleTz: string,
): { start: string; end: string; min: string } {
  const firstAllowedStartUtc = firstAllowedTimeOffDayStartUtc(now, scheduleTz);
  const z = toZonedTime(firstAllowedStartUtc, scheduleTz);
  const startZ = new Date(z);
  startZ.setHours(9, 0, 0, 0);
  let startUtc = fromZonedTime(startZ, scheduleTz);

  const endZ = toZonedTime(startUtc, scheduleTz);
  endZ.setHours(17, 0, 0, 0);
  let endUtc = fromZonedTime(endZ, scheduleTz);
  if (endUtc <= startUtc) {
    endUtc = new Date(startUtc.getTime() + 60 * 60 * 1000);
  }

  return {
    start: formatDatetimeLocalInTimezone(startUtc, scheduleTz),
    end: formatDatetimeLocalInTimezone(endUtc, scheduleTz),
    min: formatDatetimeLocalInTimezone(firstAllowedStartUtc, scheduleTz),
  };
}
