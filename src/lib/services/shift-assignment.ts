import { prisma } from "@/lib/db";
import { intervalsOverlap } from "@/lib/datetime";
import {
  employeeQualifiesForShift,
  qualificationFailureReasons,
  type DeptMembership,
} from "@/lib/validation/shift-assignment";

export type ValidateAssignmentResult = { ok: true } | { ok: false; reasons: string[] };

export async function getEmployeeDepartmentMemberships(
  employeeId: string,
): Promise<DeptMembership[]> {
  const rows = await prisma.employeeDepartment.findMany({
    where: { employeeId },
    select: { departmentId: true, roleId: true },
  });
  return rows.map((r) => ({
    departmentId: r.departmentId,
    roleId: r.roleId,
  }));
}

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

export async function validateShiftAssignment(input: {
  employeeId: string;
  shiftId: string;
  excludeAssignmentId?: string;
}): Promise<ValidateAssignmentResult> {
  const shift = await prisma.shift.findUnique({
    where: { id: input.shiftId },
    select: { departmentId: true, roleId: true, startsAt: true, endsAt: true },
  });

  if (!shift) {
    return { ok: false, reasons: ["Shift not found."] };
  }

  const memberships = await getEmployeeDepartmentMemberships(input.employeeId);
  const shiftQual = {
    departmentId: shift.departmentId,
    roleId: shift.roleId,
  };

  if (!employeeQualifiesForShift(memberships, shiftQual)) {
    return {
      ok: false,
      reasons: qualificationFailureReasons(memberships, shiftQual),
    };
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

  return { ok: true };
}
