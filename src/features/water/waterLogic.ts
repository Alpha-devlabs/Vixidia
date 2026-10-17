import type {
  Delivery,
  DeliveryCompletion,
  FailReason,
  IsoDay,
  Paise,
  PaymentMethod,
  RecurringOrder,
  WaterBook,
  WaterCustomer,
  WaterPayment,
  Weekday,
} from '../../types/water';
import { addDays, daysBetween } from '../../utils/dates';
import { formatAmount } from '../../utils/format';
import { parseMoney, toRupees } from '../invoices/money';

/*
 * Water Delivery Management — business rules shared by every screen.
 *
 * Money (integer paise, never floating rupees)
 *   - A completed delivery charges delivered cans × can price + delivered cartons
 *     × carton price. The charge exists only because the delivery is completed,
 *     and a delivery can be completed once, so it is charged exactly once.
 *   - Empty-can returns never create a charge.
 *   - Scheduled, failed and rescheduled deliveries create no charge.
 *   - Balance = opening balance + charges − payments. Each payment is one record,
 *     so it reduces the balance exactly once.
 *   - A payment must be more than zero and no more than what is owed at that
 *     moment (for a payment taken at the door: prior balance + this delivery).
 *
 * Reusable cans
 *   - Full cans delivered increase the customer's cans held; empties collected
 *     decrease it. Cartons are not reusable and don't count.
 *   - Empties collected can't exceed the cans the customer held before the
 *     delivery, so the balance can never go negative.
 *   - Can movements come from the completion record, so they are counted once.
 *
 * Dates are calendar days (YYYY-MM-DD) compared as strings: no timezone shifts.
 */

export const failReasons: { value: FailReason; label: string }[] = [
  { value: 'not_home', label: 'Customer not home' },
  { value: 'locked', label: 'Gate or building locked' },
  { value: 'refused', label: 'Customer refused delivery' },
  { value: 'other', label: 'Other reason' },
];

export const paymentMethods: { value: PaymentMethod; label: string }[] = [
  { value: 'upi', label: 'UPI' },
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank transfer' },
];

export const weekdays: { value: Weekday; short: string }[] = [
  { value: 1, short: 'Mon' },
  { value: 2, short: 'Tue' },
  { value: 3, short: 'Wed' },
  { value: 4, short: 'Thu' },
  { value: 5, short: 'Fri' },
  { value: 6, short: 'Sat' },
  { value: 0, short: 'Sun' },
];

export const MAX_QTY = 50;
export const MAX_RESCHEDULE_DAYS = 30;

export function labelOf<T extends string>(list: { value: T; label: string }[], value: T): string {
  return list.find((x) => x.value === value)?.label ?? value;
}

export function money(paise: Paise): string {
  return formatAmount(toRupees(paise));
}

/** "2 cans · 1 carton", "1 can". */
export function orderText(cans: number, cartons: number): string {
  const parts = [];
  if (cans) parts.push(`${cans} ${cans === 1 ? 'can' : 'cans'}`);
  if (cartons) parts.push(`${cartons} ${cartons === 1 ? 'carton' : 'cartons'}`);
  return parts.join(' · ') || 'Nothing';
}

/** "2 cans · Mon, Wed, Fri" or "1 can · Daily". */
export function recurringText(r: RecurringOrder | undefined): string {
  if (!r) return 'No regular order';
  const days = r.days.length === 7 ? 'Daily' : weekdays.filter((w) => r.days.includes(w.value)).map((w) => w.short).join(', ');
  return `${orderText(r.cans, r.cartons)} · ${days}`;
}

export function isIsoDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y!, m! - 1, d!));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m! - 1 && date.getUTCDate() === d;
}

// ---------- Charges, cans and balances ----------

/** The charge a delivery creates: zero unless it is completed. */
export function deliveryCharge(book: Pick<WaterBook, 'pricing'>, d: Delivery): Paise {
  if (d.status !== 'completed' || !d.completion) return 0;
  return d.completion.cans * book.pricing.canPaise + d.completion.cartons * book.pricing.cartonPaise;
}

/** Change in the customer's cans held: +full cans delivered − empties collected. Zero unless completed. */
export function canMovement(d: Delivery): number {
  if (d.status !== 'completed' || !d.completion) return 0;
  return d.completion.cans - d.completion.emptiesCollected;
}

