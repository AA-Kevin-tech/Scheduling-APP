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

/**
 * Clock-in after scheduled start + this many minutes counts as “late” for manager alerts.
 * Default 1 avoids noise from clock skew while still flagging true lateness.
 */
export function clockInLateAfterMinutes(): number {
  const raw = process.env.TIME_CLOCK_LATE_AFTER_MINUTES;
  if (raw === undefined || raw === "") return 1;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 && n <= 120 ? n : 1;
}

/**
 * If an employee still has not clocked in this many minutes after shift start (and the shift
 * is still in progress), managers get an alert (once per assignment, deduped).
 */
export function missingClockInAfterMinutes(): number {
  const raw = process.env.TIME_CLOCK_MISSING_IN_AFTER_MINUTES;
  if (raw === undefined || raw === "") return 15;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 1 && n <= 240 ? n : 15;
}

/** Warn when worked minutes reach this fraction of the weekly cap (0–100). */
export function weeklyHourCapWarnPercent(): number {
  const raw = process.env.TIME_CLOCK_WEEKLY_CAP_WARN_PERCENT;
  if (raw === undefined || raw === "") return 90;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 50 && n <= 100 ? n : 90;
}
