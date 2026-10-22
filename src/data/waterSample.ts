import type { WaterCustomer, WaterOrder, WaterState, SampleBusiness } from '../types/water';

/**
 * Fictional sample business for the Water Delivery Management demo. Every name and figure here is
 * invented. Totals shown in the demo are calculated from these records.
 */
export const sampleBusiness: SampleBusiness = {
  name: 'Thendral Water Delivery',
  owner: 'Meena',
  town: 'Sample town',
  today: '2026-03-18',
  orderPrefix: 'TW',
  unitLabel: '20 L can',
  defaultUnitPrice: 40,
  depositPerCan: 150,
  routeOrder: ['Market Road', 'Bus Stand', 'Hospital Road', 'Teachers Colony', 'Gandhi Nagar', 'Bypass Road'],
  deliveryPerson: 'Senthil',
};

const customers: WaterCustomer[] = [
  { id: 'c01', name: 'Lakshmi Stores', area: 'Market Road', kind: 'shop', note: 'Back entrance after 10 am.', openingCans: 4, depositCans: 4, schedule: { pattern: 'daily', quantity: 4 } },
  { id: 'c02', name: 'Arun Kumar', area: 'Gandhi Nagar', kind: 'home', openingCans: 2, depositCans: 2, schedule: { pattern: 'alternate', quantity: 2, start: '2026-03-02' } },
  { id: 'c03', name: 'Sri Vinayaka Tailors', area: 'Bus Stand', kind: 'shop', openingCans: 1, depositCans: 2 },
  { id: 'c04', name: 'Priya & Family', area: 'Teachers Colony', kind: 'home', note: 'Leave with the watchman if closed.', openingCans: 2, depositCans: 2 },
  { id: 'c05', name: 'Green Leaf Clinic', area: 'Hospital Road', kind: 'office', openingCans: 6, depositCans: 6, schedule: { pattern: 'alternate', quantity: 6, start: '2026-03-02' } },
  { id: 'c06', name: 'Rahim Bhai Bakery', area: 'Market Road', kind: 'shop', openingCans: 5, depositCans: 3 },
  { id: 'c07', name: 'Selvi Ramesh', area: 'Gandhi Nagar', kind: 'home', openingCans: 1, depositCans: 1 },
  { id: 'c08', name: 'Kaviya Tuition Centre', area: 'Teachers Colony', kind: 'office', openingCans: 3, depositCans: 3, schedule: { pattern: 'weekdays', quantity: 3, days: [1, 3, 5] } },
  { id: 'c09', name: 'Murugan Auto Works', area: 'Bypass Road', kind: 'shop', openingCans: 4, depositCans: 2 },
  { id: 'c10', name: 'Devi Nursing Home', area: 'Hospital Road', kind: 'office', note: 'Delivers to the 1st floor store room.', openingCans: 8, depositCans: 8, schedule: { pattern: 'daily', quantity: 8 } },
  // Regular customers whose delivery for today has not been added to the round yet.
  { id: 'c11', name: 'Annapoorna Mess', area: 'Market Road', kind: 'shop', openingCans: 5, depositCans: 5, schedule: { pattern: 'daily', quantity: 5 } },
  { id: 'c12', name: 'St. Mary’s Girls Hostel', area: 'Bus Stand', kind: 'office', openingCans: 6, depositCans: 6, schedule: { pattern: 'weekdays', quantity: 6, days: [1, 3, 5] } },
];

const P = sampleBusiness.defaultUnitPrice;
const T = sampleBusiness.today;

const orders: WaterOrder[] = [
  // Earlier days — some still unpaid, so they count towards dues.
  { id: 'o1031', number: 'TW-1031', customerId: 'c05', date: '2026-03-16', quantity: 6, unitPrice: P, delivery: 'delivered', payment: 'unpaid' },
  { id: 'o1033', number: 'TW-1033', customerId: 'c09', date: '2026-03-16', quantity: 3, unitPrice: P, delivery: 'delivered', payment: 'unpaid' },
  { id: 'o1036', number: 'TW-1036', customerId: 'c01', date: '2026-03-17', quantity: 4, unitPrice: P, delivery: 'delivered', payment: 'paid' },
  { id: 'o1037', number: 'TW-1037', customerId: 'c10', date: '2026-03-17', quantity: 8, unitPrice: P, delivery: 'delivered', payment: 'unpaid', emptiesCollected: 6 },
  { id: 'o1039', number: 'TW-1039', customerId: 'c03', date: '2026-03-17', quantity: 2, unitPrice: P, delivery: 'delivered', payment: 'paid' },
  // Today.
  { id: 'o1040', number: 'TW-1040', customerId: 'c01', date: T, quantity: 4, unitPrice: P, delivery: 'delivered', payment: 'paid', emptiesCollected: 4, collectedOnRound: true, fromSchedule: true },
  { id: 'o1041', number: 'TW-1041', customerId: 'c02', date: T, quantity: 2, unitPrice: P, delivery: 'delivered', payment: 'paid', emptiesCollected: 2, collectedOnRound: true, fromSchedule: true },
  { id: 'o1042', number: 'TW-1042', customerId: 'c05', date: T, quantity: 6, unitPrice: P, delivery: 'delivered', payment: 'unpaid', emptiesCollected: 6, fromSchedule: true },
  { id: 'o1043', number: 'TW-1043', customerId: 'c03', date: T, quantity: 1, unitPrice: P, delivery: 'delivered', payment: 'paid', emptiesCollected: 1, collectedOnRound: true },
  { id: 'o1044', number: 'TW-1044', customerId: 'c06', date: T, quantity: 3, unitPrice: P, delivery: 'pending', payment: 'unpaid', note: 'Call before arriving.' },
  { id: 'o1045', number: 'TW-1045', customerId: 'c04', date: T, quantity: 2, unitPrice: P, delivery: 'pending', payment: 'unpaid' },
  { id: 'o1046', number: 'TW-1046', customerId: 'c10', date: T, quantity: 8, unitPrice: P, delivery: 'pending', payment: 'unpaid', fromSchedule: true },
  { id: 'o1047', number: 'TW-1047', customerId: 'c07', date: T, quantity: 1, unitPrice: P, delivery: 'pending', payment: 'paid', note: 'Paid in advance by UPI.' },
  { id: 'o1048', number: 'TW-1048', customerId: 'c08', date: T, quantity: 3, unitPrice: P, delivery: 'pending', payment: 'unpaid', fromSchedule: true },
  { id: 'o1049', number: 'TW-1049', customerId: 'c09', date: T, quantity: 2, unitPrice: P, delivery: 'delivered', payment: 'unpaid', emptiesCollected: 0 },
];

/** Returns a fresh copy of the sample dataset; used for initial state and reset. */
export function createSampleState(): WaterState {
  return {
    customers: customers.map((c) => ({ ...c })),
    orders: orders.map((o) => ({ ...o })),
    nextOrderSeq: 1050,
    nextCustomerSeq: 13,
  };
}
