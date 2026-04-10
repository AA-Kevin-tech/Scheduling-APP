export const SCHEDULE_PASTE_MODES = [
  "ALLOW_CONFLICTS",
  "AVOID_CONFLICTS",
  "OVERWRITE_CONFLICTS",
  "ALL_OPEN",
] as const;

export type SchedulePasteMode = (typeof SCHEDULE_PASTE_MODES)[number];

export const PASTE_MODE_LABELS: Record<SchedulePasteMode, string> = {
  ALLOW_CONFLICTS: "Allow conflicts (keep all assignments, may double-book)",
  AVOID_CONFLICTS:
    "Avoid conflicts (skip assignment if time off or overlapping shift)",
  OVERWRITE_CONFLICTS:
    "Overwrite conflicts (remove overlapping shifts for those employees, then paste)",
  ALL_OPEN: "Paste as open shifts (no assignments)",
};
