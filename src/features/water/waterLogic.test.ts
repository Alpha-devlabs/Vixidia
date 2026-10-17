import { describe, expect, it } from 'vitest';
import { createSampleState, sampleBusiness } from '../../data/waterSample';
import {
  customerBalances,
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
