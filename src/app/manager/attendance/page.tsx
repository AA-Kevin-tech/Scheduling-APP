import Link from "next/link";
import { requireManager } from "@/lib/auth/guards";

const cards: {
  href: string;
  title: string;
  description: string;
}[] = [
  {
    href: "/manager/attendance/timesheets",
    title: "Timesheets",
    description:
      "Week view per employee: scheduled vs punched hours; administrators can correct punches.",
  },
  {
    href: "/manager/attendance/time-tracker",
    title: "Time tracker",
    description:
      "Day timeline: who is scheduled and who has clocked in, across your venues.",
  },
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
          <h1 className="text-xl font-semibold text-slate-900 dark:text-zinc-100">Attendance</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">
            Timesheets, day timeline, audit log, clock issues, and the kiosk terminal.
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
              className="block surface-card p-5 transition-colors hover:border-sky-300 hover:bg-sky-50/40"
            >
              <span className="font-medium text-slate-900 dark:text-zinc-100">{c.title}</span>
              <span className="mt-1 block text-sm text-slate-600 dark:text-zinc-400">
                {c.description}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
