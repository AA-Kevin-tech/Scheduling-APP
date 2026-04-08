import { shiftsWhereForLocations } from "@/lib/auth/location-scope";
import { prisma } from "@/lib/db";
import { endOfDayUtc, intervalsOverlap, startOfDayUtc } from "@/lib/datetime";

export type DayCoverage = {
  date: string;
  departmentId: string;
  departmentName: string;
  scheduled: number;
  required: number;
  gap: number;
};

/**
 * For each calendar day in [rangeStart, rangeEnd], compare published shift assignments
 * to CoverageRule rows: department-wide rules use total department headcount that day;
 * zone-specific rules count only assignments on shifts in that zone. Gap is the largest
 * shortfall among those constraints (or 1 − scheduled when no rule applies).
 */
/** `rangeEnd` is exclusive (first instant after the last day in range). */
export async function computeDepartmentCoverage(input: {
  rangeStart: Date;
  rangeEnd: Date;
  departmentId?: string;
  /** When set, only departments at these venues (omit for org-wide). */
  onlyAtLocations?: string[];
}): Promise<DayCoverage[]> {
  const locIds = input.onlyAtLocations;
  const deptWhere = {
    ...(input.departmentId ? { id: input.departmentId } : {}),
    ...(locIds === undefined
      ? {}
      : locIds.length === 0
        ? { id: { in: [] as string[] } }
        : { locationId: { in: locIds } }),
  };

  const depts = await prisma.department.findMany({
    where: deptWhere,
    orderBy: { sortOrder: "asc" },
    include: {
      coverageRules: true,
    },
  });

  const shiftLocWhere = shiftsWhereForLocations(
    locIds === undefined ? null : locIds,
  );

  const rulesByDept = new Map(
    depts.map((d) => [d.id, d.coverageRules] as const),
  );

  const assignments = await prisma.shiftAssignment.findMany({
    where: {
      shift: {
        AND: [
          { startsAt: { lt: input.rangeEnd } },
          { endsAt: { gt: input.rangeStart } },
          { publishedAt: { not: null } },
          ...(input.departmentId
            ? [{ departmentId: input.departmentId } as const]
            : []),
          shiftLocWhere,
        ],
      },
    },
    include: {
      shift: {
        select: {
          departmentId: true,
          zoneId: true,
          startsAt: true,
          endsAt: true,
        },
      },
    },
  });

  const days: Date[] = [];
  const start = startOfDayUtc(input.rangeStart);
  for (let t = start.getTime(); t < input.rangeEnd.getTime(); t += 86400000) {
    days.push(new Date(t));
  }

  const out: DayCoverage[] = [];

  for (const dept of depts) {
    const rules = rulesByDept.get(dept.id) ?? [];
    for (const day of days) {
      const dayStart = startOfDayUtc(day);
      const dayEnd = endOfDayUtc(day);

      const deptAssignments = assignments.filter((a) => {
        if (a.shift.departmentId !== dept.id) return false;
        return intervalsOverlap(
          a.shift.startsAt,
          a.shift.endsAt,
          dayStart,
          dayEnd,
        );
      });

      const scheduled = deptAssignments.length;
      const scheduledByZone = new Map<string, number>();
      for (const a of deptAssignments) {
        const z = a.shift.zoneId;
        if (!z) continue;
        scheduledByZone.set(z, (scheduledByZone.get(z) ?? 0) + 1);
      }

      const { required, gap } = coverageRequiredAndGap(
        rules,
        day,
        scheduled,
        scheduledByZone,
      );

      out.push({
        date: day.toISOString().slice(0, 10),
        departmentId: dept.id,
        departmentName: dept.name,
        scheduled,
        required,
        gap,
      });
    }
  }

  return out;
}

type RuleForCoverage = {
  minStaffCount: number;
  validFrom: Date | null;
  validTo: Date | null;
  zoneId: string | null;
};

function coverageRequiredAndGap(
  rules: RuleForCoverage[],
  day: Date,
  scheduledDept: number,
  scheduledByZone: Map<string, number>,
): { required: number; gap: number } {
  const applicable = rules.filter((r) => {
    if (r.validFrom && day < r.validFrom) return false;
    if (r.validTo && day > r.validTo) return false;
    return true;
  });

  if (applicable.length === 0) {
    return {
      required: 1,
      gap: Math.max(0, 1 - scheduledDept),
    };
  }

  let deptWideMax = 0;
  const zoneMax = new Map<string, number>();
  for (const r of applicable) {
    if (!r.zoneId) {
      deptWideMax = Math.max(deptWideMax, r.minStaffCount);
    } else {
      zoneMax.set(
        r.zoneId,
        Math.max(zoneMax.get(r.zoneId) ?? 0, r.minStaffCount),
      );
    }
  }

  const shortfalls: number[] = [];
  if (deptWideMax > 0) {
    shortfalls.push(deptWideMax - scheduledDept);
  }
  for (const [zid, req] of zoneMax) {
    shortfalls.push(req - (scheduledByZone.get(zid) ?? 0));
  }

  const gap = shortfalls.length > 0 ? Math.max(0, ...shortfalls) : 0;

  const maxZoneReq =
    zoneMax.size > 0 ? Math.max(...zoneMax.values()) : 0;
  let required: number;
  if (deptWideMax > 0 && maxZoneReq > 0) {
    required = Math.max(deptWideMax, maxZoneReq);
  } else if (deptWideMax > 0) {
    required = deptWideMax;
  } else if (maxZoneReq > 0) {
    required = maxZoneReq;
  } else {
    required = 1;
  }

  return { required, gap };
}

export type CoverageSummary = {
  byDepartment: Record<
    string,
    { name: string; daysBelowMin: number; worstGap: number }
  >;
};

export function summarizeCoverage(rows: DayCoverage[]): CoverageSummary {
  const byDepartment: CoverageSummary["byDepartment"] = {};
  for (const r of rows) {
    const cur = byDepartment[r.departmentId] ?? {
      name: r.departmentName,
      daysBelowMin: 0,
      worstGap: 0,
    };
    if (r.gap > 0) {
      cur.daysBelowMin += 1;
      cur.worstGap = Math.max(cur.worstGap, r.gap);
    }
    byDepartment[r.departmentId] = cur;
  }
  return { byDepartment };
}
