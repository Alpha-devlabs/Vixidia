import type { Invoice, InvoiceBook, InvoiceLine, InvoiceStatus, IsoDay, Paise, Payment, PaymentMethod } from '../../types/invoice';
import { addDays, daysBetween } from '../../utils/dates';
import { formatAmount } from '../../utils/format';
import { MAX_PAISE, applyBasisPoints, isValidPaise, isValidQuantity, multiplyQuantity, parseMoney, parseQuantity, toRupees } from './money';

/*
 * Invoice & Payment Tracker — core rules.
 *
 * Every screen gets its numbers from here: totals, balances, statuses and the
 * overview are derived from the stored invoices and payments, never stored a
 * second time. The create / record / send functions are pure: they validate,
 * then return a new book or a set of field errors, and never mutate the input.
 *
 * Calculation order (matches the approved form's "Rates are before GST"):
 *   line amount = quantity × rate, rounded half up to the paisa
 *   subtotal    = sum of line amounts
 *   GST         = subtotal × invoice GST rate, rounded half up to the paisa
 *   total       = subtotal + GST
 * There is no discount in the approved design, so none is applied.
 */

export const STANDARD_GST_BASIS_POINTS = 1800;
export const paymentMethods: readonly PaymentMethod[] = ['UPI', 'Bank transfer', 'Cash', 'Cheque', 'Card'];

const MAX_DESCRIPTION = 200;
const MAX_NOTES = 1000;
const MAX_REFERENCE = 100;
const MAX_TERMS_DAYS = 365;

// ---------- Dates ----------

/** True for a real calendar date written as YYYY-MM-DD. */
export function isIsoDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y!, m! - 1, d!));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m! - 1 && date.getUTCDate() === d;
}

// ---------- Totals ----------

export interface InvoiceTotals {
  subtotal: Paise;
  gst: Paise;
  total: Paise;
}

export function lineAmount(line: InvoiceLine): Paise {
  return multiplyQuantity(line.quantity, line.ratePaise);
}

export function invoiceTotals(lines: InvoiceLine[], gstBasisPoints: number): InvoiceTotals {
  const subtotal = lines.reduce((sum, l) => sum + lineAmount(l), 0);
  const gst = applyBasisPoints(subtotal, gstBasisPoints);
  return { subtotal, gst, total: subtotal + gst };
}

/** "18%", "5%", "12.5%" — for labels. */
export function gstLabel(basisPoints: number): string {
  return `${basisPoints / 100}%`;
}

// ---------- Status ----------

/**
 * Status rules:
 * - A draft stays a draft until it is sent.
 * - Paid when the payments cover the total, whatever the due date.
 * - Otherwise overdue from the day after the due date. This includes partly paid
 *   invoices: being late outranks being partly paid. The remaining balance is
 *   still shown alongside.
 * - Otherwise partially paid if anything has been paid, else awaiting payment.
 * Dates are compared as calendar days (YYYY-MM-DD), so time zones can't shift them.
 */
export function statusFor(invoice: Pick<Invoice, 'draft' | 'dueDate'>, total: Paise, paid: Paise, today: IsoDay): InvoiceStatus {
  if (invoice.draft) return 'draft';
  if (paid >= total) return 'paid';
  if (today > invoice.dueDate) return 'overdue';
  return paid > 0 ? 'partially_paid' : 'awaiting';
}

// ---------- Rows: one derived view per invoice ----------

export interface InvoiceRow {
  invoice: Invoice;
  customer: string;
  city: string;
  totals: InvoiceTotals;
  paid: Paise;
  /** total − paid, never below zero. */
  balance: Paise;
  status: InvoiceStatus;
  daysOverdue: number;
  /** This invoice's payments, newest first. */
  payments: Payment[];
}

export function invoiceRow(book: InvoiceBook, invoice: Invoice): InvoiceRow {
  const customer = book.customers.find((c) => c.id === invoice.customerId);
  const totals = invoiceTotals(invoice.lines, invoice.gstBasisPoints);
  const payments = book.payments
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => p.invoiceId === invoice.id)
    .sort((a, b) => (a.p.date === b.p.date ? b.i - a.i : a.p.date < b.p.date ? 1 : -1))
    .map(({ p }) => p);
  const paid = payments.reduce((sum, p) => sum + p.amountPaise, 0);
  const status = statusFor(invoice, totals.total, paid, book.today);
  return {
    invoice,
    customer: customer?.name ?? 'Unknown customer',
    city: customer?.city ?? '',
    totals,
    paid,
    balance: Math.max(0, totals.total - paid),
    status,
    daysOverdue: status === 'overdue' ? daysBetween(invoice.dueDate, book.today) : 0,
    payments,
  };
}

