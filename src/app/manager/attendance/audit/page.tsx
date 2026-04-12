import Link from "next/link";
import { requireManager } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";

export default async function ManagerAttendanceAuditPage() {
  await requireManager();

  const rows = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 150,
    include: {
      actor: { select: { email: true, name: true } },
    },
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Audit log</h1>
          <p className="mt-1 text-sm text-slate-600">
            Schedule edits, assignments, swaps, and overrides (last 150 entries).
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href="/manager/attendance" className="text-sky-700 hover:underline">
            ← Attendance
          </Link>
          <Link href="/manager" className="text-sky-700 hover:underline">
            Dashboard
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto surface-card">
        <table className="min-w-full text-left text-xs sm:text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
            <tr>
              <th className="px-2 py-2 sm:px-3">When</th>
              <th className="px-2 py-2 sm:px-3">Actor</th>
              <th className="px-2 py-2 sm:px-3">Action</th>
              <th className="px-2 py-2 sm:px-3">Entity</th>
              <th className="px-2 py-2 sm:px-3">Reason</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-slate-100 last:border-0">
                <td className="whitespace-nowrap px-2 py-2 text-slate-600 sm:px-3">
                  {r.createdAt.toLocaleString()}
                </td>
                <td className="px-2 py-2 text-slate-800 sm:px-3">
                  {r.actor?.email ?? "—"}
                </td>
                <td className="px-2 py-2 font-medium text-slate-900 sm:px-3">
                  {r.action}
                </td>
                <td className="px-2 py-2 text-slate-600 sm:px-3">
                  {r.entityType} {r.entityId.slice(0, 8)}…
                </td>
                <td className="max-w-[200px] truncate px-2 py-2 text-slate-500 sm:px-3">
                  {r.reason ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
