import type { DistributorBook, Party, Product, Unit } from '../types/distributor';
import {
  adjustStock,
  cancelOrder,
  cancelPurchase,
  confirmOrder,
  createOrder,
  createPurchase,
  fulfilOrder,
  moveStock,
  orderRow,
  purchaseRow,
  receivePurchase,
  recordPayment,
  type AdjustReason,
} from '../features/distributor/distributorLogic';
import { rupees } from '../features/invoices/money';

/**
 * Fictional sample business for the Small Distributor Management demo.
 *
 * "Kaveri Wholesale Distributors" in Pune supplies kirana stores, a
 * supermarket, a hotel, a café and a medical store. The sample day is fixed
 * (Friday 23 October 2026). The history from 1 September is not typed in as
 * results: it is replayed through the demo's own rules (receiving, delivering,
 * payments, adjustments), so every stock balance, total and balance reconciles
 * by construction. Names, phones and emails are invented.
 */
export const DISTRIBUTOR_TODAY = '2026-10-23';
export const distributorBusiness = { name: 'Kaveri Wholesale Distributors', city: 'Pune' };
const OPENING = '2026-09-01';

type P = [id: string, sku: string, name: string, category: string, unit: Unit, cost: number, price: number, reorder: number, opening: number];
const productList: P[] = [
  ['p1', 'STP-101', 'Basmati Rice 25 kg', 'Staples', 'bag', 1850, 2100, 15, 40],
  ['p2', 'STP-102', 'Sona Masoori Rice 25 kg', 'Staples', 'bag', 1350, 1520, 20, 50],
  ['p3', 'STP-103', 'Toor Dal 1 kg × 10', 'Staples', 'carton', 1300, 1450, 12, 30],
  ['p4', 'STP-104', 'Sugar 50 kg', 'Staples', 'bag', 2050, 2200, 10, 25],
  ['p5', 'STP-105', 'Sunflower Oil 1 L × 12', 'Staples', 'carton', 1560, 1740, 15, 35],
  ['p6', 'STP-106', 'Wheat Atta 10 kg', 'Staples', 'bag', 380, 430, 25, 60],
  ['p7', 'BEV-201', 'Tea 250 g × 24', 'Beverages', 'carton', 2400, 2700, 16, 15],
  ['p8', 'BEV-202', 'Instant Coffee 50 g × 24', 'Beverages', 'box', 2900, 3250, 10, 10],
  ['p9', 'BEV-203', 'Mango Drink 200 ml × 30', 'Beverages', 'case', 360, 420, 30, 80],
  ['p10', 'BEV-204', 'Packaged Water 1 L × 12', 'Beverages', 'case', 120, 150, 50, 120],
  ['p11', 'PC-301', 'Bath Soap 100 g × 48', 'Personal care', 'carton', 1150, 1300, 18, 15],
  ['p12', 'PC-302', 'Toothpaste 150 g × 36', 'Personal care', 'carton', 2700, 3000, 12, 12],
  ['p13', 'PC-303', 'Shampoo Sachets 16 × 30', 'Personal care', 'box', 600, 690, 10, 30],
  ['p14', 'PC-304', 'Coconut Hair Oil 200 ml × 24', 'Personal care', 'carton', 1900, 2150, 8, 18],
  ['p15', 'HC-401', 'Detergent Powder 1 kg × 20', 'Household', 'carton', 1700, 1900, 12, 30],
  ['p16', 'HC-402', 'Dishwash Bar 200 g × 60', 'Household', 'carton', 1050, 1200, 10, 22],
  ['p17', 'HC-403', 'Floor Cleaner 1 L × 12', 'Household', 'carton', 1080, 1250, 12, 10],
  ['p18', 'HC-404', 'Phenyl 5 L Can', 'Household', 'piece', 210, 260, 0, 20],
];

const party = (id: string, name: string, contactName: string, n: number, address: string, creditDays: number, notes = '', active = true): Party => ({
  id,
  name,
  contactName,
  phone: `+91 90000 5${String(n).padStart(4, '0')}`,
  email: `${name.toLowerCase().replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '')}@example.com`,
  address,
  notes,
  creditDays,
  active,
});

