import { prisma } from "@/lib/db";
import { zonedDayBoundsUtc } from "@/lib/schedule/tz";

const userSelect = { select: { name: true, email: true } } as const;

const shiftInclude = {
  department: { select: { name: true } },
  startsAt: true,
  endsAt: true,
} as const;

export type AdminPunchRow = {
  punchId: string;
  assignmentId: string;
  employeeLabel: string;
  departmentName: string;
  shiftStartsAt: Date;
  shiftEndsAt: Date;
  clockInAt: Date;
  clockOutAt: Date | null;
  clockInNote: string | null;
  clockOutNote: string | null;
};

export type AdminAssignmentNoPunchRow = {
  assignmentId: string;
  employeeLabel: string;
  departmentName: string;
  shiftStartsAt: Date;
  shiftEndsAt: Date;
};

function labelEmployee(name: string | null, email: string) {
  return name?.trim() || email;
}

/** Punches that overlap the calendar day in `tz` (for review / correction). */
export async function listPunchesOverlappingAdminDay(
  isoKey: string,
  tz: string,
): Promise<AdminPunchRow[]> {
  const { start, end } = zonedDayBoundsUtc(isoKey, tz);
  const rows = await prisma.shiftTimePunch.findMany({
    where: {
      AND: [
        { clockInAt: { lt: end } },
        {
          OR: [{ clockOutAt: null }, { clockOutAt: { gt: start } }],
        },
      ],
    },
    include: {
      assignment: {
        include: {
          employee: { include: { user: userSelect } },
          shift: { include: shiftInclude },
        },
      },
    },
    orderBy: { clockInAt: "desc" },
  });

  return rows.map((p) => {
    const u = p.assignment.employee.user;
    return {
      punchId: p.id,
      assignmentId: p.assignment.id,
      employeeLabel: labelEmployee(u.name, u.email),
      departmentName: p.assignment.shift.department.name,
      shiftStartsAt: p.assignment.shift.startsAt,
      shiftEndsAt: p.assignment.shift.endsAt,
      clockInAt: p.clockInAt,
      clockOutAt: p.clockOutAt,
      clockInNote: p.clockInNote,
      clockOutNote: p.clockOutNote,
    };
  });
}

/** Published shift assignments that day with no punch yet (admin may add one). */
export async function listAssignmentsWithoutPunchOverlappingDay(
  isoKey: string,
  tz: string,
): Promise<AdminAssignmentNoPunchRow[]> {
  const { start, end } = zonedDayBoundsUtc(isoKey, tz);
  const rows = await prisma.shiftAssignment.findMany({
    where: {
      timePunches: { none: {} },
      shift: {
        publishedAt: { not: null },
        startsAt: { lt: end },
        endsAt: { gt: start },
      },
    },
    include: {
      employee: { include: { user: userSelect } },
      shift: { include: shiftInclude },
    },
    orderBy: { shift: { startsAt: "asc" } },
  });

  return rows.map((a) => {
    const u = a.employee.user;
    return {
      assignmentId: a.id,
      employeeLabel: labelEmployee(u.name, u.email),
      departmentName: a.shift.department.name,
      shiftStartsAt: a.shift.startsAt,
      shiftEndsAt: a.shift.endsAt,
    };
  });
}
