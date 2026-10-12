import type { Invoice, InvoiceCustomer, Payment } from '../types/invoice';
import { addDays, localToday } from '../utils/dates';

/**
 * Fictional sample records for the Invoice & Payment Tracker design preview.
 * Every business name, number and amount is invented. Dates are relative to the
 * visitor's today so due and overdue states look current.
 */
export const invoiceIssuer = {
  name: 'Harbor & Pine Supply Co.',
  city: 'Coimbatore',
};

export const invoiceCustomers: InvoiceCustomer[] = [
  { id: 'k1', name: 'Brightline Interiors', city: 'Coimbatore' },
  { id: 'k2', name: 'Nilgiri Tea Traders', city: 'Ooty' },
  { id: 'k3', name: 'Coastal Print Works', city: 'Puducherry' },
  { id: 'k4', name: 'Meridian Dental Clinic', city: 'Chennai' },
  { id: 'k5', name: 'Saffron Events Co.', city: 'Bengaluru' },
  { id: 'k6', name: 'Greenfield Academy', city: 'Salem' },
  { id: 'k7', name: 'Urban Nest Realty', city: 'Madurai' },
  { id: 'k8', name: 'Lotus Wellness Studio', city: 'Tiruchirappalli' },
];

export const paymentMethods = ['UPI', 'Bank transfer', 'Cash', 'Cheque', 'Card'] as const;

interface InvoiceSeed extends Omit<Invoice, 'issueDate' | 'dueDate'> {
  issuedDaysAgo: number;
  termsDays: number;
}

const seeds: InvoiceSeed[] = [
  { id: 'i41', number: 'INV-2026-041', customerId: 'k5', issuedDaysAgo: 2, termsDays: 15, taxRate: 0.18, lines: [{ description: 'Corporate gift hampers', quantity: 40, rate: 2400 }, { description: 'Custom engraving', quantity: 40, rate: 300 }] },
  { id: 'i40', number: 'INV-2026-040', customerId: 'k1', issuedDaysAgo: 5, termsDays: 15, taxRate: 0.18, lines: [{ description: 'Glass storage jars (case of 12)', quantity: 6, rate: 9800 }] },
  { id: 'i39', number: 'INV-2026-039', customerId: 'k4', issuedDaysAgo: 9, termsDays: 7, taxRate: 0.18, lines: [{ description: 'Premium pen sets', quantity: 25, rate: 540 }, { description: 'Desk organisers', quantity: 10, rate: 780 }] },
  { id: 'i38', number: 'INV-2026-038', customerId: 'k6', issuedDaysAgo: 14, termsDays: 30, taxRate: 0.18, lines: [{ description: 'Notebook bundles', quantity: 120, rate: 360 }, { description: 'Greeting card packs', quantity: 60, rate: 250 }] },
  { id: 'i37', number: 'INV-2026-037', customerId: 'k2', issuedDaysAgo: 21, termsDays: 15, taxRate: 0.18, lines: [{ description: 'Corporate gifting consultation', quantity: 1, rate: 3500 }, { description: 'Festive gift hampers', quantity: 18, rate: 2400 }] },
  { id: 'i36', number: 'INV-2026-036', customerId: 'k7', issuedDaysAgo: 34, termsDays: 15, taxRate: 0.18, lines: [{ description: 'Ceramic mug sets', quantity: 30, rate: 650 }, { description: 'Gift wrapping', quantity: 30, rate: 150 }] },
  { id: 'i35', number: 'INV-2026-035', customerId: 'k3', issuedDaysAgo: 40, termsDays: 30, taxRate: 0.18, lines: [{ description: 'Desk organisers', quantity: 20, rate: 780 }] },
  { id: 'i34', number: 'INV-2026-034', customerId: 'k8', issuedDaysAgo: 52, termsDays: 15, taxRate: 0.18, lines: [{ description: 'Scented candles', quantity: 48, rate: 480 }, { description: 'Gift wrapping', quantity: 48, rate: 150 }] },
  { id: 'i33', number: 'INV-2026-033', customerId: 'k5', issuedDaysAgo: 61, termsDays: 15, taxRate: 0.18, lines: [{ description: 'Festive gift hampers', quantity: 25, rate: 2400 }] },
  { id: 'i32', number: 'INV-2026-032', customerId: 'k1', issuedDaysAgo: 74, termsDays: 30, taxRate: 0.18, lines: [{ description: 'Cotton kitchen towels', quantity: 50, rate: 420 }, { description: 'Ceramic mug sets', quantity: 20, rate: 650 }] },
  { id: 'i31', number: 'INV-2026-031', customerId: 'k4', issuedDaysAgo: 88, termsDays: 15, taxRate: 0.18, lines: [{ description: 'Corporate gifting consultation', quantity: 2, rate: 3500 }] },
  { id: 'i42', number: 'INV-2026-042', customerId: 'k3', issuedDaysAgo: 0, termsDays: 30, taxRate: 0.18, draft: true, lines: [{ description: 'Greeting card packs', quantity: 100, rate: 250 }] },
];

interface PaymentSeed extends Omit<Payment, 'date'> {
  daysAgo: number;
}

const paymentSeeds: PaymentSeed[] = [
  { id: 'p1', invoiceId: 'i39', daysAgo: 3, amount: 25134, method: 'UPI', reference: 'UPI ref 4471' },
  { id: 'p2', invoiceId: 'i38', daysAgo: 6, amount: 30000, method: 'Bank transfer', reference: 'NEFT 88213' },
  { id: 'p3', invoiceId: 'i37', daysAgo: 12, amount: 25000, method: 'Bank transfer', reference: 'NEFT 87102' },
  { id: 'p4', invoiceId: 'i35', daysAgo: 18, amount: 18408, method: 'Cheque', reference: 'Cheque 000412' },
  { id: 'p5', invoiceId: 'i34', daysAgo: 30, amount: 20000, method: 'UPI', reference: 'UPI ref 3920' },
  { id: 'p6', invoiceId: 'i33', daysAgo: 44, amount: 70800, method: 'Bank transfer', reference: 'RTGS 55102' },
  { id: 'p7', invoiceId: 'i32', daysAgo: 50, amount: 40120, method: 'Bank transfer', reference: 'NEFT 80117' },
  { id: 'p8', invoiceId: 'i31', daysAgo: 70, amount: 8260, method: 'Card' },
  { id: 'p9', invoiceId: 'i36', daysAgo: 9, amount: 10000, method: 'Cash' },
];

export function createInvoiceSample(today: string = localToday()) {
  const invoices: Invoice[] = seeds.map(({ issuedDaysAgo, termsDays, ...rest }) => {
    const issueDate = addDays(today, -issuedDaysAgo);
    return { ...rest, issueDate, dueDate: addDays(issueDate, termsDays) };
  });
  const payments: Payment[] = paymentSeeds.map(({ daysAgo, ...rest }) => ({ ...rest, date: addDays(today, -daysAgo) }));
  return { today, customers: invoiceCustomers, invoices, payments };
}

export type InvoiceSample = ReturnType<typeof createInvoiceSample>;