const suppliers: Party[] = [
  party('s1', 'Deccan Agro Foods', 'Mahesh Kulkarni', 101, 'Market Yard, Gultekdi, Pune', 30, 'Rice, dal, sugar, oil and atta. Delivers in 2 days.'),
  party('s2', 'Western Beverages Pvt Ltd', 'Neha Deshpande', 102, 'Bhosari MIDC, Pimpri-Chinchwad', 15, 'Minimum order 50 cases.'),
  party('s3', 'Coastal Personal Care Supplies', 'Joseph Fernandes', 103, 'Hadapsar Industrial Estate, Pune', 30),
  party('s4', 'Clean Home Products', 'Sunita Pawar', 104, 'Chakan, Pune district', 15),
  party('s5', 'Metro Packaging Co.', 'Ravi Shah', 105, 'Kondhwa, Pune', 15, 'No longer used. Kept for past records.', false),
];

const customers: Party[] = [
  party('c1', 'Shree Krishna Kirana Stores', 'Ganesh Jadhav', 201, 'Kothrud, Pune', 15, 'Prefers morning deliveries.'),
  party('c2', 'Patil General Store', 'Anil Patil', 202, 'Hadapsar, Pune', 7),
  party('c3', 'Fresh Mart Supermarket', 'Priya Iyer', 203, 'Baner Road, Pune', 30, 'Purchase manager approves orders over ₹50,000.'),
  party('c4', 'Sai Provision Stores', 'Sachin More', 204, 'Wakad, Pune', 15),
  party('c5', 'Annapurna Hotel', 'Ramesh Shetty', 205, 'Shivajinagar, Pune', 7),
  party('c6', 'Green Leaf Café', 'Aisha Khan', 206, 'Koregaon Park, Pune', 15),
  party('c7', 'City Medical & General', 'Dr. Vikram Rao', 207, 'Aundh, Pune', 15),
  party('c8', 'Joshi Traders', 'Prakash Joshi', 208, 'Camp, Pune', 15, 'Closed their shop in October.', false),
];

type L = [productId: string, qty: number];
type Pay = [date: string, amount: number | 'full', method: 'cash' | 'upi' | 'bank'];
interface Doc {
  ref: string;
  date: string;
  party: string;
  lines: L[];
  /** Date it was received / delivered, cancelled, or left as is. */
  done?: string;
  cancelled?: string;
  confirmed?: string;
  pay?: Pay[];
  notes?: string;
}

const purchases: Doc[] = [
  { ref: 'PO-2001', date: '2026-09-02', party: 's2', lines: [['p9', 60], ['p10', 80]], done: '2026-09-04', pay: [['2026-09-18', 'full', 'bank']] },
  { ref: 'PO-2002', date: '2026-09-06', party: 's1', lines: [['p1', 30], ['p2', 30], ['p6', 40]], done: '2026-09-08', pay: [['2026-10-07', 'full', 'bank']] },
  { ref: 'PO-2003', date: '2026-09-12', party: 's3', lines: [['p11', 20], ['p12', 10], ['p13', 20], ['p14', 12]], done: '2026-09-14', pay: [['2026-10-10', 'full', 'bank']] },
  { ref: 'PO-2004', date: '2026-09-16', party: 's4', lines: [['p15', 20], ['p16', 15], ['p17', 10]], done: '2026-09-18', pay: [['2026-10-03', 'full', 'upi']] },
  { ref: 'PO-2005', date: '2026-09-26', party: 's1', lines: [['p3', 20], ['p4', 15], ['p5', 20]], done: '2026-09-28', pay: [['2026-10-15', 50000, 'bank']] },
  { ref: 'PO-2006', date: '2026-10-03', party: 's2', lines: [['p9', 50], ['p10', 60], ['p7', 10], ['p8', 6]], done: '2026-10-05', pay: [['2026-10-10', 40000, 'bank']] },
  { ref: 'PO-2007', date: '2026-10-08', party: 's4', lines: [['p17', 10]], cancelled: '2026-10-09', notes: 'Cancelled: supplier couldn’t deliver this week.' },
  { ref: 'PO-2008', date: '2026-10-10', party: 's1', lines: [['p1', 20], ['p2', 20], ['p6', 30]], done: '2026-10-12' },
  { ref: 'PO-2009', date: '2026-10-14', party: 's4', lines: [['p15', 15], ['p16', 10]], done: '2026-10-16' },
  { ref: 'PO-2010', date: '2026-10-19', party: 's3', lines: [['p13', 15], ['p14', 10]], done: '2026-10-21' },
  { ref: 'PO-2011', date: '2026-10-22', party: 's3', lines: [['p12', 12], ['p11', 15]], notes: 'Expected Monday.' },
  { ref: 'PO-2012', date: '2026-10-23', party: 's2', lines: [['p7', 12], ['p8', 8]], notes: 'To confirm quantities with Neha.' },
];

