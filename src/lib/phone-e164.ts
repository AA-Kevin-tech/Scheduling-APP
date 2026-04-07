/**
 * Best-effort E.164 from profile input (US: 10 digits → +1…).
 * Returns null if the number cannot be interpreted safely.
 */
export function parseToE164(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const t = raw.trim();
  if (!t) return null;
  const digits = t.replace(/\D/g, "");
  if (digits.length === 0) return null;
  if (t.startsWith("+")) {
    return `+${digits}`;
  }
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }
  return null;
}
