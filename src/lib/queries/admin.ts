import { prisma } from "@/lib/db";

export async function getLocations() {
  return prisma.location.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

/**
 * Locations visible in admin UI for the current scheduling venue scope.
 * `null` = all venues (switcher on “All venues”).
 */
export async function getLocationsForScope(scopeLocationIds: string[] | null) {
  if (scopeLocationIds === null) {
    return getLocations();
  }
  if (scopeLocationIds.length === 0) {
    return [];
  }
  return prisma.location.findMany({
    where: { id: { in: scopeLocationIds } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

/** Narrow select: avoids Prisma Decimal on Employee (breaks RSC serialization) and omits unused columns. */
export async function getUsersForAdminList(options?: {
  /** When non-null and non-empty, only users with no employee row or at least one of these venues. */
  onlyAtLocations?: string[] | null;
}) {
  const scope = options?.onlyAtLocations;
  const where =
    scope != null && scope.length > 0
      ? {
          OR: [
            { employee: null },
            {
              employee: {
                locations: { some: { locationId: { in: scope } } },
              },
            },
          ],
        }
      : undefined;

  return prisma.user.findMany({
    where,
    orderBy: { email: "asc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      employee: {
        select: {
          archivedAt: true,
          locations: {
            select: {
              id: true,
              location: { select: { name: true } },
            },
          },
          departments: {
            select: {
              id: true,
              department: { select: { name: true } },
              role: { select: { name: true } },
            },
          },
        },
      },
    },
  });
}

export async function getUserForAdminEdit(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      employee: {
        include: {
          locations: true,
          departments: {
            include: { department: { include: { location: true } } },
          },
        },
      },
    },
  });
}
