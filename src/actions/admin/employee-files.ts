"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminOrManager } from "@/lib/auth/guards";
import { employeeOverlapsSchedulingScope } from "@/lib/auth/location-scope";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/services/audit";

export const MAX_EMPLOYEE_FILE_BYTES = 10 * 1024 * 1024;
const MAX_FILE_BYTES = MAX_EMPLOYEE_FILE_BYTES;

export function safeEmployeeFileName(raw: string): string {
  const base = raw
    .replace(/^.*[/\\]/, "")
    .replace(/\0/g, "")
    .trim();
  if (!base) return "upload";
  return base.length > 200 ? base.slice(0, 200) : base;
}

const uploadSchema = z.object({
  employeeId: z.string().min(1),
  description: z.string().max(2000).optional(),
  adminUserIdForRevalidate: z
    .string()
    .transform((s) => s.trim())
    .transform((s) => (s === "" ? undefined : s)),
});

const deleteSchema = z.object({
  fileId: z.string().min(1),
  employeeId: z.string().min(1),
  adminUserIdForRevalidate: z
    .string()
    .transform((s) => s.trim())
    .transform((s) => (s === "" ? undefined : s)),
});

export async function uploadEmployeeFile(
  _prev: { ok?: boolean; error?: string } | undefined,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const session = await requireAdminOrManager();

  const parsed = uploadSchema.safeParse({
    employeeId: formData.get("employeeId"),
    description: (formData.get("description") as string | null) ?? undefined,
    adminUserIdForRevalidate: String(formData.get("adminUserIdForRevalidate") ?? ""),
  });
  if (!parsed.success) {
    return { error: "Invalid form." };
  }

  const allowed = await employeeOverlapsSchedulingScope(
    session,
    parsed.data.employeeId,
  );
  if (!allowed) {
    return { error: "You cannot upload files for this employee." };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { error: "Choose a file to upload." };
  }
  if (file.size === 0) {
    return { error: "The file is empty." };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { error: "File is too large (max 10 MB)." };
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const fileName = safeEmployeeFileName(file.name);
  const contentType = file.type?.trim() ? file.type.trim() : null;
  const desc = (parsed.data.description ?? "").trim();
  const description = desc.length > 0 ? desc : null;

  const row = await prisma.employeeFile.create({
    data: {
      employeeId: parsed.data.employeeId,
      fileName,
      contentType,
      sizeBytes: buf.length,
      data: buf,
      description,
      uploadedByUserId: session.user.id ?? null,
    },
    select: { id: true },
  });

  await writeAuditLog({
    actorUserId: session.user.id ?? null,
    entityType: "EmployeeFile",
    entityId: row.id,
    action: "create",
    payload: {
      employeeId: parsed.data.employeeId,
      fileName,
      sizeBytes: buf.length,
    },
  });

  revalidatePath(`/manager/employees/${parsed.data.employeeId}`);
  if (parsed.data.adminUserIdForRevalidate) {
    revalidatePath(`/admin/users/${parsed.data.adminUserIdForRevalidate}`);
  }
  return { ok: true };
}

export async function deleteEmployeeFile(
  _prev: { ok?: boolean; error?: string } | undefined,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const session = await requireAdminOrManager();

  const parsed = deleteSchema.safeParse({
    fileId: formData.get("fileId"),
    employeeId: formData.get("employeeId"),
    adminUserIdForRevalidate: String(formData.get("adminUserIdForRevalidate") ?? ""),
  });
  if (!parsed.success) {
    return { error: "Invalid form." };
  }

  const allowed = await employeeOverlapsSchedulingScope(
    session,
    parsed.data.employeeId,
  );
  if (!allowed) {
    return { error: "You cannot delete files for this employee." };
  }

  const existing = await prisma.employeeFile.findFirst({
    where: {
      id: parsed.data.fileId,
      employeeId: parsed.data.employeeId,
    },
    select: { id: true, fileName: true },
  });
  if (!existing) {
    return { error: "File not found." };
  }

  await prisma.employeeFile.delete({ where: { id: existing.id } });

  await writeAuditLog({
    actorUserId: session.user.id ?? null,
    entityType: "EmployeeFile",
    entityId: existing.id,
    action: "delete",
    payload: {
      employeeId: parsed.data.employeeId,
      fileName: existing.fileName,
    },
  });

  revalidatePath(`/manager/employees/${parsed.data.employeeId}`);
  if (parsed.data.adminUserIdForRevalidate) {
    revalidatePath(`/admin/users/${parsed.data.adminUserIdForRevalidate}`);
  }
  return { ok: true };
}
