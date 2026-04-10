import { differenceInCalendarDays } from "date-fns";
import type { Prisma } from "@prisma/client";
import { TimeOffStatus } from "@prisma/client";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import { intervalsOverlap } from "@/lib/datetime";
import {
  addCalendarDaysInZone,
  addCalendarWeeksPreservingLocalTime,
  parseYmdTime,
} from "@/lib/schedule/tz";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/services/audit";
import { shiftsWhereForLocations } from "@/lib/auth/location-scope";
import type { SchedulePasteMode } from "@/lib/schedule/paste-modes";

export type { SchedulePasteMode };

export type PlannedScheduleRow = {
  departmentId: string;
  locationId: string | null;
  roleId: string | null;
  zoneId: string | null;
  title: string | null;
  startsAt: Date;
  endsAt: Date;
  employeeIds: string[];
};

type SourceShiftLike = {
  departmentId: string;
  locationId: string | null;
  roleId: string | null;
  zoneId: string | null;
  title: string | null;
  startsAt: Date;
  endsAt: Date;
  recurrenceRule: string | null;
  parentShiftId: string | null;
  assignments: { employeeId: string; employee?: { archivedAt: Date | null } }[];
  department: { locationId: string };
};

function ymdDiffInZone(aYmd: string, bYmd: string, tz: string): number {
  const a = toZonedTime(fromZonedTime(parseYmdTime(aYmd, 12, 0, 0), tz), tz);
  const b = toZonedTime(fromZonedTime(parseYmdTime(bYmd, 12, 0, 0), tz), tz);
  return differenceInCalendarDays(b, a);
}

export function shiftWallFields(
  startsAt: Date,
  endsAt: Date,
  weekMondayYmd: string,
  tz: string,
): {
  dayIndex: number;
  startHm: string;
  endHm: string;
  endDayOffset: number;
} {
  const startYmd = formatInTimeZone(startsAt, tz, "yyyy-MM-dd");
  const endYmd = formatInTimeZone(endsAt, tz, "yyyy-MM-dd");
  const dayIndex = ymdDiffInZone(weekMondayYmd, startYmd, tz);
  const startHm = formatInTimeZone(startsAt, tz, "HH:mm");
  const endHm = formatInTimeZone(endsAt, tz, "HH:mm");
  const endDayOffset = ymdDiffInZone(startYmd, endYmd, tz);
  return { dayIndex, startHm, endHm, endDayOffset };
}

function plannedFromWallFields(
  weekMondayYmd: string,
  tz: string,
  row: {
    dayIndex: number;
    startHm: string;
    endHm: string;
    endDayOffset: number;
    departmentId: string;
    locationId: string | null;
    roleId: string | null;
    zoneId: string | null;
    title: string | null;
  },
): { startsAt: Date; endsAt: Date } {
  const startYmd = addCalendarDaysInZone(weekMondayYmd, row.dayIndex, tz);
  const [sh, sm] = row.startHm.split(":").map(Number);
  const startsAt = fromZonedTime(parseYmdTime(startYmd, sh, sm, 0), tz);
  const endYmd = addCalendarDaysInZone(startYmd, row.endDayOffset, tz);
  const [eh, em] = row.endHm.split(":").map(Number);
  const endsAt = fromZonedTime(parseYmdTime(endYmd, eh, em, 0), tz);
  return { startsAt, endsAt };
}

/** Skip series children / optional recurring roots when saving a template. */
export function filterShiftsForTemplateSave(
  shifts: SourceShiftLike[],
  includeRepeating: boolean,
): SourceShiftLike[] {
  if (includeRepeating) return shifts;
  return shifts.filter(
    (s) => s.recurrenceRule == null && s.parentShiftId == null,
  );
}

export function planCopyWeek(
  shifts: SourceShiftLike[],
  weekDelta: number,
  scheduleTz: string,
): PlannedScheduleRow[] {
  const rows: PlannedScheduleRow[] = [];
  for (const s of shifts) {
    const startsAt = addCalendarWeeksPreservingLocalTime(
      s.startsAt,
      weekDelta,
      scheduleTz,
    );
    const endsAt = addCalendarWeeksPreservingLocalTime(
      s.endsAt,
      weekDelta,
      scheduleTz,
    );
    const employeeIds = s.assignments
      .filter((a) => a.employee?.archivedAt == null)
      .map((a) => a.employeeId);
    rows.push({
      departmentId: s.departmentId,
      locationId: s.locationId,
      roleId: s.roleId,
      zoneId: s.zoneId,
      title: s.title,
      startsAt,
      endsAt,
      employeeIds,
    });
  }
  return rows;
}

export function planFromTemplateShifts(
  templateShifts: Array<{
    dayIndex: number;
    startHm: string;
    endHm: string;
    endDayOffset: number;
    departmentId: string;
    locationId: string | null;
    roleId: string | null;
    zoneId: string | null;
    title: string | null;
    assignments: { employeeId: string; employee?: { archivedAt: Date | null } }[];
  }>,
  targetMondayYmd: string,
  scheduleTz: string,
): PlannedScheduleRow[] {
  const rows: PlannedScheduleRow[] = [];
  for (const s of templateShifts) {
    const { startsAt, endsAt } = plannedFromWallFields(targetMondayYmd, scheduleTz, s);
    const employeeIds = s.assignments
      .filter((a) => a.employee?.archivedAt == null)
      .map((a) => a.employeeId);
    rows.push({
      departmentId: s.departmentId,
      locationId: s.locationId,
      roleId: s.roleId,
      zoneId: s.zoneId,
      title: s.title,
      startsAt,
      endsAt,
      employeeIds,
    });
  }
  return rows;
}

