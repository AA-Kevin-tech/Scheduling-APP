import { prisma } from "@/lib/db";

export async function getShiftsForRange(params: {
  from: Date;
  to: Date;
  departmentId?: string;
  roleId?: string;
}) {
  return prisma.shift.findMany({
    where: {
      AND: [
        { startsAt: { lt: params.to } },
        { endsAt: { gt: params.from } },
        ...(params.departmentId
          ? [{ departmentId: params.departmentId } as const]
          : []),
        ...(params.roleId ? [{ roleId: params.roleId } as const] : []),
      ],
    },
    include: {
      department: true,
      role: true,
      zone: true,
      assignments: {
        include: {
          employee: {
            include: {
              user: { select: { name: true, email: true } },
            },
          },
        },
      },
    },
    orderBy: [{ startsAt: "asc" }, { id: "asc" }],
  });
}

export async function getShiftsForEmployee(params: {
  employeeId: string;
  from: Date;
  to: Date;
}) {
  return prisma.shift.findMany({
    where: {
      AND: [
        { startsAt: { lt: params.to } },
        { endsAt: { gt: params.from } },
        { assignments: { some: { employeeId: params.employeeId } } },
      ],
    },
    include: {
      department: true,
      role: true,
      zone: true,
      assignments: {
        where: { employeeId: params.employeeId },
        include: {
          employee: {
            include: {
              user: { select: { name: true, email: true } },
            },
          },
        },
      },
    },
    orderBy: { startsAt: "asc" },
  });
}

export async function getShiftById(id: string) {
  return prisma.shift.findUnique({
    where: { id },
    include: {
      department: true,
      role: true,
      zone: true,
      location: true,
      assignments: {
        include: {
          employee: {
            include: {
              user: { select: { name: true, email: true } },
            },
          },
        },
      },
    },
  });
}

/** Shift visible to this employee only if they have an assignment. */
export async function getShiftForEmployee(params: {
  shiftId: string;
  employeeId: string;
}) {
  return prisma.shift.findFirst({
    where: {
      id: params.shiftId,
      assignments: { some: { employeeId: params.employeeId } },
    },
    include: {
      department: true,
      role: true,
      zone: true,
      location: true,
      assignments: {
        where: { employeeId: params.employeeId },
        include: {
          employee: {
            include: {
              user: { select: { name: true, email: true } },
            },
          },
        },
      },
    },
  });
}

export async function getEmployeesWithDepartments() {
  return prisma.employee.findMany({
    orderBy: { user: { email: "asc" } },
    include: {
      user: { select: { name: true, email: true } },
      locations: { include: { location: true } },
      departments: {
        include: { department: true, role: true },
      },
    },
  });
}

export async function getDepartmentsWithRoles() {
  return prisma.department.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      roles: { orderBy: { name: "asc" } },
      zones: { orderBy: { name: "asc" } },
    },
  });
}
