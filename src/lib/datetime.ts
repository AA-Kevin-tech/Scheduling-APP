/** Week starts Monday (ISO weekday 1). */

export function startOfDayUtc(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

export function endOfDayUtc(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(23, 59, 59, 999);
  return x;
}

/** Monday 00:00 UTC of the week containing `d`. */
export function startOfWeekMondayUtc(d: Date): Date {
  const x = new Date(d);
  const day = x.getUTCDay(); // 0 Sun .. 6 Sat
  const diff = day === 0 ? -6 : 1 - day;
  x.setUTCDate(x.getUTCDate() + diff);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

export function addDaysUtc(d: Date, days: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

export function addWeeksUtc(d: Date, weeks: number): Date {
  return addDaysUtc(d, weeks * 7);
}

export function parseDateParam(s: string | undefined, fallback: Date): Date {
  if (!s) return fallback;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

export function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function intervalsOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}