async function overlappingShiftIdsToOverwrite(
  tx: Prisma.TransactionClient,
  opts: {
    targetFrom: Date;
    targetTo: Date;
    locationWhere: Prisma.ShiftWhereInput;
    planned: PlannedScheduleRow[];
  },
): Promise<string[]> {
  const { targetFrom, targetTo, locationWhere, planned } = opts;
  const employeeIds = [...new Set(planned.flatMap((p) => p.employeeIds))];
  if (employeeIds.length === 0) return [];

  const candidates = await tx.shift.findMany({
    where: {
      AND: [
        locationWhere,
        { startsAt: { lt: targetTo } },
        { endsAt: { gt: targetFrom } },
        { assignments: { some: { employeeId: { in: employeeIds } } } },
      ],
    },
    select: {
      id: true,
      startsAt: true,
      endsAt: true,
      assignments: { select: { employeeId: true } },
    },
  });

  const toDelete = new Set<string>();
  for (const plan of planned) {
    for (const empId of plan.employeeIds) {
      for (const c of candidates) {
        if (!c.assignments.some((a) => a.employeeId === empId)) continue;
        if (
          intervalsOverlap(
            plan.startsAt,
            plan.endsAt,
            c.startsAt,
            c.endsAt,
          )
        ) {
          toDelete.add(c.id);
        }
      }
    }
  }
  return [...toDelete];
}

async function employeeHasTimeOffConflict(
  tx: Prisma.TransactionClient,
  employeeId: string,
  startsAt: Date,
  endsAt: Date,
): Promise<boolean> {
  const row = await tx.timeOffRequest.findFirst({
    where: {
      employeeId,
      status: { in: [TimeOffStatus.PENDING, TimeOffStatus.APPROVED] },
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
    },
    select: { id: true },
  });
  return !!row;
}

async function employeeHasAssignmentOverlapInTx(
  tx: Prisma.TransactionClient,
  employeeId: string,
  shiftStartsAt: Date,
  shiftEndsAt: Date,
): Promise<boolean> {
  const assignments = await tx.shiftAssignment.findMany({
    where: { employeeId },
    include: { shift: { select: { startsAt: true, endsAt: true } } },
  });
  for (const a of assignments) {
    if (
      intervalsOverlap(
        shiftStartsAt,
        shiftEndsAt,
        a.shift.startsAt,
        a.shift.endsAt,
      )
    ) {
      return true;
    }
  }
  return false;
}

export async function commitSchedulePaste(input: {
  actorUserId: string;
  scheduleTz: string;
  targetFrom: Date;
  targetTo: Date;
  locationIds: string[] | null;
  mode: SchedulePasteMode;
  planned: PlannedScheduleRow[];
  auditAction: string;
  auditPayload: Record<string, unknown>;
}): Promise<{ ok: true; created: number } | { ok: false; error: string }> {
  const { planned, mode, targetFrom, targetTo, locationIds, actorUserId } =
    input;
  if (planned.length === 0) {
    return { ok: true, created: 0 };
  }

  const deptIds = [...new Set(planned.map((p) => p.departmentId))];
  const depts = await prisma.department.findMany({
    where: { id: { in: deptIds } },
    select: { id: true, locationId: true },
  });
  const deptLoc = new Map(depts.map((d) => [d.id, d.locationId]));
  if (depts.length !== deptIds.length) {
    return { ok: false, error: "One or more departments are no longer valid." };
  }

  const locWhere = shiftsWhereForLocations(locationIds);

  let created = 0;

  try {
    created = await prisma.$transaction(async (tx) => {
      if (mode === "OVERWRITE_CONFLICTS") {
        const ids = await overlappingShiftIdsToOverwrite(tx, {
          targetFrom,
          targetTo,
          locationWhere: locWhere,
          planned,
        });
        if (ids.length > 0) {
          await tx.shift.deleteMany({ where: { id: { in: ids } } });
        }
      }

      let n = 0;
      for (const row of planned) {
        const locId = deptLoc.get(row.departmentId);
        if (!locId) throw new Error("Department missing");

        let toAssign: string[] = [];
        if (mode === "ALL_OPEN") {
          toAssign = [];
        } else if (mode === "AVOID_CONFLICTS") {
          for (const empId of row.employeeIds) {
            if (
              await employeeHasTimeOffConflict(tx, empId, row.startsAt, row.endsAt)
            ) {
              continue;
            }
            if (
              await employeeHasAssignmentOverlapInTx(
                tx,
                empId,
                row.startsAt,
                row.endsAt,
              )
            ) {
              continue;
            }
            toAssign.push(empId);
          }
        } else {
          toAssign = row.employeeIds;
        }

        const shift = await tx.shift.create({
          data: {
            departmentId: row.departmentId,
            locationId: row.locationId,
            roleId: row.roleId,
            zoneId: row.zoneId,
            title: row.title,
            startsAt: row.startsAt,
            endsAt: row.endsAt,
            publishedAt: null,
            recurrenceRule: null,
            parentShiftId: null,
          },
        });
        n += 1;

        for (const empId of toAssign) {
          await tx.shiftAssignment.create({
            data: {
              shiftId: shift.id,
              employeeId: empId,
              assignedByUserId: actorUserId,
              managerOverrideReason: null,
            },
          });
        }
      }
      return n;
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Paste failed.";
    return { ok: false, error: msg };
  }

  await writeAuditLog({
    actorUserId,
    entityType: "Shift",
    entityId: "batch",
    action: input.auditAction,
    payload: {
      ...input.auditPayload,
      created,
      mode: input.mode,
    },
  });

  return { ok: true, created };
}
