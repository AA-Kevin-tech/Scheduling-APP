import { prisma } from "@/lib/db";
import {
  addWeeksUtc,
  overlapMinutes,
  startOfDayUtc,
  startOfWeekMondayUtc,
} from "@/lib/datetime";

/** Sum worked minutes from punches overlapping [rangeStart, rangeEnd). Open punches use `now` as segment end. */
export async function sumWorkedMinutesInRange(
  employeeId: string,
  rangeStart: Date,
  rangeEnd: Date,
  now: Date = new Date(),
): Promise<number> {
  const punches = await prisma.shiftTimePunch.findMany({
    where: {
      AND: [
        { assignment: { employeeId } },
        { clockInAt: { lt: rangeEnd } },
        {
          OR: [{ clockOutAt: null }, { clockOutAt: { gt: rangeStart } }],
        },
      ],
    },
    select: { clockInAt: true, clockOutAt: true },
  });

  let total = 0;
  for (const p of punches) {
    const segmentEnd = p.clockOutAt ?? now;
    total += overlapMinutes(p.clockInAt, segmentEnd, rangeStart, rangeEnd);
  }
  return total;
}

/** Sum worked minutes from punches overlapping the ISO Monday–Sunday week (UTC) containing `refDate`. */
export async function sumWorkedMinutesInIsoWeek(
  employeeId: string,
  refDate: Date,
): Promise<number> {
  const weekStart = startOfWeekMondayUtc(refDate);
  const weekEnd = addWeeksUtc(weekStart, 1);
  return sumWorkedMinutesInRange(employeeId, weekStart, weekEnd, new Date());
}

/** Sum worked minutes from punches overlapping the last `dayCount` calendar days (UTC), including today. */
export async function sumWorkedMinutesLastDaysUtc(
  employeeId: string,
  dayCount: number,
  now: Date = new Date(),
): Promise<number> {
  const rangeEnd = new Date(now);
  const rangeStart = startOfDayUtc(now);
  rangeStart.setUTCDate(rangeStart.getUTCDate() - (dayCount - 1));
  return sumWorkedMinutesInRange(employeeId, rangeStart, rangeEnd, now);
}
