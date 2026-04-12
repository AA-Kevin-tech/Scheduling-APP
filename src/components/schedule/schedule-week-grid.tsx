"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useState } from "react";
import { assignEmployeeToShift } from "@/actions/shifts";
import type { ScheduleAnnotationDTO } from "@/lib/schedule/annotations";
import type { WeekDayColumn } from "@/lib/schedule/week-grid";
import { ScheduleAnnotationDialog } from "@/components/schedule/schedule-annotation-dialog";

const DRAG_MIME = "application/x-schedule-shift";

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
  /** Open shift: drag-assign target (manager schedule). */
  shiftId?: string;
  /** Calendar day YYYY-MM-DD in schedule zone (drag same-column validation). */
  dayIso?: string;
  /** Assigned: employee is not on this shift's department in their profile. */
  outOfDepartment?: boolean;
  /** Manager: shift is draft until published (lighter / dashed card). */
  isDraft?: boolean;
};

export type ScheduleWeekRow = {
  rowId: string;
  /** Highlight strip (e.g. open shifts). */
  rowTone?: "open" | "default";
  name: string;
  detail?: string;
  blocksByDay: Record<string, ScheduleWeekBlock[]>;
};

/** Serializable; used client-side to build “create shift” links for empty cells (manager schedule). */
export type NewShiftQueryContext = {
  weekMondayIso: string;
  departmentId?: string;
  roleId?: string;
};

function managerNewShiftHref(
  dayIso: string,
  ctx: NewShiftQueryContext,
): string {
  const q = new URLSearchParams();
  q.set("day", dayIso);
  q.set("week", ctx.weekMondayIso);
  if (ctx.departmentId) q.set("departmentId", ctx.departmentId);
  if (ctx.roleId) q.set("roleId", ctx.roleId);
  return `/manager/shifts/new?${q.toString()}`;
}

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
  /** When set, empty cells link to create-shift (manager schedule). */
  newShiftQuery?: NewShiftQueryContext;
  /** Manager: drag open shifts onto employee rows to assign. */
  enableDragAssign?: boolean;
  /** Day notes (announcements / closed / no time off) for column hints. */
  scheduleAnnotations?: ScheduleAnnotationDTO[];
  /** When set, column headers include a link to add or edit notes for that day. */
  annotationLocations?: { id: string; name: string }[];
  /** Default venue for new notes (e.g. active venue or filtered department’s site). */
  defaultAnnotationLocationId?: string | null;
};

type DragPayload = { shiftId: string; dayIso: string };

function BlockCard({
  block,
  enableDragAssign,
}: {
  block: ScheduleWeekBlock;
  enableDragAssign: boolean;
}) {
  const base =
    block.variant === "time_off"
      ? "border-slate-300 bg-slate-200/90 text-slate-800 dark:text-zinc-200"
      : block.variant === "open"
        ? "border-amber-300/80 bg-amber-100/90 text-amber-950"
        : "border-amber-400/70 bg-[#e8dcc8] text-amber-950";

  const draftClass =
    block.kind === "shift" && block.isDraft
      ? "border-dashed opacity-[0.78] ring-1 ring-inset ring-slate-400/25 brightness-[1.02]"
      : "";

  const isOpenDraggable =
    enableDragAssign &&
    block.variant === "open" &&
    block.kind === "shift" &&
    block.shiftId &&
    block.dayIso;

  const cardInner = (
    <div
      className={`relative max-w-full overflow-hidden rounded border px-1.5 py-1 text-left text-[10px] leading-tight shadow-sm sm:px-2 sm:py-1 sm:text-xs ${base} ${draftClass} ${
        isOpenDraggable ? "cursor-grab active:cursor-grabbing" : ""
      }`}
    >
      {block.outOfDepartment && block.variant === "assigned" && (
        <span
          className="absolute right-0.5 top-0.5 z-10 h-2 w-2 rounded-sm bg-amber-300 ring-1 ring-amber-600/40"
          title="This person is not assigned to this shift’s department on their profile. Assign them in Edit user or override when scheduling."
        />
      )}
      <p className="font-semibold leading-snug">{block.line1}</p>
      {block.line2 && (
        <p className="mt-0.5 line-clamp-2 break-words text-[9px] font-medium opacity-90 sm:text-[11px]">
          {block.line2}
        </p>
      )}
    </div>
  );

  if (block.href && block.kind === "shift") {
    return (
      <Link
        href={block.href}
        title={
          block.isDraft
            ? "Draft — not visible to staff until you publish the schedule"
            : undefined
        }
        draggable={Boolean(isOpenDraggable)}
        onDragStart={(e) => {
          if (!isOpenDraggable || !block.shiftId || !block.dayIso) return;
          const payload: DragPayload = {
            shiftId: block.shiftId,
            dayIso: block.dayIso,
          };
          e.dataTransfer.setData(DRAG_MIME, JSON.stringify(payload));
          e.dataTransfer.effectAllowed = "move";
        }}
        className="block min-w-0 max-w-full outline-none ring-sky-400 transition hover:opacity-95 focus-visible:ring-2"
      >
        {cardInner}
      </Link>
    );
  }

  return cardInner;
}

