import { describe, expect, it } from 'vitest';
import type { DistributorBook } from '../../types/distributor';
import { DISTRIBUTOR_TODAY, createDistributorSample } from '../../data/distributorSample';
import {
  adjustStock,
  cancelOrder,
  cancelPurchase,
  committedOf,
  confirmOrder,
  createOrder,
  createProduct,
  createPurchase,
  customerRows,
  docTotal,
  emptyProduct,
  filterOrders,
  filterProducts,
  fulfilOrder,
  ledger,
  lineTotal,
  lowStockRows,
  moveStock,
  nextRef,
  orderRow,
  overview,
  payables,
  paymentRows,
  productRows,
  productToInput,
  purchaseRow,
  rangeFor,
  receivables,
  receivePurchase,
  reconcile,
  recordPayment,
  recentActivity,
  saveParty,
  partyToInput,
  stockOf,
  supplierRows,
  updateOrder,
  updateProduct,
  updatePurchase,
  type OrderInput,
  type PurchaseInput,
} from './distributorLogic';

const sample = () => createDistributorSample();
const ok = <R extends { ok: boolean }>(r: R): R & { ok: true } => {
  if (!r.ok) throw new Error(JSON.stringify((r as unknown as { errors: unknown }).errors));
  return r as R & { ok: true };
};
const orderBy = (b: DistributorBook, ref: string) => b.orders.find((o) => o.ref === ref)!;
const purchaseBy = (b: DistributorBook, ref: string) => b.purchases.find((p) => p.ref === ref)!;
const productBy = (b: DistributorBook, sku: string) => b.products.find((p) => p.sku === sku)!;
const order = (b: DistributorBook, lines: [string, number][], over: Partial<OrderInput> = {}): OrderInput => ({
  customerId: 'c4',
  ref: nextRef(b, 'order'),
  date: b.today,
  notes: '',
  lines: lines.map(([sku, qty]) => {
    const p = productBy(b, sku);
    return { productId: p.id, qty: String(qty), price: String(p.pricePaise / 100) };
  }),
  ...over,
});
const purchase = (b: DistributorBook, lines: [string, number][], over: Partial<PurchaseInput> = {}): PurchaseInput => ({
  supplierId: 's1',
  ref: nextRef(b, 'purchase'),
  date: b.today,
  notes: '',
  lines: lines.map(([sku, qty]) => {
    const p = productBy(b, sku);
    return { productId: p.id, qty: String(qty), price: String(p.costPaise / 100) };
  }),
  ...over,
});
const pay = (b: DistributorBook, direction: 'in' | 'out', docId: string, amount: string, requestId = `r-${Math.random()}`) => recordPayment(b, { direction, docId, amount, method: 'upi', note: '', requestId });

