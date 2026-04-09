import type { CompanyHoliday, CompensationType } from "@prisma/client";
import { fromZonedTime } from "date-fns-tz";
import { prisma } from "@/lib/db";
import { overlapMinutes } from "@/lib/datetime";

export type HolidayPayReportRow = {
  employeeId: string;
  name: string;
  email: string;
  compensationType: CompensationType;
  holidayPayEligible: boolean;
  workedHoursOnHoliday: number;
  /** Extra hours owed above straight time (multiplier − 1) × worked hours. */
  premiumExtraHours: number;
  /** Paid holiday hours when configured and employee did not work (hourly only). */
  paidAbsenceHours: number | null;
};

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export function holidayDayUtcBounds(
  holidayDateYmd: string,
  scheduleTimeZone: string,
): { start: Date; end: Date } | null {
  if (!YMD.test(holidayDateYmd)) return null;
  const start = fromZonedTime(`${holidayDateYmd}T00:00:00`, scheduleTimeZone);
  const end = fromZonedTime(`${holidayDateYmd}T23:59:59.999`, scheduleTimeZone);
  return { start, end };
}

function roundHours2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Punch overlap minutes with [bounds.start, bounds.end], treating open punches as ending at `nowCapped`.
 */
function punchOverlapMinutes(
  clockInAt: Date,
  clockOutAt: Date | null,
  bounds: { start: Date; end: Date },
  nowCapped: Date,
): number {
  const segEnd = clockOutAt ?? nowCapped;
  const end = segEnd > nowCapped ? nowCapped : segEnd;
  return overlapMinutes(clockInAt, end, bounds.start, bounds.end);
}

export async function buildHolidayPayReport(input: {
  holiday: CompanyHoliday;
  scheduleTimeZone: string;
  now?: Date;
}): Promise<{
  rows: HolidayPayReportRow[];
  bounds: { start: Date; end: Date };
  error?: string;
}> {
  const now = input.now ?? new Date();
  const bounds = holidayDayUtcBounds(
    input.holiday.holidayDateYmd,
    input.scheduleTimeZone,
  );
  if (!bounds) {
    return {
      rows: [],
      bounds: { start: now, end: now },
      error: "Invalid holiday date.",
    };
  }

  const nowCapped =
    now > bounds.end ? bounds.end : now < bounds.start ? bounds.start : now;

  const mult = Number(input.holiday.workPremiumMultiplier);
  const premiumFactor = mult > 1 ? mult - 1 : 0;
  const paidAbsenceConfigured =
    input.holiday.paidAbsenceHours != null
      ? Number(input.holiday.paidAbsenceHours)
      : null;

  const [employees, punches] = await Promise.all([
    prisma.employee.findMany({
      where: { archivedAt: null },
      include: {
        user: { select: { name: true, email: true } },
      },
      orderBy: { user: { email: "asc" } },
    }),
    prisma.shiftTimePunch.findMany({
      where: {
        AND: [
          { clockInAt: { lt: bounds.end } },
          {
            OR: [{ clockOutAt: null }, { clockOutAt: { gt: bounds.start } }],
          },
        ],
      },
      include: {
        assignment: {
          select: { employeeId: true },
        },
      },
    }),
  ]);

  const workedMinutesByEmployee = new Map<string, number>();
  for (const p of punches) {
    const eid = p.assignment.employeeId;
    const m = punchOverlapMinutes(
      p.clockInAt,
      p.clockOutAt,
      bounds,
      nowCapped,
    );
    if (m <= 0) continue;
    workedMinutesByEmployee.set(
      eid,
      (workedMinutesByEmployee.get(eid) ?? 0) + m,
    );
  }

  const rows: HolidayPayReportRow[] = employees.map((emp) => {
    const workedMinutes = workedMinutesByEmployee.get(emp.id) ?? 0;
    const workedHours = roundHours2(workedMinutes / 60);
    const premiumExtraHours =
      emp.holidayPayEligible && premiumFactor > 0
        ? roundHours2(workedHours * premiumFactor)
        : 0;

    let paidAbsenceHours: number | null = null;
    if (
      emp.holidayPayEligible &&
      paidAbsenceConfigured != null &&
      paidAbsenceConfigured > 0 &&
      workedMinutes === 0 &&
      emp.compensationType === "HOURLY"
    ) {
      paidAbsenceHours = roundHours2(paidAbsenceConfigured);
    }

    return {
      employeeId: emp.id,
      name: emp.user.name?.trim() || emp.user.email,
      email: emp.user.email,
      compensationType: emp.compensationType,
      holidayPayEligible: emp.holidayPayEligible,
      workedHoursOnHoliday: workedHours,
      premiumExtraHours,
      paidAbsenceHours,
    };
  });

  return { rows, bounds };
}
