import Link from "next/link";
import { getSchedulingLocationIdsForSession } from "@/lib/auth/location-scope";
import { requireManager } from "@/lib/auth/guards";
import { departmentBadgeClass } from "@/lib/departments/theme";
import { listSwapRequestsForManager } from "@/lib/queries/swaps";
import { SwapManagerActions } from "@/components/manager/swap-manager-actions";

export default async function ManagerSwapsPage() {
  const session = await requireManager();
  const locationIds = await getSchedulingLocationIdsForSession(session);

  const pending = await listSwapRequestsForManager(
    ["PENDING"],
    locationIds,
  );
  const ready = await listSwapRequestsForManager(
    ["ACCEPTED_BY_TARGET"],
    locationIds,
  );

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-zinc-100">Swap approvals</h1>
        <Link
          href="/manager/schedule"
          className="text-sm text-sky-700 hover:underline"
        >
          Schedule
        </Link>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-slate-700 dark:text-zinc-300">
          Awaiting employee response
        </h2>
        <SwapList swaps={pending} showManagerActions={false} />
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-700 dark:text-zinc-300">
          Ready for your approval
        </h2>
        <ul className="mt-3 space-y-4">
          {ready.map((s) => {
            const from = s.fromAssignment.shift;
            const badge = departmentBadgeClass(from.department.slug);
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
                  <span className="text-xs text-amber-800">Accepted by employee</span>
                </div>
                <p className="mt-2 text-sm text-slate-800 dark:text-zinc-200">
                  {new Date(from.startsAt).toLocaleString()} →{" "}
                  {new Date(from.endsAt).toLocaleString()}
                </p>
                <p className="text-xs text-slate-500 dark:text-zinc-500">
                  {s.requester.user.name ?? s.requester.user.email} ↔{" "}
                  {s.target?.user.name ?? s.target?.user.email}
                </p>
                <div className="mt-4">
                  <SwapManagerActions swapId={s.id} />
                </div>
              </li>
            );
          })}
        </ul>
        {ready.length === 0 && (
          <p className="mt-2 text-sm text-slate-500 dark:text-zinc-500">Nothing waiting for approval.</p>
        )}
      </section>
    </div>
  );
}

function SwapList({
  swaps,
  showManagerActions,
}: {
  swaps: Awaited<ReturnType<typeof listSwapRequestsForManager>>;
  showManagerActions: boolean;
}) {
  if (swaps.length === 0) {
    return <p className="mt-2 text-sm text-slate-500 dark:text-zinc-500">None.</p>;
  }
  return (
    <ul className="mt-3 space-y-3">
      {swaps.map((s) => {
        const from = s.fromAssignment.shift;
        const badge = departmentBadgeClass(from.department.slug);
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
              <span className="text-xs text-slate-500 dark:text-zinc-500">{s.status}</span>
            </div>
            <p className="mt-2 text-sm text-slate-800 dark:text-zinc-200">
              {new Date(from.startsAt).toLocaleString()}
            </p>
            <p className="text-xs text-slate-500 dark:text-zinc-500">
              {s.requester.user.name ?? s.requester.user.email} →{" "}
              {s.target?.user.name ?? s.target?.user.email}
            </p>
            {showManagerActions && (
              <div className="mt-4">
                <SwapManagerActions swapId={s.id} />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
