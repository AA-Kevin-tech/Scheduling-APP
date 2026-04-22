/** Shared limits and helpers for employee document uploads (not a server-actions module). */

export const MAX_EMPLOYEE_FILE_BYTES = 10 * 1024 * 1024;

export function safeEmployeeFileName(raw: string): string {
  const base = raw
    .replace(/^.*[/\\]/, "")
    .replace(/\0/g, "")
    .trim();
  if (!base) return "upload";
  return base.length > 200 ? base.slice(0, 200) : base;
}
