import { formatInTimeZone } from "date-fns-tz";
import { prisma } from "@/lib/db";
import {
  findOpenPunchForEmployee,
  getClockableAssignmentsForEmployee,
} from "@/lib/queries/time-clock";
import { normalizeIanaTimezone } from "@/lib/schedule/tz";

export type TerminalDashboard = {
  displayName: string;
  timezone: string;
  openPunch: {
    punchId: string;
    clockInAt: string;
    departmentName: string;
    shiftLabel: string;
    locationName: string | null;
  } | null;
  /** One shift to clock back into after a break (e.g. lunch), when they already finished a segment today. */
  resumeLunchBreak: {
    assignmentId: string;
    title: string;
    departmentName: string;
    locationName: string | null;
    startsAtLabel: string;
    endsAtLabel: string;
  } | null;
  clockInOptions: Array<{
    assignmentId: string;
    title: string;
    departmentName: string;
    locationName: string | null;
    startsAtLabel: string;
    endsAtLabel: string;
  }>;
};

export async function getTerminalDashboard(
  employeeId: string,
): Promise<TerminalDashboard | null> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { user: { select: { name: true, email: true } } },
  });
  if (!employee) return null;

  const tz = normalizeIanaTimezone(employee.timezone);
  const now = new Date();
  const displayName =
    employee.user.name?.trim() || employee.user.email || "Employee";

  const [openPunch, clockable] = await Promise.all([
    findOpenPunchForEmployee(employeeId),
    getClockableAssignmentsForEmployee(employeeId, now),
  ]);

  let openSerialized: TerminalDashboard["openPunch"] = null;
  if (openPunch) {
    const s = openPunch.assignment.shift;
    openSerialized = {
      punchId: openPunch.id,
      clockInAt: openPunch.clockInAt.toISOString(),
      departmentName: s.department.name,
      shiftLabel: s.title || s.role?.name || "Shift",
      locationName: s.location?.name ?? null,
    };
  }

  const clockInOptions = clockable
    .filter((a) => !a.timePunches.some((p) => p.clockOutAt == null))
    .map((a) => {
      const s = a.shift;
      const title = s.title || s.role?.name || s.department.name;
      return {
        assignmentId: a.id,
        title,
        departmentName: s.department.name,
        locationName: s.location?.name ?? null,
        startsAtLabel: formatInTimeZone(s.startsAt, tz, "MMM d, h:mm a"),
        endsAtLabel: formatInTimeZone(s.endsAt, tz, "h:mm a"),
      };
    });

  let resumeLunchBreak: TerminalDashboard["resumeLunchBreak"] = null;
  if (!openPunch && clockInOptions.length === 1) {
    const only = clockInOptions[0];
    const row = clockable.find((a) => a.id === only.assignmentId);
    if (row && row.timePunches.some((p) => p.clockOutAt != null)) {
      resumeLunchBreak = { ...only };
    }
  }

  return {
    displayName,
    timezone: tz,
    openPunch: openSerialized,
    resumeLunchBreak,
    clockInOptions,
  };
}
