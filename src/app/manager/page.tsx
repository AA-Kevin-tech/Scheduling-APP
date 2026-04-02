import Link from "next/link";
import { auth } from "@/auth";

export default async function ManagerDashboardPage() {
  const session = await auth();
  const name = session?.user?.name ?? session?.user?.email ?? "Manager";

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Dashboard — {name}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Department-first scheduling, coverage, and approvals.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Open shifts", value: "—", href: "/manager/schedule" },
          { label: "Pending swaps", value: "—", href: "/manager/swaps" },
          { label: "Coverage alerts", value: "—", href: "/manager/coverage" },
        ].map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-sky-300"
          >
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">
              {card.value}
            </p>
            <p className="mt-1 text-xs text-slate-400">Open the page</p>
          </Link>
        ))}
      </div>

      <section className="rounded-xl border border-dashed border-slate-300 bg-white/50 p-6 text-sm text-slate-600">
        <p className="font-medium text-slate-800">Shortcuts</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>
            <Link href="/manager/shifts/new" className="text-sky-700 hover:underline">
              Create shift
            </Link>
          </li>
          <li>
            <Link href="/manager/employees" className="text-sky-700 hover:underline">
              Employees
            </Link>
          </li>
          <li>Phase 3: swap engine with explicit block reasons</li>
          <li>Phase 4: approvals inbox and audit views</li>
        </ul>
      </section>
    </div>
  );
}