const orders: Doc[] = [
  { ref: 'SO-1001', date: '2026-09-03', party: 'c1', lines: [['p1', 5], ['p3', 4], ['p6', 10]], done: '2026-09-04', pay: [['2026-09-15', 'full', 'upi']] },
  { ref: 'SO-1002', date: '2026-09-05', party: 'c3', lines: [['p9', 20], ['p10', 30], ['p11', 5]], done: '2026-09-07', pay: [['2026-10-05', 'full', 'bank']] },
  { ref: 'SO-1003', date: '2026-09-08', party: 'c2', lines: [['p2', 6], ['p4', 3], ['p5', 4]], done: '2026-09-09', pay: [['2026-09-14', 'full', 'cash']] },
  { ref: 'SO-1004', date: '2026-09-10', party: 'c5', lines: [['p1', 8], ['p5', 6], ['p7', 3]], done: '2026-09-11', pay: [['2026-09-18', 'full', 'upi']] },
  { ref: 'SO-1005', date: '2026-09-14', party: 'c4', lines: [['p6', 15], ['p15', 6], ['p16', 5]], done: '2026-09-15', pay: [['2026-09-30', 'full', 'upi']] },
  { ref: 'SO-1006', date: '2026-09-17', party: 'c6', lines: [['p8', 3], ['p7', 4], ['p9', 10]], done: '2026-09-18', pay: [['2026-10-02', 'full', 'upi']] },
  { ref: 'SO-1007', date: '2026-09-21', party: 'c7', lines: [['p12', 5], ['p13', 8], ['p14', 6], ['p11', 6]], done: '2026-09-22', pay: [['2026-10-06', 'full', 'bank']] },
  { ref: 'SO-1008', date: '2026-09-24', party: 'c1', lines: [['p2', 10], ['p3', 6], ['p17', 4]], done: '2026-09-25', pay: [['2026-10-08', 15000, 'upi']] },
  { ref: 'SO-1009', date: '2026-09-28', party: 'c3', lines: [['p10', 40], ['p9', 25], ['p15', 8], ['p16', 6]], done: '2026-09-29', pay: [['2026-10-20', 'full', 'bank']] },
  { ref: 'SO-1010', date: '2026-10-01', party: 'c2', lines: [['p1', 6], ['p4', 5], ['p6', 12]], done: '2026-10-02', pay: [['2026-10-06', 10000, 'cash']] },
  { ref: 'SO-1011', date: '2026-10-05', party: 'c4', lines: [['p5', 8], ['p3', 5], ['p11', 4]], done: '2026-10-06', pay: [['2026-10-19', 'full', 'upi']] },
  { ref: 'SO-1012', date: '2026-10-07', party: 'c5', lines: [['p1', 6], ['p2', 4], ['p5', 5]], done: '2026-10-08', pay: [['2026-10-14', 15000, 'upi']] },
  { ref: 'SO-1013', date: '2026-10-09', party: 'c8', lines: [['p18', 4], ['p16', 3]], done: '2026-10-10', pay: [['2026-10-12', 'full', 'cash']] },
  { ref: 'SO-1014', date: '2026-10-12', party: 'c3', lines: [['p9', 20], ['p10', 30], ['p12', 4], ['p14', 5]], done: '2026-10-13' },
  { ref: 'SO-1015', date: '2026-10-14', party: 'c6', lines: [['p7', 4], ['p8', 3], ['p13', 6]], done: '2026-10-15', pay: [['2026-10-20', 10000, 'upi']] },
  { ref: 'SO-1016', date: '2026-10-15', party: 'c1', lines: [['p4', 6]], cancelled: '2026-10-16', notes: 'Customer bought sugar elsewhere.' },
  { ref: 'SO-1017', date: '2026-10-16', party: 'c1', lines: [['p6', 15], ['p15', 6], ['p17', 5]], done: '2026-10-17' },
  { ref: 'SO-1018', date: '2026-10-18', party: 'c7', lines: [['p11', 5], ['p12', 3], ['p13', 6]], done: '2026-10-19', pay: [['2026-10-22', 'full', 'bank']] },
  { ref: 'SO-1019', date: '2026-10-20', party: 'c4', lines: [['p2', 8], ['p4', 4]], done: '2026-10-21' },
  { ref: 'SO-1020', date: '2026-10-21', party: 'c2', lines: [['p3', 6], ['p5', 6]], confirmed: '2026-10-21' },
  { ref: 'SO-1021', date: '2026-10-22', party: 'c5', lines: [['p1', 5], ['p7', 3]], confirmed: '2026-10-22', notes: 'Deliver before Saturday lunch service.' },
  { ref: 'SO-1022', date: '2026-10-22', party: 'c3', lines: [['p10', 40], ['p9', 30]] },
  { ref: 'SO-1023', date: '2026-10-23', party: 'c6', lines: [['p8', 12], ['p13', 5]], notes: 'Asked for 12 boxes of coffee for their new outlet.' },
];

