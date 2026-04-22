import type { Session } from "next-auth";
import type { UserRole } from "@prisma/client";
import { isSuperAdminRole } from "@/lib/auth/roles";
import { prisma } from "@/lib/db";

/** Super Admin / IT can toggle this per `UserRole` (those roles always may edit schedules). */
export const SCHEDULING_EDIT_FEATURE = "scheduling_edit" as const;

export async function getSchedulingEditAllowedForRole(
  role: UserRole,
): Promise<boolean> {
  if (isSuperAdminRole(role)) return true;
  const row = await prisma.rolePermission.findUnique({
    where: {
      role_feature: { role, feature: SCHEDULING_EDIT_FEATURE },
    },
    select: { allowed: true },
  });
  // No row: managers/admins/payroll may edit; employees default to read-only (WIW-style).
  if (!row) return role !== "EMPLOYEE";
  return row.allowed;
}

export async function getSchedulingEditAllowedForSession(
  session: Session,
): Promise<boolean> {
  return getSchedulingEditAllowedForRole(session.user.role as UserRole);
}
