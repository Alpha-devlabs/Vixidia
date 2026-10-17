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
};

const customers: WaterCustomer[] = [
  { id: 'c01', name: 'Lakshmi Stores', area: 'Market Road', kind: 'shop', note: 'Back entrance after 10 am.' },
  { id: 'c02', name: 'Arun Kumar', area: 'Gandhi Nagar', kind: 'home' },
  { id: 'c03', name: 'Sri Vinayaka Tailors', area: 'Bus Stand', kind: 'shop' },
  { id: 'c04', name: 'Priya & Family', area: 'Teachers Colony', kind: 'home', note: 'Leave with the watchman if closed.' },
  { id: 'c05', name: 'Green Leaf Clinic', area: 'Hospital Road', kind: 'office' },
  { id: 'c06', name: 'Rahim Bhai Bakery', area: 'Market Road', kind: 'shop' },
  { id: 'c07', name: 'Selvi Ramesh', area: 'Gandhi Nagar', kind: 'home' },
  { id: 'c08', name: 'Kaviya Tuition Centre', area: 'Teachers Colony', kind: 'office' },
  { id: 'c09', name: 'Murugan Auto Works', area: 'Bypass Road', kind: 'shop' },
  { id: 'c10', name: 'Devi Nursing Home', area: 'Hospital Road', kind: 'office', note: 'Delivers to the 1st floor store room.' },
];

const P = sampleBusiness.defaultUnitPrice;
const T = sampleBusiness.today;

const orders: WaterOrder[] = [
  // Earlier days — some still unpaid, so they count towards dues.
  { id: 'o1031', number: 'TW-1031', customerId: 'c05', date: '2026-03-16', quantity: 6, unitPrice: P, delivery: 'delivered', payment: 'unpaid' },
  { id: 'o1033', number: 'TW-1033', customerId: 'c09', date: '2026-03-16', quantity: 3, unitPrice: P, delivery: 'delivered', payment: 'unpaid' },
  { id: 'o1036', number: 'TW-1036', customerId: 'c01', date: '2026-03-17', quantity: 4, unitPrice: P, delivery: 'delivered', payment: 'paid' },
  { id: 'o1037', number: 'TW-1037', customerId: 'c10', date: '2026-03-17', quantity: 8, unitPrice: P, delivery: 'delivered', payment: 'unpaid' },
  { id: 'o1039', number: 'TW-1039', customerId: 'c03', date: '2026-03-17', quantity: 2, unitPrice: P, delivery: 'delivered', payment: 'paid' },
  // Today.
  { id: 'o1040', number: 'TW-1040', customerId: 'c01', date: T, quantity: 4, unitPrice: P, delivery: 'delivered', payment: 'paid' },
  { id: 'o1041', number: 'TW-1041', customerId: 'c02', date: T, quantity: 2, unitPrice: P, delivery: 'delivered', payment: 'paid' },
  { id: 'o1042', number: 'TW-1042', customerId: 'c05', date: T, quantity: 6, unitPrice: P, delivery: 'delivered', payment: 'unpaid' },
  { id: 'o1043', number: 'TW-1043', customerId: 'c03', date: T, quantity: 1, unitPrice: P, delivery: 'delivered', payment: 'paid' },
  { id: 'o1044', number: 'TW-1044', customerId: 'c06', date: T, quantity: 3, unitPrice: P, delivery: 'pending', payment: 'unpaid', note: 'Call before arriving.' },
  { id: 'o1045', number: 'TW-1045', customerId: 'c04', date: T, quantity: 2, unitPrice: P, delivery: 'pending', payment: 'unpaid' },
  { id: 'o1046', number: 'TW-1046', customerId: 'c10', date: T, quantity: 8, unitPrice: P, delivery: 'pending', payment: 'unpaid' },
  { id: 'o1047', number: 'TW-1047', customerId: 'c07', date: T, quantity: 1, unitPrice: P, delivery: 'pending', payment: 'paid', note: 'Paid in advance by UPI.' },
  { id: 'o1048', number: 'TW-1048', customerId: 'c08', date: T, quantity: 3, unitPrice: P, delivery: 'pending', payment: 'unpaid' },
  { id: 'o1049', number: 'TW-1049', customerId: 'c09', date: T, quantity: 2, unitPrice: P, delivery: 'delivered', payment: 'unpaid' },
];

/** Returns a fresh copy of the sample dataset; used for initial state and reset. */
export function createSampleState(): WaterState {
  return {
    customers: customers.map((c) => ({ ...c })),
    orders: orders.map((o) => ({ ...o })),
    nextOrderSeq: 1050,
    nextCustomerSeq: 11,
  };
}
