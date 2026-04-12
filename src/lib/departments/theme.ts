import type { DepartmentColorOption } from "@/lib/departments/color-tokens";

/** Tailwind classes for each persisted `colorToken` (admin picker). */
export const DEPARTMENT_TOKEN_BADGE_CLASSES: Record<DepartmentColorOption, string> = {
  emerald:
    "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-100 dark:border-emerald-700",
  amber:
    "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-100 dark:border-amber-700",
  violet:
    "bg-violet-100 text-violet-900 border-violet-300 dark:bg-violet-950 dark:text-violet-100 dark:border-violet-700",
  teal:
    "bg-teal-100 text-teal-900 border-teal-300 dark:bg-teal-950 dark:text-teal-100 dark:border-teal-700",
  rose:
    "bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950 dark:text-rose-100 dark:border-rose-700",
  slate:
    "bg-slate-100 text-slate-900 border-slate-300 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600",
  sky:
    "bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-950 dark:text-sky-100 dark:border-sky-700",
  red: "bg-red-100 text-red-900 border-red-300 dark:bg-red-950 dark:text-red-100 dark:border-red-700",
  orange:
    "bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-950 dark:text-orange-100 dark:border-orange-700",
  lime:
    "bg-lime-100 text-lime-900 border-lime-300 dark:bg-lime-950 dark:text-lime-100 dark:border-lime-700",
  green:
    "bg-green-100 text-green-900 border-green-300 dark:bg-green-950 dark:text-green-100 dark:border-green-700",
  cyan:
    "bg-cyan-100 text-cyan-900 border-cyan-300 dark:bg-cyan-950 dark:text-cyan-100 dark:border-cyan-700",
  blue:
    "bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950 dark:text-blue-100 dark:border-blue-700",
  indigo:
    "bg-indigo-100 text-indigo-900 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-100 dark:border-indigo-700",
  fuchsia:
    "bg-fuchsia-100 text-fuchsia-900 border-fuchsia-300 dark:bg-fuchsia-950 dark:text-fuchsia-100 dark:border-fuchsia-700",
  pink:
    "bg-pink-100 text-pink-900 border-pink-300 dark:bg-pink-950 dark:text-pink-100 dark:border-pink-700",
};

const FALLBACK_BADGE =
  "bg-slate-100 text-slate-800 dark:text-zinc-200 border-slate-300 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600";

/** Stable Tailwind-ish color tokens per department slug (seed / legacy overrides). */
export const DEPARTMENT_COLORS: Record<string, string> = {
  "guest-services":
    "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-100 dark:border-emerald-700",
  admissions:
    "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-100 dark:border-amber-700",
  retail:
    "bg-violet-100 text-violet-900 border-violet-300 dark:bg-violet-950 dark:text-violet-100 dark:border-violet-700",
  "animal-care":
    "bg-teal-100 text-teal-900 border-teal-300 dark:bg-teal-950 dark:text-teal-100 dark:border-teal-700",
  events:
    "bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950 dark:text-rose-100 dark:border-rose-700",
  maintenance:
    "bg-slate-200 text-slate-900 dark:text-zinc-100 border-slate-400 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600",
  education:
    "bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-950 dark:text-sky-100 dark:border-sky-700",
};

/**
 * Badge styling for a department. Uses `colorToken` when set so admin-chosen colors
 * apply everywhere; falls back to slug-based seed styling, then neutral.
 */
export function departmentBadgeClass(slug: string, colorToken?: string | null): string {
  if (colorToken && colorToken in DEPARTMENT_TOKEN_BADGE_CLASSES) {
    return DEPARTMENT_TOKEN_BADGE_CLASSES[colorToken as DepartmentColorOption];
  }
  return DEPARTMENT_COLORS[slug] ?? FALLBACK_BADGE;
}
