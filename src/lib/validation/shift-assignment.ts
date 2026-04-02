/**
 * Pure rules for assigning an employee to a shift.
 * DB-specific checks (overlap queries) live in services.
 */

export type DeptMembership = {
  departmentId: string;
  roleId: string | null;
};

export type ShiftQualification = {
  departmentId: string;
  roleId: string | null;
};

export function employeeQualifiesForShift(
  memberships: DeptMembership[],
  shift: ShiftQualification,
): boolean {
  const inDept = memberships.filter((m) => m.departmentId === shift.departmentId);
  if (inDept.length === 0) return false;
  if (!shift.roleId) return true;
  return inDept.some((m) => m.roleId === shift.roleId);
}

export function qualificationFailureReasons(
  memberships: DeptMembership[],
  shift: ShiftQualification,
): string[] {
  const reasons: string[] = [];
  const inDept = memberships.filter((m) => m.departmentId === shift.departmentId);
  if (inDept.length === 0) {
    reasons.push("Employee is not assigned to this shift’s department.");
  }
  if (shift.roleId && !inDept.some((m) => m.roleId === shift.roleId)) {
    reasons.push(
      "Employee does not hold the required role for this shift in this department.",
    );
  }
  return reasons;
}
