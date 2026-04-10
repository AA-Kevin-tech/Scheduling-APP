"use server";

import { randomBytes } from "crypto";
import { hash } from "bcryptjs";
import { z } from "zod";
import { publicAppBaseUrl } from "@/lib/app-url";
import { prisma } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";

const requestSchema = z.object({
  email: z.string().email(),
});

export async function requestPasswordReset(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const parsed = requestSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { error: "Enter a valid email address." };
  }

  const email = parsed.data.email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.passwordHash) {
    return { ok: true };
  }

  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.verificationToken.deleteMany({
    where: { identifier: email },
  });

  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token,
      expires,
    },
  });

  const resetUrl = `${publicAppBaseUrl()}/reset-password?token=${encodeURIComponent(token)}`;

  try {
    await sendPasswordResetEmail(email, resetUrl);
  } catch (e) {
    console.error(e);
    return { error: "Could not send email. Try again later." };
  }

  return { ok: true };
}

export async function resetPassword(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const token = String(formData.get("token") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!token) {
    return { error: "This reset link is invalid or has expired." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const row = await prisma.verificationToken.findFirst({
    where: { token },
  });

  if (!row || row.expires < new Date()) {
    return { error: "This reset link is invalid or has expired." };
  }

  const email = row.identifier.toLowerCase().trim();
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!existing) {
    await prisma.verificationToken.deleteMany({
      where: { identifier: row.identifier, token: row.token },
    });
    return {
      error:
        "This account is no longer available. Contact an administrator for help.",
    };
  }

  const passwordHash = await hash(password, 12);

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { email },
      data: {
        passwordHash,
        credentialVersion: { increment: 1 },
      },
    });
    await tx.verificationToken.deleteMany({
      where: { identifier: row.identifier, token: row.token },
    });
    await tx.session.deleteMany({ where: { userId: user.id } });
  });

  return { ok: true };
}
