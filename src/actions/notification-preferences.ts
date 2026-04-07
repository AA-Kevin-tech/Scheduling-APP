"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { parseToE164 } from "@/lib/phone-e164";

const prefsSchema = z.object({
  notifyEmail: z.boolean(),
  notifySms: z.boolean(),
  smsOptIn: z.boolean(),
});

export async function updateNotificationPreferences(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const session = await requireSession();
  const parsed = prefsSchema.safeParse({
    notifyEmail: formData.get("notifyEmail") === "on",
    notifySms: formData.get("notifySms") === "on",
    smsOptIn: formData.get("smsOptIn") === "on",
  });
  if (!parsed.success) {
    return { error: "Invalid form." };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { smsOptInAt: true },
  });
  if (!user) return { error: "User not found." };

  const { notifyEmail, notifySms, smsOptIn } = parsed.data;

  if (!notifySms) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        notifyEmail,
        notifySms: false,
        smsOptInAt: null,
      },
    });
    revalidatePath("/employee/profile");
    revalidatePath("/manager/settings");
    revalidatePath("/admin");
    return { ok: true };
  }

  // SMS on
  if (!smsOptIn) {
    if (!user.smsOptInAt) {
      return {
        error:
          "To enable text alerts, check the box to confirm you agree to receive SMS.",
      };
    }
    // Withdrew consent: turn SMS off
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        notifyEmail,
        notifySms: false,
        smsOptInAt: null,
      },
    });
    revalidatePath("/employee/profile");
    revalidatePath("/manager/settings");
    revalidatePath("/admin");
    return { ok: true };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      notifyEmail,
      notifySms: true,
      smsOptInAt: user.smsOptInAt ?? new Date(),
    },
  });

  revalidatePath("/employee/profile");
  revalidatePath("/manager/settings");
  revalidatePath("/admin");
  return { ok: true };
}

const managerPhoneSchema = z.object({
  phone: z.string().max(40),
});

/** Mobile number for accounts without an Employee profile (manager/admin only). */
export async function updateManagerAccountPhone(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const session = await requireSession();
  if (session.user.employeeId) {
    return { error: "Use your employee profile phone for SMS." };
  }
  if (session.user.role !== "MANAGER" && session.user.role !== "ADMIN") {
    return { error: "Not allowed." };
  }

  const parsed = managerPhoneSchema.safeParse({
    phone: formData.get("phone") ?? "",
  });
  if (!parsed.success) {
    return { error: "Phone value is too long." };
  }

  const raw = parsed.data.phone.trim();
  if (raw === "") {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { phoneE164: null },
    });
    revalidatePath("/manager/settings");
    return { ok: true };
  }

  const e164 = parseToE164(raw);
  if (!e164) {
    return {
      error:
        "Enter a valid mobile number (10 digits US, or start with + for other countries).",
    };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { phoneE164: e164 },
  });

  revalidatePath("/manager/settings");
  return { ok: true };
}
