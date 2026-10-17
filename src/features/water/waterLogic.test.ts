import { describe, expect, it } from 'vitest';
import type { WaterBook } from '../../types/water';
import { createWaterSample, LEDGER_DAYS, PRICING } from '../../data/waterSample';
import { addDays } from '../../utils/dates';
import {
  accountOf,
  accounts,
  businessSummary,
  canMovement,
  completeDelivery,
  createCustomer,
  createOrder,
  customerToInput,
  daySummary,
  deliveryCharge,
  deliveryRows,
  emptyCustomerInput,
  emptyOrderInput,
  suggestedQuantity,
  failDelivery,
  filterAccounts,
  filterDeliveries,
  money,
  orderText,
  parseQty,
  paymentLog,
  recordPayment,
  recurringText,
  rescheduleDelivery,
  updateCustomer,
  type CompletionInput,
} from './waterLogic';

// Saturday 17 October 2026.
const TODAY = '2026-10-17';
const sample = () => createWaterSample(TODAY);

const balanceOf = (book: WaterBook, id: string) => accountOf(book, id)!.balance;
const cansOf = (book: WaterBook, id: string) => accountOf(book, id)!.cansHeld;
const input = (over: Partial<CompletionInput> = {}): CompletionInput => ({ cans: '2', cartons: '0', empties: '2', amount: '', method: '', ...over });
/** d7 is c07's pending delivery today: 2 cans, ₹800 carried forward, 2 cans held. */
const PENDING = 'd7';

function ok<T extends { ok: boolean }>(r: T): Extract<T, { ok: true }> {
  if (!r.ok) throw new Error(`Expected ok, got ${JSON.stringify(r)}`);
  return r as Extract<T, { ok: true }>;
}

describe('water sample reconciliation', () => {
  it('matches the documented scenario', () => {
    const book = sample();
    const s = businessSummary(book);
    expect(s.customers).toBe(35);
    expect(s.active).toBe(32);
    expect(s.paused).toBe(3);
    expect(s.recurring).toBe(24);
    expect(s.withBalance).toBe(11);
    expect(s.outstanding).toBe(695_000);
    expect(money(s.outstanding)).toBe('₹6,950.00');
    expect(book.pricing).toEqual({ canPaise: 10_000, cartonPaise: 15_000 });
    expect(PRICING.canPaise).toBe(10_000);
  });

  it('has 18 deliveries today: 6 completed and 12 pending', () => {
    const s = daySummary(deliveryRows(sample(), TODAY));
    expect(s.scheduled).toBe(18);
    expect(s.completed).toBe(6);
    expect(s.pending).toBe(12);
    expect(s.failed).toBe(0);
    expect(s.rescheduled).toBe(0);
  });

  it('reconciles each balance to opening + charges − payments', () => {
    const book = sample();
    for (const a of accounts(book)) {
      const charges = book.deliveries.filter((d) => d.customerId === a.customer.id).reduce((s, d) => s + deliveryCharge(book, d), 0);
      const paid = book.payments.filter((p) => p.customerId === a.customer.id).reduce((s, p) => s + p.amountPaise, 0);
      expect(a.balance).toBe(a.customer.openingBalancePaise + charges - paid);
      expect(a.balance >= 0, `${a.customer.id} balance`).toBe(true);
      expect(a.cansHeld >= 0, `${a.customer.id} cans`).toBe(true);
      expect(Number.isInteger(a.balance)).toBe(true);
    }
  });

  it('lists the expected balances per customer', () => {
    const book = sample();
    const owing = Object.fromEntries(accounts(book).filter((a) => a.balance > 0).map((a) => [a.customer.id, a.balance / 100]));
    expect(owing).toEqual({ c01: 150, c03: 1850, c05: 200, c07: 800, c08: 1200, c09: 400, c10: 600, c11: 300, c12: 1000, c13: 250, c14: 200 });
  });

  it('includes the worked example: 3 cans, 2 empties, ₹150 by UPI', () => {
    const book = sample();
    const d = book.deliveries.find((x) => x.id === 'd1')!;
    expect(d.customerId).toBe('c01');
    expect(d.completion).toMatchObject({ cans: 3, cartons: 0, emptiesCollected: 2 });
    expect(deliveryCharge(book, d)).toBe(30_000);
    expect(canMovement(d)).toBe(1);
    const pay = book.payments.filter((p) => p.deliveryId === 'd1');
    expect(pay).toHaveLength(1);
    expect(pay[0]).toMatchObject({ amountPaise: 15_000, method: 'upi' });
    expect(deliveryCharge(book, d) - pay[0]!.amountPaise).toBe(15_000);
    const row = deliveryRows(book, TODAY).find((r) => r.delivery.id === 'd1')!;
    expect(row.payment).toBe('part');
  });

  it('keeps every ledger entry inside the ledger window and uses fictional phones', () => {
    const book = sample();
    const start = addDays(TODAY, -LEDGER_DAYS);
    for (const d of book.deliveries) expect(d.date >= start && d.date <= TODAY).toBe(true);
    for (const c of book.customers) expect(c.phone).toMatch(/^\+91 90000 0\d{4}$/);
    expect(new Set(book.customers.map((c) => c.phone)).size).toBe(35);
  });

  it('is deterministic and resets to the same data for the same date', () => {
    expect(createWaterSample(TODAY)).toEqual(createWaterSample(TODAY));
    const changed = ok(completeDelivery(sample(), PENDING, input())).book;
    expect(businessSummary(changed).outstanding === businessSummary(sample()).outstanding).toBe(false);
    expect(createWaterSample(TODAY)).toEqual(sample());
  });

  it('reconciles for any start date', () => {
    for (const day of ['2026-01-01', '2026-02-28', '2026-06-15', '2026-12-31']) {
      const s = businessSummary(createWaterSample(day));
      expect(s.outstanding, day).toBe(695_000);
      expect(s.withBalance, day).toBe(11);
      expect(daySummary(deliveryRows(createWaterSample(day), day)).scheduled, day).toBe(18);
    }
  });
});

