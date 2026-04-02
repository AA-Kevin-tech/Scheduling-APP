import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { addWeeksUtc, parseDateParam, startOfWeekMondayUtc } from "@/lib/datetime";
import { getShiftsForEmployee, getShiftsForRange } from "@/lib/queries/schedule";

function mapShift(s: Awaited<ReturnType<typeof getShiftsForRange>>[number]) {
  return {
    id: s.id,
    departmentId: s.departmentId,
    roleId: s.roleId,
    zoneId: s.zoneId,
    title: s.title,
    startsAt: s.startsAt.toISOString(),
    endsAt: s.endsAt.toISOString(),
    parentShiftId: s.parentShiftId,
    recurrenceRule: s.recurrenceRule,
    department: {
      id: s.department.id,
      name: s.department.name,
      slug: s.department.slug,
    },
    role: s.role
      ? { id: s.role.id, name: s.role.name, slug: s.role.slug }
      : null,
    zone: s.zone
      ? { id: s.zone.id, name: s.zone.name, slug: s.zone.slug }
      : null,
    assignments: s.assignments.map((a) => ({
      id: a.id,
      employeeId: a.employeeId,
      managerOverrideReason: a.managerOverrideReason,
      employee: {
        id: a.employee.id,
        name: a.employee.user.name,
        email: a.employee.user.email,
      },
    })),
  };
}

/** JSON shifts feed for integrations / future mobile clients. */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const departmentId = searchParams.get("departmentId") ?? undefined;
  const roleId = searchParams.get("roleId") ?? undefined;

  const from = fromParam
    ? startOfWeekMondayUtc(parseDateParam(fromParam, new Date()))
    : startOfWeekMondayUtc(new Date());
  const to = toParam ? new Date(toParam) : addWeeksUtc(from, 1);

  if (Number.isNaN(to.getTime())) {
    return NextResponse.json({ error: "Invalid `to` date" }, { status: 400 });
  }

  if (session.user.role === "EMPLOYEE") {
    const employeeId = session.user.employeeId;
    if (!employeeId) {
      return NextResponse.json(
        { error: "No employee profile linked to this account." },
        { status: 403 },
      );
    }
    const shifts = await getShiftsForEmployee({
      employeeId,
      from,
      to,
    });
    return NextResponse.json({
      range: { from: from.toISOString(), to: to.toISOString() },
      shifts: shifts.map(mapShift),
    });
  }

  const shifts = await getShiftsForRange({
    from,
    to,
    departmentId,
    roleId,
  });

  return NextResponse.json({
    range: { from: from.toISOString(), to: to.toISOString() },
    shifts: shifts.map(mapShift),
  });
}
