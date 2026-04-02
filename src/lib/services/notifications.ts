import { prisma } from "@/lib/db";

export async function createNotification(input: {
  userId: string;
  title: string;
  body: string;
  type: string;
}) {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      title: input.title,
      body: input.body,
      type: input.type,
    },
  });
}

export async function notifyManagersExcept(
  exceptUserId: string | null,
  title: string,
  body: string,
  type: string,
) {
  const managers = await prisma.user.findMany({
    where: {
      role: { in: ["MANAGER", "ADMIN"] },
      ...(exceptUserId ? { id: { not: exceptUserId } } : {}),
    },
    select: { id: true },
  });
  await Promise.all(
    managers.map((m) =>
      createNotification({ userId: m.id, title, body, type }),
    ),
  );
}

export async function getUnreadCount(userId: string) {
  return prisma.notification.count({
    where: { userId, readAt: null },
  });
}