describe('dashboard figures follow the records', () => {
  it('derives can totals from movements', () => {
    const book = sample();
    const opening = book.customers.reduce((s, c) => s + c.openingCans, 0);
    const moved = book.deliveries.reduce((s, d) => s + canMovement(d), 0);
    expect(businessSummary(book).cansWithCustomers).toBe(opening + moved);
  });

  it('updates counts and balances when a delivery is completed', () => {
    const before = sample();
    const after = ok(completeDelivery(before, PENDING, input({ amount: '200', method: 'cash' }))).book;
    const s = daySummary(deliveryRows(after, TODAY));
    expect(s.completed).toBe(7);
    expect(s.pending).toBe(11);
    expect(balanceOf(after, 'c07')).toBe(balanceOf(before, 'c07'));
    expect(businessSummary(after).outstanding).toBe(businessSummary(before).outstanding);
    expect(daySummary(deliveryRows(after, TODAY)).cansDelivered).toBe(daySummary(deliveryRows(before, TODAY)).cansDelivered + 2);
  });

  it('expects empties only up to the cans a customer holds', () => {
    const rows = deliveryRows(sample(), TODAY);
    for (const r of rows.filter((x) => x.delivery.status === 'scheduled')) expect(r.empties <= r.delivery.cans).toBe(true);
  });
});

