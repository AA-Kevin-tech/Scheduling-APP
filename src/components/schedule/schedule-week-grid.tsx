import Link from "next/link";
import type { WeekDayColumn } from "@/lib/schedule/week-grid";

export type ScheduleWeekBlock = {
  key: string;
  kind: "shift" | "time_off";
  href?: string;
  /** Primary line (e.g. time range). */
  line1: string;
  /** Secondary line (role, department, or label). */
  line2?: string;
  /** Visual variant inside the cell. */
  variant: "assigned" | "open" | "time_off";
};

export type ScheduleWeekRow = {
  rowId: string;
  /** Highlight strip (e.g. open shifts). */
  rowTone?: "open" | "default";
  name: string;
  detail?: string;
  blocksByDay: Record<string, ScheduleWeekBlock[]>;
};

type Props = {
  weekDays: WeekDayColumn[];
  /** Calendar date `YYYY-MM-DD` in the schedule timezone for “today” highlight. */
  todayIso: string;
  rows: ScheduleWeekRow[];
  /** Total scheduled hours per day (sum of displayed shifts). */
  footerHoursByDay?: Record<string, number>;
  emptyMessage?: string;
  /** Shown in the header corner (e.g. IANA zone). */
  timezoneLabel?: string;
  /** Empty cells link to create a shift (manager schedule). */
  getEmptyCellHref?: (ctx: {
    rowId: string;
    dayIso: string;
  }) => string | undefined;
};

function BlockCard({ block }: { block: ScheduleWeekBlock }) {
  const base =
    block.variant === "time_off"
      ? "border-slate-300 bg-slate-200/90 text-slate-800"
      : block.variant === "open"
        ? "border-amber-300/80 bg-amber-100/90 text-amber-950"
        : "border-amber-400/70 bg-[#e8dcc8] text-amber-950";

  const inner = (
    <div
      className={`rounded-md border px-2 py-1.5 text-left text-xs shadow-sm ${base}`}
    >
      <p className="font-semibold leading-tight">{block.line1}</p>
      {block.line2 && (
        <p className="mt-0.5 truncate text-[11px] font-medium opacity-90">
          {block.line2}
        </p>
      )}
    </div>
  );

  if (block.href && block.kind === "shift") {
    return (
      <Link
        href={block.href}
        className="block outline-none ring-sky-400 transition hover:opacity-95 focus-visible:ring-2"
      >
        {inner}
      </Link>
    );
  }

  return inner;
}

export function ScheduleWeekGrid({
  weekDays,
  todayIso,
  rows,
  footerHoursByDay,
  emptyMessage,
  timezoneLabel,
  getEmptyCellHref,
}: Props) {
  const hasAnyBlock = rows.some((r) =>
    weekDays.some((d) => (r.blocksByDay[d.isoKey]?.length ?? 0) > 0),
  );

  return (
    <div className="space-y-3">
      {!hasAnyBlock && emptyMessage && (
        <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600">
          {emptyMessage}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th
                scope="col"
                className="sticky left-0 z-20 min-w-[180px] border-b border-r border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                {timezoneLabel ? (
                  <span className="normal-case text-slate-400">{timezoneLabel}</span>
                ) : null}
              </th>
              {weekDays.map((d) => {
                const isToday = d.isoKey === todayIso;
                return (
                  <th
                    key={d.isoKey}
                    scope="col"
                    className={`border-b border-slate-200 px-2 py-2 text-center ${
                      isToday ? "bg-sky-600 text-white" : "text-slate-700"
                    }`}
                  >
                    <div className="text-[11px] font-bold uppercase tracking-wider">
                      {d.weekdayShort}
                    </div>
                    <div className="text-sm font-semibold">{d.dayNum}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => {
              const stripe =
                row.rowTone === "open"
                  ? "bg-emerald-50/80"
                  : rowIdx % 2 === 0
                    ? "bg-white"
                    : "bg-slate-50/60";
              const stripeTh =
                row.rowTone === "open" ? "bg-emerald-50" : rowIdx % 2 === 0 ? "bg-white" : "bg-slate-50";
              return (
              <tr key={row.rowId} className={stripe}>
                <th
                  scope="row"
                  className={`sticky left-0 z-10 border-b border-r border-slate-200 px-3 py-2 text-left align-top ${stripeTh}`}
                >
                  <div className="font-semibold text-slate-900">{row.name}</div>
                  {row.detail && (
                    <div className="mt-0.5 text-xs font-normal text-slate-500">
                      {row.detail}
                    </div>
                  )}
                </th>
                {weekDays.map((d) => {
                  const isToday = d.isoKey === todayIso;
                  const blocks = row.blocksByDay[d.isoKey] ?? [];
                  const emptyHref = getEmptyCellHref?.({
                    rowId: row.rowId,
                    dayIso: d.isoKey,
                  });
                  return (
                    <td
                      key={d.isoKey}
                      className={`border-b border-slate-200 px-1.5 py-2 align-top ${
                        isToday ? "bg-sky-50/60" : ""
                      }`}
                    >
                      <div className="flex min-h-[52px] flex-col gap-1">
                        {blocks.length === 0 && emptyHref ? (
                          <Link
                            href={emptyHref}
                            className="flex min-h-[52px] flex-1 items-center justify-center rounded-md border border-dashed border-slate-200 bg-white/80 text-lg text-slate-300 transition hover:border-sky-400 hover:bg-sky-50/50 hover:text-sky-600"
                            title="Create shift"
                          >
                            <span className="sr-only">Create shift</span>
                            +
                          </Link>
                        ) : blocks.length > 0 ? (
                          blocks.map((b) => <BlockCard key={b.key} block={b} />)
                        ) : (
                          <div className="min-h-[52px]" />
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
            })}
          </tbody>
          {footerHoursByDay && (
            <tfoot>
              <tr className="border-t-2 border-slate-300 bg-slate-100 font-medium text-slate-800">
                <th
                  scope="row"
                  className="sticky left-0 z-10 border-r border-slate-200 bg-slate-100 px-3 py-2 text-left text-xs uppercase tracking-wide text-slate-600"
                >
                  Assigned total
                </th>
                {weekDays.map((d) => {
                  const isToday = d.isoKey === todayIso;
                  const h = footerHoursByDay[d.isoKey];
                  return (
                    <td
                      key={d.isoKey}
                      className={`border-t border-slate-200 px-2 py-2 text-center text-sm ${
                        isToday ? "bg-sky-100/80" : ""
                      }`}
                    >
                      {h != null && h > 0 ? h : "—"}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
