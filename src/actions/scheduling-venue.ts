"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import {
  getBaseSchedulingLocationIdsForSession,
  SCHEDULING_ACTIVE_VENUE_COOKIE,
} from "@/lib/auth/location-scope";
import { prisma } from "@/lib/db";

export async function setSchedulingActiveVenue(
  venueId: "__all__" | string,
): Promise<{ ok?: true; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const jar = await cookies();

  if (venueId === "__all__") {
    jar.delete(SCHEDULING_ACTIVE_VENUE_COOKIE);
    revalidatePath("/admin", "layout");
    revalidatePath("/manager", "layout");
    revalidatePath("/employee", "layout");
    return { ok: true };
  }

  const loc = await prisma.location.findUnique({
    where: { id: venueId },
    select: { id: true },
  });
  if (!loc) {
    return { error: "Unknown venue" };
  }

  const base = await getBaseSchedulingLocationIdsForSession(session);
  if (base !== null && !base.includes(venueId)) {
    return { error: "You are not assigned to that venue." };
  }

  jar.set(SCHEDULING_ACTIVE_VENUE_COOKIE, venueId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 400,
    secure: process.env.NODE_ENV === "production",
  });

  revalidatePath("/admin", "layout");
  revalidatePath("/manager", "layout");
  revalidatePath("/employee", "layout");
  return { ok: true };
}
