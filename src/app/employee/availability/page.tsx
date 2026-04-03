import Link from "next/link";
import { requireEmployeeProfile } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { deleteAvailabilitySlot } from "@/actions/availability";
import { AvailabilityAddForm } from "./availability-add-form";
import { AvailabilitySlotForm } from "./availability-slot-form";

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
        Typical hours you can work each week. This is stored for visibility and
        future scheduling features; shift assignments and swaps still use
        department, hours, and rest rules from the schedule.
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
                className="space-y-3 rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm"
              >
                <AvailabilitySlotForm
                  id={s.id}
                  dayOfWeek={s.dayOfWeek}
                  startsAt={s.startsAt}
                  endsAt={s.endsAt}
                />
                <form action={deleteAvailabilitySlot}>
                  <input type="hidden" name="id" value={s.id} />
                  <button type="submit" className="text-xs text-red-700 hover:underline">
                    Remove slot
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
