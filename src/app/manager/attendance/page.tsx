import Link from "next/link";
import { requireManager } from "@/lib/auth/guards";

const cards: {
  href: string;
  title: string;
  description: string;
}[] = [
  {
    href: "/manager/attendance/audit",
    title: "Audit log",
    description:
      "Schedule edits, assignments, swaps, and overrides (last 150 entries).",
  },
  {
    href: "/manager/time-clock",
    title: "Clock issues",
    description:
      "Open punches past shift end, missing clock-ins, and shifts without a punch.",
  },
  {
    href: "/terminal/setup",
    title: "Time clock terminal",
    description: "Open or configure the shared kiosk PIN time clock.",
  },
];

export default async function ManagerAttendanceHubPage() {
  await requireManager();

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Attendance</h1>
          <p className="mt-1 text-sm text-slate-600">
            Time clock operations and the scheduling audit trail.
          </p>
        </div>
        <Link href="/manager" className="text-sm text-sky-700 hover:underline">
          Dashboard
        </Link>
      </div>

      <ul className="grid gap-4 sm:grid-cols-1">
        {cards.map((c) => (
          <li key={c.href}>
            <Link
              href={c.href}
              className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-sky-300 hover:bg-sky-50/40"
            >
              <span className="font-medium text-slate-900">{c.title}</span>
              <span className="mt-1 block text-sm text-slate-600">
                {c.description}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
