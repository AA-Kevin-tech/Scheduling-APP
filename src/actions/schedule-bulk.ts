"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  getSchedulingLocationIdsForSession,
  sessionMayAccessVenue,
  shiftVenueId,
} from "@/lib/auth/location-scope";
import { requireManager } from "@/lib/auth/guards";
import { getSchedulingEditAllowedForSession } from "@/lib/permissions/scheduling-edit";
import { prisma } from "@/lib/db";
import { getShiftsForRange } from "@/lib/queries/schedule";
import {
  addWeeksToMondayIso,
  getDefaultScheduleTimezone,
  resolveWeekRangeFromQuery,
} from "@/lib/schedule/tz";
import { SCHEDULE_PASTE_MODES } from "@/lib/schedule/paste-modes";
import {
  commitSchedulePaste,
  filterShiftsForTemplateSave,
  planCopyWeek,
  planFromTemplateShifts,
  shiftWallFields,
} from "@/lib/services/schedule-paste";

export type ScheduleBulkState = {
  ok?: boolean;
  error?: string;
  message?: string;
  created?: number;
};

function emptyToNull(v: FormDataEntryValue | null): string | null {
  if (v === null || v === "") return null;
  return String(v);
}

const pasteModeSchema = z.enum(SCHEDULE_PASTE_MODES);