describe('sample data', () => {
  it('is deterministic and on the fixed sample day', () => {
    expect(sample()).toEqual(sample());
    expect(sample().today).toBe(DISTRIBUTOR_TODAY);
  });

  it('has the documented shape: products, parties and every document state', () => {
    const b = sample();
    expect(b.products).toHaveLength(18);
    expect(new Set(b.products.map((p) => p.category))).toEqual(new Set(['Staples', 'Beverages', 'Personal care', 'Household']));
    expect(b.suppliers).toHaveLength(5);
    expect(b.customers).toHaveLength(8);
    const count = <T extends { status: string }>(list: T[]) => list.reduce<Record<string, number>>((m, x) => ({ ...m, [x.status]: (m[x.status] ?? 0) + 1 }), {});
    expect(count(b.purchases)).toEqual({ received: 9, cancelled: 1, draft: 2 });
    expect(count(b.orders)).toEqual({ fulfilled: 18, cancelled: 1, confirmed: 2, draft: 2 });
    expect(b.movements.filter((m) => m.type === 'adjustment')).toHaveLength(6);
    for (const m of b.movements.filter((x) => x.type === 'adjustment')) expect(m.reason.length).toBeGreaterThan(0);
  });

  it('reconciles stock for every product with the ledger and never goes negative', () => {
    const b = sample();
    for (const p of b.products) {
      const r = reconcile(b, p.id);
      expect(r.current, p.sku).toBe(r.expected);
      // Each product's ledger, replayed in order, never dips below zero and ends at the current stock.
      let running = 0;
      for (const m of b.movements.filter((x) => x.productId === p.id).sort((x, y) => x.seq - y.seq)) {
        running += m.qty;
        expect(m.balanceAfter).toBe(running);
        expect(running).toBeGreaterThan(-1);
      }
      expect(running).toBe(stockOf(b, p.id));
    }
  });

  it('stock comes only from opening, received purchases, delivered orders and adjustments', () => {
    const b = sample();
    for (const m of b.movements) {
      if (m.type === 'purchase') expect(b.purchases.find((p) => p.id === m.ref?.id)?.status).toBe('received');
      if (m.type === 'sale') expect(b.orders.find((o) => o.id === m.ref?.id)?.status).toBe('fulfilled');
    }
    for (const p of b.purchases) {
      const moved = b.movements.filter((m) => m.ref?.kind === 'purchase' && m.ref.id === p.id);
      expect(moved.length, p.ref).toBe(p.status === 'received' ? p.lines.length : 0);
    }
    for (const o of b.orders) {
      const moved = b.movements.filter((m) => m.ref?.kind === 'order' && m.ref.id === o.id);
      expect(moved.length, o.ref).toBe(o.status === 'fulfilled' ? o.lines.length : 0);
      if (o.status === 'fulfilled') expect(moved.reduce((s, m) => s - m.qty, 0)).toBe(o.lines.reduce((s, l) => s + l.qty, 0));
    }
  });

  it('has no overpayments, and every payment belongs to a delivered order or received purchase', () => {
    const b = sample();
    for (const p of b.payments) {
      if (p.direction === 'in') expect(b.orders.find((o) => o.id === p.docId)?.status).toBe('fulfilled');
      else expect(b.purchases.find((x) => x.id === p.docId)?.status).toBe('received');
      expect(p.amountPaise).toBeGreaterThan(0);
    }
    for (const o of b.orders) expect(orderRow(b, o).balance).toBeGreaterThan(-1);
    for (const p of b.purchases) expect(purchaseRow(b, p).balance).toBeGreaterThan(-1);
  });

  it('has full and part payments, overdue and not-yet-due balances, and low-stock products', () => {
    const b = sample();
    const rows = b.orders.map((o) => orderRow(b, o));
    expect(rows.filter((r) => r.pay === 'paid').length).toBeGreaterThan(5);
    expect(rows.filter((r) => r.pay === 'partial').length).toBeGreaterThan(1);
    expect(rows.some((r) => r.overdue)).toBe(true);
    expect(rows.some((r) => r.balance > 0 && !r.overdue)).toBe(true);
    expect(lowStockRows(b).map((r) => r.product.sku).sort()).toEqual(['BEV-201', 'BEV-202', 'HC-403', 'PC-301', 'PC-302']);
  });

  it('document totals equal the sum of their lines', () => {
    const b = sample();
    for (const d of [...b.orders, ...b.purchases]) expect(docTotal(d.lines)).toBe(d.lines.reduce((s, l) => s + l.qty * l.unitPaise, 0));
    expect(lineTotal({ productId: 'x', sku: 'X', name: 'X', unit: 'bag', qty: 3, unitPaise: 185000 })).toBe(555000);
    expect(docTotal(orderBy(b, 'SO-1001').lines)).toBe(2060000);
  });

  it('a reset gives a fresh copy, unaffected by earlier changes', () => {
    const b = sample();
    const changed = ok(receivePurchase(b, purchaseBy(b, 'PO-2011').id)).book;
    expect(changed).not.toEqual(b);
    expect(sample()).toEqual(b);
  });
});

