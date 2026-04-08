"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/slug";
import { writeAuditLog } from "@/lib/services/audit";

const createSchema = z.object({
  name: z.string().min(1),
  address: z.string().nullable().optional(),
  sortOrder: z.coerce.number().int().optional().default(0),
});

async function uniqueLocationSlug(
  base: string,
  excludeLocationId?: string,
): Promise<string> {
  let slug = slugify(base);
  let n = 0;
  while (true) {
    const hit = await prisma.location.findFirst({
      where: {
        slug,
        ...(excludeLocationId ? { NOT: { id: excludeLocationId } } : {}),
      },
    });
    if (!hit) return slug;
    n += 1;
    slug = `${slugify(base)}-${n}`;
  }
}

export async function createLocation(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const session = await requireAdmin();
  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    address: emptyToNull(formData.get("address")),
    sortOrder: formData.get("sortOrder"),
  });
  if (!parsed.success) {
    return { error: parsed.error.flatten().formErrors.join(", ") };
  }

  const slug = await uniqueLocationSlug(parsed.data.name);

  const loc = await prisma.location.create({
    data: {
      name: parsed.data.name.trim(),
      slug,
      address: parsed.data.address?.trim() || null,
      sortOrder: parsed.data.sortOrder,
    },
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    entityType: "Location",
    entityId: loc.id,
    action: "CREATE",
    payload: { name: loc.name, slug: loc.slug },
  });

  revalidatePath("/admin/locations");
  revalidatePath("/admin/users");
  return { ok: true };
}

const updateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  address: z.string().nullable().optional(),
  sortOrder: z.coerce.number().int(),
});

export async function updateLocation(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const session = await requireAdmin();
  const parsed = updateSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    address: emptyToNull(formData.get("address")),
    sortOrder: formData.get("sortOrder"),
  });
  if (!parsed.success) {
    return { error: parsed.error.flatten().formErrors.join(", ") };
  }

  const existing = await prisma.location.findUnique({
    where: { id: parsed.data.id },
  });
  if (!existing) return { error: "Location not found." };

  let slug = existing.slug;
  if (parsed.data.name.trim() !== existing.name) {
    slug = await uniqueLocationSlug(parsed.data.name, parsed.data.id);
  }

  await prisma.location.update({
    where: { id: parsed.data.id },
    data: {
      name: parsed.data.name.trim(),
      slug,
      address: parsed.data.address?.trim() || null,
      sortOrder: parsed.data.sortOrder,
    },
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    entityType: "Location",
    entityId: parsed.data.id,
    action: "UPDATE",
  });

  revalidatePath("/admin/locations");
  return { ok: true };
}

export async function deleteLocation(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const session = await requireAdmin();
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { error: "Missing id." };

  const [shifts, links, departments] = await Promise.all([
    prisma.shift.count({ where: { locationId: id } }),
    prisma.employeeLocation.count({ where: { locationId: id } }),
    prisma.department.count({ where: { locationId: id } }),
  ]);
  if (shifts > 0 || links > 0 || departments > 0) {
    return {
      error:
        "Remove departments, employees, and shifts from this venue before deleting.",
    };
  }

  await prisma.location.delete({ where: { id } });
  await writeAuditLog({
    actorUserId: session.user.id,
    entityType: "Location",
    entityId: id,
    action: "DELETE",
  });

  revalidatePath("/admin/locations");
  return { ok: true };
}

function emptyToNull(v: FormDataEntryValue | null): string | null {
  if (v === null || v === "") return null;
  return String(v);
}
