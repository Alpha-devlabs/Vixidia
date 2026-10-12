import type { Paise } from '../../types/invoice';

/*
 * Exact money helpers for INR.
 *
 * Amounts are whole paise. Text a person types is parsed digit by digit, never
 * through floating-point maths, and every multiplication is done in BigInt and
 * rounded once, half up, to the nearest paisa.
 */

/** Largest amount any single figure may reach: ₹100 crore. Keeps every sum far inside safe integers. */
export const MAX_PAISE: Paise = 100_000_000_000; // ₹1,00,00,00,000.00
export const MAX_QUANTITY = 1_000_000;

/** Rupees (as written in sample data or code) to paise. For trusted constants only; user input goes through parseMoney. */
export function rupees(amount: number): Paise {
  return Math.round(amount * 100);
}

/** Paise to rupees for display (formatAmount / formatCurrency take rupees). */
export function toRupees(paise: Paise): number {
  return paise / 100;
}

/** Strips the separators people commonly type: spaces, commas and the rupee sign. */
function clean(text: string): string {
  return text.replace(/[,\s₹]/g, '');
}

export type Parsed<T> = { ok: true; value: T } | { ok: false; reason: 'empty' | 'format' | 'too_large' };

/**
 * Parses rupees typed by a person ("12,500", "12500.5", "₹99.99") into paise.
 * Accepts at most two decimal places and no sign; anything else is a format error.
 */
export function parseMoney(text: string): Parsed<Paise> {
  const s = clean(text);
  if (!s) return { ok: false, reason: 'empty' };
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(s);
  if (!m) return { ok: false, reason: 'format' };
  const whole = m[1]!.replace(/^0+(?=\d)/, '');
  if (whole.length > 12) return { ok: false, reason: 'too_large' };
  const value = Number(whole) * 100 + Number((m[2] ?? '').padEnd(2, '0'));
  if (value > MAX_PAISE) return { ok: false, reason: 'too_large' };
  return { ok: true, value };
}

/** Parses a quantity: a positive-or-zero number with at most three decimal places. */
export function parseQuantity(text: string): Parsed<number> {
  const s = clean(text);
  if (!s) return { ok: false, reason: 'empty' };
  const m = /^(\d+)(?:\.(\d{1,3}))?$/.exec(s);
  if (!m) return { ok: false, reason: 'format' };
  if (m[1]!.replace(/^0+(?=\d)/, '').length > 7) return { ok: false, reason: 'too_large' };
  const milli = Number(m[1]) * 1000 + Number((m[2] ?? '').padEnd(3, '0'));
  if (milli > MAX_QUANTITY * 1000) return { ok: false, reason: 'too_large' };
  return { ok: true, value: milli / 1000 };
}

/** True when a quantity is positive, finite and has at most three decimal places. */
export function isValidQuantity(q: number): boolean {
  return Number.isFinite(q) && q > 0 && q <= MAX_QUANTITY && Math.abs(q * 1000 - Math.round(q * 1000)) < 1e-6;
}

/** True when an amount is a whole, non-negative number of paise within the limit. */
export function isValidPaise(p: number): boolean {
  return Number.isSafeInteger(p) && p >= 0 && p <= MAX_PAISE;
}

/** round_half_up(a × b ÷ d) for non-negative integers, computed exactly. */
function mulDivRound(a: bigint, b: bigint, d: bigint): bigint {
  return (a * b * 2n + d) / (2n * d);
}

/** quantity × rate, rounded half up to the paisa. */
export function multiplyQuantity(quantity: number, ratePaise: Paise): Paise {
  const milli = BigInt(Math.round(quantity * 1000));
  return Number(mulDivRound(milli, BigInt(ratePaise), 1000n));
}

/** amount × basis points ÷ 10 000, rounded half up to the paisa (1800 bp = 18%). */
export function applyBasisPoints(amount: Paise, basisPoints: number): Paise {
  return Number(mulDivRound(BigInt(amount), BigInt(basisPoints), 10_000n));
}

/** Paise as plain text for an input field, e.g. 1234567 → "12345.67". */
export function paiseToInput(paise: Paise): string {
  return `${Math.floor(paise / 100)}.${String(paise % 100).padStart(2, '0')}`;
}
