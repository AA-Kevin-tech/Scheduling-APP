import type { Department, Role, Shift } from "@prisma/client";
import { DEFAULT_MIN_REST_MINUTES } from "@/lib/constants/scheduling";
import { addWeeksUtc, overlapMinutes, startOfWeekMondayUtc } from "@/lib/datetime";
import { prisma } from "@/lib/db";
import {
  validateQualification,
  validateRestPeriod,
  type QualificationInput,
} from "@/lib/validation/swap-eligibility";
import {
  getEffectiveHourCaps,
  getRestAnchorsForEmployee,
  sumAssignedMinutesInRange,
  sumAssignedMinutesOnCalendarDay,
} from "@/lib/services/hours";

export type SwapTakeValidationParams = {
  takerEmployeeId: string;
  shift: Shift & { department: Department; role: Role | null };
  dropAssignmentId: string | null;
};

/** Validates an employee taking a shift (swap pickup / two-way leg). */
export async function validateEmployeeTakingShift(
  params: SwapTakeValidationParams,
): Promise<{ ok: boolean; reasons: string[] }> {
  const { takerEmployeeId, shift, dropAssignmentId } = params;
  const reasons: string[] = [];
  const excludeIds = dropAssignmentId ? [dropAssignmentId] : [];

  const memberships = await prisma.employeeDepartment.findMany({
    where: { employeeId: takerEmployeeId },
    select: { departmentId: true, roleId: true },
  });

  const qualification: QualificationInput = {
    employeeDepartmentIds: memberships.map((m) => m.departmentId),
    employeeRoleIds: memberships
      .map((m) => m.roleId)
      .filter((id): id is string => id != null),
    shiftDepartmentId: shift.departmentId,
    shiftRoleId: shift.roleId,
  };
  reasons.push(...validateQualification(qualification).reasons);

  const weekStart = startOfWeekMondayUtc(shift.startsAt);
  const weekEnd = addWeeksUtc(weekStart, 1);

  const weeklyWorked = await sumAssignedMinutesInRange(
    takerEmployeeId,
    weekStart,
    weekEnd,
    excludeIds,
  );
  const addWeekly = overlapMinutes(
    shift.startsAt,
    shift.endsAt,
    weekStart,
    weekEnd,
  );

  const { weeklyMaxMinutes, dailyMaxMinutes } =
    await getEffectiveHourCaps(takerEmployeeId);

  const weeklyAfter = weeklyWorked + addWeekly;
  if (weeklyMaxMinutes != null && weeklyAfter > weeklyMaxMinutes) {
    reasons.push(
      `Weekly hours would exceed the limit (${Math.floor(weeklyMaxMinutes / 60)}h max).`,
    );
  }

  const dayStart = new Date(shift.startsAt);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

  const dailyWorked = await sumAssignedMinutesOnCalendarDay(
    takerEmployeeId,
    new Date(shift.startsAt),
    excludeIds,
  );
  const addDaily = overlapMinutes(
    shift.startsAt,
    shift.endsAt,
    dayStart,
    dayEnd,
  );
  const dailyAfter = dailyWorked + addDaily;
  if (dailyMaxMinutes != null && dailyAfter > dailyMaxMinutes) {
    reasons.push(
      `Daily hours would exceed the limit (${Math.floor(dailyMaxMinutes / 60)}h max).`,
    );
  }

  const anchors = await getRestAnchorsForEmployee(
    takerEmployeeId,
    shift.startsAt,
    shift.endsAt,
    excludeIds,
  );
  reasons.push(
    ...validateRestPeriod({
      proposedShift: { startsAt: shift.startsAt, endsAt: shift.endsAt },
      priorShiftEnd: anchors.priorShiftEnd,
      nextShiftStart: anchors.nextShiftStart,
      minimumRestMinutes: DEFAULT_MIN_REST_MINUTES,
    }).reasons,
  );

  return { ok: reasons.length === 0, reasons };
}
