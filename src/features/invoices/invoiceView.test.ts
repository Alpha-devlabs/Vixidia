import { describe, expect, it } from 'vitest';
import { createInvoiceSample } from '../../data/invoiceSample';
import { invoiceRows, overview } from './invoiceLogic';
import { aging, filterRows, overdueRows } from './invoiceView';

const TODAY = '2026-10-12';
const rows = invoiceRows(createInvoiceSample(TODAY));
const o = overview(rows);

describe('outstanding by age', () => {
  it('buckets add up to the outstanding and overdue balances', () => {
    const buckets = aging(rows, TODAY);
    expect(buckets.reduce((a, b) => a + b.amount, 0)).toBe(o.outstanding);
    expect(buckets.reduce((a, b) => a + b.count, 0)).toBe(o.outstandingCount);
    expect(buckets.slice(1).reduce((a, b) => a + b.amount, 0)).toBe(o.overdue);
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

  it('orders the overdue panel by largest balance', () => {
    const list = overdueRows(rows);
    expect(list.length).toBe(o.overdueCount);
    for (let i = 1; i < list.length; i++) expect(list[i - 1]!.balance >= list[i]!.balance).toBe(true);
  });
});
