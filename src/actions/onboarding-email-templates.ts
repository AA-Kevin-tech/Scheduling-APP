"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/services/audit";

const templateSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  subject: z.string().trim().min(1, "Subject is required.").max(200),
  htmlBody: z.string().trim().min(1, "HTML body is required.").max(100_000),
});

function zodFormError(err: z.ZodError): string {
  const flat = err.flatten();
  const parts = [
    ...flat.formErrors,
    ...Object.values(flat.fieldErrors).flat(),
  ];
  return parts.filter(Boolean).join(", ") || "Invalid form.";
}

export async function createOnboardingEmailTemplate(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string; id?: string }> {
  const session = await requireAdmin();
  const parsed = templateSchema.safeParse({
    name: formData.get("name"),
    subject: formData.get("subject"),
    htmlBody: formData.get("htmlBody"),
  });
  if (!parsed.success) return { error: zodFormError(parsed.error) };

  const row = await prisma.onboardingEmailTemplate.create({
    data: {
      name: parsed.data.name,
      subject: parsed.data.subject,
      htmlBody: parsed.data.htmlBody,
      createdByUserId: session.user.id,
    },
  });
  revalidatePath("/admin/onboarding-email-templates");
  await writeAuditLog({
    actorUserId: session.user.id,
    entityType: "OnboardingEmailTemplate",
    entityId: row.id,
    action: "CREATE",
    payload: { name: row.name },
  });
  return { ok: true, id: row.id };
}

export async function updateOnboardingEmailTemplate(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const session = await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Missing template id." };

  const parsed = templateSchema.safeParse({
    name: formData.get("name"),
    subject: formData.get("subject"),
    htmlBody: formData.get("htmlBody"),
  });
  if (!parsed.success) return { error: zodFormError(parsed.error) };

  try {
    await prisma.onboardingEmailTemplate.update({
      where: { id },
      data: {
        name: parsed.data.name,
        subject: parsed.data.subject,
        htmlBody: parsed.data.htmlBody,
      },
    });
  } catch {
    return { error: "Template not found." };
  }
  revalidatePath("/admin/onboarding-email-templates");
  revalidatePath(`/admin/onboarding-email-templates/${id}/edit`);
  await writeAuditLog({
    actorUserId: session.user.id,
    entityType: "OnboardingEmailTemplate",
    entityId: id,
    action: "UPDATE",
    payload: { name: parsed.data.name },
  });
  return { ok: true };
}

/** Form action: always redirects (with optional error query on failure). */
export async function deleteOnboardingEmailTemplate(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    redirect(
      `/admin/onboarding-email-templates?err=${encodeURIComponent("Missing template id.")}`,
    );
  }

  try {
    await prisma.onboardingEmailTemplate.delete({ where: { id } });
  } catch {
    redirect(
      `/admin/onboarding-email-templates?err=${encodeURIComponent("Could not delete template (it may already be removed).")}`,
    );
  }

  await writeAuditLog({
    actorUserId: session.user.id,
    entityType: "OnboardingEmailTemplate",
    entityId: id,
    action: "DELETE",
    payload: {},
  });
  revalidatePath("/admin/onboarding-email-templates");
  redirect("/admin/onboarding-email-templates");
}
