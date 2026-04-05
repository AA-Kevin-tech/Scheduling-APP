import { createHmac, timingSafeEqual } from "crypto";

const PREFIX = "v1";

function getSecret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return s;
}

export function signPayload(data: Record<string, unknown>): string {
  const secret = getSecret();
  const payload = Buffer.from(JSON.stringify(data), "utf8").toString("base64url");
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${PREFIX}.${payload}.${sig}`;
}

export function verifyPayload<T extends Record<string, unknown>>(
  token: string | undefined,
): T | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== PREFIX) return null;
  const [, payloadB64, sig] = parts;
  if (!payloadB64 || !sig) return null;
  try {
    const secret = getSecret();
    const expected = createHmac("sha256", secret).update(payloadB64).digest("base64url");
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const json = Buffer.from(payloadB64, "base64url").toString("utf8");
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}
