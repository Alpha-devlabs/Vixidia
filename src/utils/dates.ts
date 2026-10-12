/**
 * Day arithmetic on YYYY-MM-DD strings, done in UTC so daylight-saving
 * changes can never shift a date.
 */
const DAY_MS = 86_400_000;

function toUtc(day: string): number {
  const [y, m, d] = day.split('-').map(Number);
  return Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

function fromUtc(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(day: string, n: number): string {
  return fromUtc(toUtc(day) + n * DAY_MS);
}

/** Whole days from `a` to `b` (positive when b is later). */
export function daysBetween(a: string, b: string): number {
  return Math.round((toUtc(b) - toUtc(a)) / DAY_MS);
}

/** The visitor's local calendar date. */
export function localToday(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Day of the week, 0 = Sunday. */
export function weekday(day: string): number {
  return new Date(toUtc(day)).getUTCDay();
}

export function isWithin(day: string, start: string, end: string): boolean {
  return day >= start && day <= end;
}