export interface Account {
  customer: WaterCustomer;
  charges: Paise;
  paid: Paise;
  /** Opening balance + charges − payments. */
  balance: Paise;
  cansHeld: number;
  /** Completed deliveries, newest first. */
  history: Delivery[];
  /** Scheduled deliveries from today on, soonest first. */
  upcoming: Delivery[];
  payments: WaterPayment[];
  lastDelivered?: IsoDay;
}

const byDateDesc = <T extends { date: string }>(a: T, b: T) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1);

export function account(book: WaterBook, customer: WaterCustomer): Account {
  const mine = book.deliveries.filter((d) => d.customerId === customer.id);
  const payments = book.payments.filter((p) => p.customerId === customer.id).sort(byDateDesc);
  const charges = mine.reduce((s, d) => s + deliveryCharge(book, d), 0);
  const paid = payments.reduce((s, p) => s + p.amountPaise, 0);
  const history = mine.filter((d) => d.status === 'completed').sort(byDateDesc);
  return {
    customer,
    charges,
    paid,
    balance: customer.openingBalancePaise + charges - paid,
    cansHeld: customer.openingCans + mine.reduce((s, d) => s + canMovement(d), 0),
    history,
    upcoming: mine.filter((d) => d.status === 'scheduled' && d.date >= book.today).sort((a, b) => a.date.localeCompare(b.date)),
    payments,
    ...(history[0] ? { lastDelivered: history[0].date } : {}),
  };
}

export function accounts(book: WaterBook): Account[] {
  return book.customers.map((c) => account(book, c));
}

export function accountOf(book: WaterBook, customerId: string): Account | undefined {
  const c = book.customers.find((x) => x.id === customerId);
  return c ? account(book, c) : undefined;
}

// ---------- Deliveries for a day ----------

export type PaymentState = 'paid' | 'part' | 'unpaid' | 'none';

export interface DeliveryRow {
  delivery: Delivery;
  customer: WaterCustomer;
  /** Pending: empties expected (one per full can, up to the cans the customer holds). Completed: empties collected. */
  empties: number;
  charge: Paise;
  /** Payments taken during this delivery. */
  collected: Paise;
  payment: PaymentState;
  /** Where a rescheduled delivery went. */
  movedToDate?: IsoDay;
}

export function deliveryRows(book: WaterBook, date: IsoDay): DeliveryRow[] {
  const held = new Map(accounts(book).map((a) => [a.customer.id, a.cansHeld]));
  return book.deliveries
    .filter((d) => d.date === date)
    .flatMap((d) => {
      const customer = book.customers.find((c) => c.id === d.customerId);
      if (!customer) return [];
      const charge = deliveryCharge(book, d);
      const collected = book.payments.filter((p) => p.deliveryId === d.id).reduce((s, p) => s + p.amountPaise, 0);
      const moved = d.movedTo ? book.deliveries.find((x) => x.id === d.movedTo) : undefined;
      const payment: PaymentState = d.status !== 'completed' ? 'none' : collected >= charge ? 'paid' : collected > 0 ? 'part' : 'unpaid';
      return [
        {
          delivery: d,
          customer,
          empties: d.completion ? d.completion.emptiesCollected : Math.min(d.cans, held.get(customer.id) ?? 0),
          charge,
          collected,
          payment,
          ...(moved ? { movedToDate: moved.date } : {}),
        },
      ];
    });
}

export interface DaySummary {
  /** All deliveries on the day's list (completed + pending + failed + rescheduled). */
  scheduled: number;
  completed: number;
  pending: number;
  failed: number;
  rescheduled: number;
  /** Cans delivered so far on completed deliveries. */
  cansDelivered: number;
  emptiesCollected: number;
  /** Expected empties on the deliveries still pending. */
  emptiesToCollect: number;
}

export function daySummary(rows: DeliveryRow[]): DaySummary {
  const n = (s: Delivery['status']) => rows.filter((r) => r.delivery.status === s).length;
  const done = rows.filter((r) => r.delivery.status === 'completed');
  return {
    scheduled: rows.length,
    completed: n('completed'),
    pending: n('scheduled'),
    failed: n('failed'),
    rescheduled: n('rescheduled'),
    cansDelivered: done.reduce((s, r) => s + (r.delivery.completion?.cans ?? 0), 0),
    emptiesCollected: done.reduce((s, r) => s + (r.delivery.completion?.emptiesCollected ?? 0), 0),
    emptiesToCollect: rows.filter((r) => r.delivery.status === 'scheduled').reduce((s, r) => s + r.empties, 0),
  };
}

