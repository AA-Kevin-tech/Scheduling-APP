"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/slug";
import { writeAuditLog } from "@/lib/services/audit";

const COLOR_TOKENS = [
  "emerald",
  "amber",
  "violet",
  "teal",
  "rose",
  "slate",
  "sky",
] as const;

const createSchema = z.object({
  locationId: z.string().min(1),
  name: z.string().min(1),
  colorToken: z.enum(COLOR_TOKENS).optional().default("slate"),
  sortOrder: z.coerce.number().int().optional().default(0),
});

async function uniqueDepartmentSlug(
  base: string,
  locationId: string,
  excludeDepartmentId?: string,
): Promise<string> {
  let slug = slugify(base);
  let n = 0;
  while (true) {
    const hit = await prisma.department.findFirst({
      where: {
        locationId,
        slug,
        ...(excludeDepartmentId
          ? { NOT: { id: excludeDepartmentId } }
          : {}),
      },
    });
    if (!hit) return slug;
    n += 1;
    slug = `${slugify(base)}-${n}`;
  }
}

export async function createDepartment(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const session = await requireAdmin();
  const parsed = createSchema.safeParse({
    locationId: formData.get("locationId"),
    name: formData.get("name"),
    colorToken: formData.get("colorToken") || "slate",
    sortOrder: formData.get("sortOrder"),
  });
  if (!parsed.success) {
    return { error: parsed.error.flatten().formErrors.join(", ") };
  }

  const loc = await prisma.location.findUnique({
    where: { id: parsed.data.locationId },
    select: { id: true },
  });
  if (!loc) return { error: "Venue not found." };

  const slug = await uniqueDepartmentSlug(
    parsed.data.name,
    parsed.data.locationId,
  );

  const dept = await prisma.department.create({
    data: {
      locationId: parsed.data.locationId,
      name: parsed.data.name.trim(),
      slug,
      colorToken: parsed.data.colorToken,
      sortOrder: parsed.data.sortOrder,
      roles: {
        create: [
          { name: "Attendant", slug: "attendant" },
          { name: "Lead", slug: "lead" },
        ],
      },
    },
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    entityType: "Department",
    entityId: dept.id,
    action: "CREATE",
    payload: { name: dept.name, slug: dept.slug },
  });

  revalidatePath("/admin/departments");
  revalidatePath("/manager/departments");
  revalidatePath("/manager/schedule");
  return { ok: true };
}

const updateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  colorToken: z.enum(COLOR_TOKENS),
  sortOrder: z.coerce.number().int(),
});

export async function updateDepartment(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const session = await requireAdmin();
  const parsed = updateSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    colorToken: formData.get("colorToken"),
    sortOrder: formData.get("sortOrder"),
  });
  if (!parsed.success) {
    return { error: parsed.error.flatten().formErrors.join(", ") };
  }

  const existing = await prisma.department.findUnique({
    where: { id: parsed.data.id },
  });
  if (!existing) return { error: "Department not found." };

  let slug = existing.slug;
  if (parsed.data.name.trim() !== existing.name) {
    slug = await uniqueDepartmentSlug(
      parsed.data.name,
      existing.locationId,
      parsed.data.id,
    );
  }

  await prisma.department.update({
    where: { id: parsed.data.id },
    data: {
      name: parsed.data.name.trim(),
      slug,
      colorToken: parsed.data.colorToken,
      sortOrder: parsed.data.sortOrder,
    },
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    entityType: "Department",
    entityId: parsed.data.id,
    action: "UPDATE",
  });

  revalidatePath("/admin/departments");
  revalidatePath("/manager/departments");
  revalidatePath("/manager/schedule");
  return { ok: true };
}

export async function deleteDepartment(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const session = await requireAdmin();
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { error: "Missing id." };

  const [shifts, empDepts, rules] = await Promise.all([
    prisma.shift.count({ where: { departmentId: id } }),
    prisma.employeeDepartment.count({ where: { departmentId: id } }),
    prisma.coverageRule.count({ where: { departmentId: id } }),
  ]);

  if (shifts > 0 || empDepts > 0 || rules > 0) {
    return {
      error:
        "Remove employees, shifts, and coverage rules from this department first.",
    };
  }

  await prisma.department.delete({ where: { id } });

  await writeAuditLog({
    actorUserId: session.user.id,
    entityType: "Department",
    entityId: id,
    action: "DELETE",
  });

  revalidatePath("/admin/departments");
  revalidatePath("/manager/departments");
  revalidatePath("/manager/schedule");
  return { ok: true };
}

const zoneNameSchema = z.object({
  departmentId: z.string().min(1),
  name: z.string().min(1),
});

async function uniqueZoneSlug(departmentId: string, base: string): Promise<string> {
  let slug = slugify(base);
  let n = 0;
  while (true) {
    const hit = await prisma.departmentZone.findFirst({
      where: { departmentId, slug },
    });
    if (!hit) return slug;
    n += 1;
    slug = `${slugify(base)}-${n}`;
  }
}

export async function createDepartmentZone(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const session = await requireAdmin();
  const parsed = zoneNameSchema.safeParse({
    departmentId: formData.get("departmentId"),
    name: formData.get("name"),
  });
  if (!parsed.success) {
    return { error: parsed.error.flatten().formErrors.join(", ") };
  }

  const name = parsed.data.name.trim();
  const dept = await prisma.department.findUnique({
    where: { id: parsed.data.departmentId },
    select: { id: true },
  });
  if (!dept) return { error: "Department not found." };

  const slug = await uniqueZoneSlug(parsed.data.departmentId, name);

  const zone = await prisma.departmentZone.create({
    data: {
      departmentId: parsed.data.departmentId,
      name,
      slug,
    },
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    entityType: "DepartmentZone",
    entityId: zone.id,
    action: "CREATE",
    payload: { departmentId: parsed.data.departmentId, name, slug },
  });

  revalidatePath("/admin/departments");
  revalidatePath("/manager/departments");
  revalidatePath("/manager/schedule");
  revalidatePath("/manager/coverage");
  return { ok: true };
}

export async function deleteDepartmentZone(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const session = await requireAdmin();
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { error: "Missing id." };

  const zone = await prisma.departmentZone.findUnique({
    where: { id },
    select: { id: true, departmentId: true, name: true },
  });
  if (!zone) return { error: "Zone not found." };

  await prisma.departmentZone.delete({ where: { id } });

  await writeAuditLog({
    actorUserId: session.user.id,
    entityType: "DepartmentZone",
    entityId: id,
    action: "DELETE",
    payload: { departmentId: zone.departmentId, name: zone.name },
  });

  revalidatePath("/admin/departments");
  revalidatePath("/manager/departments");
  revalidatePath("/manager/schedule");
  revalidatePath("/manager/coverage");
  return { ok: true };
}
