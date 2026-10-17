import type { Appointment, CancelReason, Customer, OpeningHours, PaymentMethod, SalonBook, SalonPayment, Service, Stylist } from '../types/salon';
import { addDays } from '../utils/dates';
import { snapshot } from '../features/salon/salonLogic';

/*
 * Fictional salon for the Salon Management demo. Every name, phone number
 * (+91 90000 3xxxx, plus one UK drama-range number) and email (@example.com)
 * is invented.
 *
 * Fixed sample day: Saturday 17 October 2026. Before anyone touches the demo,
 * today has 13 appointments (5 completed, 8 still to come) and 1 cancellation;
 * ₹4,700 has been paid today and one ₹2,500 colouring is completed but unpaid.
 */

export const SALON_TODAY = '2026-10-17';

export const salonBusiness = { name: 'Mehendi Lane Salon', city: 'Pune' };

export const HOURS: OpeningHours = { open: '10:00', close: '20:00', closedWeekday: 2 };

export const SERVICES: Service[] = [
  { id: 's1', name: 'Haircut', category: 'hair', durationMin: 30, pricePaise: 40_000 },
  { id: 's2', name: 'Hair wash & styling', category: 'hair', durationMin: 45, pricePaise: 60_000 },
  { id: 's3', name: 'Hair colouring', category: 'hair', durationMin: 90, pricePaise: 250_000 },
  { id: 's4', name: 'Hair spa', category: 'hair', durationMin: 60, pricePaise: 120_000 },
  { id: 's5', name: 'Beard trim', category: 'hair', durationMin: 15, pricePaise: 20_000 },
  { id: 's6', name: 'Facial', category: 'skin', durationMin: 60, pricePaise: 150_000 },
  { id: 's7', name: 'Eyebrow threading', category: 'skin', durationMin: 15, pricePaise: 8_000 },
  { id: 's8', name: 'Waxing (arms)', category: 'skin', durationMin: 30, pricePaise: 50_000 },
  { id: 's9', name: 'Manicure', category: 'nails', durationMin: 45, pricePaise: 70_000 },
  { id: 's10', name: 'Pedicure', category: 'nails', durationMin: 60, pricePaise: 90_000 },
];

export const STYLISTS: Stylist[] = [
  { id: 'st1', name: 'Meena Iyer', role: 'Senior stylist', categories: ['hair'] },
  { id: 'st2', name: 'Ravi Kumar', role: 'Stylist', categories: ['hair'] },
  { id: 'st3', name: 'Shalini Das', role: 'Beautician', categories: ['skin', 'nails'] },
];

const people: [string, string, string, string][] = [
  ['Lakshmi Menon', '+91 90000 30001', 'lakshmi.menon@example.com', 'Prefers Meena. Sensitive scalp: mild shampoo.'],
  ['Priya Sharma', '+91 90000 30002', 'priya.sharma@example.com', ''],
  ['Aarav Patel', '+91 90000 30003', '', ''],
  ['Neha Kapoor', '+91 90000 30004', 'neha.kapoor@example.com', 'Patch test done for colour (Oct).'],
  ['Arjun Reddy', '+91 90000 30005', '', 'Usually books a beard trim with a haircut.'],
  ['Vivek Rao', '+91 90000 30006', '', ''],
  ['Sanjana Gupta', '+91 90000 30007', 'sanjana.gupta@example.com', ''],
  ['Rohit Malhotra', '+91 90000 30008', '', ''],
  ['Kiran Das', '+91 90000 30009', '', ''],
  ['Meghna Joshi', '+91 90000 30010', 'meghna.joshi@example.com', ''],
  ['Fatima Siddiqui', '+91 90000 30011', '', 'Allergic to strong fragrances.'],
  ['Ritu Bansal', '+91 90000 30012', '', ''],
  ['Anjali Nair', '+91 90000 30013', 'anjali.nair@example.com', ''],
  ['Sara Thomas', '+91 90000 30014', '', ''],
  ['Dev Khanna', '+91 90000 30015', '', ''],
  ['Emily Carter', '+44 20 7946 0958', 'emily.carter@example.com', 'Visiting from the UK until December.'],
];

/** [customer no., stylist no., days from today, start, services, outcome]. Outcome: a payment method (completed and paid), 'unpaid', a cancel reason, or omitted (booked). */
type Seed = [number, number, number, string, number[], (PaymentMethod | 'unpaid' | `x:${CancelReason}`)?];

