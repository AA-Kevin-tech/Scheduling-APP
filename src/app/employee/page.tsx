import Link from "next/link";
import { auth } from "@/auth";

export default async function EmployeeHomePage() {
  const session = await auth();
  const name = session?.user?.name ?? session?.user?.email ?? "there";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Hello, {name}</h1>
        <p className="mt-1 text-sm text-slate-600">
          Your upcoming shifts and actions in one place.
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-medium text-slate-500">Hours this week</h2>
        <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-900">
          — / —
        </p>
        <p className="mt-1 text-xs text-slate-500">Connected in Phase 2</p>
      </section>

      <ul className="grid gap-3">
        <li>
          <Link
            href="/employee/schedule"
            className="block rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-sky-300"
          >
            <span className="font-medium text-slate-900">My schedule</span>
            <span className="mt-1 block text-sm text-slate-600">
              Week view and shift details
            </span>
          </Link>
        </li>
        <li>
          <Link
            href="/employee/swaps"
            className="block rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-sky-300"
          >
            <span className="font-medium text-slate-900">Shift swaps</span>
            <span className="mt-1 block text-sm text-slate-600">
              Request and respond to swaps
            </span>
          </Link>
        </li>
      </ul>
    </div>
  );
}
