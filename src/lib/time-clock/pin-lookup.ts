import { createHmac } from "crypto";

/** Deterministic digest for indexed PIN lookup (never store plain PIN). */
export function timeClockPinLookupDigest(plainPin: string): string {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret) {
    throw new Error("AUTH_SECRET is required for time clock PIN lookup.");
  }
  return createHmac("sha256", secret)
    .update(`timeclock-pin-v1:${plainPin}`, "utf8")
    .digest("hex");
}
