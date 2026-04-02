import { prisma } from "@/lib/db";

export async function getLocations() {
  return prisma.location.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function getUsersForAdminList() {
  return prisma.user.findMany({
    orderBy: { email: "asc" },
    include: {
      employee: {
        include: {
          locations: { include: { location: true } },
          departments: { include: { department: true, role: true } },
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
          departments: true,
        },
      },
    },
  });
}
