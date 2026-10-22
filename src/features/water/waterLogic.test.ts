import { describe, expect, it } from 'vitest';
import { createSampleState, sampleBusiness } from '../../data/waterSample';
import {
  canBalances,
  canSummary,
  cansHeld,
  customerBalances,
  defaultEmpties,
  dueRegulars,
  isDueOn,
  roundStops,
  roundSummary,
  scheduleLabel,
  weekdayOf,
  duesList,
  emptyNewOrder,
  filterOrders,
  orderTotal,
  waterReducer,
  summarize,
  validateNewOrder,
  type NewOrderInput,
} from './waterLogic';
import type { WaterState } from '../../types/water';

const today = sampleBusiness.today;
const add = (state: WaterState, input: NewOrderInput) =>
  waterReducer(state, { type: 'addOrder', input, today, unitPrice: 40, prefix: 'TW' });

describe('sample data', () => {
  it('references only existing customers', () => {
    const s = createSampleState();
    const ids = new Set(s.customers.map((c) => c.id));
    for (const o of s.orders) expect(ids.has(o.customerId)).toBe(true);
  });

  it('returns an independent copy each time', () => {
    const a = createSampleState();
    a.orders[0]!.payment = 'paid';
    a.orders.push({ ...a.orders[0]!, id: 'x' });
    const b = createSampleState();
    expect(b.orders.length).toBe(a.orders.length - 1);
  });
});

describe('summarize', () => {
  const s = createSampleState();
  const sum = summarize(s, today);
  const todays = s.orders.filter((o) => o.date === today);

  it('counts today’s orders and splits delivered and pending', () => {
    expect(sum.ordersToday).toBe(todays.length);
    expect(sum.delivered + sum.pending).toBe(sum.ordersToday);
    expect(sum.delivered).toBe(5);
    expect(sum.pending).toBe(5);
  });

  it('computes outstanding dues across all days', () => {
    const expected = s.orders.filter((o) => o.payment === 'unpaid').reduce((a, o) => a + orderTotal(o), 0);
    expect(sum.outstanding).toBe(expected);
    // 41 unpaid cans × ₹40 across TW-1031/1033/1037/1042/1044/1045/1046/1048/1049.
    expect(sum.outstanding).toBe(1640);
  });

  it('agrees with per-customer balances', () => {
    const fromBalances = customerBalances(s).reduce((a, b) => a + b.outstanding, 0);
    expect(fromBalances).toBe(sum.outstanding);
    expect(duesList(s)).toHaveLength(sum.customersWithDues);
  });

  it('has collected ≤ billed', () => {
    expect(sum.collectedToday).toBeLessThan(sum.billedToday + 1);
  });
});

describe('updates', () => {
  it('marking delivered moves an order from pending to delivered', () => {
    const s = createSampleState();
    const before = summarize(s, today);
    const next = waterReducer(s, { type: 'markDelivered', orderId: 'o1044' });
    const after = summarize(next, today);
    expect(after.pending).toBe(before.pending - 1);
    expect(after.delivered).toBe(before.delivered + 1);
    expect(s.orders.find((o) => o.id === 'o1044')?.delivery).toBe('pending'); // original untouched
  });

  it('marking paid reduces outstanding by the order total', () => {
    const s = createSampleState();
    const order = s.orders.find((o) => o.id === 'o1046')!;
    const next = waterReducer(s, { type: 'markPaid', orderId: order.id });
    expect(summarize(next, today).outstanding).toBe(summarize(s, today).outstanding - orderTotal(order));
  });

  it('settling a customer clears all their dues', () => {
    const s = createSampleState();
    const next = waterReducer(s, { type: 'settleCustomer', customerId: 'c05' });
    const bal = customerBalances(next).find((b) => b.customer.id === 'c05');
    expect(bal?.outstanding).toBe(0);
  });

  it('reset restores the sample dataset', () => {
    const changed = waterReducer(createSampleState(), { type: 'markPaid', orderId: 'o1042' });
    const restored = waterReducer(changed, { type: 'reset', state: createSampleState() });
    expect(restored).toEqual(createSampleState());
  });
});

