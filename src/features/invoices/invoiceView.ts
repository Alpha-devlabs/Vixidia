import type { Invoice, InvoiceLine, InvoiceStatus, Payment } from '../../types/invoice';
import type { InvoiceSample } from '../../data/invoiceSample';
import { daysBetween } from '../../utils/dates';

/*
 * Read-only helpers that turn the sample records into what the design preview shows.
 * They are intentionally simple; the next phase replaces them with the full,
 * tested invoice and payment logic (part payments, status transitions, validation).
 */

const round2 = (n: number) => Math.round(n * 100) / 100;

export function lineAmount(line: InvoiceLine): number {
  return round2(line.quantity * line.rate);
}

export interface InvoiceTotals {
  subtotal: number;
  tax: number;
  total: number;
}

export function totalsFor(lines: InvoiceLine[], taxRate: number): InvoiceTotals {
  const subtotal = round2(lines.reduce((a, l) => a + lineAmount(l), 0));
  const tax = round2(subtotal * taxRate);
  return { subtotal, tax, total: round2(subtotal + tax) };
}

export interface InvoiceRow {
  invoice: Invoice;
  customer: string;
  city: string;
  totals: InvoiceTotals;
  paid: number;
  balance: number;
  status: InvoiceStatus;
  daysOverdue: number;
  payments: Payment[];
}

export function statusFor(invoice: Invoice, paid: number, total: number, today: string): InvoiceStatus {
  if (invoice.draft) return 'draft';
  if (paid >= total) return 'paid';
  if (invoice.dueDate < today) return 'overdue';
  return paid > 0 ? 'partially_paid' : 'awaiting';
}

export function invoiceRows(data: InvoiceSample): InvoiceRow[] {
  const customers = new Map(data.customers.map((c) => [c.id, c]));
  return data.invoices
    .map((invoice) => {
      const totals = totalsFor(invoice.lines, invoice.taxRate);
      const payments = data.payments.filter((p) => p.invoiceId === invoice.id).sort((a, b) => (a.date < b.date ? 1 : -1));
      const paid = round2(payments.reduce((a, p) => a + p.amount, 0));
      const status = statusFor(invoice, paid, totals.total, data.today);
      return {
        invoice,
        customer: customers.get(invoice.customerId)?.name ?? 'Unknown customer',
        city: customers.get(invoice.customerId)?.city ?? '',
        totals,
        paid,
        balance: round2(Math.max(0, totals.total - paid)),
        status,
        daysOverdue: status === 'overdue' ? daysBetween(invoice.dueDate, data.today) : 0,
        payments,
      };
    })
    .sort((a, b) => (a.invoice.issueDate < b.invoice.issueDate ? 1 : a.invoice.issueDate > b.invoice.issueDate ? -1 : b.invoice.number.localeCompare(a.invoice.number)));
}

export interface InvoiceOverview {
  invoiced: number;
  invoicedCount: number;
  collected: number;
  paymentCount: number;
  outstanding: number;
  outstandingCount: number;
  overdue: number;
  overdueCount: number;
}

/** Headline figures for the four metric cards. Drafts are excluded until sent. */
export function overview(rows: InvoiceRow[], payments: Payment[]): InvoiceOverview {
  const sent = rows.filter((r) => r.status !== 'draft');
  const open = sent.filter((r) => r.balance > 0);
  const late = open.filter((r) => r.status === 'overdue');
  return {
    invoiced: round2(sent.reduce((a, r) => a + r.totals.total, 0)),
    invoicedCount: sent.length,
    collected: round2(payments.reduce((a, p) => a + p.amount, 0)),
    paymentCount: payments.length,
    outstanding: round2(open.reduce((a, r) => a + r.balance, 0)),
    outstandingCount: open.length,
    overdue: round2(late.reduce((a, r) => a + r.balance, 0)),
    overdueCount: late.length,
  };
}

export interface AgingBucket {
  label: string;
  amount: number;
  count: number;
}

/** Outstanding balances by how far past due they are. */
export function aging(rows: InvoiceRow[], today: string): AgingBucket[] {
  const buckets: AgingBucket[] = [
    { label: 'Not yet due', amount: 0, count: 0 },
    { label: '1–30 days late', amount: 0, count: 0 },
    { label: '31–60 days late', amount: 0, count: 0 },
    { label: 'Over 60 days late', amount: 0, count: 0 },
  ];
  for (const r of rows) {
    if (r.status === 'draft' || r.balance <= 0) continue;
    const late = daysBetween(r.invoice.dueDate, today);
    const i = late <= 0 ? 0 : late <= 30 ? 1 : late <= 60 ? 2 : 3;
    buckets[i]!.amount = round2(buckets[i]!.amount + r.balance);
    buckets[i]!.count += 1;
  }
  return buckets;
}

export type StatusFilter = 'all' | InvoiceStatus;

export const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'awaiting', label: 'Awaiting payment' },
  { value: 'partially_paid', label: 'Partially paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'paid', label: 'Paid' },
  { value: 'draft', label: 'Draft' },
];

export function filterRows(rows: InvoiceRow[], query: string, status: StatusFilter): InvoiceRow[] {
  const q = query.trim().toLowerCase();
  return rows.filter(
    (r) =>
      (status === 'all' || r.status === status) &&
      (!q || r.invoice.number.toLowerCase().includes(q) || r.customer.toLowerCase().includes(q)),
  );
}
