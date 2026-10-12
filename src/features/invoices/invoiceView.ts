import type { InvoiceStatus, Paise } from '../../types/invoice';
import type { InvoiceRow } from './invoiceLogic';
import { daysBetween } from '../../utils/dates';

/*
 * List and dashboard helpers that only rearrange rows from invoiceLogic.ts.
 * They never compute money themselves; amounts come from the rows.
 */

export interface AgingBucket {
  label: string;
  amount: Paise;
  count: number;
}

/** Outstanding balances by how far past due they are. Buckets add up to the outstanding total. */
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
    const bucket = buckets[late <= 0 ? 0 : late <= 30 ? 1 : late <= 60 ? 2 : 3]!;
    bucket.amount += r.balance;
    bucket.count += 1;
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

/** Overdue invoices, largest balance first, for the overview panel. */
export function overdueRows(rows: InvoiceRow[]): InvoiceRow[] {
  return rows.filter((r) => r.status === 'overdue').sort((a, b) => b.balance - a.balance);
}
