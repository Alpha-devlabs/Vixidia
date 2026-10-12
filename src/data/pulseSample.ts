import type { CatalogItem, Customer, Order, OrderLine, PulseState, SampleBusiness } from '../types/pulse';
import { addDays, localToday, weekday } from '../utils/dates';

/**
 * Fictional sample business for the Pulse demo. Every name and amount is invented.
 *
 * Orders are produced by a seeded generator, so the dataset is identical on every
 * load. Dates are anchored to the visitor's "today" so reporting periods feel
 * current. Every figure the dashboard shows is calculated from these orders.
 */
export const sampleBusiness: SampleBusiness = {
  name: 'Harbor & Pine Supply Co.',
  description: 'A fictional small business selling homeware, stationery, gifts and gift services.',
};

/** Days of history: enough for a 90-day period and the 90 days before it. */
export const HISTORY_DAYS = 180;
const SEED = 20261012;

/** Small, fast, deterministic PRNG (mulberry32). */
function createRng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)),
    pick: <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)]!,
  };
}

export const sampleCatalog: CatalogItem[] = [
  { id: 'p01', name: 'Ceramic mug set', category: 'Home & kitchen', price: 650 },
  { id: 'p02', name: 'Cotton kitchen towels', category: 'Home & kitchen', price: 420 },
  { id: 'p03', name: 'Glass storage jars', category: 'Home & kitchen', price: 890 },
  { id: 'p04', name: 'Notebook bundle', category: 'Stationery', price: 360 },
  { id: 'p05', name: 'Desk organiser', category: 'Stationery', price: 780 },
  { id: 'p06', name: 'Premium pen set', category: 'Stationery', price: 540 },
  { id: 'p07', name: 'Festive gift hamper', category: 'Gifts', price: 2400 },
  { id: 'p08', name: 'Scented candle', category: 'Gifts', price: 480 },
  { id: 'p09', name: 'Greeting card pack', category: 'Gifts', price: 250 },
  { id: 'p10', name: 'Gift wrapping', category: 'Services', price: 150 },
  { id: 'p11', name: 'Custom engraving', category: 'Services', price: 300 },
  { id: 'p12', name: 'Corporate gifting consultation', category: 'Services', price: 3500 },
];

const firstNames = ['Asha', 'Daniel', 'Fatima', 'Ishaan', 'Kavya', 'Meera', 'Arjun', 'Nisha', 'Rahul', 'Sana', 'Vikram', 'Leela', 'Joseph', 'Priya', 'Omar', 'Divya'];
const lastInitials = ['M.', 'K.', 'R.', 'S.', 'P.', 'T.'];

/** Relative popularity of each product; some trend up or down over the history. */
function productWeight(item: CatalogItem, progress: number): number {
  const trend: Record<string, number> = {
    p07: 1.8, // gift hampers become much more popular
    p11: 1.6, // engraving grows
    p12: 0.6, // consultations are rare but valuable
    p04: -0.5, // notebooks decline
    p06: -0.3,
  };
  const base = item.price > 2000 ? 0.35 : item.price > 700 ? 0.8 : 1.2;
  return Math.max(0.05, base * (1 + (trend[item.id] ?? 0) * progress));
}

/** Builds the full sample dataset. Pass `today` to pin dates (used by tests). */
export function createSampleState(today: string = localToday()): PulseState {
  const rng = createRng(SEED);
  const start = addDays(today, -(HISTORY_DAYS - 1));

  const customers: Customer[] = [];
  const addCustomer = () => {
    const i = customers.length;
    const name = `${firstNames[i % firstNames.length]} ${lastInitials[Math.floor(i / firstNames.length) % lastInitials.length]}`;
    const c = { id: `c${String(i + 1).padStart(3, '0')}`, name };
    customers.push(c);
    return c;
  };
  for (let i = 0; i < 18; i++) addCustomer();

  const orders: Order[] = [];
  let ref = 1001;
  // Orders per day by weekday (Sun..Sat): Saturdays are busiest.
  const dailyRange: [number, number][] = [[1, 3], [1, 4], [2, 5], [2, 5], [2, 5], [3, 6], [4, 8]];

  for (let offset = 0; offset < HISTORY_DAYS; offset++) {
    const date = addDays(start, offset);
    const progress = offset / (HISTORY_DAYS - 1);
    const [lo, hi] = dailyRange[weekday(date)]!;
    let count = rng.int(lo, hi);
    if (rng.next() < 0.35 * progress) count += 1; // gentle growth over time

    for (let n = 0; n < count; n++) {
      // Roughly one new customer every few days; their first order is that day.
      const customer = rng.next() < 0.12 ? addCustomer() : rng.pick(customers);
      const weights = sampleCatalog.map((item) => productWeight(item, progress));
      const total = weights.reduce((a, b) => a + b, 0);
      const lineCount = rng.int(1, 3);
      const lines: OrderLine[] = [];
      for (let l = 0; l < lineCount; l++) {
        let r = rng.next() * total;
        let idx = 0;
        while (r > weights[idx]! && idx < weights.length - 1) r -= weights[idx++]!;
        const item = sampleCatalog[idx]!;
        if (lines.some((x) => x.productId === item.id)) continue;
        lines.push({ productId: item.id, quantity: item.category === 'Services' ? 1 : rng.int(1, 3), unitPrice: item.price });
      }
      orders.push({ id: `o${ref}`, ref: `ORD-${ref}`, date, customerId: customer.id, lines });
      ref++;
    }
  }

  // A realistic default target: 10% above the 30 days before the current period, rounded.
  const priorStart = addDays(today, -59);
  const priorEnd = addDays(today, -30);
  const prior = orders
    .filter((o) => o.date >= priorStart && o.date <= priorEnd)
    .reduce((sum, o) => sum + o.lines.reduce((a, l) => a + l.quantity * l.unitPrice, 0), 0);
  const revenueTarget30 = Math.max(10_000, Math.round((prior * 1.1) / 10_000) * 10_000);

  return { today, catalog: sampleCatalog, customers, orders, revenueTarget30 };
}
