import {
  MANAGER_NOTIFICATION_ROLES,
  ORG_WIDE_USER_ROLES,
} from "@/lib/auth/roles";
import { prisma } from "@/lib/db";
import { dispatchNotificationOutbound } from "@/lib/services/notification-dispatch";

export async function createNotification(input: {
  userId: string;
  title: string;
  body: string;
  type: string;
}) {
  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      title: input.title,
      body: input.body,
      type: input.type,
    },
  });

  void dispatchNotificationOutbound(notification.id).catch((err) => {
    console.error("[notifications] outbound dispatch error", notification.id, err);
  });

  return notification;
}

export async function notifyManagersExcept(
  exceptUserId: string | null,
  title: string,
  body: string,
  type: string,
) {
  const managers = await prisma.user.findMany({
    where: {
      role: { in: [...MANAGER_NOTIFICATION_ROLES] },
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

/** Admins (optional except) + managers assigned to at least one of these venues. */
export async function notifyManagersAtLocationsExcept(
  locationIds: string[],
  exceptUserId: string | null,
  title: string,
  body: string,
  type: string,
) {
  if (locationIds.length === 0) return;

  const admins = await prisma.user.findMany({
    where: {
      role: { in: [...ORG_WIDE_USER_ROLES] },
      ...(exceptUserId ? { id: { not: exceptUserId } } : {}),
    },
    select: { id: true },
  });

  const managersAtVenue = await prisma.user.findMany({
    where: {
      role: "MANAGER",
      ...(exceptUserId ? { id: { not: exceptUserId } } : {}),
      OR: [
        { managerLocations: { some: { locationId: { in: locationIds } } } },
        {
          AND: [
            { managerLocations: { none: {} } },
            {
              employee: {
                locations: { some: { locationId: { in: locationIds } } },
              },
            },
          ],
        },
      ],
    },
    select: { id: true },
  });

  const ids = new Set<string>();
  for (const a of admins) ids.add(a.id);
  for (const m of managersAtVenue) ids.add(m.id);

  await Promise.all(
    [...ids].map((userId) =>
      createNotification({ userId, title, body, type }),
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
