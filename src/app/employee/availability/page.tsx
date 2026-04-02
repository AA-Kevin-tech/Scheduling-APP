import Link from "next/link";
import { requireEmployeeProfile } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { deleteAvailabilitySlot } from "@/actions/availability";
import { AvailabilityAddForm } from "./availability-add-form";

const DAYS = [
  { v: 0, label: "Sunday" },
  { v: 1, label: "Monday" },
  { v: 2, label: "Tuesday" },
  { v: 3, label: "Wednesday" },
  { v: 4, label: "Thursday" },
  { v: 5, label: "Friday" },
  { v: 6, label: "Saturday" },
];

export default async function EmployeeAvailabilityPage() {
  const { employeeId } = await requireEmployeeProfile();

  const slots = await prisma.availability.findMany({
    where: { employeeId },
    orderBy: [{ dayOfWeek: "asc" }, { startsAt: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-slate-900">Availability</h1>
        <Link
          href="/employee/schedule"
          className="text-sm text-sky-700 hover:underline"
        >
          My schedule
        </Link>
      </div>
      <p className="text-sm text-slate-600">
        Typical hours you can work each week (Phase 2 — used by scheduling
        suggestions later).
      </p>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-medium text-slate-800">Add slot</h2>
        <AvailabilityAddForm />
      </section>

      <section>
        <h2 className="text-sm font-medium text-slate-800">Your slots</h2>
        {slots.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No availability yet.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {slots.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <span>
                  {DAYS.find((d) => d.v === s.dayOfWeek)?.label ?? s.dayOfWeek}{" "}
                  · {s.startsAt}–{s.endsAt}
                </span>
                <form action={deleteAvailabilitySlot}>
                  <input type="hidden" name="id" value={s.id} />
                  <button type="submit" className="text-red-700 hover:underline">
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