describe('dashboard figures', () => {
  const b = sample();
  const range = rangeFor(b.today, 'mtd');
  const o = overview(b, range);

  it('uses a clear, fixed reporting period', () => {
    expect(range).toEqual({ from: '2026-10-01', to: '2026-10-23', label: '1 Oct – 23 Oct (23 days)' });
    expect(rangeFor(b.today, 'prev')).toMatchObject({ from: '2026-09-01', to: '2026-09-30' });
    expect(rangeFor(b.today, 'last7')).toMatchObject({ from: '2026-10-17', to: '2026-10-23' });
  });

  it('matches the sample scenario', () => {
    expect(o).toMatchObject({
      activeProducts: 17,
      lowStock: 5,
      inventoryCost: 76974000,
      inventorySaleValue: 86909000,
      purchases: { value: 20600000, count: 4 },
      paidOut: { value: 34655000, count: 5 },
      sales: { value: 21219000, count: 9 },
      collected: { value: 22492000, count: 11 },
      receivables: { total: 14044000, overdue: 4504000, notDue: 9540000, docs: 7, parties: 6 },
      payables: { total: 20395000, overdue: 2660000, notDue: 17735000, docs: 5, parties: 4 },
    });
  });

  it('sales are delivered orders; collections are payments: different numbers from different records', () => {
    const delivered = b.orders.filter((x) => x.status === 'fulfilled' && x.fulfilledOn! >= range.from && x.fulfilledOn! <= range.to);
    expect(o.sales.value).toBe(delivered.reduce((s, x) => s + docTotal(x.lines), 0));
    const received = b.payments.filter((p) => p.direction === 'in' && p.date >= range.from && p.date <= range.to);
    expect(o.collected.value).toBe(received.reduce((s, p) => s + p.amountPaise, 0));
    expect(o.sales.value).not.toBe(o.collected.value);
    // Confirmed and draft orders are not sales.
    expect(delivered.some((x) => x.ref === 'SO-1020' || x.ref === 'SO-1022')).toBe(false);
  });

  it('purchases are received purchases; paid is supplier payments', () => {
    const rec = b.purchases.filter((p) => p.status === 'received' && p.receivedOn! >= range.from);
    expect(o.purchases.value).toBe(rec.reduce((s, p) => s + docTotal(p.lines), 0));
    expect(o.paidOut.value).toBe(b.payments.filter((p) => p.direction === 'out' && p.date >= range.from).reduce((s, p) => s + p.amountPaise, 0));
  });

  it('values inventory at current cost, separately from potential sales value', () => {
    const rows = productRows(b);
    expect(o.inventoryCost).toBe(rows.reduce((s, r) => s + r.stock * r.product.costPaise, 0));
    expect(o.inventorySaleValue).toBe(rows.reduce((s, r) => s + r.stock * r.product.pricePaise, 0));
    expect(o.inventorySaleValue).toBeGreaterThan(o.inventoryCost);
    const basmati = rows.find((r) => r.product.sku === 'STP-101')!;
    expect(basmati).toMatchObject({ stock: 64, costValue: 64 * 185000, saleValue: 64 * 210000 });
  });

  it('receivables = delivered orders − customer payments; payables = received purchases − supplier payments', () => {
    const delivered = b.orders.filter((x) => x.status === 'fulfilled');
    const paidIn = b.payments.filter((p) => p.direction === 'in').reduce((s, p) => s + p.amountPaise, 0);
    expect(o.receivables.total).toBe(delivered.reduce((s, x) => s + docTotal(x.lines), 0) - paidIn);
    const rec = b.purchases.filter((p) => p.status === 'received');
    const paidOut = b.payments.filter((p) => p.direction === 'out').reduce((s, p) => s + p.amountPaise, 0);
    expect(o.payables.total).toBe(rec.reduce((s, p) => s + docTotal(p.lines), 0) - paidOut);
    expect(o.receivables.overdue + o.receivables.notDue).toBe(o.receivables.total);
    expect(customerRows(b).reduce((s, r) => s + r.outstanding.total, 0)).toBe(o.receivables.total);
    expect(supplierRows(b).reduce((s, r) => s + r.outstanding.total, 0)).toBe(o.payables.total);
  });

  it('ignores drafts, confirmed and cancelled documents in balances', () => {
    for (const ref of ['SO-1016', 'SO-1020', 'SO-1021', 'SO-1022', 'SO-1023']) expect(orderRow(b, orderBy(b, ref)).balance).toBe(0);
    for (const ref of ['PO-2007', 'PO-2011', 'PO-2012']) expect(purchaseRow(b, purchaseBy(b, ref)).balance).toBe(0);
  });

  it('marks overdue only past the due date, from the customer’s credit days', () => {
    const r = orderRow(b, orderBy(b, 'SO-1010'));
    expect(r).toMatchObject({ overdue: true, pay: 'partial', balance: 1876000 });
    expect(r.order.dueDate).toBe('2026-10-09'); // delivered 2 Oct + 7 days
    expect(orderRow(b, orderBy(b, 'SO-1015')).overdue).toBe(false); // due 30 Oct
    // On the due date itself it is not overdue yet.
    expect(orderRow({ ...b, today: '2026-10-30' }, orderBy(b, 'SO-1015')).overdue).toBe(false);
    expect(orderRow({ ...b, today: '2026-10-31' }, orderBy(b, 'SO-1015')).overdue).toBe(true);
  });

  it('lists recent activity newest first', () => {
    const a = recentActivity(b, 5);
    expect(a).toHaveLength(5);
    for (let i = 1; i < a.length; i += 1) expect(a[i - 1]!.date >= a[i]!.date).toBe(true);
    expect(a[0]!.date).toBe('2026-10-22');
  });
});

