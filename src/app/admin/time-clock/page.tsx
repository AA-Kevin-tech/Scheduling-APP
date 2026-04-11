import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { canAccessItPayrollTimeClockSettings } from "@/lib/auth/roles";
import type { UserRole } from "@prisma/client";

/** Former route; IT/Payroll-only settings moved to /it-payroll/time-clock */
export default async function LegacyAdminTimeClockRedirect() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  const role = session.user.role as UserRole;
  if (canAccessItPayrollTimeClockSettings(role)) {
    redirect("/it-payroll/time-clock");
  }
  redirect("/admin");
}