/** Every invoice, newest first (by issue date, then invoice number). */
export function invoiceRows(book: InvoiceBook): InvoiceRow[] {
  return book.invoices
    .map((invoice) => invoiceRow(book, invoice))
    .sort((a, b) =>
      a.invoice.issueDate !== b.invoice.issueDate
        ? a.invoice.issueDate < b.invoice.issueDate
          ? 1
          : -1
        : b.invoice.number.localeCompare(a.invoice.number, 'en', { numeric: true }),
    );
}

// ---------- Overview ----------

export interface InvoiceOverview {
  invoiced: Paise;
  invoicedCount: number;
  collected: Paise;
  paymentCount: number;
  outstanding: Paise;
  outstandingCount: number;
  overdue: Paise;
  overdueCount: number;
}

/**
 * Headline figures, computed from the same rows the list and detail views show.
 * Drafts are excluded until sent. Because payments can never exceed an invoice's
 * balance, invoiced = collected + outstanding always holds.
 */
export function overview(rows: InvoiceRow[]): InvoiceOverview {
  const sent = rows.filter((r) => r.status !== 'draft');
  const open = sent.filter((r) => r.balance > 0);
  const late = open.filter((r) => r.status === 'overdue');
  const sum = (xs: InvoiceRow[], f: (r: InvoiceRow) => number) => xs.reduce((a, r) => a + f(r), 0);
  return {
    invoiced: sum(sent, (r) => r.totals.total),
    invoicedCount: sent.length,
    collected: sum(sent, (r) => r.paid),
    paymentCount: sum(sent, (r) => r.payments.length),
    outstanding: sum(open, (r) => r.balance),
    outstandingCount: open.length,
    overdue: sum(late, (r) => r.balance),
    overdueCount: late.length,
  };
}

// ---------- Creating invoices ----------

/** One item row as typed into the form. */
export interface LineInput {
  description: string;
  quantity: string;
  rate: string;
}

export interface NewInvoiceInput {
  customerId: string;
  issueDate: string;
  termsDays: number;
  gstBasisPoints: number;
  lines: LineInput[];
  notes?: string;
  draft: boolean;
}

/** Field errors. Item errors use the key `line-<index>` (index into the input lines). */
export type FieldErrors = Record<string, string>;

export type Result<T> = ({ ok: true; book: InvoiceBook } & T) | { ok: false; errors: FieldErrors };

/** A row the person hasn't started (no description and no rate) is ignored, as in the form. */
function isBlank(l: LineInput): boolean {
  return !l.description.trim() && !l.rate.trim();
}

/** Parses one item row. Returns the line, or the first problem with it. */
export function parseLine(l: LineInput): { line: InvoiceLine } | { error: string } {
  const description = l.description.trim();
  if (!description) return { error: 'Describe the item.' };
  if (description.length > MAX_DESCRIPTION) return { error: `Keep the description under ${MAX_DESCRIPTION} characters.` };
  const q = parseQuantity(l.quantity);
  if (!q.ok) {
    if (q.reason === 'empty') return { error: 'Enter a quantity.' };
    if (q.reason === 'too_large') return { error: 'That quantity is too large.' };
    return { error: 'Quantity must be a number above zero, with up to 3 decimals.' };
  }
  if (q.value <= 0) return { error: 'Quantity must be more than zero.' };
  const r = parseMoney(l.rate);
  if (!r.ok) {
    if (r.reason === 'empty') return { error: 'Enter a rate in rupees.' };
    if (r.reason === 'too_large') return { error: 'That rate is too large.' };
    return { error: 'Use rupees and paise only, like 2400.50.' };
  }
  const line: InvoiceLine = { description, quantity: q.value, ratePaise: r.value };
  if (lineAmount(line) > MAX_PAISE) return { error: 'This item’s amount is too large.' };
  return { line };
}

/** Amount for one typed row, or null while it can't be calculated yet. */
export function lineInputAmount(l: Pick<LineInput, 'quantity' | 'rate'>): Paise | null {
  const q = parseQuantity(l.quantity);
  const r = parseMoney(l.rate);
  if (!q.ok || !r.ok || q.value <= 0) return null;
  const amount = multiplyQuantity(q.value, r.value);
  return amount > MAX_PAISE ? null : amount;
}

