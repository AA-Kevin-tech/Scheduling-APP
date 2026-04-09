import { prisma } from "@/lib/db";

export async function getLocations() {
  return prisma.location.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

/** Narrow select: avoids Prisma Decimal on Employee (breaks RSC serialization) and omits unused columns. */
export async function getUsersForAdminList() {
  return prisma.user.findMany({
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
