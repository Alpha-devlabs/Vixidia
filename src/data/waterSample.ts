import type { Delivery, PaymentMethod, Pricing, RecurringOrder, WaterBook, WaterCustomer, WaterPayment, Weekday } from '../types/water';
import { addDays, localToday, weekday } from '../utils/dates';

/*
 * Fictional water-can delivery round for the Water Delivery Management demo.
 * Every name, phone number (+91 90000 0xxxx) and address is invented.
 *
 * The ledger starts 14 days before the demo's today with opening balances and
 * cans "carried forward"; after that every rupee and can comes from a recorded
 * delivery or payment. The seed is built so that, before anyone touches the
 * demo, it reconciles to:
 *   35 customers (32 active, 3 paused), 24 with a regular order;
 *   18 deliveries today: 6 completed, 12 pending;
 *   ₹6,950 outstanding across 11 customers;
 *   ₹100 per 20-litre can, ₹150 per carton of twelve 1-litre bottles.
 * Recurring days are placed relative to today so the round always looks current.
 */

export const waterBusiness = { name: 'Kovai Water Rounds', city: 'Coimbatore' };

export const PRICING: Pricing = { canPaise: 10_000, cartonPaise: 15_000 };

export const LEDGER_DAYS = 14;

type Pattern = 'daily' | 'alt' | 'weekly' | 'offAlt' | 'week+1' | 'week+2' | 'week+3';

interface Seed {
  id: string;
  name: string;
  locality: string;
  address?: string;
  paused?: true;
  pattern?: Pattern;
  cans?: number;
  cartons?: number;
  /** Rupees carried forward when the ledger started. */
  opening?: number;
  /** Extra cans held beyond one regular order. */
  extraCans?: number;
}

const seeds: Seed[] = [
  { id: 'c01', name: 'Lakshmi Iyer', locality: 'RS Puram', address: '14, West Periasamy Road', pattern: 'alt', cans: 2 },
  { id: 'c02', name: 'Ramesh Kumar', locality: 'Gandhipuram', address: '22, 5th Street', pattern: 'daily', cans: 2 },
  { id: 'c03', name: 'Sri Balaji Stores', locality: 'Town Hall', address: 'Shop 3, Big Bazaar Street', pattern: 'alt', cans: 2, cartons: 1, opening: 1500 },
  { id: 'c04', name: 'Priya Shankar', locality: 'Saibaba Colony', pattern: 'alt', cans: 4, extraCans: 1 },
  { id: 'c05', name: 'Mohammed Irfan', locality: 'Ukkadam', pattern: 'alt', cans: 2 },
  { id: 'c06', name: 'Vel Printers', locality: 'Peelamedu', address: '2nd floor, Avinashi Road', pattern: 'daily', cans: 5 },
  { id: 'c07', name: 'Anitha Raj', locality: 'Peelamedu', pattern: 'alt', cans: 2, opening: 800 },
  { id: 'c08', name: 'Senthil Murugan', locality: 'Singanallur', pattern: 'alt', cans: 3, opening: 1200 },
  { id: 'c09', name: 'Geetha Krishnan', locality: 'Saravanampatti', pattern: 'weekly', cans: 2, opening: 400 },
  { id: 'c10', name: 'Arun Prakash', locality: 'Vadavalli', pattern: 'alt', cans: 2, opening: 600 },
  { id: 'c11', name: 'Fathima Begum', locality: 'Kuniyamuthur', pattern: 'alt', cans: 1, opening: 300 },
  { id: 'c12', name: 'Sree Ganesh Tiffin Centre', locality: 'Ganapathy', address: 'Near bus stop, Sathy Road', pattern: 'daily', cans: 4, opening: 1500 },
  { id: 'c13', name: 'Karthikeyan S', locality: 'Thudiyalur', pattern: 'weekly', cans: 3, opening: 250 },
  { id: 'c14', name: 'Divya Natarajan', locality: 'Race Course', pattern: 'alt', cans: 2 },
  { id: 'c15', name: 'Joseph Antony', locality: 'Podanur', pattern: 'alt', cans: 2, opening: 600 },
  { id: 'c16', name: 'Meena Sundaram', locality: 'Kavundampalayam', pattern: 'weekly', cans: 1, opening: 300 },
  { id: 'c17', name: 'Rajesh Pillai', locality: 'Hopes College', pattern: 'alt', cans: 2, cartons: 1 },
  { id: 'c18', name: 'Sangeetha Mani', locality: 'Ramanathapuram', pattern: 'alt', cans: 3, extraCans: 1 },
  { id: 'c19', name: 'Vignesh Babu', locality: 'Sowripalayam', pattern: 'offAlt', cans: 2 },
  { id: 'c20', name: 'Bhavani Textiles office', locality: 'Avinashi Road', pattern: 'week+1', cans: 6, cartons: 1 },
  { id: 'c21', name: 'Nirmala Devi', locality: 'Kalapatti', pattern: 'offAlt', cans: 1 },
  { id: 'c22', name: 'Suresh Chandran', locality: 'Ondipudur', pattern: 'week+2', cans: 2 },
  { id: 'c23', name: 'Kavitha Ramesh', locality: 'Selvapuram', pattern: 'offAlt', cans: 2 },
  { id: 'c24', name: 'Abdul Rahman', locality: 'Kottaimedu', pattern: 'week+3', cans: 3 },
  { id: 'c25', name: 'Deepa Venkatesh', locality: 'Ganapathy', extraCans: 1 },
  { id: 'c26', name: 'Harish Kannan', locality: 'Sulur', extraCans: 2 },
  { id: 'c27', name: 'Revathi Subramanian', locality: 'Kovaipudur', extraCans: 1 },
  { id: 'c28', name: 'Prakash Gowda', locality: 'Saravanampatti', extraCans: 2 },
  { id: 'c29', name: 'Shanthi Elango', locality: 'Ramnagar', extraCans: 1 },
  { id: 'c30', name: 'Mani Medicals', locality: 'Gandhipuram', extraCans: 2 },
  { id: 'c31', name: 'Yamuna Rajan', locality: 'Peelamedu', extraCans: 1 },
  { id: 'c32', name: 'Gokul Nair', locality: 'Vadavalli', extraCans: 1 },
  { id: 'c33', name: 'Saravanan T', locality: 'Sulur', paused: true, extraCans: 2 },
  { id: 'c34', name: 'Latha Murali', locality: 'Podanur', paused: true, extraCans: 1 },
  { id: 'c35', name: 'Ravi Juice Corner', locality: 'Town Hall', paused: true, extraCans: 2 },
];

