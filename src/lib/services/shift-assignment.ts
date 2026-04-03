import { prisma } from "@/lib/db";
import { intervalsOverlap } from "@/lib/datetime";
import { validateEmployeeTakingShift } from "@/lib/services/swap-context";

export type ValidateAssignmentResult = { ok: true } | { ok: false; reasons: string[] };

export async function findOverlappingAssignmentReason(
  employeeId: string,
  shiftStartsAt: Date,
  shiftEndsAt: Date,
  excludeAssignmentId?: string,
): Promise<string | null> {
  const assignments = await prisma.shiftAssignment.findMany({
    where: {
      employeeId,
      ...(excludeAssignmentId ? { id: { not: excludeAssignmentId } } : {}),
    },
    include: {
      shift: { select: { startsAt: true, endsAt: true, id: true } },
    },
  });

  for (const a of assignments) {
    if (
      intervalsOverlap(
        shiftStartsAt,
        shiftEndsAt,
        a.shift.startsAt,
        a.shift.endsAt,
      )
    ) {
      return `Employee is already scheduled for an overlapping shift (${a.shift.startsAt.toISOString()} – ${a.shift.endsAt.toISOString()}).`;
    }
  }
  return null;
}

/** Qualification, overlap, hour caps, and minimum rest (same rules as swaps / eligibility). */
export async function validateShiftAssignment(input: {
  employeeId: string;
  shiftId: string;
  excludeAssignmentId?: string;
}): Promise<ValidateAssignmentResult> {
  const shift = await prisma.shift.findUnique({
    where: { id: input.shiftId },
    include: { department: true, role: true },
  });

  if (!shift) {
    return { ok: false, reasons: ["Shift not found."] };
  }

  const overlap = await findOverlappingAssignmentReason(
    input.employeeId,
    shift.startsAt,
    shift.endsAt,
    input.excludeAssignmentId,
  );

  if (overlap) {
    return { ok: false, reasons: [overlap] };
  }

  const rules = await validateEmployeeTakingShift({
    takerEmployeeId: input.employeeId,
    shift,
    dropAssignmentId: input.excludeAssignmentId ?? null,
  });

  if (!rules.ok) {
    return { ok: false, reasons: rules.reasons };
  }

  return { ok: true };
}
