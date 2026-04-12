"use server";

import type { ThemePreference } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";

const schema = z.enum(["LIGHT", "DARK", "SYSTEM"]);

export async function updateThemePreference(
  pref: ThemePreference,
): Promise<{ ok?: boolean; error?: string }> {
  const parsed = schema.safeParse(pref);
  if (!parsed.success) {
    return { error: "Invalid theme." };
  }
  const session = await requireSession();
  await prisma.user.update({
    where: { id: session.user.id },
    data: { themePreference: parsed.data },
  });
  revalidatePath("/", "layout");
  revalidatePath("/employee/profile");
  revalidatePath("/manager/settings");
  return { ok: true };
}
