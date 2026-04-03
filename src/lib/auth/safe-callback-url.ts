/**
 * Reject protocol-relative and absolute URLs so open redirects cannot use ?callbackUrl=.
 */
export function safeCallbackUrl(
  raw: string | undefined,
  fallback: string,
): string {
  if (typeof raw !== "string") return fallback;
  const s = raw.trim();
  if (!s.startsWith("/") || s.startsWith("//")) return fallback;
  if (s.includes("\\")) return fallback;
  return s;
}