describe('stock operation', () => {
  it('applies a batch of movements together or not at all', () => {
    const b = sample();
    const tea = productBy(b, 'BEV-201');
    const rice = productBy(b, 'STP-101');
    const r = moveStock(b, [
      { productId: rice.id, qty: -5, type: 'adjustment', reason: 'x' },
      { productId: tea.id, qty: -100, type: 'adjustment', reason: 'x' },
    ]);
    expect(r.ok).toBe(false);
    expect(stockOf(b, rice.id)).toBe(64);
    expect(moveStock(b, [{ productId: rice.id, qty: 0, type: 'adjustment', reason: 'x' }]).ok).toBe(false);
    expect(moveStock(b, [{ productId: rice.id, qty: 1.5, type: 'adjustment', reason: 'x' }]).ok).toBe(false);
  });
});

describe('stock adjustments', () => {
  const b = sample();
  const soap = productBy(b, 'PC-301');
  const base = { productId: soap.id, direction: 'out' as const, qty: '2', reason: 'damaged', note: 'Wet cartons', requestId: 'adj-1' };

  it('writes one movement with the reason and resulting balance', () => {
    const r = ok(adjustStock(b, base));
    expect(r.movement).toMatchObject({ type: 'adjustment', qty: -2, balanceAfter: 13, reason: 'Damaged in storage', note: 'Wet cartons', date: DISTRIBUTOR_TODAY });
    expect(stockOf(r.book, soap.id)).toBe(13);
    expect(ledger(r.book, { productId: soap.id })[0]!.movement.id).toBe(r.movement.id);
    const rec = reconcile(r.book, soap.id);
    expect(rec.current).toBe(rec.expected);
    expect(rec.adjustedOut).toBe(2);
  });

  it('requires a reason, a direction it allows, a whole quantity, and a note for “other”', () => {
    expect(adjustStock(b, { ...base, reason: '' })).toMatchObject({ ok: false, errors: { reason: 'Choose a reason.' } });
    expect(adjustStock(b, { ...base, direction: 'in', reason: 'damaged' })).toMatchObject({ ok: false, errors: { reason: '“Damaged in storage” can only reduce stock.' } });
    expect(adjustStock(b, { ...base, qty: '1.5' })).toMatchObject({ ok: false, errors: { qty: 'Use whole units. Stock is counted in whole packs.' } });
    expect(adjustStock(b, { ...base, qty: '0' })).toMatchObject({ ok: false, errors: { qty: 'Enter a quantity greater than zero.' } });
    expect(adjustStock(b, { ...base, reason: 'other', note: '' })).toMatchObject({ ok: false, errors: { note: 'Explain the adjustment.' } });
    expect(adjustStock(b, { ...base, direction: '' }).ok).toBe(false);
  });

  it('refuses to take stock below zero and leaves the book unchanged', () => {
    const r = adjustStock(b, { ...base, qty: '16' });
    expect(r).toMatchObject({ ok: false, errors: { qty: 'Only 15 cartons in stock. Stock can’t go below zero.' } });
    expect(b).toEqual(sample());
  });

  it('applies a repeated submission once', () => {
    const once = ok(adjustStock(b, base)).book;
    expect(adjustStock(once, base)).toMatchObject({ ok: false, errors: { form: 'This adjustment has already been saved.' } });
    expect(stockOf(once, soap.id)).toBe(13);
  });
});

