/**
 * Calendar dates for common US holidays that move by year (and fixed-date holidays).
 * Used to pre-fill admin company holiday forms; admins can still edit the date or name.
 */

export type SelectableHolidayKey =
  | "new-years"
  | "mlk"
  | "presidents"
  | "memorial"
  | "juneteenth"
  | "independence"
  | "labor"
  | "columbus"
  | "veterans"
  | "thanksgiving"
  | "christmas"
  | "easter";

export const SELECTABLE_HOLIDAY_CHOICES: {
  key: SelectableHolidayKey;
  label: string;
}[] = [
  { key: "new-years", label: "New Year's Day" },
  { key: "mlk", label: "Martin Luther King Jr. Day" },
  { key: "presidents", label: "Presidents' Day" },
  { key: "memorial", label: "Memorial Day" },
  { key: "juneteenth", label: "Juneteenth" },
  { key: "independence", label: "Independence Day" },
  { key: "labor", label: "Labor Day" },
  {
    key: "columbus",
    label: "Columbus Day / Indigenous Peoples' Day",
  },
  { key: "veterans", label: "Veterans Day" },
  { key: "thanksgiving", label: "Thanksgiving Day" },
  { key: "christmas", label: "Christmas Day" },
  { key: "easter", label: "Easter Sunday" },
];

function toYmd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** weekday: 0 = Sunday … 6 = Saturday. n = 1 (first) … 5 (fifth). */
function nthWeekdayOfMonth(
  year: number,
  month1to12: number,
  weekday: number,
  n: number,
): Date {
  const offset = (weekday - new Date(Date.UTC(year, month1to12 - 1, 1)).getUTCDay() + 7) % 7;
  const day = 1 + offset + (n - 1) * 7;
  return new Date(Date.UTC(year, month1to12 - 1, day));
}

function lastWeekdayOfMonth(
  year: number,
  month1to12: number,
  weekday: number,
): Date {
  const last = new Date(Date.UTC(year, month1to12, 0));
  while (last.getUTCDay() !== weekday) {
    last.setUTCDate(last.getUTCDate() - 1);
  }
  return last;
}

/** Gregorian Easter Sunday (Western), UTC calendar date. */
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

const choiceByKey = Object.fromEntries(
  SELECTABLE_HOLIDAY_CHOICES.map((c) => [c.key, c]),
) as Record<SelectableHolidayKey, { key: SelectableHolidayKey; label: string }>;

export function resolveSelectableHoliday(
  key: SelectableHolidayKey,
  year: number,
): { ymd: string; name: string } | null {
  if (!Number.isInteger(year) || year < 1900 || year > 2200) return null;

  let d: Date;
  switch (key) {
    case "new-years":
      d = new Date(Date.UTC(year, 0, 1));
      break;
    case "mlk":
      d = nthWeekdayOfMonth(year, 1, 1, 3);
      break;
    case "presidents":
      d = nthWeekdayOfMonth(year, 2, 1, 3);
      break;
    case "memorial":
      d = lastWeekdayOfMonth(year, 5, 1);
      break;
    case "juneteenth":
      d = new Date(Date.UTC(year, 5, 19));
      break;
    case "independence":
      d = new Date(Date.UTC(year, 6, 4));
      break;
    case "labor":
      d = nthWeekdayOfMonth(year, 9, 1, 1);
      break;
    case "columbus":
      d = nthWeekdayOfMonth(year, 10, 1, 2);
      break;
    case "veterans":
      d = new Date(Date.UTC(year, 10, 11));
      break;
    case "thanksgiving":
      d = nthWeekdayOfMonth(year, 11, 4, 4);
      break;
    case "christmas":
      d = new Date(Date.UTC(year, 11, 25));
      break;
    case "easter":
      d = easterSunday(year);
      break;
  }

  return {
    ymd: toYmd(d),
    name: choiceByKey[key].label,
  };
}

export function holidayYearRange(centerYear: number, span = 6): number[] {
  const out: number[] = [];
  for (let y = centerYear - span; y <= centerYear + span; y++) {
    out.push(y);
  }
  return out;
}
