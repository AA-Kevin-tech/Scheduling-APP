/** Stable Tailwind-ish color tokens per department slug (UI consistency). */
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

export function departmentBadgeClass(slug: string): string {
  return (
    DEPARTMENT_COLORS[slug] ??
    "bg-slate-100 text-slate-800 dark:text-zinc-200 border-slate-300 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600"
  );
}