export interface BusinessSummary {
  customers: number;
  active: number;
  paused: number;
  recurring: number;
  withBalance: number;
  outstanding: Paise;
  cansWithCustomers: number;
}

export function businessSummary(book: WaterBook): BusinessSummary {
  const all = accounts(book);
  const owing = all.filter((a) => a.balance > 0);
  return {
    customers: all.length,
    active: all.filter((a) => a.customer.status === 'active').length,
    paused: all.filter((a) => a.customer.status === 'paused').length,
    recurring: all.filter((a) => a.customer.recurring).length,
    withBalance: owing.length,
    outstanding: owing.reduce((s, a) => s + a.balance, 0),
    cansWithCustomers: all.reduce((s, a) => s + a.cansHeld, 0),
  };
}

export type DeliveryFilter = 'all' | 'pending' | 'completed' | 'failed' | 'rescheduled';

export function filterDeliveries(rows: DeliveryRow[], filter: DeliveryFilter, query = ''): DeliveryRow[] {
  const q = query.trim().toLowerCase();
  const digits = q.replace(/\D/g, '');
  return rows.filter((r) => {
    const s = r.delivery.status;
    if (filter === 'pending' ? s !== 'scheduled' : filter !== 'all' && s !== filter) return false;
    if (!q) return true;
    const c = r.customer;
    return `${c.name} ${c.locality} ${c.address ?? ''}`.toLowerCase().includes(q) || (digits.length >= 3 && c.phone.replace(/\D/g, '').includes(digits));
  });
}

// ---------- Actions ----------

export type FieldErrors = Partial<Record<'delivery' | 'cans' | 'cartons' | 'empties' | 'amount' | 'method' | 'date' | 'reason' | 'customer' | 'name' | 'phone' | 'locality' | 'address' | 'status' | 'recurring', string>>;
export type Result<T> = ({ ok: true; book: WaterBook } & T) | { ok: false; errors: FieldErrors };

function nextId(prefix: string, taken: { id: string }[]): string {
  const ids = new Set(taken.map((t) => t.id));
  let n = taken.length + 1;
  while (ids.has(`${prefix}${n}`)) n += 1;
  return `${prefix}${n}`;
}

/** Whole number from 0 to MAX_QTY, from a typed string; null if invalid. */
export function parseQty(text: string): number | null {
  const s = text.trim();
  if (!/^\d{1,3}$/.test(s)) return null;
  const n = Number(s);
  return n <= MAX_QTY ? n : null;
}

/** Validates an amount against what is owed. Empty text means "no payment" when `optional`. */
function checkAmount(text: string, owed: Paise, optional: boolean): { paise: Paise } | { error: string } | null {
  const raw = text.trim();
  if (!raw) return optional ? null : { error: 'Enter the amount received.' };
  if (/^-/.test(raw)) return { error: 'Enter an amount greater than zero.' };
  const p = parseMoney(raw);
  if (!p.ok) return { error: p.reason === 'too_large' ? `This is more than the ${money(owed)} owed.` : 'Use rupees and paise only, like 150 or 150.50.' };
  if (p.value <= 0) return { error: 'Enter an amount greater than zero.' };
  if (p.value > owed) return { error: owed > 0 ? `This is more than the ${money(owed)} owed.` : 'Nothing is owed, so no payment can be recorded.' };
  return { paise: p.value };
}

export interface CompletionInput {
  cans: string;
  cartons: string;
  empties: string;
  /** Rupees taken at the door; empty for none. */
  amount: string;
  method: string;
}

