import Link from "next/link";
import { requireEmployeeProfile } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import {
  createAvailabilitySlot,
  deleteAvailabilitySlot,
  updateAvailabilitySlot,
} from "@/actions/availability";
import { UnavailabilityAddForm } from "@/components/unavailability/unavailability-add-form";
import { UnavailabilityDeleteForm } from "@/components/unavailability/unavailability-delete-form";
import { UnavailabilitySlotForm } from "@/components/unavailability/unavailability-slot-form";

export default async function EmployeeAvailabilityPage() {
  const { employeeId } = await requireEmployeeProfile();

  const slots = await prisma.availability.findMany({
    where: { employeeId },
    orderBy: [{ dayOfWeek: "asc" }, { startsAt: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-zinc-100">
          Times I can&apos;t work
        </h1>
        <Link
          href="/employee/schedule"
          className="text-sm text-sky-700 hover:underline"
        >
          My schedule
        </Link>
      </div>
      <p className="text-sm text-slate-600 dark:text-zinc-400">
        Add recurring blocks when you are not available each week (by day and
        time range). This is stored for visibility and future scheduling
        features; shift assignments and swaps still follow department assignments,
        hour caps, and rest rules.
      </p>

      <section className="surface-card p-4">
        <h2 className="text-sm font-medium text-slate-800 dark:text-zinc-200">Add unavailable time</h2>
        <UnavailabilityAddForm createSlot={createAvailabilitySlot} />
      </section>

      <section>
        <h2 className="text-sm font-medium text-slate-800 dark:text-zinc-200">Your unavailable times</h2>
        {slots.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500 dark:text-zinc-500">
            No blocks yet. If you have no restrictions, leave this empty.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {slots.map((s) => (
              <li
                key={s.id}
                className="space-y-3 rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm"
              >
                <UnavailabilitySlotForm
                  id={s.id}
                  dayOfWeek={s.dayOfWeek}
                  startsAt={s.startsAt}
                  endsAt={s.endsAt}
                  updateSlot={updateAvailabilitySlot}
                />
                <UnavailabilityDeleteForm
                  slotId={s.id}
                  action={deleteAvailabilitySlot}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
