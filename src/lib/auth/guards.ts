import type { UserRole } from "@prisma/client";
import { auth } from "@/auth";
import {
  canAccessAdminRoutes,
  canAccessItPayrollTimeClockSettings,
  canAccessManagerRoutes,
  isSuperAdminRole,
  loginHomePath,
} from "@/lib/auth/roles";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

export async function requireSession() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session;
}

export async function requireManager() {
  const session = await requireSession();
  if (!canAccessManagerRoutes(session.user.role as UserRole)) {
    redirect("/employee");
  }
  return session;
}

export async function requireAdmin() {
  const session = await requireSession();
  if (!canAccessAdminRoutes(session.user.role as UserRole)) {
    redirect("/manager");
  }
  return session;
}

export async function requireSuperAdmin() {
  const session = await requireSession();
  if (!isSuperAdminRole(session.user.role as UserRole)) {
    redirect("/admin");
  }
  return session;
}

/** IT and Payroll only (time clock policy + geofence configuration). */
export async function requireItOrPayroll() {
  const session = await requireSession();
  if (
    !canAccessItPayrollTimeClockSettings(session.user.role as UserRole)
  ) {
    redirect(loginHomePath(session.user.role as UserRole));
  }
  return session;
}

/** Admin or manager (for user provisioning, etc.). */
export async function requireAdminOrManager() {
  const session = await requireSession();
  if (!canAccessManagerRoutes(session.user.role as UserRole)) {
    redirect("/employee");
  }
  return session;
}

export async function requireEmployeeProfile() {
  const session = await requireSession();
  const employeeId = session.user.employeeId;
  if (!employeeId) {
    if (canAccessManagerRoutes(session.user.role as UserRole)) {
      redirect(loginHomePath(session.user.role as UserRole));
    }
    redirect("/login");
  }
  const emp = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { archivedAt: true },
  });
  if (emp?.archivedAt) {
    redirect("/employee/account-archived");
  }
  return { session, employeeId };
}