async function assertShiftsVenueAccess(
  session: Awaited<ReturnType<typeof requireManager>>,
  shifts: { locationId: string | null; department: { locationId: string } }[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  for (const s of shifts) {
    const vid = shiftVenueId(s);
    if (!(await sessionMayAccessVenue(session, vid))) {
      return { ok: false, error: "You do not manage one of these venues." };
    }
  }
  return { ok: true };
}

function revalidateSchedulePaths() {
  revalidatePath("/manager/schedule");
  revalidatePath("/manager/coverage");
  revalidatePath("/employee/schedule");
}

export async function runScheduleBulkAction(
  _prev: ScheduleBulkState,
  formData: FormData,
): Promise<ScheduleBulkState> {
  const session = await requireManager();
  if (!(await getSchedulingEditAllowedForSession(session))) {
    return { error: "Schedule is view-only for your role." };
  }
  const intent = String(formData.get("intent") ?? "");
  const scheduleTz = getDefaultScheduleTimezone();
  const now = new Date();
  const locationIds = await getSchedulingLocationIdsForSession(session);

  if (intent === "copy_previous_week") {
    const parsed = z
      .object({
        mondayIso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        mode: pasteModeSchema,
        departmentId: z.string().optional(),
        roleId: z.string().optional(),
      })
      .safeParse({
        mondayIso: formData.get("mondayIso"),
        mode: formData.get("mode"),
        departmentId: emptyToNull(formData.get("departmentId")) ?? undefined,
        roleId: emptyToNull(formData.get("roleId")) ?? undefined,
      });
    if (!parsed.success) {
      return { error: parsed.error.flatten().formErrors.join(", ") };
    }
    const { mondayIso, mode, departmentId, roleId } = parsed.data;
    const { from: targetFrom, to: targetTo } = resolveWeekRangeFromQuery(
      mondayIso,
      scheduleTz,
      now,
    );
    const prevMonday = addWeeksToMondayIso(mondayIso, -1, scheduleTz);
    const { from: sourceFrom, to: sourceTo } = resolveWeekRangeFromQuery(
      prevMonday,
      scheduleTz,
      now,
    );

    const sourceShifts = await getShiftsForRange({
      from: sourceFrom,
      to: sourceTo,
      departmentId,
      roleId,
      locationIds,
    });

    const access = await assertShiftsVenueAccess(session, sourceShifts);
    if (!access.ok) return { error: access.error };

    const planned = planCopyWeek(sourceShifts, 1, scheduleTz);
    const result = await commitSchedulePaste({
      actorUserId: session.user.id,
      scheduleTz,
      targetFrom,
      targetTo,
      locationIds,
      mode,
      planned,
      auditAction: "COPY_PREVIOUS_WEEK",
      auditPayload: {
        targetMonday: mondayIso,
        sourceMonday: prevMonday,
      },
    });
    if (!result.ok) return { error: result.error };
    revalidateSchedulePaths();
    return {
      ok: true,
      created: result.created,
      message:
        result.created === 0
          ? "No shifts in the previous week to copy."
          : `Copied ${result.created} shift${result.created === 1 ? "" : "s"}.`,
    };
  }

  if (intent === "save_template") {
    const parsed = z
      .object({
        mondayIso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        name: z.string().min(1).max(120),
        description: z.string().max(2000).optional(),
        includeRepeating: z.boolean(),
        departmentId: z.string().optional(),
        roleId: z.string().optional(),
      })
      .safeParse({
        mondayIso: formData.get("mondayIso"),
        name: formData.get("name"),
        description: emptyToNull(formData.get("description")) ?? undefined,
        includeRepeating: formData.get("includeRepeating") === "on",
        departmentId: emptyToNull(formData.get("departmentId")) ?? undefined,
        roleId: emptyToNull(formData.get("roleId")) ?? undefined,
      });
    if (!parsed.success) {
      return { error: parsed.error.flatten().formErrors.join(", ") };
    }
    const { mondayIso, name, description, includeRepeating, departmentId, roleId } =
      parsed.data;
    const { from, to } = resolveWeekRangeFromQuery(mondayIso, scheduleTz, now);
    const shifts = await getShiftsForRange({
      from,
      to,
      departmentId,
      roleId,
      locationIds,
    });
    const access = await assertShiftsVenueAccess(session, shifts);
    if (!access.ok) return { error: access.error };

    const filtered = filterShiftsForTemplateSave(shifts, includeRepeating);
    if (filtered.length === 0) {
      return { error: "No shifts to save for this week (check filters)." };
    }

    await prisma.scheduleTemplate.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        createdByUserId: session.user.id,
        shifts: {
          create: filtered.map((s) => {
            const w = shiftWallFields(s.startsAt, s.endsAt, mondayIso, scheduleTz);
            return {
              dayIndex: w.dayIndex,
              startHm: w.startHm,
              endHm: w.endHm,
              endDayOffset: w.endDayOffset,
              departmentId: s.departmentId,
              locationId: s.locationId,
              roleId: s.roleId,
              zoneId: s.zoneId,
              title: s.title,
              assignments: {
                create: s.assignments
                  .filter((a) => a.employee?.archivedAt == null)
                  .map((a) => ({ employeeId: a.employeeId })),
              },
            };
          }),
        },
      },
    });
    revalidatePath("/manager/schedule");
    return { ok: true, message: `Saved template “${name.trim()}”.` };
  }

  if (intent === "load_template") {
    const parsed = z
      .object({
        templateId: z.string().min(1),
        mondayIso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        mode: pasteModeSchema,
        departmentId: z.string().optional(),
        roleId: z.string().optional(),
      })
      .safeParse({
        templateId: formData.get("templateId"),
        mondayIso: formData.get("mondayIso"),
        mode: formData.get("mode"),
        departmentId: emptyToNull(formData.get("departmentId")) ?? undefined,
        roleId: emptyToNull(formData.get("roleId")) ?? undefined,
      });
    if (!parsed.success) {
      return { error: parsed.error.flatten().formErrors.join(", ") };
    }
    const { templateId, mondayIso, mode, departmentId, roleId } = parsed.data;
    const { from: targetFrom, to: targetTo } = resolveWeekRangeFromQuery(
      mondayIso,
      scheduleTz,
      now,
    );

    const tpl = await prisma.scheduleTemplate.findUnique({
      where: { id: templateId },
      include: {
        shifts: {
          include: {
            assignments: {
              include: {
                employee: { select: { archivedAt: true } },
              },
            },
          },
        },
      },
    });
    if (!tpl) return { error: "Template not found." };

    let planned = planFromTemplateShifts(
      tpl.shifts,
      mondayIso,
      scheduleTz,
    );
    if (departmentId) {
      planned = planned.filter((p) => p.departmentId === departmentId);
    }
    if (roleId) {
      planned = planned.filter((p) => p.roleId === roleId);
    }
    if (planned.length === 0) {
      return {
        error:
          "This template has no shifts that match the current department/role filters.",
      };
    }

    const deptIds = [...new Set(planned.map((p) => p.departmentId))];
    const depts = await prisma.department.findMany({
      where: { id: { in: deptIds } },
      select: { id: true, locationId: true },
    });
    if (depts.length !== deptIds.length) {
      return { error: "One or more departments in this template are invalid." };
    }
    for (const d of depts) {
      if (!(await sessionMayAccessVenue(session, d.locationId))) {
        return { error: "You do not manage one of these venues." };
      }
    }

    const result = await commitSchedulePaste({
      actorUserId: session.user.id,
      scheduleTz,
      targetFrom,
      targetTo,
      locationIds,
      mode,
      planned,
      auditAction: "LOAD_SCHEDULE_TEMPLATE",
      auditPayload: {
        templateId,
        targetMonday: mondayIso,
        templateName: tpl.name,
      },
    });
    if (!result.ok) return { error: result.error };
    revalidateSchedulePaths();
    return {
      ok: true,
      created: result.created,
      message: `Loaded ${result.created} shift${result.created === 1 ? "" : "s"} from template.`,
    };
  }

  if (intent === "delete_template") {
    const parsed = z
      .object({ templateId: z.string().min(1) })
      .safeParse({ templateId: formData.get("templateId") });
    if (!parsed.success) {
      return { error: parsed.error.flatten().formErrors.join(", ") };
    }
    const row = await prisma.scheduleTemplate.findUnique({
      where: { id: parsed.data.templateId },
      select: { id: true, name: true },
    });
    if (!row) return { error: "Template not found." };
    await prisma.scheduleTemplate.delete({ where: { id: row.id } });
    revalidatePath("/manager/schedule");
    return { ok: true, message: `Deleted template “${row.name}”.` };
  }

  if (intent === "update_template") {
    const parsed = z
      .object({
        templateId: z.string().min(1),
        mondayIso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        includeRepeating: z.boolean(),
        departmentId: z.string().optional(),
        roleId: z.string().optional(),
      })
      .safeParse({
        templateId: formData.get("templateId"),
        mondayIso: formData.get("mondayIso"),
        includeRepeating: formData.get("includeRepeating") === "on",
        departmentId: emptyToNull(formData.get("departmentId")) ?? undefined,
        roleId: emptyToNull(formData.get("roleId")) ?? undefined,
      });
    if (!parsed.success) {
      return { error: parsed.error.flatten().formErrors.join(", ") };
    }
    const { templateId, mondayIso, includeRepeating, departmentId, roleId } =
      parsed.data;
    const tplRow = await prisma.scheduleTemplate.findUnique({
      where: { id: templateId },
      select: { id: true },
    });
    if (!tplRow) return { error: "Template not found." };

    const { from, to } = resolveWeekRangeFromQuery(mondayIso, scheduleTz, now);
    const shifts = await getShiftsForRange({
      from,
      to,
      departmentId,
      roleId,
      locationIds,
    });
    const access = await assertShiftsVenueAccess(session, shifts);
    if (!access.ok) return { error: access.error };

    const filtered = filterShiftsForTemplateSave(shifts, includeRepeating);
    if (filtered.length === 0) {
      return { error: "No shifts to save for this week (check filters)." };
    }

    await prisma.scheduleTemplate.update({
      where: { id: templateId },
      data: {
        shifts: {
          deleteMany: {},
          create: filtered.map((s) => {
            const w = shiftWallFields(s.startsAt, s.endsAt, mondayIso, scheduleTz);
            return {
              dayIndex: w.dayIndex,
              startHm: w.startHm,
              endHm: w.endHm,
              endDayOffset: w.endDayOffset,
              departmentId: s.departmentId,
              locationId: s.locationId,
              roleId: s.roleId,
              zoneId: s.zoneId,
              title: s.title,
              assignments: {
                create: s.assignments
                  .filter((a) => a.employee?.archivedAt == null)
                  .map((a) => ({ employeeId: a.employeeId })),
              },
            };
          }),
        },
      },
    });
    revalidatePath("/manager/schedule");
    return { ok: true, message: "Template updated from this week." };
  }

  return { error: "Unknown action." };
}
