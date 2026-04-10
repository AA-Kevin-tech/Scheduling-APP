import type { ScheduleAnnotationDTO } from "@/lib/schedule/annotations";

export function WeekAnnouncementStrip({
  items,
  title = "Notes for this week",
}: {
  items: ScheduleAnnotationDTO[];
  title?: string;
}) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-xl border border-sky-200 bg-sky-50/90 p-4 text-sm shadow-sm">
      <p className="font-semibold text-sky-950">{title}</p>
      <ul className="mt-2 space-y-2">
        {items.map((a) => (
          <li
            key={a.id}
            className="rounded-lg border border-sky-100/80 bg-white/70 px-3 py-2 text-slate-800"
          >
            <span className="font-medium text-slate-900">{a.title}</span>
            <span className="text-slate-500">
              {" "}
              · {a.locationName}
              {a.startsOnYmd === a.endsOnYmd
                ? ` · ${a.startsOnYmd}`
                : ` · ${a.startsOnYmd} → ${a.endsOnYmd}`}
            </span>
            {a.businessClosed ? (
              <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 text-[11px] font-medium text-slate-800">
                Closed
              </span>
            ) : null}
            {a.blockTimeOffRequests ? (
              <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-950">
                No new time off
              </span>
            ) : null}
            {a.message ? (
              <p className="mt-1 whitespace-pre-wrap text-xs text-slate-600">
                {a.message}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