describe('adding orders', () => {
  it('adds an order for an existing customer as pending', () => {
    const s = createSampleState();
    const next = add(s, { ...emptyNewOrder(), customerId: 'c02', quantity: '3' });
    expect(next.orders).toHaveLength(s.orders.length + 1);
    const created = next.orders[0]!;
    expect(created.number).toBe('TW-1050');
    expect(created.delivery).toBe('pending');
    expect(created.date).toBe(today);
    expect(summarize(next, today).pending).toBe(summarize(s, today).pending + 1);
    expect(summarize(next, today).outstanding).toBe(summarize(s, today).outstanding + 120);
  });

  it('creates a new customer when requested', () => {
    const s = createSampleState();
    const next = add(s, { ...emptyNewOrder(), customerMode: 'new', newName: 'Anbu Mess', newArea: 'North Street', quantity: '5', payment: 'paid' });
    expect(next.customers).toHaveLength(s.customers.length + 1);
    expect(next.customers.at(-1)?.name).toBe('Anbu Mess');
    expect(next.orders[0]!.customerId).toBe(next.customers.at(-1)!.id);
    expect(summarize(next, today).outstanding).toBe(summarize(s, today).outstanding);
  });

  it('ignores invalid input', () => {
    const s = createSampleState();
    expect(add(s, { ...emptyNewOrder(), customerId: '' })).toBe(s);
  });
});

describe('validation', () => {
  const customers = createSampleState().customers;
  it('requires a customer and a sensible quantity', () => {
    const errors = validateNewOrder({ ...emptyNewOrder(), quantity: '0' }, customers);
    expect(errors.customerId).toBeDefined();
    expect(errors.quantity).toBeDefined();
  });
  it('rejects fractional and oversized quantities', () => {
    expect(validateNewOrder({ ...emptyNewOrder(), customerId: 'c01', quantity: '2.5' }, customers).quantity).toBeDefined();
    expect(validateNewOrder({ ...emptyNewOrder(), customerId: 'c01', quantity: '51' }, customers).quantity).toBeDefined();
  });
  it('rejects duplicate new customer names', () => {
    const errors = validateNewOrder(
      { ...emptyNewOrder(), customerMode: 'new', newName: 'lakshmi stores', newArea: 'x' },
      customers,
    );
    expect(errors.newName).toBeDefined();
  });
  it('accepts a valid order', () => {
    expect(validateNewOrder({ ...emptyNewOrder(), customerId: 'c01', quantity: '4' }, customers)).toEqual({});
  });
});

describe('search and filtering', () => {
  const s = createSampleState();
  it('filters by delivery and payment status', () => {
    const pending = filterOrders(s, { query: '', filter: 'pending', day: today });
    expect(pending.every((o) => o.delivery === 'pending')).toBe(true);
    const unpaid = filterOrders(s, { query: '', filter: 'unpaid' });
    expect(unpaid).toHaveLength(summarize(s, today).unpaidOrders);
  });
  it('searches by customer name, area and order number', () => {
    expect(filterOrders(s, { query: 'bakery', filter: 'all' }).map((o) => o.id)).toEqual(['o1044']);
    expect(filterOrders(s, { query: 'TW-1031', filter: 'all' })).toHaveLength(1);
    expect(filterOrders(s, { query: 'hospital road', filter: 'all' }).length).toBeGreaterThan(1);
    expect(filterOrders(s, { query: 'zzz', filter: 'all' })).toHaveLength(0);
  });
  it('lists pending orders before delivered ones within a day', () => {
    const list = filterOrders(s, { query: '', filter: 'all', day: today });
    const firstDelivered = list.findIndex((o) => o.delivery === 'delivered');
    expect(list.slice(firstDelivered).every((o) => o.delivery === 'delivered')).toBe(true);
  });
});

describe('cans and deposits', () => {
  const s = createSampleState();
  const held = (id: string, state = s) => cansHeld(state.customers.find((c) => c.id === id)!, state.orders);

  it('treats a delivery with nothing recorded as a straight swap', () => {
    expect(held('c01')).toBe(4);
    expect(held('c05')).toBe(6);
  });

  it('counts cans left behind when fewer empties come back', () => {
    expect(held('c09')).toBe(6); // 4 to start, 2 delivered today with no empties back
    expect(held('c10')).toBe(10); // 8 to start, 8 delivered with only 6 empties back
  });

  it('lists customers beyond their deposit first and totals them', () => {
    const balances = canBalances(s, sampleBusiness.depositPerCan);
    expect(balances[0]!.customer.id).toBe('c09');
    expect(balances[0]!.beyondDeposit).toBe(4);
    const totals = canSummary(balances);
    expect(totals.cansOut).toBe(51);
    expect(totals.beyondDeposit).toBe(8);
    expect(totals.customersBeyond).toBe(3);
  });
});

