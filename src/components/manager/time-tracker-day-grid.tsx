export type TimeTrackerSegment =
  | { kind: "scheduled"; start: Date; end: Date; title: string }
  | { kind: "punched"; start: Date; end: Date; open: boolean; title: string };

export type TimeTrackerRow = {
  employeeId: string;
  label: string;
  segments: TimeTrackerSegment[];
};

function clipToDay(
  start: Date,
  end: Date,
  dayStart: Date,
  dayEnd: Date,
): { start: Date; end: Date } | null {
  const s = start > dayStart ? start : dayStart;
  const e = end < dayEnd ? end : dayEnd;
  if (e <= s) return null;
  return { start: s, end: e };
}

function segmentStyle(
  seg: { start: Date; end: Date },
  dayStart: Date,
  daySpanMs: number,
): { leftPct: number; widthPct: number } {
  const leftMs = seg.start.getTime() - dayStart.getTime();
  const widthMs = seg.end.getTime() - seg.start.getTime();
  const leftPct = Math.max(0, Math.min(100, (leftMs / daySpanMs) * 100));
  const rawW = (widthMs / daySpanMs) * 100;
  const widthPct = Math.min(100 - leftPct, Math.max(0.2, rawW));
  return { leftPct, widthPct };
}

export function TimeTrackerDayGrid({
  rows,
  dayStart,
  dayEnd,
  tzLabel,
}: {
  rows: TimeTrackerRow[];
  dayStart: Date;
  dayEnd: Date;
  tzLabel: string;
}) {
  const daySpanMs = dayEnd.getTime() - dayStart.getTime() + 1;

  const hours: number[] = [];
  for (let h = 0; h < 24; h += 2) hours.push(h);

  return (
    <div className="space-y-2">
      <div className="flex gap-2 text-[10px] text-slate-500 dark:text-zinc-500 sm:text-xs">
        <div className="w-32 shrink-0 sm:w-36" />
        <div
          className="grid min-w-0 flex-1 gap-0"
          style={{ gridTemplateColumns: "repeat(12, minmax(0, 1fr))" }}
        >
          {hours.map((h) => (
            <div key={h} className="text-center">
              {h === 0
                ? "12a"
                : h < 12
                  ? `${h}a`
                  : h === 12
                    ? "12p"
                    : `${h - 12}p`}
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-slate-500 dark:text-zinc-500">Times in {tzLabel} (calendar day).</p>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 dark:text-zinc-400">
          No published shifts overlap this day for your location scope.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li
              key={row.employeeId}
              className="flex gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm sm:gap-3 sm:p-3"
            >
              <div className="w-32 shrink-0 text-sm font-medium text-slate-900 dark:text-zinc-100 sm:w-36">
                {row.label}
              </div>
              <div className="relative min-h-12 min-w-0 flex-1">
                <div className="absolute inset-0 rounded bg-slate-100" />
                <div className="relative h-12 w-full">
                  {row.segments.map((seg, i) => {
                    const clipped = clipToDay(
                      seg.start,
                      seg.end,
                      dayStart,
                      dayEnd,
                    );
                    if (!clipped) return null;
                    const { leftPct, widthPct } = segmentStyle(
                      clipped,
                      dayStart,
                      daySpanMs,
                    );
                    const key = `${seg.kind}-${i}-${clipped.start.getTime()}`;
                    if (seg.kind === "scheduled") {
                      return (
                        <div
                          key={key}
                          className="absolute top-1 h-2 rounded-sm bg-slate-400/50"
                          style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                          title={`Scheduled: ${seg.title}`}
                        />
                      );
                    }
                    return (
                      <div
                        key={key}
                        className={`absolute top-4 h-6 rounded border border-white/40 ${
                          seg.open
                            ? "bg-emerald-500/85"
                            : "bg-sky-600/85"
                        }`}
                        style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                        title={`${seg.open ? "Open punch" : "Punch"}: ${seg.title}`}
                      />
                    );
                  })}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-4 text-xs text-slate-600 dark:text-zinc-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-6 rounded-sm bg-slate-400/50" />
          Scheduled shift
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-6 rounded bg-sky-600/85" />
          Punched (complete)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-6 rounded bg-emerald-500/85" />
          Punched (open)
        </span>
      </div>
    </div>
  );
}