const adjustments: [date: string, productId: string, qty: number, reason: AdjustReason, note: string][] = [
  ['2026-09-20', 'p9', -3, 'damaged', 'Cases crushed while unloading'],
  ['2026-09-30', 'p6', -2, 'count', 'Month-end count'],
  ['2026-10-11', 'p1', -1, 'damaged', 'Torn bag, rice spilled'],
  ['2026-10-17', 'p13', 2, 'count', 'Two boxes found behind the rack'],
  ['2026-10-18', 'p8', -1, 'expired', ''],
  ['2026-10-20', 'p9', -2, 'sample', 'Given to Green Leaf Café to try'],
];

/** Builds the sample book by replaying the history above, in date order, through the demo's rules. */
export function createDistributorSample(): DistributorBook {
  const products: Product[] = productList.map(([id, sku, name, category, unit, cost, price, reorderLevel]) => ({ id, sku, name, category, unit, costPaise: rupees(cost), pricePaise: rupees(price), reorderLevel, active: true }));
  let book: DistributorBook = { today: OPENING, products, suppliers: suppliers.map((s) => ({ ...s, active: true })), customers: customers.map((c) => ({ ...c, active: true })), purchases: [], orders: [], payments: [], movements: [] };

  const take = <R extends { ok: boolean }>(what: string, r: R): R & { ok: true } => {
    if (!r.ok) throw new Error(`Sample data: ${what} failed: ${JSON.stringify((r as unknown as { errors: unknown }).errors)}`);
    return r as R & { ok: true };
  };
  const on = (date: string) => (book = { ...book, today: date });

  // Opening stock, all on 1 September.
  book = take('opening stock', moveStock(book, productList.map(([id, , , , , , , , opening]) => ({ productId: id, qty: opening, type: 'opening' as const, reason: 'Opening stock' })))).book;

  type Step = { date: string; order: number; run: () => void };
  const steps: Step[] = [];
  const ids = new Map<string, string>();
  let payN = 0;
  const lineInputs = (lines: L[], kind: 'cost' | 'price') => lines.map(([productId, qty]) => ({ productId, qty: String(qty), price: String(productList.find((p) => p[0] === productId)![kind === 'cost' ? 5 : 6]) }));

  for (const d of purchases) {
    steps.push({
      date: d.date,
      order: 1,
      run: () => {
        const r = take(d.ref, createPurchase(book, { supplierId: d.party, ref: d.ref, date: d.date, notes: d.notes ?? '', lines: lineInputs(d.lines, 'cost') }));
        book = r.book;
        ids.set(d.ref, r.purchase.id);
      },
    });
    if (d.done) steps.push({ date: d.done, order: 2, run: () => (book = take(`${d.ref} receive`, receivePurchase(book, ids.get(d.ref)!)).book) });
    if (d.cancelled) steps.push({ date: d.cancelled, order: 2, run: () => (book = take(`${d.ref} cancel`, cancelPurchase(book, ids.get(d.ref)!)).book) });
    for (const [date, amount, method] of d.pay ?? [])
      steps.push({
        date,
        order: 4,
        run: () => {
          const id = ids.get(d.ref)!;
          const due = purchaseRow(book, book.purchases.find((p) => p.id === id)!).balance;
          book = take(`${d.ref} payment`, recordPayment(book, { direction: 'out', docId: id, amount: String((amount === 'full' ? due : rupees(amount)) / 100), method, note: '', requestId: `seed-${(payN += 1)}` })).book;
        },
      });
  }
  for (const d of orders) {
    steps.push({
      date: d.date,
      order: 3,
      run: () => {
        const r = take(d.ref, createOrder(book, { customerId: d.party, ref: d.ref, date: d.date, notes: d.notes ?? '', lines: lineInputs(d.lines, 'price') }));
        book = r.book;
        ids.set(d.ref, r.order.id);
      },
    });
    if (d.done || d.confirmed) steps.push({ date: d.confirmed ?? d.date, order: 3.5, run: () => (book = take(`${d.ref} confirm`, confirmOrder(book, ids.get(d.ref)!)).book) });
    if (d.done) steps.push({ date: d.done, order: 3.6, run: () => (book = take(`${d.ref} deliver`, fulfilOrder(book, ids.get(d.ref)!)).book) });
    if (d.cancelled) steps.push({ date: d.cancelled, order: 3.6, run: () => (book = take(`${d.ref} cancel`, cancelOrder(book, ids.get(d.ref)!)).book) });
    for (const [date, amount, method] of d.pay ?? [])
      steps.push({
        date,
        order: 4,
        run: () => {
          const id = ids.get(d.ref)!;
          const due = orderRow(book, book.orders.find((o) => o.id === id)!).balance;
          book = take(`${d.ref} payment`, recordPayment(book, { direction: 'in', docId: id, amount: String((amount === 'full' ? due : rupees(amount)) / 100), method, note: '', requestId: `seed-${(payN += 1)}` })).book;
        },
      });
  }
  adjustments.forEach(([date, productId, qty, reason, note], i) =>
    steps.push({ date, order: 5, run: () => (book = take(`adjust ${productId}`, adjustStock(book, { productId, direction: qty > 0 ? 'in' : 'out', qty: String(Math.abs(qty)), reason, note, requestId: `seed-adj-${i + 1}` })).book) }),
  );
  // After their last dealings: Phenyl is discontinued, Joshi Traders and Metro Packaging are inactive.
  steps.push({ date: '2026-10-11', order: 6, run: () => (book = { ...book, products: book.products.map((p) => (p.id === 'p18' ? { ...p, active: false } : p)), customers: book.customers.map((c) => (c.id === 'c8' ? { ...c, active: false } : c)), suppliers: book.suppliers.map((s) => (s.id === 's5' ? { ...s, active: false } : s)) }) });

  steps.sort((a, b) => a.date.localeCompare(b.date) || a.order - b.order);
  for (const s of steps) {
    on(s.date);
    s.run();
  }
  return { ...book, today: DISTRIBUTOR_TODAY };
}