describe('regular deliveries', () => {
  it('knows the sample day is a Wednesday', () => {
    expect(weekdayOf('2026-03-18')).toBe(3);
    expect(weekdayOf('1970-01-01')).toBe(4);
  });

  it('works out which days each pattern is due', () => {
    expect(isDueOn({ pattern: 'daily', quantity: 1 }, '2026-03-18')).toBe(true);
    const alt = { pattern: 'alternate' as const, quantity: 1, start: '2026-03-02' };
    expect(isDueOn(alt, '2026-03-18')).toBe(true);
    expect(isDueOn(alt, '2026-03-17')).toBe(false);
    expect(isDueOn(alt, '2026-03-01')).toBe(false);
    expect(isDueOn({ pattern: 'weekdays', quantity: 1, days: [1, 3, 5] }, '2026-03-19')).toBe(false);
  });

  it('describes patterns in plain words', () => {
    expect(scheduleLabel({ pattern: 'weekdays', quantity: 3, days: [5, 1, 3] })).toBe('Mon, Wed, Fri · 3 cans');
    expect(scheduleLabel({ pattern: 'daily', quantity: 1 })).toBe('Every day · 1 can');
  });

  it('finds regulars due today who are not on the run, and adds them once', () => {
    const s = createSampleState();
    expect(dueRegulars(s, today).map((c) => c.id)).toEqual(['c11', 'c12']);
    const next = waterReducer(s, { type: 'addRegulars', day: today, unitPrice: 40, prefix: 'TW' });
    expect(next.orders).toHaveLength(s.orders.length + 2);
    expect(next.nextOrderSeq).toBe(s.nextOrderSeq + 2);
    expect(summarize(next, today).pending).toBe(summarize(s, today).pending + 2);
    expect(next.orders.find((o) => o.customerId === 'c12')).toMatchObject({ quantity: 6, fromSchedule: true, number: 'TW-1051' });
    expect(dueRegulars(next, today)).toHaveLength(0);
    expect(waterReducer(next, { type: 'addRegulars', day: today, unitPrice: 40, prefix: 'TW' })).toBe(next);
  });
});

describe('delivery round', () => {
  it('orders stops by route area', () => {
    const stops = roundStops(createSampleState(), today, sampleBusiness.routeOrder);
    expect(stops).toHaveLength(10);
    expect(stops[0]!.customer?.name).toBe('Lakshmi Stores');
    expect(stops.at(-1)!.customer?.area).toBe('Bypass Road');
  });

  it('summarises progress, empties and cash in hand', () => {
    const sum = roundSummary(roundStops(createSampleState(), today, sampleBusiness.routeOrder));
    expect(sum).toMatchObject({ stops: 10, done: 5, emptiesBack: 13, cashInHand: 280 });
  });

  it('completing a stop records empties and cash', () => {
    const s = createSampleState();
    const next = waterReducer(s, { type: 'completeStop', orderId: 'o1044', emptiesCollected: 3, cashCollected: true });
    expect(next.orders.find((o) => o.id === 'o1044')).toMatchObject({ delivery: 'delivered', payment: 'paid', emptiesCollected: 3, collectedOnRound: true });
    expect(summarize(next, today).outstanding).toBe(summarize(s, today).outstanding - 120);
    const stops = roundStops(next, today, sampleBusiness.routeOrder);
    expect(roundSummary(stops).cashInHand).toBe(400);
  });

  it('never takes back more empties than the customer has', () => {
    const next = waterReducer(createSampleState(), { type: 'completeStop', orderId: 'o1044', emptiesCollected: 99, cashCollected: false });
    expect(next.orders.find((o) => o.id === 'o1044')).toMatchObject({ emptiesCollected: 5, payment: 'unpaid' });
  });

  it('suggests one empty per full can, capped by what the customer holds', () => {
    expect(defaultEmpties({ order: { quantity: 3 } as never, cansBefore: 5 })).toBe(3);
    expect(defaultEmpties({ order: { quantity: 3 } as never, cansBefore: 1 })).toBe(1);
    expect(defaultEmpties({ order: { quantity: 3 } as never, cansBefore: 0 })).toBe(0);
  });
});
