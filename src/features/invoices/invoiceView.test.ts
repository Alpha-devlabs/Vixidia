import { describe, expect, it } from 'vitest';
import { createInvoiceSample } from '../../data/invoiceSample';
import { aging, filterRows, invoiceRows, lineAmount, overview, statusFor, totalsFor } from './invoiceView';
import type { Invoice } from '../../types/invoice';

const TODAY = '2026-10-12';
const data = createInvoiceSample(TODAY);
const rows = invoiceRows(data);
const sum = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) * 100) / 100;

describe('sample records', () => {
  it('reference known customers and invoices', () => {
    const customers = new Set(data.customers.map((c) => c.id));
    const invoices = new Set(data.invoices.map((i) => i.id));
    for (const i of data.invoices) expect(customers.has(i.customerId)).toBe(true);
    for (const p of data.payments) expect(invoices.has(p.invoiceId)).toBe(true);
  });

  it('never record more than an invoice total, or a payment before its invoice', () => {
    for (const r of rows) {
      expect(r.paid).toBeLessThan(r.totals.total + 0.001);
      for (const p of r.payments) expect(p.date >= r.invoice.issueDate && p.date <= TODAY).toBe(true);
    }
  });

  it('have unique invoice numbers', () => {
    expect(new Set(data.invoices.map((i) => i.number)).size).toBe(data.invoices.length);
  });

  it('cover every display status', () => {
    const statuses = new Set(rows.map((r) => r.status));
    for (const s of ['draft', 'awaiting', 'partially_paid', 'overdue', 'paid']) expect(statuses.has(s as never)).toBe(true);
  });
});

describe('totals', () => {
  it('multiplies quantity by rate and adds GST', () => {
    expect(lineAmount({ description: 'x', quantity: 3, rate: 1250.5 })).toBe(3751.5);
    expect(totalsFor([{ description: 'x', quantity: 2, rate: 1000 }], 0.18)).toEqual({ subtotal: 2000, tax: 360, total: 2360 });
  });

  it('rounds to paise', () => {
    const t = totalsFor([{ description: 'x', quantity: 3, rate: 33.33 }], 0.18);
    expect(t.subtotal).toBe(99.99);
    expect(t.tax).toBe(18);
    expect(t.total).toBe(117.99);
  });
});

describe('status', () => {
  const base: Invoice = { id: 'x', number: 'X', customerId: 'k1', issueDate: '2026-10-01', dueDate: '2026-10-10', lines: [], taxRate: 0 };
  it('derives status from payments and dates', () => {
    expect(statusFor({ ...base, draft: true }, 0, 100, TODAY)).toBe('draft');
    expect(statusFor(base, 100, 100, TODAY)).toBe('paid');
    expect(statusFor(base, 50, 100, TODAY)).toBe('overdue');
    expect(statusFor({ ...base, dueDate: '2026-10-20' }, 50, 100, TODAY)).toBe('partially_paid');
    expect(statusFor({ ...base, dueDate: '2026-10-20' }, 0, 100, TODAY)).toBe('awaiting');
  });
});

describe('overview figures', () => {
  const o = overview(rows, data.payments);

  it('reconcile: invoiced = collected + outstanding', () => {
    expect(Math.round((o.collected + o.outstanding) * 100) / 100).toBe(o.invoiced);
  });

  it('match the rows they summarise', () => {
    const sent = rows.filter((r) => r.status !== 'draft');
    expect(o.invoicedCount).toBe(sent.length);
    expect(o.overdue).toBe(sum(rows.filter((r) => r.status === 'overdue').map((r) => r.balance)));
    expect(o.overdueCount).toBe(rows.filter((r) => r.status === 'overdue').length);
    expect(o.collected).toBe(sum(data.payments.map((p) => p.amount)));
  });

  it('exclude drafts from what has been invoiced', () => {
    const draft = rows.find((r) => r.status === 'draft')!;
    expect(o.invoiced).toBe(sum(rows.filter((r) => r.status !== 'draft').map((r) => r.totals.total)));
    expect(draft.totals.total).toBeGreaterThan(0);
  });

  it('age buckets add up to the outstanding balance', () => {
    const buckets = aging(rows, TODAY);
    expect(sum(buckets.map((b) => b.amount))).toBe(o.outstanding);
    expect(buckets.reduce((a, b) => a + b.count, 0)).toBe(o.outstandingCount);
    expect(sum(buckets.slice(1).map((b) => b.amount))).toBe(o.overdue);
  });
});

describe('list filtering', () => {
  it('filters by status and searches number or customer', () => {
    expect(filterRows(rows, '', 'overdue').every((r) => r.status === 'overdue')).toBe(true);
    expect(filterRows(rows, 'inv-2026-037', 'all').map((r) => r.invoice.number)).toEqual(['INV-2026-037']);
    expect(filterRows(rows, 'brightline', 'all').length).toBe(2);
    expect(filterRows(rows, 'zzz', 'all')).toHaveLength(0);
  });

  it('lists newest invoices first', () => {
    for (let i = 1; i < rows.length; i++) expect(rows[i - 1]!.invoice.issueDate >= rows[i]!.invoice.issueDate).toBe(true);
  });
});