/** What completing would do, for the live preview and for validation. */
export function previewCompletion(book: WaterBook, deliveryId: string, input: Pick<CompletionInput, 'cans' | 'cartons' | 'empties'>) {
  const d = book.deliveries.find((x) => x.id === deliveryId);
  const acc = d ? accountOf(book, d.customerId) : undefined;
  const cans = parseQty(input.cans);
  const cartons = parseQty(input.cartons);
  const empties = parseQty(input.empties);
  const charge = cans !== null && cartons !== null ? cans * book.pricing.canPaise + cartons * book.pricing.cartonPaise : null;
  return {
    balanceBefore: acc?.balance ?? 0,
    cansBefore: acc?.cansHeld ?? 0,
    charge,
    owedAfterCharge: charge === null ? null : (acc?.balance ?? 0) + charge,
    cansAfter: cans !== null && empties !== null ? (acc?.cansHeld ?? 0) + cans - empties : null,
  };
}

/**
 * Completes today's scheduled delivery once: records what was delivered and
 * collected, which creates its charge and can movement, plus an optional
 * payment taken at the door.
 */
export function completeDelivery(book: WaterBook, deliveryId: string, input: CompletionInput): Result<{ delivery: Delivery; payment?: WaterPayment }> {
  const d = book.deliveries.find((x) => x.id === deliveryId);
  if (!d) return { ok: false, errors: { delivery: 'This delivery doesn’t exist.' } };
  if (d.status === 'completed') return { ok: false, errors: { delivery: 'This delivery is already completed.' } };
  if (d.status !== 'scheduled') return { ok: false, errors: { delivery: `This delivery was ${d.status} and can’t be completed.` } };
  if (d.date !== book.today) return { ok: false, errors: { delivery: 'Only today’s deliveries can be completed.' } };

  const errors: FieldErrors = {};
  const cans = parseQty(input.cans);
  const cartons = parseQty(input.cartons);
  const empties = parseQty(input.empties);
  if (cans === null) errors.cans = `Enter a whole number from 0 to ${MAX_QTY}.`;
  if (cartons === null) errors.cartons = `Enter a whole number from 0 to ${MAX_QTY}.`;
  if (empties === null) errors.empties = `Enter a whole number from 0 to ${MAX_QTY}.`;
  if (cans !== null && cartons !== null && cans + cartons === 0) errors.cans = 'Nothing was delivered. Mark the delivery as failed instead.';

  const p = previewCompletion(book, deliveryId, input);
  if (empties !== null && empties > p.cansBefore) {
    errors.empties = p.cansBefore === 0 ? 'This customer holds no cans, so there are no empties to collect.' : `The customer holds only ${p.cansBefore} ${p.cansBefore === 1 ? 'can' : 'cans'}.`;
  }

  let paise: Paise | undefined;
  if (p.owedAfterCharge !== null) {
    const a = checkAmount(input.amount, p.owedAfterCharge, true);
    if (a && 'error' in a) errors.amount = a.error;
    else if (a) paise = a.paise;
  }
  if (paise !== undefined && !paymentMethods.some((m) => m.value === input.method)) errors.method = 'Choose how the customer paid.';
  if (Object.keys(errors).length) return { ok: false, errors };

  const completion: DeliveryCompletion = { cans: cans!, cartons: cartons!, emptiesCollected: empties!, completedOn: book.today };
  const delivery: Delivery = { ...d, status: 'completed', completion };
  const payment: WaterPayment | undefined =
    paise !== undefined ? { id: nextId('p', book.payments), customerId: d.customerId, date: book.today, amountPaise: paise, method: input.method as PaymentMethod, deliveryId: d.id } : undefined;
  return {
    ok: true,
    delivery,
    ...(payment ? { payment } : {}),
    book: { ...book, deliveries: book.deliveries.map((x) => (x.id === d.id ? delivery : x)), payments: payment ? [...book.payments, payment] : book.payments },
  };
}

/** Marks today's scheduled delivery as failed. No charge, no can movement. */
export function failDelivery(book: WaterBook, deliveryId: string, reason: string): Result<{ delivery: Delivery }> {
  const d = book.deliveries.find((x) => x.id === deliveryId);
  if (!d) return { ok: false, errors: { delivery: 'This delivery doesn’t exist.' } };
  if (d.status !== 'scheduled') return { ok: false, errors: { delivery: `This delivery is already ${d.status}.` } };
  if (d.date !== book.today) return { ok: false, errors: { delivery: 'Only today’s deliveries can be marked as failed.' } };
  if (!failReasons.some((r) => r.value === reason)) return { ok: false, errors: { reason: 'Choose what went wrong.' } };
  const delivery: Delivery = { ...d, status: 'failed', failReason: reason as FailReason };
  return { ok: true, delivery, book: { ...book, deliveries: book.deliveries.map((x) => (x.id === d.id ? delivery : x)) } };
}

