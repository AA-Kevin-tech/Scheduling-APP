import { prisma } from "@/lib/db";
import { addWeeksUtc, overlapMinutes, startOfWeekMondayUtc } from "@/lib/datetime";

/** Sum worked minutes from punches overlapping the ISO Monday–Sunday week (UTC) containing `refDate`. */
export async function sumWorkedMinutesInIsoWeek(
  employeeId: string,
  refDate: Date,
): Promise<number> {
  const weekStart = startOfWeekMondayUtc(refDate);
  const weekEnd = addWeeksUtc(weekStart, 1);
  const now = new Date();

  const punches = await prisma.shiftTimePunch.findMany({
    where: {
      assignment: { employeeId },
      clockInAt: { lt: weekEnd },
      OR: [{ clockOutAt: null }, { clockOutAt: { gt: weekStart } }],
    },
    select: { clockInAt: true, clockOutAt: true },
  });

  let total = 0;
  for (const p of punches) {
    const segmentEnd = p.clockOutAt ?? now;
    total += overlapMinutes(p.clockInAt, segmentEnd, weekStart, weekEnd);
  }
  return total;
}