describe('products', () => {
  it('creates a product with opening stock as an opening movement', () => {
    const b = sample();
    const r = ok(createProduct(b, { ...emptyProduct(), sku: 'bev-205', name: 'Lemon Soda 300 ml × 24', category: 'Beverages', unit: 'case', price: '540', cost: '470', reorderLevel: '10', openingStock: '25' }));
    expect(r.product).toMatchObject({ sku: 'BEV-205', pricePaise: 54000, costPaise: 47000, active: true });
    expect(stockOf(r.book, r.product.id)).toBe(25);
    expect(ledger(r.book, { productId: r.product.id })[0]!.movement).toMatchObject({ type: 'opening', qty: 25 });
  });

  it('validates SKU, prices, unit and reorder level', () => {
    const b = sample();
    const r = createProduct(b, { ...emptyProduct(), sku: 'STP-101', name: '', category: '', unit: '', price: '0', cost: 'abc', reorderLevel: '-1', openingStock: '2.5' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(['category', 'cost', 'name', 'openingStock', 'price', 'reorderLevel', 'sku', 'unit']);
  });

  it('price and name changes never rewrite existing purchases or orders', () => {
    const b = sample();
    const rice = productBy(b, 'STP-101');
    const before = orderBy(b, 'SO-1001').lines[0]!;
    const r = ok(updateProduct(b, rice.id, { ...productToInput(rice), name: 'Basmati Rice Premium 25 kg', price: '2400', cost: '2000' }));
    expect(orderBy(r.book, 'SO-1001').lines[0]).toEqual(before);
    expect(before).toMatchObject({ name: 'Basmati Rice 25 kg', sku: 'STP-101', unit: 'bag', unitPaise: 210000 });
    expect(purchaseBy(r.book, 'PO-2002').lines[0]).toMatchObject({ name: 'Basmati Rice 25 kg', unitPaise: 185000 });
    expect(stockOf(r.book, rice.id)).toBe(64);
    // New documents use the new details.
    const o = ok(createOrder(r.book, order(r.book, [['STP-101', 1]])));
    expect(o.order.lines[0]).toMatchObject({ name: 'Basmati Rice Premium 25 kg', unitPaise: 240000 });
  });

  it('filters by search, category, status and low stock', () => {
    const rows = productRows(sample());
    expect(filterProducts(rows, { query: 'rice' }).map((r) => r.product.sku)).toEqual(['STP-101', 'STP-102']);
    expect(filterProducts(rows, { query: 'hc-' })).toHaveLength(4);
    expect(filterProducts(rows, { category: 'Beverages' })).toHaveLength(4);
    expect(filterProducts(rows, { status: 'inactive' }).map((r) => r.product.name)).toEqual(['Phenyl 5 L Can']);
    expect(filterProducts(rows, { stock: 'low' })).toHaveLength(5);
  });
});

describe('purchases', () => {
  it('a draft adds no stock; receiving adds every line exactly once', () => {
    const b = sample();
    const p = purchaseBy(b, 'PO-2011');
    const soap = productBy(b, 'PC-301');
    expect(stockOf(b, soap.id)).toBe(15);
    const r = ok(receivePurchase(b, p.id));
    expect(r.purchase).toMatchObject({ status: 'received', receivedOn: DISTRIBUTOR_TODAY, dueDate: '2026-11-22' });
    expect(stockOf(r.book, soap.id)).toBe(30);
    expect(r.book.movements.length - b.movements.length).toBe(2);
    const again = receivePurchase(r.book, p.id);
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.errors.form).toMatch(/already received/);
    expect(stockOf(r.book, soap.id)).toBe(30);
    expect(purchaseRow(r.book, r.purchase)).toMatchObject({ pay: 'unpaid', balance: 4965000 });
  });

  it('editing a draft changes no stock; received and cancelled purchases can’t be edited', () => {
    const b = sample();
    const p = purchaseBy(b, 'PO-2012');
    const r = ok(updatePurchase(b, p.id, purchase(b, [['BEV-201', 20]], { ref: p.ref, supplierId: 's2' })));
    expect(r.purchase.lines).toHaveLength(1);
    expect(r.book.movements).toEqual(b.movements);
    expect(updatePurchase(b, purchaseBy(b, 'PO-2001').id, purchase(b, [['BEV-201', 1]], { ref: 'PO-2001' })).ok).toBe(false);
    expect(updatePurchase(b, purchaseBy(b, 'PO-2007').id, purchase(b, [['BEV-201', 1]], { ref: 'PO-2007' })).ok).toBe(false);
  });

  it('a cancelled purchase can’t be received and never affects stock', () => {
    const b = sample();
    const r = ok(cancelPurchase(b, purchaseBy(b, 'PO-2012').id));
    expect(r.book.movements).toEqual(b.movements);
    expect(receivePurchase(r.book, r.purchase.id).ok).toBe(false);
    expect(cancelPurchase(b, purchaseBy(b, 'PO-2001').id).ok).toBe(false);
  });

  it('save-and-receive is atomic and snapshots the lines', () => {
    const b = sample();
    const r = ok(createPurchase(b, purchase(b, [['PC-302', 6]], { supplierId: 's3' }), { receive: true }));
    expect(r.purchase.status).toBe('received');
    expect(r.purchase.ref).toBe('PO-2013');
    expect(r.purchase.lines[0]).toMatchObject({ sku: 'PC-302', name: 'Toothpaste 150 g × 36', unit: 'carton', qty: 6, unitPaise: 270000 });
    expect(stockOf(r.book, productBy(b, 'PC-302').id)).toBe(16);
  });

  it('validates supplier, reference, date and lines', () => {
    const b = sample();
    const r = createPurchase(b, purchase(b, [['BEV-201', 0]], { supplierId: 's5', ref: 'po-2001', date: '2026-10-30' }));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.party).toBe('Metro Packaging Co. is inactive. Choose an active supplier.');
      expect(r.errors.ref).toBe('Another purchase already uses PO-2001.');
      expect(r.errors.date).toBe('The date can’t be in the future.');
      expect(r.errors['line0.qty']).toBe('Enter a quantity greater than zero.');
    }
    const inactive = createPurchase(b, purchase(b, [['HC-404', 5]]));
    expect(inactive.ok).toBe(false);
    if (!inactive.ok) expect(inactive.errors['line0.product']).toBe('Phenyl 5 L Can is inactive. Remove this line.');
    const dup = createPurchase(b, purchase(b, [['BEV-201', 1], ['BEV-201', 2]]));
    expect(dup.ok).toBe(false);
    expect(createPurchase(b, { ...purchase(b, []), lines: [{ productId: '', qty: '', price: '' }] })).toMatchObject({ ok: false, errors: { lines: 'Add at least one product.' } });
  });
});

