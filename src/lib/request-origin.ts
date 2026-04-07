import { headers } from "next/headers";

/**
 * Scheme + host for the current request, for absolute links shown in the UI.
 * Uses forwarded headers when the app sits behind a reverse proxy.
 */
export async function getRequestOrigin(): Promise<string | null> {
  const h = await headers();
  const host =
    h.get("x-forwarded-host")?.split(",")[0]?.trim() ??
    h.get("host")?.trim() ??
    null;
  if (!host) return null;

  const protoRaw = h.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const proto =
    protoRaw === "http" || protoRaw === "https" ? protoRaw : "http";

  return `${proto}://${host}`;
}

export function isLoopbackOrigin(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "[::1]" ||
      hostname === "::1"
    );
  } catch {
    return false;
  }
}