describe('completing a delivery', () => {
  it('charges delivered cans and cartons once, never empties', () => {
    const book = ok(completeDelivery(sample(), PENDING, input({ cans: '3', cartons: '1', empties: '2' }))).book;
    const d = book.deliveries.find((x) => x.id === PENDING)!;
    expect(deliveryCharge(book, d)).toBe(3 * 10_000 + 15_000);
    expect(balanceOf(book, 'c07')).toBe(80_000 + 45_000);
    const lessEmpties = ok(completeDelivery(sample(), PENDING, input({ cans: '3', cartons: '1', empties: '0' }))).book;
    expect(balanceOf(lessEmpties, 'c07')).toBe(balanceOf(book, 'c07'));
  });

  it('moves cans: +full delivered − empties collected', () => {
    const before = cansOf(sample(), 'c07');
    const book = ok(completeDelivery(sample(), PENDING, input({ cans: '3', empties: '2' }))).book;
    expect(cansOf(book, 'c07')).toBe(before + 1);
  });

  it('refuses to complete twice and does not charge twice', () => {
    const once = ok(completeDelivery(sample(), PENDING, input({ amount: '100', method: 'upi' }))).book;
    const twice = completeDelivery(once, PENDING, input({ amount: '100', method: 'upi' }));
    expect(twice.ok).toBe(false);
    if (!twice.ok) expect(twice.errors.delivery).toBe('This delivery is already completed.');
    const seeded = completeDelivery(sample(), 'd1', input());
    expect(seeded.ok).toBe(false);
    expect(once.payments.filter((p) => p.deliveryId === PENDING)).toHaveLength(1);
  });

  it('rejects invalid quantities', () => {
    for (const bad of ['-1', '2.5', 'abc', '', '51', '1e2']) {
      const r = completeDelivery(sample(), PENDING, input({ cans: bad }));
      expect(r.ok, bad).toBe(false);
      if (!r.ok) expect(typeof r.errors.cans, bad).toBe('string');
    }
    const nothing = completeDelivery(sample(), PENDING, input({ cans: '0', cartons: '0', empties: '0' }));
    expect(nothing.ok).toBe(false);
    if (!nothing.ok) expect(nothing.errors.cans).toMatch(/failed/);
    expect(parseQty('50')).toBe(50);
    expect(parseQty(' 7 ')).toBe(7);
    expect(parseQty('007')).toBe(7);
  });

  it('never lets cans held go negative', () => {
    const book = sample();
    const held = cansOf(book, 'c07');
    const r = completeDelivery(book, PENDING, input({ cans: '0', cartons: '1', empties: String(held + 1) }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.empties).toMatch(/holds only/);
    const exact = ok(completeDelivery(book, PENDING, input({ cans: '0', cartons: '1', empties: String(held) }))).book;
    expect(cansOf(exact, 'c07')).toBe(0);
  });

  it('refuses empties from a customer with no cans', () => {
    const created = ok(createCustomer(sample(), { ...emptyCustomerInput(), name: 'Test Home', phone: '+91 90000 09999', locality: 'Peelamedu' }));
    const d = { id: 'dx', customerId: created.customer.id, date: TODAY, cans: 1, cartons: 0, status: 'scheduled' as const };
    const book = { ...created.book, deliveries: [...created.book.deliveries, d] };
    const r = completeDelivery(book, 'dx', input({ cans: '1', empties: '1' }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.empties).toMatch(/no cans/);
  });

  it('only completes today’s scheduled deliveries', () => {
    const moved = ok(rescheduleDelivery(sample(), PENDING, addDays(TODAY, 1)));
    const future = completeDelivery(moved.book, moved.moved.id, input());
    expect(future.ok).toBe(false);
    if (!future.ok) expect(future.errors.delivery).toMatch(/today/);
    const old = completeDelivery(moved.book, PENDING, input());
    expect(old.ok).toBe(false);
  });

  it('validates a payment taken at the door against prior balance + this charge', () => {
    // c07 owes ₹800; delivering 2 cans adds ₹200, so up to ₹1,000 can be collected.
    expect(ok(completeDelivery(sample(), PENDING, input({ amount: '1000', method: 'cash' }))).book.payments.length).toBe(sample().payments.length + 1);
    for (const [amount, re] of [
      ['1000.01', /more than/],
      ['0', /greater than zero/],
      ['-5', /greater than zero/],
      ['12.345', /rupees and paise/],
    ] as const) {
      const r = completeDelivery(sample(), PENDING, input({ amount, method: 'cash' }));
      expect(r.ok, amount).toBe(false);
      if (!r.ok) expect(r.errors.amount, amount).toMatch(re);
    }
    const noMethod = completeDelivery(sample(), PENDING, input({ amount: '100' }));
    expect(noMethod.ok).toBe(false);
    if (!noMethod.ok) expect(noMethod.errors.method).toBe('Choose how the customer paid.');
    const noPay = ok(completeDelivery(sample(), PENDING, input()));
    expect(noPay.payment).toBeUndefined();
  });
});

describe('failed and rescheduled deliveries', () => {
  it('a failed delivery has no charge and no can movement', () => {
    const before = sample();
    const r = ok(failDelivery(before, PENDING, 'not_home'));
    expect(r.delivery.status).toBe('failed');
    expect(deliveryCharge(r.book, r.delivery)).toBe(0);
    expect(canMovement(r.delivery)).toBe(0);
    expect(balanceOf(r.book, 'c07')).toBe(balanceOf(before, 'c07'));
    expect(cansOf(r.book, 'c07')).toBe(cansOf(before, 'c07'));
    const s = daySummary(deliveryRows(r.book, TODAY));
    expect(s.completed).toBe(6);
    expect(s.pending).toBe(11);
    expect(s.failed).toBe(1);
    expect(failDelivery(r.book, PENDING, 'locked').ok).toBe(false);
    expect(failDelivery(before, PENDING, 'nonsense').ok).toBe(false);
    expect(completeDelivery(r.book, PENDING, input()).ok).toBe(false);
  });

  it('reschedules to a valid later date without charging', () => {
    const before = sample();
    const r = ok(rescheduleDelivery(before, PENDING, addDays(TODAY, 2)));
    expect(r.delivery.status).toBe('rescheduled');
    expect(r.moved).toMatchObject({ customerId: 'c07', date: addDays(TODAY, 2), cans: 2, status: 'scheduled', movedFrom: PENDING });
    expect(balanceOf(r.book, 'c07')).toBe(balanceOf(before, 'c07'));
    const s = daySummary(deliveryRows(r.book, TODAY));
    expect(s.rescheduled).toBe(1);
    expect(s.pending).toBe(11);
    expect(deliveryRows(r.book, TODAY).find((x) => x.delivery.id === PENDING)!.movedToDate).toBe(addDays(TODAY, 2));
    expect(accountOf(r.book, 'c07')!.upcoming.map((d) => d.id)).toEqual([r.moved.id]);
    expect(rescheduleDelivery(r.book, PENDING, addDays(TODAY, 3)).ok).toBe(false);
  });

  it('rejects invalid reschedule dates', () => {
    for (const [date, re] of [
      ['', /Choose a date/],
      ['2026-02-30', /Choose a date/],
      [TODAY, /after today/],
      [addDays(TODAY, -1), /after today/],
      [addDays(TODAY, 31), /within 30 days/],
    ] as const) {
      const r = rescheduleDelivery(sample(), PENDING, date);
      expect(r.ok, date).toBe(false);
      if (!r.ok) expect(r.errors.date, date).toMatch(re);
    }
    expect(rescheduleDelivery(sample(), PENDING, addDays(TODAY, 30)).ok).toBe(true);
    expect(rescheduleDelivery(sample(), 'd1', addDays(TODAY, 1)).ok).toBe(false);
  });

  it('a failed delivery can be rescheduled', () => {
    const failed = ok(failDelivery(sample(), PENDING, 'locked')).book;
    const r = ok(rescheduleDelivery(failed, PENDING, addDays(TODAY, 1)));
    expect(r.delivery).toMatchObject({ status: 'rescheduled', failReason: 'locked', movedTo: r.moved.id });
  });
});

describe('payments', () => {
  it('reduces the balance exactly once', () => {
    const before = sample();
    const r = ok(recordPayment(before, { customerId: 'c08', amount: '450.50', method: 'upi' }));
    expect(r.payment.amountPaise).toBe(45_050);
    expect(balanceOf(r.book, 'c08')).toBe(120_000 - 45_050);
    expect(businessSummary(r.book).outstanding).toBe(695_000 - 45_050);
    expect(paymentLog(r.book)[0]!.id).toBe(r.payment.id);
  });

  it('settling a balance removes the customer from the owing count', () => {
    const r = ok(recordPayment(sample(), { customerId: 'c13', amount: '250', method: 'cash' }));
    expect(businessSummary(r.book).withBalance).toBe(10);
    expect(filterAccounts(accounts(r.book), 'balance')).toHaveLength(10);
  });

  it('rejects zero, negative, too-large and malformed amounts', () => {
    for (const [amount, re] of [
      ['', /Enter the amount/],
      ['0', /greater than zero/],
      ['-100', /greater than zero/],
      ['1200.01', /more than the ₹1,200.00 owed/],
      ['12.3.4', /rupees and paise/],
    ] as const) {
      const r = recordPayment(sample(), { customerId: 'c08', amount, method: 'cash' });
      expect(r.ok, amount).toBe(false);
      if (!r.ok) expect(r.errors.amount, amount).toMatch(re);
    }
    const none = recordPayment(sample(), { customerId: 'c02', amount: '1', method: 'cash' });
    expect(none.ok).toBe(false);
    if (!none.ok) expect(none.errors.amount).toMatch(/Nothing is owed/);
    expect(recordPayment(sample(), { customerId: 'c08', amount: '100', method: '' }).ok).toBe(false);
    expect(recordPayment(sample(), { customerId: 'nope', amount: '100', method: 'cash' }).ok).toBe(false);
  });

  it('keeps all money in integer paise', () => {
    const r = ok(recordPayment(sample(), { customerId: 'c08', amount: '0.10', method: 'cash' }));
    const again = ok(recordPayment(r.book, { customerId: 'c08', amount: '0.20', method: 'cash' }));
    expect(balanceOf(again.book, 'c08')).toBe(120_000 - 30);
    expect(money(balanceOf(again.book, 'c08'))).toBe('₹1,199.70');
    for (const p of again.book.payments) expect(Number.isInteger(p.amountPaise)).toBe(true);
  });
});

describe('customers', () => {
  it('searches by name, locality and phone digits', () => {
    const all = accounts(sample());
    expect(filterAccounts(all, 'all', 'lakshmi').map((a) => a.customer.id)).toEqual(['c01']);
    expect(filterAccounts(all, 'all', 'PEELAMEDU').map((a) => a.customer.id).sort()).toEqual(['c06', 'c07', 'c31']);
    expect(filterAccounts(all, 'all', '01012').map((a) => a.customer.id)).toEqual(['c12']);
    expect(filterAccounts(all, 'all', 'zzz')).toHaveLength(0);
  });

  it('filters by status and balance', () => {
    const all = accounts(sample());
    expect(filterAccounts(all, 'all')).toHaveLength(35);
    expect(filterAccounts(all, 'active')).toHaveLength(32);
    expect(filterAccounts(all, 'paused').map((a) => a.customer.id)).toEqual(['c34', 'c35', 'c33']);
    expect(filterAccounts(all, 'balance')).toHaveLength(11);
    expect(filterAccounts(all, 'paused', 'sulur').map((a) => a.customer.id)).toEqual(['c33']);
  });

  it('filters today’s deliveries by state and search', () => {
    const rows = deliveryRows(sample(), TODAY);
    expect(filterDeliveries(rows, 'pending')).toHaveLength(12);
    expect(filterDeliveries(rows, 'completed')).toHaveLength(6);
    expect(filterDeliveries(rows, 'rescheduled')).toHaveLength(0);
    expect(filterDeliveries(rows, 'all', 'irfan').map((r) => r.delivery.id)).toEqual(['d5']);
  });

  it('creates a customer with validation and no opening balance', () => {
    const book = sample();
    const bad = createCustomer(book, { ...emptyCustomerInput(), phone: 'abc' });
    expect(bad.ok).toBe(false);
    if (!bad.ok) {
      expect(bad.errors.name).toBe('Enter the customer’s name.');
      expect(typeof bad.errors.phone).toBe('string');
      expect(typeof bad.errors.locality).toBe('string');
    }
    const dup = createCustomer(book, { ...emptyCustomerInput(), name: 'X', phone: '+91 90000 01001', locality: 'Y' });
    expect(dup.ok).toBe(false);
    if (!dup.ok) expect(dup.errors.phone).toMatch(/already/);
    const noDays = createCustomer(book, { ...emptyCustomerInput(), name: 'X', phone: '90000 12345', locality: 'Y', recurring: true, recurringDays: [] });
    expect(noDays.ok).toBe(false);
    const r = ok(createCustomer(book, { ...emptyCustomerInput(), name: '  New   Home ', phone: '90000 12345', locality: 'Kalapatti', recurring: true }));
    expect(r.customer).toMatchObject({ id: 'c36', name: 'New Home', status: 'active', openingBalancePaise: 0, openingCans: 0, recurring: { cans: 2, cartons: 0, days: [1, 3, 5] } });
    expect(businessSummary(r.book).customers).toBe(36);
    expect(businessSummary(r.book).recurring).toBe(25);
    expect(businessSummary(r.book).outstanding).toBe(695_000);
  });

  it('edits details without touching balances or cans', () => {
    const book = sample();
    const c = book.customers.find((x) => x.id === 'c03')!;
    const r = ok(updateCustomer(book, 'c03', { ...customerToInput(c), status: 'paused', recurring: false }));
    expect(r.customer.status).toBe('paused');
    expect(r.customer.recurring).toBeUndefined();
    expect(balanceOf(r.book, 'c03')).toBe(balanceOf(book, 'c03'));
    expect(cansOf(r.book, 'c03')).toBe(cansOf(book, 'c03'));
    expect(updateCustomer(book, 'c03', { ...customerToInput(c), phone: book.customers[0]!.phone }).ok).toBe(false);
  });

  it('describes orders in words', () => {
    expect(orderText(1, 0)).toBe('1 can');
    expect(orderText(2, 1)).toBe('2 cans · 1 carton');
    expect(recurringText({ cans: 2, cartons: 0, days: [0, 1, 2, 3, 4, 5, 6] })).toBe('2 cans · Daily');
    expect(recurringText({ cans: 1, cartons: 0, days: [5, 1] })).toBe('1 can · Mon, Fri');
    expect(recurringText(undefined)).toBe('No regular order');
  });
});

describe('orders', () => {
  const order = (over: Partial<ReturnType<typeof emptyOrderInput>> = {}) => ({ ...emptyOrderInput(TODAY), ...over });
  const newCustomer = { ...emptyCustomerInput(), name: 'Selvi Arumugam', phone: '+91 90000 09901', locality: 'Kalapatti' };

  it('adds a scheduled delivery for an existing customer without charging', () => {
    const before = sample();
    const r = ok(createOrder(before, order({ customerId: 'c25', cans: '3' })));
    expect(r.isNewCustomer).toBe(false);
    expect(r.delivery).toMatchObject({ customerId: 'c25', date: TODAY, cans: 3, cartons: 0, status: 'scheduled' });
    expect(deliveryCharge(r.book, r.delivery)).toBe(0);
    expect(businessSummary(r.book).outstanding).toBe(695_000);
    const s = daySummary(deliveryRows(r.book, TODAY));
    expect(s.scheduled).toBe(19);
    expect(s.pending).toBe(13);
    expect(ok(completeDelivery(r.book, r.delivery.id, input({ cans: '3', empties: '1' }))).book.deliveries.find((d) => d.id === r.delivery.id)!.status).toBe('completed');
  });

  it('creates a new active customer and the order together', () => {
    const r = ok(createOrder(sample(), order({ customerMode: 'new', customer: { ...newCustomer, status: 'paused' }, date: addDays(TODAY, 1), cans: '2', cartons: '1' })));
    expect(r.isNewCustomer).toBe(true);
    expect(r.customer).toMatchObject({ id: 'c36', name: 'Selvi Arumugam', status: 'active', openingBalancePaise: 0, openingCans: 0 });
    expect(r.delivery).toMatchObject({ customerId: 'c36', date: addDays(TODAY, 1), cans: 2, cartons: 1 });
    expect(businessSummary(r.book).customers).toBe(36);
    expect(accountOf(r.book, 'c36')!.upcoming.map((d) => d.id)).toEqual([r.delivery.id]);
  });

  it('validates the new customer, and saves nothing if anything is wrong', () => {
    const book = sample();
    const r = createOrder(book, order({ customerMode: 'new', customer: { ...newCustomer, phone: '+91 90000 01001' }, cans: '0', cartons: '0' }));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.phone).toMatch(/already/);
      expect(r.errors.cans).toBe('Add at least one can or carton.');
    }
    expect(book.customers).toHaveLength(35);
    const blank = createOrder(book, order({ customerMode: 'new' }));
    expect(blank.ok).toBe(false);
    if (!blank.ok) expect(Object.keys(blank.errors).sort()).toEqual(['locality', 'name', 'phone']);
  });

  it('requires an active existing customer', () => {
    const none = createOrder(sample(), order());
    expect(none.ok).toBe(false);
    if (!none.ok) expect(none.errors.customer).toBe('Choose a customer, or add a new one.');
    const paused = createOrder(sample(), order({ customerId: 'c33' }));
    expect(paused.ok).toBe(false);
    if (!paused.ok) expect(paused.errors.customer).toMatch(/is paused/);
  });

  it('accepts today up to 30 days ahead, and rejects past or invalid dates', () => {
    for (const [date, re] of [
      ['', /Choose a delivery date/],
      ['2026-13-01', /Choose a delivery date/],
      [addDays(TODAY, -1), /today or a later date/],
      [addDays(TODAY, 31), /within 30 days/],
    ] as const) {
      const r = createOrder(sample(), order({ customerId: 'c25', date }));
      expect(r.ok, date).toBe(false);
      if (!r.ok) expect(r.errors.date, date).toMatch(re);
    }
    expect(createOrder(sample(), order({ customerId: 'c25', date: addDays(TODAY, 30) })).ok).toBe(true);
  });

  it('prevents a second planned delivery for the same customer on the same day', () => {
    const dup = createOrder(sample(), order({ customerId: 'c07' }));
    expect(dup.ok).toBe(false);
    if (!dup.ok) expect(dup.errors.date).toMatch(/already has a delivery planned/);
    // Already delivered today (c01) or on another day is fine.
    expect(createOrder(sample(), order({ customerId: 'c01' })).ok).toBe(true);
    expect(createOrder(sample(), order({ customerId: 'c07', date: addDays(TODAY, 1) })).ok).toBe(true);
  });

  it('rejects invalid quantities', () => {
    for (const bad of ['-1', '1.5', '51', 'x']) expect(createOrder(sample(), order({ customerId: 'c25', cans: bad })).ok, bad).toBe(false);
  });

  it('suggests the customer’s regular order', () => {
    const book = sample();
    expect(suggestedQuantity(book.customers.find((c) => c.id === 'c03'))).toEqual({ cans: '2', cartons: '1' });
    expect(suggestedQuantity(book.customers.find((c) => c.id === 'c25'))).toEqual({ cans: '2', cartons: '0' });
    expect(suggestedQuantity(undefined)).toEqual({ cans: '2', cartons: '0' });
  });
});