describe('sales orders', () => {
  it('drafts and confirmed orders deduct nothing; delivery deducts once', () => {
    const b = sample();
    const o = orderBy(b, 'SO-1020'); // confirmed: 6 Toor Dal, 6 Sunflower Oil
    const dal = productBy(b, 'STP-103');
    expect(stockOf(b, dal.id)).toBe(35);
    expect(committedOf(b, dal.id)).toBe(6);
    const r = ok(fulfilOrder(b, o.id));
    expect(r.order).toMatchObject({ status: 'fulfilled', fulfilledOn: DISTRIBUTOR_TODAY, dueDate: '2026-10-30' });
    expect(stockOf(r.book, dal.id)).toBe(29);
    expect(committedOf(r.book, dal.id)).toBe(0);
    const again = fulfilOrder(r.book, o.id);
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.errors.form).toMatch(/already delivered/);
    expect(stockOf(r.book, dal.id)).toBe(29);
  });

  it('delivered is not paid: the balance stays until a payment is recorded', () => {
    const b = sample();
    const r = ok(fulfilOrder(b, orderBy(b, 'SO-1020').id));
    expect(orderRow(r.book, r.order)).toMatchObject({ pay: 'unpaid', balance: 1914000, received: 0 });
  });

  it('rejects confirming or delivering without enough stock, and changes nothing', () => {
    const b = sample();
    const coffeeOrder = orderBy(b, 'SO-1023'); // draft: 12 coffee, 9 in stock
    const r = confirmOrder(b, coffeeOrder.id);
    expect(r).toMatchObject({ ok: false, errors: { form: 'Not enough stock. Instant Coffee 50 g × 24: needs 12 boxes, 9 in stock.' } });
    expect(b).toEqual(sample());
    // A confirmed order whose stock was used up meanwhile can't be delivered, not even partly.
    const tea = productBy(b, 'BEV-201');
    const drained = ok(adjustStock(b, { productId: tea.id, direction: 'out', qty: '13', reason: 'count', note: '', requestId: 'x' })).book;
    const so = orderBy(drained, 'SO-1021'); // confirmed: 5 Basmati + 3 Tea
    const f = fulfilOrder(drained, so.id);
    expect(f.ok).toBe(false);
    if (!f.ok) expect(f.errors.form).toBe('Not enough stock. Tea 250 g × 24: needs 3 cartons, 1 in stock. Nothing was delivered or deducted.');
    expect(stockOf(drained, productBy(b, 'STP-101').id)).toBe(64);
    expect(orderBy(drained, 'SO-1021').status).toBe('confirmed');
  });

  it('confirming counts stock promised to other confirmed orders', () => {
    const b = sample();
    // 14 Tea in stock, 3 promised to SO-1021: only 11 are free.
    const r = createOrder(b, order(b, [['BEV-201', 12]]), { confirm: true });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.lines).toBe('Not enough stock. Tea 250 g × 24: needs 12 cartons, 11 free (14 in stock, 3 promised to other confirmed orders).');
    expect(ok(createOrder(b, order(b, [['BEV-201', 11]]), { confirm: true })).order.status).toBe('confirmed');
  });

  it('cancelled and draft orders never reduce stock; delivered orders can’t be cancelled or edited', () => {
    const b = sample();
    const c = ok(cancelOrder(b, orderBy(b, 'SO-1022').id));
    expect(c.book.movements).toEqual(b.movements);
    expect(fulfilOrder(c.book, c.order.id).ok).toBe(false);
    expect(confirmOrder(c.book, c.order.id).ok).toBe(false);
    expect(fulfilOrder(b, orderBy(b, 'SO-1022').id)).toMatchObject({ ok: false, errors: { form: 'Confirm the order before delivering it.' } });
    expect(cancelOrder(b, orderBy(b, 'SO-1001').id).ok).toBe(false);
    expect(updateOrder(b, orderBy(b, 'SO-1001').id, order(b, [['STP-101', 1]], { ref: 'SO-1001', customerId: 'c1' })).ok).toBe(false);
  });

  it('editing a confirmed order re-checks free stock', () => {
    const b = sample();
    const so = orderBy(b, 'SO-1021');
    const tooMuch = updateOrder(b, so.id, order(b, [['STP-101', 5], ['BEV-201', 15]], { ref: so.ref, customerId: so.customerId }));
    expect(tooMuch.ok).toBe(false);
    const fine = ok(updateOrder(b, so.id, order(b, [['STP-101', 5], ['BEV-201', 10]], { ref: so.ref, customerId: so.customerId })));
    expect(fine.order.status).toBe('confirmed');
    expect(fine.book.movements).toEqual(b.movements);
  });

  it('rejects inactive customers and products, bad quantities and duplicate references', () => {
    const b = sample();
    const r = createOrder(b, order(b, [['HC-404', 1], ['STP-101', -2]], { customerId: 'c8', ref: 'so-1001' }));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.party).toBe('Joshi Traders is inactive. Choose an active customer.');
      expect(r.errors.ref).toBe('Another order already uses SO-1001.');
      expect(r.errors['line0.product']).toBe('Phenyl 5 L Can is inactive. Remove this line.');
      expect(r.errors['line1.qty']).toBe('Enter a whole number.');
    }
    expect(nextRef(b, 'order')).toBe('SO-1024');
    // The inactive product still shows on its past order.
    expect(orderBy(b, 'SO-1013').lines[0]).toMatchObject({ name: 'Phenyl 5 L Can', qty: 4 });
  });

  it('filters orders by status, customer and search', () => {
    const b = sample();
    const rows = b.orders.map((o) => orderRow(b, o));
    expect(filterOrders(rows, { status: 'open' }).map((r) => r.order.ref).sort()).toEqual(['SO-1020', 'SO-1021', 'SO-1022', 'SO-1023']);
    expect(filterOrders(rows, { status: 'unpaid' })).toHaveLength(7);
    expect(filterOrders(rows, { customerId: 'c3' })).toHaveLength(4);
    expect(filterOrders(rows, { query: 'coffee' }).map((r) => r.order.ref).sort()).toEqual(['SO-1006', 'SO-1015', 'SO-1023']);
  });
});