const seeds: Seed[] = [
  // Earlier days.
  [1, 1, -12, '10:00', [1, 2], 'upi'],
  [5, 2, -12, '14:00', [1], 'cash'],
  [1, 1, -9, '12:00', [1], 'upi'],
  [2, 3, -9, '11:00', [7], 'cash'],
  [3, 2, -7, '10:00', [1], 'cash'],
  [16, 1, -7, '11:00', [4], 'card'],
  [11, 3, -7, '16:00', [6], 'upi'],
  [6, 1, -6, '13:00', [1], 'upi'],
  [1, 3, -6, '15:00', [9, 10], 'card'],
  [2, 1, -5, '10:00', [1, 2], 'upi'],
  [15, 2, -5, '12:00', [5], 'x:customer'],
  [10, 3, -5, '14:00', [6], 'upi'],
  [1, 1, -3, '11:00', [1], 'cash'],
  [13, 3, -3, '12:00', [9], 'upi'],
  [8, 2, -3, '16:00', [1], 'cash'],
  [9, 2, -2, '10:00', [1], 'upi'],
  [11, 3, -2, '11:00', [8], 'cash'],
  [4, 1, -2, '14:00', [3], 'unpaid'],
  [3, 1, -1, '10:00', [1], 'upi'],
  [5, 2, -1, '11:00', [1, 5], 'cash'],
  [14, 1, -1, '12:00', [2], 'card'],
  [1, 3, -1, '15:00', [6], 'upi'],
  [12, 3, -1, '17:00', [7], 'x:no_show'],
  // Today.
  [1, 1, 0, '10:00', [1, 2], 'upi'],
  [2, 1, 0, '11:30', [3], 'unpaid'],
  [3, 1, 0, '13:30', [1]],
  [4, 1, 0, '15:00', [4]],
  [5, 1, 0, '17:00', [1, 5]],
  [6, 2, 0, '10:30', [5, 1], 'cash'],
  [7, 2, 0, '12:00', [1], 'x:customer'],
  [8, 2, 0, '14:00', [2]],
  [9, 2, 0, '16:00', [1]],
  [10, 3, 0, '10:00', [6], 'card'],
  [11, 3, 0, '11:15', [9, 10], 'upi'],
  [2, 3, 0, '14:00', [7]],
  [12, 3, 0, '15:00', [8]],
  [13, 3, 0, '16:30', [6]],
  // Coming up (Tuesday 20 October is closed).
  [14, 1, 1, '11:00', [3]],
  [1, 3, 1, '12:00', [9]],
  [15, 2, 1, '15:00', [1]],
  [10, 1, 2, '10:30', [1, 2]],
  [4, 3, 2, '16:00', [6]],
  [6, 2, 4, '11:00', [1]],
  [16, 3, 4, '13:00', [10]],
  [2, 1, 8, '12:00', [4]],
];

export function createSalonSample(): SalonBook {
  const customers: Customer[] = people.map(([name, phone, email, notes], i) => ({ id: `c${i + 1}`, name, phone, email, notes, createdOn: i === 15 ? '2026-10-08' : '2026-09-01' }));
  const appointments: Appointment[] = [];
  const payments: SalonPayment[] = [];
  seeds.forEach(([c, st, offset, start, ids, outcome], i) => {
    const id = `a${i + 1}`;
    const date = addDays(SALON_TODAY, offset);
    const services = snapshot(ids.map((n) => SERVICES[n - 1]!));
    const cancelled = typeof outcome === 'string' && outcome.startsWith('x:');
    const status = cancelled ? 'cancelled' : outcome ? 'completed' : 'booked';
    appointments.push({ id, customerId: `c${c}`, stylistId: `st${st}`, date, start, services, status, ...(cancelled ? { cancelReason: outcome.slice(2) as CancelReason } : {}) });
    if (outcome && !cancelled && outcome !== 'unpaid') {
      payments.push({ id: `p${payments.length + 1}`, appointmentId: id, date, amountPaise: services.reduce((s, x) => s + x.pricePaise, 0), method: outcome as PaymentMethod });
    }
  });
  return { today: SALON_TODAY, hours: { ...HOURS }, services: SERVICES.map((s) => ({ ...s })), stylists: STYLISTS.map((s) => ({ ...s, categories: [...s.categories] })), customers, appointments, payments };
}
