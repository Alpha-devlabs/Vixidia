const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export function formatCurrency(amount: number): string {
  return inr.format(amount);
}

const dateFmt = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' });
const longDateFmt = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

/** Parses a YYYY-MM-DD string as a local calendar date (no timezone shift). */
function parseDay(isoDay: string): Date {
  const [y, m, d] = isoDay.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function formatDay(isoDay: string): string {
  return dateFmt.format(parseDay(isoDay));
}

export function formatLongDay(isoDay: string): string {
  return longDateFmt.format(parseDay(isoDay));
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/**
 * Short currency for chart axes in the Indian system: ₹800, ₹12K, ₹1.2L, ₹3Cr.
 * (Intl's en-IN compact notation writes thousands as "T", which reads as trillions.)
 */
export function formatCompactCurrency(amount: number): string {
  const units: [number, string][] = [
    [10_000_000, 'Cr'],
    [100_000, 'L'],
    [1_000, 'K'],
  ];
  for (const [size, suffix] of units) {
    if (Math.abs(amount) >= size) {
      const value = amount / size;
      return `₹${Number.isInteger(value) ? value : value.toFixed(1).replace(/\.0$/, '')}${suffix}`;
    }
  }
  return `₹${amount}`;
}

const weekdayFmt = new Intl.DateTimeFormat('en-IN', { weekday: 'short' });

export function formatWeekday(isoDay: string): string {
  return weekdayFmt.format(parseDay(isoDay));
}

/** "Today", "Yesterday", or a short date. */
export function formatRelativeDay(isoDay: string, today: string): string {
  if (isoDay === today) return 'Today';
  const y = parseDay(today);
  y.setDate(y.getDate() - 1);
  if (parseDay(isoDay).getTime() === y.getTime()) return 'Yesterday';
  return formatDay(isoDay);
}

/** "3–9 Mar" style range label. */
export function formatDayRange(start: string, end: string): string {
  if (start === end) return formatDay(start);
  const a = parseDay(start);
  const b = parseDay(end);
  return a.getMonth() === b.getMonth()
    ? `${a.getDate()}–${formatDay(end)}`
    : `${formatDay(start)} – ${formatDay(end)}`;
}

/** Relative day for use mid-sentence: "today", "yesterday" or "12 Oct". */
export function formatRelativeDayInline(isoDay: string, today: string): string {
  const rel = formatRelativeDay(isoDay, today);
  return rel === 'Today' || rel === 'Yesterday' ? rel.toLowerCase() : rel;
}

/** "Due today", "Due yesterday" or "Due 12 Oct". */
export function formatDue(isoDay: string, today: string): string {
  return `Due ${formatRelativeDayInline(isoDay, today)}`;
}

const inrPaise = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Invoice amounts with paise, e.g. ₹35,683.20. */
export function formatAmount(amount: number): string {
  return inrPaise.format(amount);
}

const fullDateFmt = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/** "12 Oct 2026" */
export function formatDate(isoDay: string): string {
  const [y, m, d] = isoDay.split('-').map(Number);
  return fullDateFmt.format(new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1));
}
