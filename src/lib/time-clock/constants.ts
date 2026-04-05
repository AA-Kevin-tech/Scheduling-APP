/** Minutes before shift start that clock-in is allowed. */
export function clockInEarlyMinutes(): number {
  const raw = process.env.TIME_CLOCK_EARLY_MINUTES;
  if (raw === undefined || raw === "") return 30;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 && n <= 24 * 60 ? n : 30;
}

/** Kiosk “locked terminal” cookie lifetime (hours). */
export function kioskCookieHours(): number {
  const raw = process.env.TIME_CLOCK_KIOSK_HOURS;
  if (raw === undefined || raw === "") return 24;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 1 && n <= 168 ? n : 24;
}

/** After PIN step, how long the worker session cookie lasts (minutes). */
export function terminalWorkerSessionMinutes(): number {
  const raw = process.env.TIME_CLOCK_WORKER_SESSION_MINUTES;
  if (raw === undefined || raw === "") return 30;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 5 && n <= 480 ? n : 30;
}