/** Today's round in route order: customer, planned cans/cartons, and (for the six already done) what happened. */
const round: { c: string; cans: number; cartons?: number; done?: { cans: number; cartons?: number; empties: number; paid?: number; method?: PaymentMethod } }[] = [
  // The worked example: 3 full cans in, 2 empties back, ₹150 by UPI → ₹300 charged, ₹150 left on this delivery.
  { c: 'c01', cans: 3, done: { cans: 3, empties: 2, paid: 150, method: 'upi' } },
  { c: 'c02', cans: 2, done: { cans: 2, empties: 2, paid: 200, method: 'cash' } },
  { c: 'c03', cans: 2, cartons: 1, done: { cans: 2, cartons: 1, empties: 2 } },
  { c: 'c04', cans: 4, done: { cans: 4, empties: 3, paid: 400, method: 'upi' } },
  { c: 'c05', cans: 2, done: { cans: 2, empties: 1 } },
  { c: 'c06', cans: 5, done: { cans: 5, empties: 5, paid: 500, method: 'bank' } },
  { c: 'c07', cans: 2 },
  { c: 'c08', cans: 3 },
  { c: 'c09', cans: 2 },
  { c: 'c10', cans: 2 },
  { c: 'c11', cans: 1 },
  { c: 'c12', cans: 4 },
  { c: 'c13', cans: 3 },
  { c: 'c14', cans: 2 },
  { c: 'c15', cans: 2 },
  { c: 'c16', cans: 1 },
  { c: 'c17', cans: 2, cartons: 1 },
  { c: 'c18', cans: 3 },
];

/** One-off orders from customers without a regular order: [customer, days ago, cans]. */
const occasional: [string, number, number][] = [
  ['c25', 9, 2],
  ['c26', 4, 2],
  ['c27', 11, 1],
  ['c28', 6, 2],
  ['c28', 2, 1],
  ['c29', 8, 1],
  ['c30', 5, 2],
  ['c31', 3, 1],
  ['c32', 10, 1],
];

/** Payments against carried-forward balances: [customer, days ago, rupees, method]. */
const balancePayments: [string, number, number, PaymentMethod][] = [
  ['c12', 5, 500, 'bank'],
  ['c15', 3, 600, 'upi'],
  ['c16', 6, 300, 'cash'],
];

/** Past deliveries left unpaid (customer, how many most-recent deliveries). Everything else was paid at the door. */
const unpaidRecent: Record<string, number> = { c14: 1 };