/** Live totals for the form: every row that parses counts; rows with problems are left out until fixed. */
export function previewTotals(lines: LineInput[], gstBasisPoints: number): InvoiceTotals {
  const valid = lines.flatMap((l) => {
    const p = parseLine(l);
    return 'line' in p ? [p.line] : [];
  });
  return invoiceTotals(valid, gstBasisPoints);
}

export function isValidGstBasisPoints(bp: number): boolean {
  return Number.isInteger(bp) && bp >= 0 && bp <= 10_000;
}

/** Next number in the existing sequence, e.g. INV-2026-042 → INV-2026-043. */
export function nextInvoiceNumber(invoices: Invoice[], today: IsoDay): string {
  let best: { prefix: string; seq: number; width: number } | null = null;
  for (const inv of invoices) {
    const m = /^(.*?)(\d+)$/.exec(inv.number);
    if (!m) continue;
    const seq = Number(m[2]);
    if (!best || seq > best.seq) best = { prefix: m[1]!, seq, width: m[2]!.length };
  }
  if (!best) return `INV-${today.slice(0, 4)}-001`;
  return `${best.prefix}${String(best.seq + 1).padStart(best.width, '0')}`;
}

function nextId(prefix: string, taken: { id: string }[]): string {
  const ids = new Set(taken.map((t) => t.id));
  let n = taken.length + 1;
  while (ids.has(`${prefix}${n}`)) n += 1;
  return `${prefix}${n}`;
}

