import { prisma } from "@/lib/db";
import { shiftsWhereForLocations } from "@/lib/auth/location-scope";

const departmentWithLocation = {
  include: {
    location: { select: { id: true, name: true, slug: true } },
  },
} as const;

const shiftTeamInclude = {
  department: departmentWithLocation,
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
  /**
   * When omitted, no location filter (admin / internal).
   * Empty array = no shifts. Non-empty = those venues only.
   */
  locationIds?: string[] | null;
}) {
  const locWhere = shiftsWhereForLocations(
    params.locationIds === undefined ? null : params.locationIds,
  );
  return prisma.shift.findMany({
    where: {
      AND: [
        { startsAt: { lt: params.to } },
        { endsAt: { gt: params.from } },
        ...(params.departmentId
          ? [{ departmentId: params.departmentId } as const]
          : []),
        ...(params.roleId ? [{ roleId: params.roleId } as const] : []),
        locWhere,
      ],
    },
    include: {
      department: departmentWithLocation,
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
   * Omit both departmentIds and locationScope for org-wide (avoid for employee views).
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
      department: departmentWithLocation,
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
      department: departmentWithLocation,
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
      department: departmentWithLocation,
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
  /** If set, only staff tied to these venues (via work locations or department venue). */
  onlyAtLocations?: string[];
}) {
  const includeArchived = options?.includeArchived === true;
  const only = options?.onlyAtLocations;

  const locationWhere =
    only === undefined
      ? {}
      : only.length === 0
        ? { id: { in: [] as string[] } }
        : {
            OR: [
              { locations: { some: { locationId: { in: only } } } },
              {
                departments: {
                  some: {
                    department: { locationId: { in: only } },
                  },
                },
              },
            ],
          };

  return prisma.employee.findMany({
    where: {
      AND: [
        includeArchived ? {} : { archivedAt: null },
        locationWhere,
      ],
    },
    orderBy: { user: { email: "asc" } },
    include: {
      user: { select: { name: true, email: true } },
      locations: { include: { location: true } },
      departments: {
        include: {
          department: { include: { location: true } },
          role: true,
        },
      },
    },
  });
}

export async function getDepartmentsWithRoles(options?: {
  onlyAtLocations?: string[];
}) {
  const only = options?.onlyAtLocations;
  const locationFilter =
    only === undefined
      ? undefined
      : only.length === 0
        ? { id: { in: [] as string[] } }
        : { locationId: { in: only } };

  return prisma.department.findMany({
    where: locationFilter,
    orderBy: [{ location: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    include: {
      location: { select: { id: true, name: true, slug: true } },
      roles: { orderBy: { name: "asc" } },
      zones: { orderBy: { name: "asc" } },
      coverageRules: { orderBy: [{ minStaffCount: "desc" }, { id: "asc" }] },
    },
  });
}
