import { prisma } from "@/lib/db";

const shiftTeamInclude = {
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
} as const;

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

/** Published shifts only — for employee team schedule views. */
export async function getPublishedShiftsInRange(params: {
  from: Date;
  to: Date;
  /** If set, only these departments. */
  departmentIds?: string[];
  /**
   * Shifts at one of these locations, OR unlocated shifts in these departments.
   * Omit both departmentIds and locationScope for org-wide.
   */
  locationScope?: {
    locationIds: string[];
    departmentIdsForUnlocated: string[];
  };
}) {
  const andClause: object[] = [
    { startsAt: { lt: params.to } },
    { endsAt: { gt: params.from } },
    { publishedAt: { not: null } },
  ];

  if (params.departmentIds?.length) {
    andClause.push({ departmentId: { in: params.departmentIds } });
  }

  if (params.locationScope) {
    const { locationIds, departmentIdsForUnlocated } = params.locationScope;
    const orBranches: object[] = [];
    if (locationIds.length > 0) {
      orBranches.push({ locationId: { in: locationIds } });
    }
    if (departmentIdsForUnlocated.length > 0) {
      orBranches.push({
        AND: [
          { locationId: null },
          { departmentId: { in: departmentIdsForUnlocated } },
        ],
      });
    }
    if (orBranches.length > 0) {
      andClause.push({ OR: orBranches });
    } else {
      andClause.push({ id: { in: [] } });
    }
  }

  return prisma.shift.findMany({
    where: { AND: andClause },
    include: shiftTeamInclude,
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
        { publishedAt: { not: null } },
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
      publishedAt: { not: null },
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

export async function getEmployeesWithDepartments(options?: {
  includeArchived?: boolean;
}) {
  const includeArchived = options?.includeArchived === true;
  return prisma.employee.findMany({
    where: includeArchived ? undefined : { archivedAt: null },
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
      coverageRules: { orderBy: [{ minStaffCount: "desc" }, { id: "asc" }] },
    },
  });
}
