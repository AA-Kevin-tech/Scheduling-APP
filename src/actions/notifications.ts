"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function markNotificationRead(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return;

  await prisma.notification.updateMany({
    where: { id, userId: session.user.id },
    data: { readAt: new Date() },
  });

  revalidatePath("/employee/notifications");
  revalidatePath("/manager/notifications");
}

export async function markAllNotificationsRead(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;

  await prisma.notification.updateMany({
    where: { userId: session.user.id, readAt: null },
    data: { readAt: new Date() },
  });

  revalidatePath("/employee/notifications");
  revalidatePath("/manager/notifications");
}