function daysFor(pattern: Pattern, todayWd: number): Weekday[] {
  const w = (n: number) => (((todayWd + n) % 7) + 7) % 7 as Weekday;
  switch (pattern) {
    case 'daily':
      return [0, 1, 2, 3, 4, 5, 6];
    case 'alt':
      return [w(0), w(2), w(4)];
    case 'weekly':
      return [w(0)];
    case 'offAlt':
      return [w(1), w(3), w(5)];
    case 'week+1':
      return [w(1)];
    case 'week+2':
      return [w(2)];
    case 'week+3':
      return [w(3)];
  }
}

export function createWaterSample(today: string = localToday()): WaterBook {
  const opened = addDays(today, -LEDGER_DAYS);
  const wd = weekday(today);
  const customers: WaterCustomer[] = seeds.map((s) => {
    const recurring: RecurringOrder | undefined = s.pattern ? { cans: s.cans ?? 0, cartons: s.cartons ?? 0, days: daysFor(s.pattern, wd).sort((a, b) => a - b) } : undefined;
    return {
      id: s.id,
      name: s.name,
      phone: `+91 90000 0${String(1000 + Number(s.id.slice(1))).padStart(4, '0')}`,
      locality: s.locality,
      ...(s.address ? { address: s.address } : {}),
      status: s.paused ? 'paused' : 'active',
      ...(recurring ? { recurring } : {}),
      openingBalancePaise: (s.opening ?? 0) * 100,
      openingCans: (s.cans ?? 0) + (s.extraCans ?? 0),
      openedOn: opened,
    };
  });

  const deliveries: Delivery[] = [];
  const payments: WaterPayment[] = [];
  let h = 0;
  let p = 0;
  const methods: PaymentMethod[] = ['upi', 'cash'];

  // Past regular deliveries: full swap (same number of empties back), so cans held stay level.
  const past: { c: WaterCustomer; date: string; cans: number; cartons: number }[] = [];
  for (let k = LEDGER_DAYS - 1; k >= 1; k--) {
    const date = addDays(today, -k);
    for (const c of customers) {
      if (c.recurring && c.status === 'active' && c.recurring.days.includes(weekday(date) as Weekday)) past.push({ c, date, cans: c.recurring.cans, cartons: c.recurring.cartons });
    }
  }
  for (const [id, ago, cans] of occasional) past.push({ c: customers.find((x) => x.id === id)!, date: addDays(today, -ago), cans, cartons: 0 });
  past.sort((a, b) => a.date.localeCompare(b.date) || a.c.id.localeCompare(b.c.id));

  const unpaidIds = new Set<string>();
  for (const [cid, n] of Object.entries(unpaidRecent)) {
    past.filter((x) => x.c.id === cid).slice(-n).forEach((x) => unpaidIds.add(`${x.c.id}|${x.date}`));
  }

  for (const x of past) {
    const id = `h${++h}`;
    const empties = Math.min(x.cans, x.c.openingCans);
    deliveries.push({ id, customerId: x.c.id, date: x.date, cans: x.cans, cartons: x.cartons, status: 'completed', completion: { cans: x.cans, cartons: x.cartons, emptiesCollected: empties, completedOn: x.date } });
    if (!unpaidIds.has(`${x.c.id}|${x.date}`)) {
      payments.push({ id: `p${++p}`, customerId: x.c.id, date: x.date, amountPaise: x.cans * PRICING.canPaise + x.cartons * PRICING.cartonPaise, method: methods[h % 2]!, deliveryId: id });
    }
  }
  for (const [cid, ago, rupees, method] of balancePayments) payments.push({ id: `p${++p}`, customerId: cid, date: addDays(today, -ago), amountPaise: rupees * 100, method });

  round.forEach((r, i) => {
    const id = `d${i + 1}`;
    if (r.done) {
      deliveries.push({
        id,
        customerId: r.c,
        date: today,
        cans: r.cans,
        cartons: r.cartons ?? 0,
        status: 'completed',
        completion: { cans: r.done.cans, cartons: r.done.cartons ?? 0, emptiesCollected: r.done.empties, completedOn: today },
      });
      if (r.done.paid) payments.push({ id: `p${++p}`, customerId: r.c, date: today, amountPaise: r.done.paid * 100, method: r.done.method!, deliveryId: id });
    } else {
      deliveries.push({ id, customerId: r.c, date: today, cans: r.cans, cartons: r.cartons ?? 0, status: 'scheduled' });
    }
  });

  return { today, pricing: PRICING, customers, deliveries, payments };
}
