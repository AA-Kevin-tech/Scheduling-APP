/**
 * Pure swap / assignment validation for server use and future API reuse.
 * Inputs are DTOs — not Prisma models — so this stays portable for React Native clients.
 */

export type IsoDateString = string;

export type ShiftInterval = {
  startsAt: Date | IsoDateString;
  endsAt: Date | IsoDateString;
};

export type QualificationInput = {
  employeeDepartmentIds: string[];
  employeeRoleIds: string[];
  shiftDepartmentId: string;
  shiftRoleId: string | null;
};

export type HourLimitsInput = {
  weeklyWorkedMinutes: number;
  proposedShiftMinutes: number;
  weeklyMaxMinutes: number | null;
};

export type RestPeriodInput = {
  proposedShift: ShiftInterval;
  priorShiftEnd: Date | IsoDateString | null;
  nextShiftStart: Date | IsoDateString | null;
  minimumRestMinutes: number;
};

export type CoverageInput = {
  currentStaffCount: number;
  minStaffCount: number;
};

export type ValidationResult = {
  ok: boolean;
  reasons: string[];
};

function toDate(d: Date | IsoDateString): Date {
  return d instanceof Date ? d : new Date(d);
}

function minutesBetween(a: Date, b: Date): number {
  return Math.abs(Math.round((b.getTime() - a.getTime()) / 60000));
}

/** Rule 1: Employee must be in department and (if shift specifies) role must match. */
export function validateQualification(input: QualificationInput): ValidationResult {
  const reasons: string[] = [];
  if (!input.employeeDepartmentIds.includes(input.shiftDepartmentId)) {
    reasons.push(
      "This employee is not assigned to the department for this shift.",
    );
  }
  if (input.shiftRoleId && !input.employeeRoleIds.includes(input.shiftRoleId)) {
    reasons.push(
      "This employee does not have the required role qualification for this shift.",
    );
  }
  return { ok: reasons.length === 0, reasons };
}

/** Rule 2: Weekly hour cap. */
export function validateHourLimits(input: HourLimitsInput): ValidationResult {
  const reasons: string[] = [];
  const weeklyAfter = input.weeklyWorkedMinutes + input.proposedShiftMinutes;

  if (input.weeklyMaxMinutes != null && weeklyAfter > input.weeklyMaxMinutes) {
    reasons.push(
      `Weekly hours would exceed the limit (${Math.floor(input.weeklyMaxMinutes / 60)}h max).`,
    );
  }
  return { ok: reasons.length === 0, reasons };
}

/** Rule 4: Minimum rest between shifts. */
export function validateRestPeriod(input: RestPeriodInput): ValidationResult {
  const reasons: string[] = [];
  const start = toDate(input.proposedShift.startsAt);
  const end = toDate(input.proposedShift.endsAt);

  if (input.priorShiftEnd) {
    const priorEnd = toDate(input.priorShiftEnd);
    const restAfter = minutesBetween(priorEnd, start);
    if (restAfter < input.minimumRestMinutes) {
      reasons.push(
        `Minimum rest between shifts is ${input.minimumRestMinutes} minutes. After the previous shift ends, only ${restAfter} minutes until this shift starts.`,
      );
    }
  }

  if (input.nextShiftStart) {
    const nextStart = toDate(input.nextShiftStart);
    const restBefore = minutesBetween(end, nextStart);
    if (restBefore < input.minimumRestMinutes) {
      reasons.push(
        `Minimum rest between shifts is ${input.minimumRestMinutes} minutes. Only ${restBefore} minutes after this shift until the next shift starts.`,
      );
    }
  }

  return { ok: reasons.length === 0, reasons };
}

/** Rule 5: Department minimum coverage (simplified headcount check). */
export function validateCoverage(input: CoverageInput): ValidationResult {
  const reasons: string[] = [];
  if (input.currentStaffCount < input.minStaffCount) {
    reasons.push(
      `Department would be below minimum coverage (need ${input.minStaffCount}, have ${input.currentStaffCount}).`,
    );
  }
  return { ok: reasons.length === 0, reasons };
}
