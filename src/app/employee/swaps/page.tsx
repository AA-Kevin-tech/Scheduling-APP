import { requireEmployeeProfile } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { listSwapRequestsForEmployee } from "@/lib/queries/swaps";
import { SwapIncomingActions } from "@/components/employee/swap-incoming-actions";
import { SwapRequestForm } from "@/components/employee/swap-request-form";
import { departmentBadgeClass } from "@/lib/departments/theme";

export default async function EmployeeSwapsPage() {
  const { employeeId } = await requireEmployeeProfile();

  const [swaps, colleagues, myAssignments, peerAssignments] = await Promise.all([
    listSwapRequestsForEmployee(employeeId),
    prisma.employee.findMany({
      where: { id: { not: employeeId }, archivedAt: null },
      include: {
        user: { select: { name: true, email: true } },
        departments: { select: { departmentId: true } },
      },
      orderBy: { user: { email: "asc" } },
    }),
    prisma.shiftAssignment.findMany({
      where: {
        employeeId,
        shift: { publishedAt: { not: null } },
      },
      orderBy: { shift: { startsAt: "asc" } },
      include: {
        shift: { include: { department: true, role: true } },
      },
    }),
    prisma.shiftAssignment.findMany({
      where: {
        employeeId: {
          not: employeeId,
        },
        shift: { publishedAt: { not: null } },
      },
      include: {
        shift: { include: { department: true } },
      },
      orderBy: { shift: { startsAt: "asc" } },
      take: 200,
    }),
  ]);

  const peerFormatted = peerAssignments.map((a) => ({
    id: a.id,
    employeeId: a.employeeId,
    label: `${a.shift.department.name} · ${new Date(a.shift.startsAt).toLocaleString()}`,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Swaps</h1>
        <p className="mt-1 text-sm text-slate-600">
          Request a one-way or two-way trade. The other person must accept, then a
          manager approves.
        </p>
      </div>

      <SwapRequestForm
        myAssignments={myAssignments}
        colleagues={colleagues.map((c) => ({
          id: c.id,
          user: c.user,
          departmentIds: c.departments.map((d) => d.departmentId),
        }))}
        peerAssignments={peerFormatted}
      />

      <section>
        <h2 className="text-sm font-medium text-slate-800">Your swap activity</h2>
        <ul className="mt-3 space-y-3">
          {swaps.map((s) => {
            const from = s.fromAssignment.shift;
            const badge = departmentBadgeClass(from.department.slug);
            const isTarget = s.targetEmployeeId === employeeId;
            const showActions =
              isTarget && s.status === "PENDING";

            return (
              <li
                key={s.id}
                className="surface-card p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs font-medium ${badge}`}
                  >
                    {from.department.name}
                  </span>
                  <span className="text-xs text-slate-500">{s.status}</span>
                </div>
                <p className="mt-2 text-sm text-slate-800">
                  {new Date(from.startsAt).toLocaleString()} →{" "}
                  {new Date(from.endsAt).toLocaleString()}
                </p>
                <p className="text-xs text-slate-500">
                  Requester: {s.requester.user.name ?? s.requester.user.email}
                  {s.target &&
                    ` · Target: ${s.target.user.name ?? s.target.user.email}`}
                </p>
                {s.toAssignment && (
                  <p className="mt-1 text-xs text-slate-600">
                    Exchange for:{" "}
                    {new Date(s.toAssignment.shift.startsAt).toLocaleString()}
                  </p>
                )}
                {showActions && <SwapIncomingActions swapId={s.id} />}
              </li>
            );
          })}
        </ul>
        {swaps.length === 0 && (
          <p className="mt-3 text-sm text-slate-500">No swap requests yet.</p>
        )}
      </section>
    </div>
  );
}
