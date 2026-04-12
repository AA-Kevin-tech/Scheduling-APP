import { setEmployeeArchivedFromUser } from "@/actions/employee-archive";

type Props = {
  userId: string;
  archivedAt: Date | null;
};

export function EmployeeArchiveSection({ userId, archivedAt }: Props) {
  const isArchived = archivedAt != null;

  return (
    <section className="surface-card p-6">
      <h2 className="text-sm font-medium text-slate-800">Archive employee</h2>
      <p className="mt-1 text-xs text-slate-500">
        Archived profiles stay in the database for history (past shifts, punches, and
        limits) but no longer appear on scheduling rosters, swap lists, or the
        employee mobile app. Restore anytime to bring them back into scheduling.
      </p>
      {isArchived ? (
        <form
          action={setEmployeeArchivedFromUser}
          className="mt-4 sm:pl-[12rem]"
        >
          <input type="hidden" name="userId" value={userId} />
          <input type="hidden" name="archived" value="false" />
          <button
            type="submit"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            Restore to scheduling
          </button>
        </form>
      ) : (
        <form
          action={setEmployeeArchivedFromUser}
          className="mt-4 sm:pl-[12rem]"
        >
          <input type="hidden" name="userId" value={userId} />
          <input type="hidden" name="archived" value="true" />
          <button
            type="submit"
            className="rounded-md bg-amber-700 px-3 py-2 text-sm font-medium text-white hover:bg-amber-800"
          >
            Archive employee
          </button>
        </form>
      )}
    </section>
  );
}
