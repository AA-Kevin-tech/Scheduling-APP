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
 * For each calendar day in [rangeStart, rangeEnd], count assignments whose shift overlaps that day
 * in `departmentId` (if set), and compare to effective CoverageRule minStaffCount.
 */
/** `rangeEnd` is exclusive (first instant after the last day in range). */
export async function computeDepartmentCoverage(input: {
  rangeStart: Date;
  rangeEnd: Date;
  departmentId?: string;
}): Promise<DayCoverage[]> {
  const depts = await prisma.department.findMany({
    where: input.departmentId ? { id: input.departmentId } : undefined,
    orderBy: { sortOrder: "asc" },
    include: {
      coverageRules: true,
    },
  });

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
        ],
      },
    },
    include: {
      shift: {
        select: {
          departmentId: true,
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

      const required = effectiveMinStaff(rules, day);

      const scheduled = assignments.filter((a) => {
        if (a.shift.departmentId !== dept.id) return false;
        return intervalsOverlap(
          a.shift.startsAt,
          a.shift.endsAt,
          dayStart,
          dayEnd,
        );
      }).length;

      const gap = required - scheduled;
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

function effectiveMinStaff(
  rules: { minStaffCount: number; validFrom: Date | null; validTo: Date | null }[],
  day: Date,
): number {
  const applicable = rules.filter((r) => {
    if (r.validFrom && day < r.validFrom) return false;
    if (r.validTo && day > r.validTo) return false;
    return true;
  });
  if (applicable.length === 0) return 1;
  return Math.max(...applicable.map((r) => r.minStaffCount));
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