/** Moves a pending or failed delivery to a later date (tomorrow to 30 days ahead). The original stays on its day as "rescheduled". */
export function rescheduleDelivery(book: WaterBook, deliveryId: string, date: string): Result<{ delivery: Delivery; moved: Delivery }> {
  const d = book.deliveries.find((x) => x.id === deliveryId);
  if (!d) return { ok: false, errors: { delivery: 'This delivery doesn’t exist.' } };
  if (d.status !== 'scheduled' && d.status !== 'failed') return { ok: false, errors: { delivery: `A ${d.status} delivery can’t be rescheduled.` } };
  if (!isIsoDay(date)) return { ok: false, errors: { date: 'Choose a date.' } };
  if (date <= book.today) return { ok: false, errors: { date: 'Choose a date after today.' } };
  if (daysBetween(book.today, date) > MAX_RESCHEDULE_DAYS) return { ok: false, errors: { date: `Choose a date within ${MAX_RESCHEDULE_DAYS} days.` } };
  const moved: Delivery = { id: nextId('d', book.deliveries), customerId: d.customerId, date, cans: d.cans, cartons: d.cartons, status: 'scheduled', movedFrom: d.id };
  const delivery: Delivery = { ...d, status: 'rescheduled', movedTo: moved.id };
  return { ok: true, delivery, moved, book: { ...book, deliveries: [...book.deliveries.map((x) => (x.id === d.id ? delivery : x)), moved] } };
}

/** Records a payment against the customer's balance (not tied to a delivery). */
export function recordPayment(book: WaterBook, input: { customerId: string; amount: string; method: string }): Result<{ payment: WaterPayment }> {
  const acc = accountOf(book, input.customerId);
  if (!acc) return { ok: false, errors: { customer: 'Choose a customer.' } };
  const errors: FieldErrors = {};
  const a = checkAmount(input.amount, acc.balance, false);
  let paise: Paise | undefined;
  if (a && 'error' in a) errors.amount = a.error;
  else if (a) paise = a.paise;
  if (!paymentMethods.some((m) => m.value === input.method)) errors.method = 'Choose how the customer paid.';
  if (Object.keys(errors).length || paise === undefined) return { ok: false, errors };
  const payment: WaterPayment = { id: nextId('p', book.payments), customerId: input.customerId, date: book.today, amountPaise: paise, method: input.method as PaymentMethod };
  return { ok: true, payment, book: { ...book, payments: [...book.payments, payment] } };
}

// ---------- Customers ----------

export interface CustomerInput {
  name: string;
  phone: string;
  locality: string;
  address: string;
  status: string;
  recurring: boolean;
  recurringCans: string;
  recurringCartons: string;
  recurringDays: Weekday[];
}

export function emptyCustomerInput(): CustomerInput {
  return { name: '', phone: '', locality: '', address: '', status: 'active', recurring: false, recurringCans: '2', recurringCartons: '0', recurringDays: [1, 3, 5] };
}

export function customerToInput(c: WaterCustomer): CustomerInput {
  return {
    name: c.name,
    phone: c.phone,
    locality: c.locality,
    address: c.address ?? '',
    status: c.status,
    recurring: !!c.recurring,
    recurringCans: String(c.recurring?.cans ?? 2),
    recurringCartons: String(c.recurring?.cartons ?? 0),
    recurringDays: c.recurring?.days ?? [1, 3, 5],
  };
}

/** Any country's format, 6–15 digits, optional leading +. Fictional sample numbers use +91 90000 0xxxx. */
export function isPhone(v: string): boolean {
  if (!/^\+?[\d\s().-]+$/.test(v)) return false;
  const n = v.replace(/\D/g, '').length;
  return n >= 6 && n <= 15;
}