describe('payments', () => {
  it('records part and full payments and updates the balance', () => {
    const b = sample();
    const so = orderBy(b, 'SO-1014'); // ₹35,650 unpaid
    const p1 = ok(pay(b, 'in', so.id, '20000'));
    expect(p1.row).toMatchObject({ pay: 'partial', balance: 1565000, received: 2000000 });
    const p2 = ok(pay(p1.book, 'in', so.id, '15650'));
    expect(p2.row).toMatchObject({ pay: 'paid', balance: 0 });
    expect(pay(p2.book, 'in', so.id, '1')).toMatchObject({ ok: false, errors: { doc: 'This is fully paid.' } });
    expect(paymentRows(p2.book)[0]).toMatchObject({ ref: 'SO-1014', partyName: 'Fresh Mart Supermarket' });
  });

  it('rejects overpayment, zero, negative and malformed amounts', () => {
    const b = sample();
    const so = orderBy(b, 'SO-1014');
    expect(pay(b, 'in', so.id, '35650.01')).toMatchObject({ ok: false, errors: { amount: 'That’s more than the ₹35,650.00 still due.' } });
    expect(pay(b, 'in', so.id, '0')).toMatchObject({ ok: false, errors: { amount: 'Enter an amount greater than zero.' } });
    expect(pay(b, 'in', so.id, '-5')).toMatchObject({ ok: false, errors: { amount: 'Enter an amount greater than zero.' } });
    expect(pay(b, 'in', so.id, '12.345').ok).toBe(false);
    expect(recordPayment(b, { direction: 'in', docId: so.id, amount: '10', method: 'cheque', note: '', requestId: 'm' })).toMatchObject({ ok: false, errors: { method: 'Choose how it was paid.' } });
  });

  it('records a repeated submission once', () => {
    const b = sample();
    const so = orderBy(b, 'SO-1014');
    const once = ok(pay(b, 'in', so.id, '1000', 'same-request')).book;
    expect(pay(once, 'in', so.id, '1000', 'same-request')).toMatchObject({ ok: false, errors: { form: 'This payment has already been recorded.' } });
    expect(once.payments.length - b.payments.length).toBe(1);
  });

  it('only delivered orders and received purchases can be paid', () => {
    const b = sample();
    for (const ref of ['SO-1020', 'SO-1022', 'SO-1016']) expect(pay(b, 'in', orderBy(b, ref).id, '100').ok).toBe(false);
    for (const ref of ['PO-2011', 'PO-2007']) expect(pay(b, 'out', purchaseBy(b, ref).id, '100').ok).toBe(false);
  });

  it('supplier payments reduce payables and count as paid, not as purchases', () => {
    const b = sample();
    const po = purchaseBy(b, 'PO-2008'); // ₹75,400 unpaid
    const r = ok(pay(b, 'out', po.id, '25000'));
    expect(payables(r.book).total).toBe(payables(b).total - 2500000);
    const range = rangeFor(b.today, 'mtd');
    expect(overview(r.book, range).paidOut.value).toBe(overview(b, range).paidOut.value + 2500000);
    expect(overview(r.book, range).purchases).toEqual(overview(b, range).purchases);
  });

  it('customer payments raise collections but not sales', () => {
    const b = sample();
    const range = rangeFor(b.today, 'mtd');
    const r = ok(pay(b, 'in', orderBy(b, 'SO-1008').id, '13900'));
    expect(overview(r.book, range).collected.value).toBe(overview(b, range).collected.value + 1390000);
    expect(overview(r.book, range).sales).toEqual(overview(b, range).sales);
    expect(receivables(r.book).overdue).toBe(receivables(b).overdue - 1390000);
  });
});