/** Validates the form and, if everything is right, adds the invoice (sent or draft). */
export function createInvoice(book: InvoiceBook, input: NewInvoiceInput): Result<{ invoice: Invoice }> {
  const errors: FieldErrors = {};
  if (!book.customers.some((c) => c.id === input.customerId)) errors.customer = 'Choose who this invoice is for.';
  if (!isIsoDay(input.issueDate)) errors.issueDate = 'Choose the invoice date.';
  if (!Number.isInteger(input.termsDays) || input.termsDays < 0 || input.termsDays > MAX_TERMS_DAYS) errors.terms = 'Choose the payment terms.';
  if (!isValidGstBasisPoints(input.gstBasisPoints)) errors.gst = 'Choose a GST rate between 0% and 100%.';

  const lines: InvoiceLine[] = [];
  input.lines.forEach((l, i) => {
    if (isBlank(l)) return;
    const parsed = parseLine(l);
    if ('error' in parsed) errors[`line-${i}`] = parsed.error;
    else lines.push(parsed.line);
  });
  const anyLineErrors = Object.keys(errors).some((k) => k.startsWith('line-'));
  if (lines.length === 0 && !anyLineErrors) errors.lines = 'Add at least one item.';

  const notes = input.notes?.trim() ?? '';
  if (notes.length > MAX_NOTES) errors.notes = `Keep notes under ${MAX_NOTES} characters.`;

  if (Object.keys(errors).length === 0) {
    const { total } = invoiceTotals(lines, input.gstBasisPoints);
    if (total <= 0) errors.lines = 'The invoice total must be more than zero.';
    else if (total > MAX_PAISE) errors.lines = 'The invoice total is too large.';
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const invoice: Invoice = {
    id: nextId('inv-', book.invoices),
    number: nextInvoiceNumber(book.invoices, book.today),
    customerId: input.customerId,
    issueDate: input.issueDate,
    dueDate: addDays(input.issueDate, input.termsDays),
    lines,
    gstBasisPoints: input.gstBasisPoints,
    ...(input.draft ? { draft: true } : {}),
    ...(notes ? { notes } : {}),
  };
  return { ok: true, invoice, book: { ...book, invoices: [...book.invoices, invoice] } };
}

/** Sends a draft: from then on it counts as invoiced and can take payments. Dates stay as entered. */
export function markSent(book: InvoiceBook, invoiceId: string): Result<{ invoice: Invoice }> {
  const found = book.invoices.find((i) => i.id === invoiceId);
  if (!found) return { ok: false, errors: { invoice: 'This invoice doesn’t exist.' } };
  if (!found.draft) return { ok: false, errors: { invoice: 'This invoice has already been sent.' } };
  const invoice: Invoice = { ...found };
  delete invoice.draft;
  return { ok: true, invoice, book: { ...book, invoices: book.invoices.map((i) => (i.id === invoiceId ? invoice : i)) } };
}

// ---------- Recording payments ----------

export interface PaymentInput {
  invoiceId: string;
  /** Rupees as typed, e.g. "12,500.50". */
  amount: string;
  date: string;
  method: string;
  reference?: string;
}

/**
 * Records one payment (a demo operation: no money moves). Rules:
 * the invoice must exist and have been sent; the amount must be a positive amount
 * in rupees and paise and no more than the balance still due (overpayments are not
 * supported); the date must be a real date, not in the future and not before the
 * invoice date.
 */
export function recordPayment(book: InvoiceBook, input: PaymentInput): Result<{ payment: Payment; row: InvoiceRow }> {
  const invoice = book.invoices.find((i) => i.id === input.invoiceId);
  if (!invoice) return { ok: false, errors: { invoice: 'This invoice doesn’t exist, so no payment can be recorded against it.' } };
  const row = invoiceRow(book, invoice);
  if (row.status === 'draft') return { ok: false, errors: { invoice: 'Send the invoice before recording payments.' } };
  if (row.balance <= 0) return { ok: false, errors: { invoice: 'This invoice is already fully paid.' } };

  const errors: FieldErrors = {};
  const raw = input.amount.trim();
  const amount = parseMoney(raw);
  if (!amount.ok) {
    if (amount.reason === 'empty') errors.amount = 'Enter the amount received.';
    else if (/^-/.test(raw)) errors.amount = 'Enter an amount greater than zero.';
    else if (amount.reason === 'too_large') errors.amount = `This is more than the ${formatAmount(toRupees(row.balance))} still due.`;
    else errors.amount = 'Use rupees and paise only, like 12500.50.';
  } else if (amount.value <= 0) errors.amount = 'Enter an amount greater than zero.';
  else if (amount.value > row.balance) errors.amount = `This is more than the ${formatAmount(toRupees(row.balance))} still due.`;

  if (!isIsoDay(input.date)) errors.date = 'Choose the date the payment arrived.';
  else if (input.date > book.today) errors.date = 'The payment date can’t be in the future.';
  else if (input.date < invoice.issueDate) errors.date = 'The payment can’t be earlier than the invoice date.';

  if (!paymentMethods.includes(input.method as PaymentMethod)) errors.method = 'Choose how the payment was made.';
  const reference = input.reference?.trim() ?? '';
  if (reference.length > MAX_REFERENCE) errors.reference = `Keep the reference under ${MAX_REFERENCE} characters.`;

  if (Object.keys(errors).length > 0 || !amount.ok || !isValidPaise(amount.value)) return { ok: false, errors };

  const payment: Payment = {
    id: nextId('pay-', book.payments),
    invoiceId: invoice.id,
    date: input.date,
    amountPaise: amount.value,
    method: input.method as PaymentMethod,
    ...(reference ? { reference } : {}),
  };
  const next = { ...book, payments: [...book.payments, payment] };
  return { ok: true, payment, book: next, row: invoiceRow(next, invoice) };
}

/** Structural checks used by tests and the sample data: every stored value is valid. */
export function bookProblems(book: InvoiceBook): string[] {
  const problems: string[] = [];
  const ids = new Set(book.invoices.map((i) => i.id));
  for (const inv of book.invoices) {
    if (!book.customers.some((c) => c.id === inv.customerId)) problems.push(`${inv.number}: unknown customer`);
    if (!isIsoDay(inv.issueDate) || !isIsoDay(inv.dueDate) || inv.dueDate < inv.issueDate) problems.push(`${inv.number}: bad dates`);
    if (!isValidGstBasisPoints(inv.gstBasisPoints)) problems.push(`${inv.number}: bad GST rate`);
    for (const l of inv.lines) if (!isValidQuantity(l.quantity) || !isValidPaise(l.ratePaise)) problems.push(`${inv.number}: bad line`);
  }
  for (const p of book.payments) {
    if (!ids.has(p.invoiceId)) problems.push(`${p.id}: unknown invoice`);
    if (!isValidPaise(p.amountPaise) || p.amountPaise <= 0) problems.push(`${p.id}: bad amount`);
  }
  for (const r of invoiceRows(book)) {
    if (r.paid > r.totals.total) problems.push(`${r.invoice.number}: overpaid`);
    if (r.status === 'draft' && r.payments.length) problems.push(`${r.invoice.number}: draft with payments`);
  }
  return problems;
}
