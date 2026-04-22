import type { UserRole } from "@prisma/client";

/** Prisma roles with org-wide scheduling (all venues). */
export const ORG_WIDE_USER_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "IT",
  "PAYROLL",
];

/** Org-wide scheduling: all venues (same data access as classic admin). */
export function isOrgWideSchedulingRole(role: UserRole): boolean {
  return ORG_WIDE_USER_ROLES.includes(role);
}

export function isSuperAdminRole(role: UserRole): boolean {
  return role === "SUPER_ADMIN";
}

export function canAccessAdminRoutes(role: UserRole): boolean {
  return isOrgWideSchedulingRole(role);
}

export function canAccessManagerRoutes(role: UserRole): boolean {
  return role === "MANAGER" || isOrgWideSchedulingRole(role);
}

/** IT and Payroll: org time clock policy and per-location geofences (not ADMIN or managers). */
export function canAccessItPayrollTimeClockSettings(role: UserRole): boolean {
  return role === "IT" || role === "PAYROLL";
}

/** Roles that receive manager-style notifications (in addition to venue managers). */
export const MANAGER_NOTIFICATION_ROLES: UserRole[] = [
  "MANAGER",
  "SUPER_ADMIN",
  "ADMIN",
  "IT",
  "PAYROLL",
];

/** Default path after sign-in (and `/` when already authenticated). */
export function loginHomePath(role: UserRole): string {
  if (canAccessAdminRoutes(role)) return "/admin";
  if (role === "MANAGER") return "/manager";
  return "/employee";
}