describe('failed operations', () => {
  it('leave the book exactly as it was', () => {
    const b = sample();
    const snapshot = JSON.stringify(b);
    confirmOrder(b, orderBy(b, 'SO-1023').id);
    receivePurchase(b, purchaseBy(b, 'PO-2001').id);
    fulfilOrder(b, orderBy(b, 'SO-1001').id);
    pay(b, 'in', orderBy(b, 'SO-1014').id, '999999');
    adjustStock(b, { productId: 'p1', direction: 'out', qty: '1000', reason: 'count', note: '', requestId: 'z' });
    createOrder(b, order(b, [['BEV-202', 50]]), { confirm: true });
    createPurchase(b, purchase(b, [['HC-404', 1]]), { receive: true });
    expect(JSON.stringify(b)).toBe(snapshot);
  });
});

describe('suppliers and customers', () => {
  it('validates and saves, with unique names and normalised phones', () => {
    const b = sample();
    const r = ok(saveParty(b, 'customer', { name: 'Om Sai Mart', contactName: 'Kiran Gaikwad', phone: '9000059999', email: 'OM@example.com', address: 'Pimple Saudagar', notes: '', creditDays: '15', active: true }));
    expect(r.party).toMatchObject({ phone: '+91 90000 59999', email: 'om@example.com', creditDays: 15 });
    const dup = saveParty(b, 'supplier', { ...partyToInput(b.suppliers[0]!), name: 'deccan agro foods' });
    expect(dup).toMatchObject({ ok: false, errors: { name: 'A supplier with this name already exists.' } });
    expect(saveParty(b, 'supplier', { ...partyToInput(b.suppliers[0]!), phone: 'x', creditDays: '500' }).ok).toBe(false);
  });

  it('renaming a party keeps past documents linked and intact', () => {
    const b = sample();
    const r = ok(saveParty(b, 'customer', { ...partyToInput(b.customers[0]!), name: 'Shree Krishna Super Kirana' }, 'c1'));
    expect(orderRow(r.book, orderBy(r.book, 'SO-1001')).customer.name).toBe('Shree Krishna Super Kirana');
    expect(orderBy(r.book, 'SO-1001').lines).toEqual(orderBy(b, 'SO-1001').lines);
  });

  it('shows each party’s outstanding balance', () => {
    const b = sample();
    const c1 = customerRows(b).find((r) => r.party.id === 'c1')!;
    expect(c1.outstanding).toMatchObject({ total: 1390000 + 2410000, overdue: 1390000 });
    const s5 = supplierRows(b).find((r) => r.party.id === 's5')!;
    expect(s5).toMatchObject({ docs: 0, outstanding: { total: 0 } });
  });
});
