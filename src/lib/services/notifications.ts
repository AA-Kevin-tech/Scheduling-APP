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

/** In-app alerts when published shifts become visible to assignees. */
export async function notifyUsersSchedulePublished(
  userIds: string[],
  singleShift: boolean,
) {
  const ids = [...new Set(userIds)];
  if (ids.length === 0) return;
  const body = singleShift
    ? "A shift assigned to you is now visible on your schedule."
    : "Your schedule has updates — new shifts were published. Open Schedule to review.";
  await Promise.all(
    ids.map((userId) =>
      createNotification({
        userId,
        title: "Schedule published",
        body,
        type: "SCHEDULE_PUBLISHED",
      }),
    ),
  );
}