export function ScheduleWeekGrid({
  weekDays,
  todayIso,
  rows,
  footerHoursByDay,
  emptyMessage,
  timezoneLabel,
  newShiftQuery,
  enableDragAssign = false,
  scheduleAnnotations = [],
  annotationLocations,
  defaultAnnotationLocationId = null,
}: Props) {
  const router = useRouter();
  const [assignError, setAssignError] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [annotationDay, setAnnotationDay] = useState<string | null>(null);
  const [editingAnnotation, setEditingAnnotation] =
    useState<ScheduleAnnotationDTO | null>(null);

  const canManageAnnotations =
    Array.isArray(annotationLocations) && annotationLocations.length > 0;

  useEffect(() => {
    setEditingAnnotation(null);
  }, [annotationDay]);

  const annotationsForDay = useCallback(
    (iso: string) =>
      scheduleAnnotations.filter(
        (a) => iso >= a.startsOnYmd && iso <= a.endsOnYmd,
      ),
    [scheduleAnnotations],
  );

  const columnTintHex = useCallback(
    (iso: string) => {
      const list = annotationsForDay(iso).filter(
        (a) => a.showAnnouncement || a.businessClosed,
      );
      return list.find((a) => a.highlightHex)?.highlightHex;
    },
    [annotationsForDay],
  );

  const columnPtoBlocked = useCallback(
    (iso: string) =>
      annotationsForDay(iso).some((a) => a.blockTimeOffRequests),
    [annotationsForDay],
  );

  const headerTooltip = useCallback(
    (iso: string) => {
      const list = annotationsForDay(iso);
      if (list.length === 0) return undefined;
      return list
        .map((a) => {
          const bits = [
            a.showAnnouncement ? "Announcement" : null,
            a.businessClosed ? "Closed" : null,
            a.blockTimeOffRequests ? "No time off" : null,
          ]
            .filter(Boolean)
            .join(", ");
          return `${a.title}${bits ? ` (${bits})` : ""}${a.message ? ` — ${a.message}` : ""}`;
        })
        .join("\n");
    },
    [annotationsForDay],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, rowId: string, dayIso: string) => {
      if (!enableDragAssign || rowId === "open") return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOverKey(`${rowId}:${dayIso}`);
    },
    [enableDragAssign],
  );

  const handleDragLeave = useCallback(() => {
    setDragOverKey(null);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent, employeeId: string, dayIso: string) => {
      setDragOverKey(null);
      if (!enableDragAssign || employeeId === "open") return;
      e.preventDefault();
      const raw = e.dataTransfer.getData(DRAG_MIME);
      if (!raw) return;
      let payload: DragPayload;
      try {
        payload = JSON.parse(raw) as DragPayload;
      } catch {
        return;
      }
      if (payload.dayIso !== dayIso) {
        setAssignError("Drop on the same day column as the open shift.");
        return;
      }
      setAssignError(null);
      const fd = new FormData();
      fd.set("shiftId", payload.shiftId);
      fd.set("employeeId", employeeId);
      fd.set(
        "managerOverrideReason",
        "Manager schedule drag-assign",
      );
      const result = await assignEmployeeToShift(null, fd);
      if (result?.error) {
        setAssignError(result.error);
        return;
      }
      router.refresh();
    },
    [enableDragAssign, router],
  );

  const hasAnyBlock = rows.some((r) =>
    weekDays.some((d) => (r.blocksByDay[d.isoKey]?.length ?? 0) > 0),
  );

  return (
    <div className="space-y-3">
      {assignError && (
        <p
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          {assignError}
        </p>
      )}
      {!hasAnyBlock && emptyMessage && (
        <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600 dark:text-zinc-400">
          {emptyMessage}
        </p>
      )}

      <div className="surface-card overflow-x-auto">
        <table className="w-full min-w-[720px] table-fixed border-collapse text-sm">
          <colgroup>
            <col className="w-[160px]" />
            {weekDays.map((d) => (
              <col key={`col-${d.isoKey}`} />
            ))}
          </colgroup>
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th
                scope="col"
                className="sticky left-0 z-20 w-[160px] min-w-0 max-w-[160px] border-b border-r border-slate-200 bg-slate-50 px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-500 sm:px-3 sm:py-2 sm:text-xs"
              >
                {timezoneLabel ? (
                  <span className="normal-case text-slate-400">{timezoneLabel}</span>
                ) : null}
              </th>
              {weekDays.map((d) => {
                const isToday = d.isoKey === todayIso;
                const tint = columnTintHex(d.isoKey);
                const pto = columnPtoBlocked(d.isoKey);
                const tip = headerTooltip(d.isoKey);
                const noteCount = annotationsForDay(d.isoKey).length;
                const thStyle: CSSProperties | undefined =
                  !isToday && tint
                    ? { backgroundColor: `${tint}55` }
                    : undefined;
                return (
                  <th
                    key={d.isoKey}
                    scope="col"
                    title={tip}
                    style={thStyle}
                    className={`border-b border-slate-200 px-1 py-1.5 text-center sm:px-2 sm:py-2 ${
                      isToday ? "bg-sky-600 text-white" : "text-slate-700 dark:text-zinc-300"
                    } ${!isToday && pto ? "ring-1 ring-inset ring-amber-400/60" : ""}`}
                  >
                    {canManageAnnotations ? (
                      <button
                        type="button"
                        onClick={() => setAnnotationDay(d.isoKey)}
                        className={`mb-0.5 w-full rounded px-1 py-0.5 text-[10px] font-medium sm:mb-1 ${
                          isToday
                            ? "text-white/90 hover:bg-white/10"
                            : "text-sky-700 hover:bg-sky-50"
                        }`}
                      >
                        {noteCount > 0
                          ? `${noteCount} note${noteCount === 1 ? "" : "s"}`
                          : "+ Note"}
                      </button>
                    ) : noteCount > 0 ? (
                      <div
                        className={`mb-1 text-[10px] font-medium ${
                          isToday ? "text-white/80" : "text-slate-500 dark:text-zinc-500"
                        }`}
                      >
                        ● Note
                      </div>
                    ) : null}
                    <div className="text-[10px] font-bold uppercase tracking-wider sm:text-[11px]">
                      {d.weekdayShort}
                    </div>
                    <div className="text-xs font-semibold sm:text-sm">{d.dayNum}</div>
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
                row.rowTone === "open"
                  ? "bg-emerald-50"
                  : rowIdx % 2 === 0
                    ? "bg-white"
                    : "bg-slate-50";
              return (
                <tr key={row.rowId} className={stripe}>
                  <th
                    scope="row"
                    className={`sticky left-0 z-10 w-[160px] min-w-0 max-w-[160px] border-b border-r border-slate-200 px-2 py-1.5 text-left align-top sm:px-3 sm:py-2 ${stripeTh}`}
                  >
                    <div className="truncate text-sm font-semibold text-slate-900 dark:text-zinc-100">
                      {row.name}
                    </div>
                    {row.detail && (
                      <div className="mt-0.5 truncate text-[10px] font-normal text-slate-500 dark:text-zinc-500 sm:text-xs">
                        {row.detail}
                      </div>
                    )}
                  </th>
                  {weekDays.map((d) => {
                    const isToday = d.isoKey === todayIso;
                    const blocks = row.blocksByDay[d.isoKey] ?? [];
                    const emptyHref = newShiftQuery
                      ? managerNewShiftHref(d.isoKey, newShiftQuery)
                      : undefined;
                    const dropKey = `${row.rowId}:${d.isoKey}`;
                    const isDragTarget =
                      enableDragAssign &&
                      row.rowId !== "open" &&
                      dragOverKey === dropKey;
                    const tint = columnTintHex(d.isoKey);
                    const pto = columnPtoBlocked(d.isoKey);
                    const tdBg: CSSProperties | undefined =
                      !isToday && tint
                        ? { backgroundColor: `${tint}22` }
                        : undefined;
                    return (
                      <td
                        key={d.isoKey}
                        onDragOver={(e) => handleDragOver(e, row.rowId, d.isoKey)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, row.rowId, d.isoKey)}
                        style={tdBg}
                        className={`min-w-0 border-b border-slate-200 px-1 py-1.5 align-top sm:px-1.5 sm:py-2 ${
                          isToday ? "bg-sky-50/60" : ""
                        } ${isDragTarget ? "ring-2 ring-inset ring-sky-400" : ""} ${
                          !isToday && pto ? "shadow-[inset_2px_0_0_0_rgba(251,191,36,0.5)]" : ""
                        }`}
                      >
                        <div className="flex min-h-[40px] min-w-0 flex-col gap-0.5 sm:min-h-[44px] sm:gap-1">
                          {blocks.length === 0 && emptyHref ? (
                            <Link
                              href={emptyHref}
                              className="flex min-h-[40px] flex-1 items-center justify-center rounded-md border border-dashed border-slate-200 bg-white/80 text-base text-slate-300 transition hover:border-sky-400 hover:bg-sky-50/50 hover:text-sky-600 sm:min-h-[44px] sm:text-lg"
                              title="Create shift"
                            >
                              <span className="sr-only">Create shift</span>
                              +
                            </Link>
                          ) : blocks.length > 0 ? (
                            blocks.map((b) => (
                              <BlockCard
                                key={b.key}
                                block={b}
                                enableDragAssign={enableDragAssign}
                              />
                            ))
                          ) : (
                            <div className="min-h-[40px] sm:min-h-[44px]" />
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
              <tr className="border-t-2 border-slate-300 bg-slate-100 font-medium text-slate-800 dark:text-zinc-200">
                <th
                  scope="row"
                  className="sticky left-0 z-10 w-[160px] min-w-0 max-w-[160px] border-r border-slate-200 bg-slate-100 px-2 py-1.5 text-left text-[10px] uppercase tracking-wide text-slate-600 dark:text-zinc-400 sm:px-3 sm:py-2 sm:text-xs"
                >
                  Assigned total
                </th>
                {weekDays.map((d) => {
                  const isToday = d.isoKey === todayIso;
                  const h = footerHoursByDay[d.isoKey];
                  const tint = columnTintHex(d.isoKey);
                  const pto = columnPtoBlocked(d.isoKey);
                  const tdBg: CSSProperties | undefined =
                    !isToday && tint
                      ? { backgroundColor: `${tint}22` }
                      : undefined;
                  return (
                    <td
                      key={d.isoKey}
                      style={tdBg}
                      className={`min-w-0 border-t border-slate-200 px-1 py-1.5 text-center text-xs sm:px-2 sm:py-2 sm:text-sm ${
                        isToday ? "bg-sky-100/80" : ""
                      } ${!isToday && pto ? "shadow-[inset_2px_0_0_0_rgba(251,191,36,0.5)]" : ""}`}
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

      {annotationDay && canManageAnnotations ? (
        <ScheduleAnnotationDialog
          dayIso={annotationDay}
          onClose={() => {
            setAnnotationDay(null);
            setEditingAnnotation(null);
          }}
          annotations={scheduleAnnotations}
          locations={annotationLocations!}
          defaultLocationId={defaultAnnotationLocationId}
          editing={editingAnnotation}
          onStartEdit={setEditingAnnotation}
          onClearEditing={() => setEditingAnnotation(null)}
        />
      ) : null}
    </div>
  );
}
