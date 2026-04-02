import Link from "next/link";
import { requireManager } from "@/lib/auth/guards";
import {
  approveTimeOffRequest,
  denyTimeOffRequest,
} from "@/actions/time-off";
import {
  getOverlapCountForRequest,
  listPendingTimeOffForManager,
} from "@/lib/queries/time-off";

export default async function ManagerTimeOffPage() {
  await requireManager();
  const pending = await listPendingTimeOffForManager();
  const overlaps = await Promise.all(
    pending.map((p) => getOverlapCountForRequest(p.id)),
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Time off</h1>
          <p className="mt-1 text-sm text-slate-600">
            Approve or deny pending requests. Overlap counts assigned shifts
            that intersect the requested window (for context only).
          </p>
        </div>
        <Link
          href="/manager"
          className="text-sm text-sky-700 hover:underline"
        >
          ← Dashboard
        </Link>
      </div>

      {pending.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          No pending time off requests.
        </p>
      ) : (
        <ul className="space-y-4">
          {pending.map((p, i) => {
            const name = p.employee.user.name ?? p.employee.user.email;
            const overlap = overlaps[i] ?? 0;
            return (
              <li
                key={p.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-slate-900">{name}</p>
                    <p className="mt-1 text-sm text-slate-700">
                      {p.startsAt.toLocaleString()} → {p.endsAt.toLocaleString()}
                    </p>
                    {p.reason ? (
                      <p className="mt-2 text-sm text-slate-600">{p.reason}</p>
                    ) : null}
                    <p className="mt-2 text-xs text-slate-500">
                      {overlap > 0
                        ? `${overlap} assigned shift(s) overlap this window`
                        : "No assigned shifts overlap this window"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <form action={approveTimeOffRequest}>
                      <input type="hidden" name="id" value={p.id} />
                      <button
                        type="submit"
                        className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800"
                      >
                        Approve
                      </button>
                    </form>
                    <form action={denyTimeOffRequest}>
                      <input type="hidden" name="id" value={p.id} />
                      <button
                        type="submit"
                        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
                      >
                        Deny
                      </button>
                    </form>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
