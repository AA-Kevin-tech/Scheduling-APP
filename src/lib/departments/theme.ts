/** Stable Tailwind-ish color tokens per department slug (UI consistency). */
export const DEPARTMENT_COLORS: Record<string, string> = {
  "guest-services": "bg-emerald-100 text-emerald-900 border-emerald-300",
  admissions: "bg-amber-100 text-amber-900 border-amber-300",
  retail: "bg-violet-100 text-violet-900 border-violet-300",
  "animal-care": "bg-teal-100 text-teal-900 border-teal-300",
  events: "bg-rose-100 text-rose-900 border-rose-300",
  maintenance: "bg-slate-200 text-slate-900 border-slate-400",
  education: "bg-sky-100 text-sky-900 border-sky-300",
};

export function departmentBadgeClass(slug: string): string {
  return DEPARTMENT_COLORS[slug] ?? "bg-slate-100 text-slate-800 border-slate-300";
}