export function validateCustomer(book: WaterBook, input: CustomerInput, editingId?: string): FieldErrors {
  const e: FieldErrors = {};
  const name = input.name.trim();
  if (!name) e.name = 'Enter the customer’s name.';
  else if (name.length > 80) e.name = 'Keep the name under 80 characters.';
  const phone = input.phone.trim();
  const digits = phone.replace(/\D/g, '');
  if (!phone) e.phone = 'Enter a phone number for delivery calls.';
  else if (!isPhone(phone)) e.phone = 'Use digits, spaces or dashes, with an optional + and country code (6–15 digits).';
  else if (book.customers.some((c) => c.id !== editingId && c.phone.replace(/\D/g, '') === digits)) e.phone = 'Another customer already has this phone number.';
  if (!input.locality.trim()) e.locality = 'Enter the area or locality for the delivery round.';
  else if (input.locality.trim().length > 60) e.locality = 'Keep this under 60 characters.';
  if (input.address.trim().length > 160) e.address = 'Keep the address under 160 characters.';
  if (input.status !== 'active' && input.status !== 'paused') e.status = 'Choose a status.';
  if (input.recurring) {
    const cans = parseQty(input.recurringCans);
    const cartons = parseQty(input.recurringCartons);
    if (cans === null || cartons === null) e.recurring = `Use whole numbers from 0 to ${MAX_QTY}.`;
    else if (cans + cartons === 0) e.recurring = 'A regular order needs at least one can or carton.';
    else if (input.recurringDays.length === 0) e.recurring = 'Choose at least one delivery day.';
  }
  return e;
}

function fromInput(input: CustomerInput) {
  return {
    name: input.name.trim().replace(/\s+/g, ' '),
    phone: input.phone.trim().replace(/\s+/g, ' '),
    locality: input.locality.trim().replace(/\s+/g, ' '),
    ...(input.address.trim() ? { address: input.address.trim() } : {}),
    status: input.status as WaterCustomer['status'],
    ...(input.recurring
      ? { recurring: { cans: parseQty(input.recurringCans)!, cartons: parseQty(input.recurringCartons)!, days: [...input.recurringDays].sort((a, b) => a - b) } }
      : {}),
  };
}

/** New customers start with no balance and no cans. */
export function createCustomer(book: WaterBook, input: CustomerInput): Result<{ customer: WaterCustomer }> {
  const errors = validateCustomer(book, input);
  if (Object.keys(errors).length) return { ok: false, errors };
  const customer: WaterCustomer = { id: nextId('c', book.customers), ...fromInput(input), openingBalancePaise: 0, openingCans: 0, openedOn: book.today };
  return { ok: true, customer, book: { ...book, customers: [...book.customers, customer] } };
}

/** Edits details only; balances and can counts come from the ledger and can't be edited here. */
export function updateCustomer(book: WaterBook, id: string, input: CustomerInput): Result<{ customer: WaterCustomer }> {
  const existing = book.customers.find((c) => c.id === id);
  if (!existing) return { ok: false, errors: { customer: 'This customer doesn’t exist.' } };
  const errors = validateCustomer(book, input, id);
  if (Object.keys(errors).length) return { ok: false, errors };
  const customer: WaterCustomer = { id, ...fromInput(input), openingBalancePaise: existing.openingBalancePaise, openingCans: existing.openingCans, openedOn: existing.openedOn };
  return { ok: true, customer, book: { ...book, customers: book.customers.map((c) => (c.id === id ? customer : c)) } };
}

export type CustomerFilter = 'all' | 'active' | 'paused' | 'balance';

export function filterAccounts(list: Account[], filter: CustomerFilter, query = ''): Account[] {
  const q = query.trim().toLowerCase();
  const digits = q.replace(/\D/g, '');
  return list
    .filter((a) => (filter === 'balance' ? a.balance > 0 : filter === 'all' || a.customer.status === filter))
    .filter((a) => {
      if (!q) return true;
      const c = a.customer;
      return `${c.name} ${c.locality} ${c.address ?? ''}`.toLowerCase().includes(q) || (digits.length >= 3 && c.phone.replace(/\D/g, '').includes(digits));
    })
    .sort((a, b) => a.customer.name.localeCompare(b.customer.name));
}

/** All payments, newest first (same day: most recently recorded first). */
export function paymentLog(book: WaterBook): WaterPayment[] {
  return book.payments
    .map((p, i) => ({ p, i }))
    .sort((a, b) => (a.p.date === b.p.date ? b.i - a.i : a.p.date < b.p.date ? 1 : -1))
    .map(({ p }) => p);
}

export function latestRescheduleDate(today: IsoDay): IsoDay {
  return addDays(today, MAX_RESCHEDULE_DAYS);
}
