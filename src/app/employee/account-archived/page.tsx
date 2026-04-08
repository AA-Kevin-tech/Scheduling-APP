import type { UserRole } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/guards";
import {
  canAccessAdminRoutes,
  canAccessManagerRoutes,
} from "@/lib/auth/roles";
import { prisma } from "@/lib/db";

export default async function EmployeeAccountArchivedPage() {
  const session = await requireSession();
  const employeeId = session.user.employeeId;
  if (!employeeId) {
    redirect("/login");
  }

  const emp = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { archivedAt: true },
  });
  if (!emp?.archivedAt) {
    redirect("/employee");
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-slate-900">Account archived</h1>
      <p className="text-sm text-slate-600">
        Your employee profile has been archived. Scheduling and self-service tools
        are no longer available, but your historical records are kept. If this is a
        mistake, contact a manager or administrator.
      </p>
      <p className="text-xs text-slate-500">
        Signed in as {session.user.email}
      </p>
      <div className="flex flex-wrap gap-3 pt-2">
        {canAccessManagerRoutes(session.user.role as UserRole) ? (
          <Link
            href="/manager"
            className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            Open manager
          </Link>
        ) : null}
        {canAccessAdminRoutes(session.user.role as UserRole) ? (
          <Link
            href="/admin"
            className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            Open admin
          </Link>
        ) : null}
      </div>
    </div>
  );
}
