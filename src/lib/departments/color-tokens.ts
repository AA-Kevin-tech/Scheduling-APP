/** Allowed department color tokens (admin picker + persisted `Department.colorToken`). */
export const DEPARTMENT_COLOR_OPTIONS = [
  "emerald",
  "amber",
  "violet",
  "teal",
  "rose",
  "slate",
  "sky",
  "red",
  "orange",
  "lime",
  "green",
  "cyan",
  "blue",
  "indigo",
  "fuchsia",
  "pink",
] as const;

export type DepartmentColorOption = (typeof DEPARTMENT_COLOR_OPTIONS)[number];
