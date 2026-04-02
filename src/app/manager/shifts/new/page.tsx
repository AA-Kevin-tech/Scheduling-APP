import Link from "next/link";
import { requireManager } from "@/lib/auth/guards";
import { getDepartmentsWithRoles } from "@/lib/queries/schedule";
import { NewShiftForm } from "@/components/manager/new-shift-form";

export default async function NewShiftPage() {
  await requireManager();
  const departments = await getDepartmentsWithRoles();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/manager/schedule"
          className="text-sm text-sky-700 hover:underline"
        >
          ← Schedule
        </Link>
      </div>
      <h1 className="text-xl font-semibold text-slate-900">Create shift</h1>
      <p className="text-sm text-slate-600">
        Shifts can repeat weekly; each occurrence is stored as its own row (series
        link via parent shift).
      </p>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <NewShiftForm departments={departments} />
      </div>
    </div>
  );
}
