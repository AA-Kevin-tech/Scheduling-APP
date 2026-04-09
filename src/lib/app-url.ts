/**
 * Canonical public base URL for links in emails and password reset.
 * Prefer NEXT_PUBLIC_APP_URL so browser and server agree with marketing domains.
 */
export function publicAppBaseUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.AUTH_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    "http://localhost:3000";
  return base.replace(/\/$/, "");
}
