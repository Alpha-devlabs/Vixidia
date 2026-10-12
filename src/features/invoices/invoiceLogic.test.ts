import { describe, expect, it } from 'vitest';
import type { Invoice, InvoiceBook } from '../../types/invoice';
import { createInvoiceSample } from '../../data/invoiceSample';
import {
  bookProblems,
  createInvoice,
  gstLabel,
  invoiceRow,
  invoiceRows,
  invoiceTotals,
  isIsoDay,
  lineAmount,
  markSent,
  nextInvoiceNumber,
  overview,
  parseLine,
  previewTotals,
  recordPayment,
  statusFor,
  type NewInvoiceInput,
  type PaymentInput,
} from './invoiceLogic';
import { filterRows } from './invoiceView';

const TODAY = '2026-10-12';

/** ₹1,000 + 18% GST = ₹1,180.00 (118 000 paise), issued 1 Oct, due 15 Oct. */
const base: Invoice = {
  id: 'a',
  number: 'INV-2026-010',
  customerId: 'k1',
  issueDate: '2026-10-01',
  dueDate: '2026-10-15',
  lines: [{ description: 'Consulting', quantity: 1, ratePaise: 100_000 }],
  gstBasisPoints: 1800,
};

function bookWith(invoices: Invoice[], payments: InvoiceBook['payments'] = []): InvoiceBook {
  return { today: TODAY, customers: [{ id: 'k1', name: 'Brightline Interiors', city: 'Coimbatore' }], invoices, payments };
}

function pay(book: InvoiceBook, amount: string, extra: Partial<PaymentInput> = {}) {
  return recordPayment(book, { invoiceId: 'a', amount, date: TODAY, method: 'UPI', ...extra });
}

/** Records a payment that must succeed, returning the new book. */
function paid(book: InvoiceBook, amount: string, extra: Partial<PaymentInput> = {}): InvoiceBook {
  const r = pay(book, amount, extra);
  if (!r.ok) throw new Error(JSON.stringify(r.errors));
  return r.book;
}

// ---------------------------------------------------------------- Calculations

describe('invoice calculations', () => {
  it('adds several line items, then GST on the subtotal', () => {
    const t = invoiceTotals(
      [
        { description: 'a', quantity: 2, ratePaise: 100_000 },
        { description: 'b', quantity: 3, ratePaise: 25_050 },
      ],
      1800,
    );
    expect(t).toEqual({ subtotal: 275_150, gst: 49_527, total: 324_677 });
  });

  it('applies the invoice’s own GST rate rather than assuming 18%', () => {
    const lines = [{ description: 'a', quantity: 1, ratePaise: 10_000 }];
    expect(invoiceTotals(lines, 500)).toEqual({ subtotal: 10_000, gst: 500, total: 10_500 });
    expect(invoiceTotals(lines, 1250).gst).toBe(1250);
    expect(invoiceTotals(lines, 0)).toEqual({ subtotal: 10_000, gst: 0, total: 10_000 });
    expect(gstLabel(1800)).toBe('18%');
    expect(gstLabel(1250)).toBe('12.5%');
  });

  it('rounds GST once, on the subtotal, half up to the paisa', () => {
    // 3 × ₹33.33 = ₹99.99; 18% = ₹17.9982 → ₹18.00
    expect(invoiceTotals([{ description: 'x', quantity: 3, ratePaise: 3333 }], 1800)).toEqual({ subtotal: 9999, gst: 1800, total: 11_799 });
    // Two lines of ₹0.10 and ₹0.20 total exactly ₹0.30 (no 0.30000000000000004).
    expect(
      invoiceTotals(
        [
          { description: 'x', quantity: 1, ratePaise: 10 },
          { description: 'y', quantity: 1, ratePaise: 20 },
        ],
        0,
      ).total,
    ).toBe(30);
  });

  it('handles decimal quantities and prices exactly', () => {
    expect(lineAmount({ description: 'x', quantity: 2.5, ratePaise: 12_345 })).toBe(30_863); // 308.625 → 308.63
    expect(lineAmount({ description: 'x', quantity: 1.005, ratePaise: 100 })).toBe(101);
  });

  it('rejects invalid quantities and prices with a clear reason', () => {
    const err = (quantity: string, rate: string) => {
      const r = parseLine({ description: 'Item', quantity, rate });
      return 'error' in r ? r.error : null;
    };
    expect(err('0', '100')).toBe('Quantity must be more than zero.');
    expect(err('-2', '100')).toMatch(/Quantity must be a number above zero/);
    expect(err('two', '100')).toMatch(/Quantity must be a number above zero/);
    expect(err('', '100')).toBe('Enter a quantity.');
    expect(err('1', '')).toBe('Enter a rate in rupees.');
    expect(err('1', '-50')).toMatch(/Use rupees and paise only/);
    expect(err('1', '10.999')).toMatch(/Use rupees and paise only/);
    expect(err('1000000', '100000')).toMatch(/too large/);
    expect(parseLine({ description: '  ', quantity: '1', rate: '1' })).toEqual({ error: 'Describe the item.' });
    expect(err('1', '0')).toBeNull(); // a free item is allowed on its own line
  });

  it('gives the form the same totals the saved invoice will have', () => {
    const input = [
      { description: 'Hampers', quantity: '10', rate: '2,400' },
      { description: 'Wrapping', quantity: '2.5', rate: '123.45' },
      { description: 'Half typed', quantity: '1', rate: 'abc' }, // left out until fixed
    ];
    const preview = previewTotals(input, 1800);
    const created = createInvoice(bookWith([]), { ...newInput(), lines: input.slice(0, 2) });
    if (!created.ok) throw new Error('expected success');
    expect(invoiceRow(created.book, created.invoice).totals).toEqual(preview);
  });
});

// ---------------------------------------------------------------- Creating invoices

function newInput(overrides: Partial<NewInvoiceInput> = {}): NewInvoiceInput {
  return {
    customerId: 'k1',
    issueDate: TODAY,
    termsDays: 15,
    gstBasisPoints: 1800,
    lines: [{ description: 'Hampers', quantity: '10', rate: '2400' }],
    draft: false,
    ...overrides,
  };
}

describe('creating invoices', () => {
  it('adds a sent invoice with the next number and a due date from the terms', () => {
    const book = bookWith([base]);
    const r = createInvoice(book, newInput({ notes: '  Bank: HDFC  ' }));
    if (!r.ok) throw new Error(JSON.stringify(r.errors));
    expect(r.invoice.number).toBe('INV-2026-011');
    expect(r.invoice.dueDate).toBe('2026-10-27');
    expect(r.invoice.draft).toBeUndefined();
    expect(r.invoice.notes).toBe('Bank: HDFC');
    expect(r.book.invoices).toHaveLength(2);
    expect(book.invoices).toHaveLength(1); // input untouched
    expect(invoiceRow(r.book, r.invoice)).toMatchObject({ status: 'awaiting', balance: 2_832_000 });
  });

  it('saves drafts, which are excluded from invoiced totals', () => {
    const r = createInvoice(bookWith([]), newInput({ draft: true }));
    if (!r.ok) throw new Error('expected success');
    expect(r.invoice.draft).toBe(true);
    expect(overview(invoiceRows(r.book)).invoiced).toBe(0);
  });

  it('ignores untouched blank rows and reports row problems by position', () => {
    const r = createInvoice(
      bookWith([]),
      newInput({
        lines: [
          { description: 'Hampers', quantity: '1', rate: '100' },
          { description: '', quantity: '1', rate: '' },
          { description: 'Wrapping', quantity: '0', rate: '10' },
        ],
      }),
    );
    expect(r).toEqual({ ok: false, errors: { 'line-2': 'Quantity must be more than zero.' } });
  });

  it('requires a customer, a real date, valid terms and GST, and at least one item', () => {
    const r = createInvoice(
      bookWith([]),
      newInput({ customerId: 'nobody', issueDate: '2026-02-30', termsDays: -1, gstBasisPoints: 18.5, lines: [{ description: '', quantity: '1', rate: '' }] }),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(Object.keys(r.errors).sort()).toEqual(['customer', 'gst', 'issueDate', 'lines', 'terms']);
    expect(r.errors.lines).toBe('Add at least one item.');
  });

  it('refuses an invoice whose total is zero', () => {
    const r = createInvoice(bookWith([]), newInput({ lines: [{ description: 'Free sample', quantity: '1', rate: '0' }] }));
    expect(r).toEqual({ ok: false, errors: { lines: 'The invoice total must be more than zero.' } });
  });

  it('continues the existing number sequence', () => {
    expect(nextInvoiceNumber([base, { ...base, id: 'b', number: 'INV-2026-099' }], TODAY)).toBe('INV-2026-100');
    expect(nextInvoiceNumber([], TODAY)).toBe('INV-2026-001');
  });
});

describe('sending a draft', () => {
  it('turns a draft into an invoice that can take payments', () => {
    const book = bookWith([{ ...base, draft: true }]);
    expect(pay(book, '100')).toEqual({ ok: false, errors: { invoice: 'Send the invoice before recording payments.' } });
    const sent = markSent(book, 'a');
    if (!sent.ok) throw new Error('expected success');
    expect(invoiceRow(sent.book, sent.invoice).status).toBe('awaiting');
    expect(pay(sent.book, '100').ok).toBe(true);
    expect(markSent(sent.book, 'a').ok).toBe(false);
    expect(markSent(sent.book, 'missing').ok).toBe(false);
  });
});

// ---------------------------------------------------------------- Payments

describe('recording payments', () => {
  const book = bookWith([base]);

  it('shows the full total due when nothing is paid', () => {
    expect(invoiceRow(book, base)).toMatchObject({ paid: 0, balance: 118_000, status: 'awaiting', payments: [] });
  });

  it('records a partial payment and shows the remaining balance', () => {
    const r = pay(book, '500', { method: 'Cash', reference: ' Counter 2 ' });
    if (!r.ok) throw new Error('expected success');
    expect(r.payment).toMatchObject({ invoiceId: 'a', amountPaise: 50_000, method: 'Cash', reference: 'Counter 2', date: TODAY });
    expect(r.row).toMatchObject({ paid: 50_000, balance: 68_000, status: 'partially_paid' });
    expect(book.payments).toHaveLength(0); // the original book is not changed
  });

  it('keeps every partial payment as its own record, newest first', () => {
    let b = paid(book, '500', { date: '2026-10-05' });
    b = paid(b, '300.50', { date: '2026-10-10' });
    const row = invoiceRow(b, base);
    expect(row.payments.map((p) => p.amountPaise)).toEqual([30_050, 50_000]);
    expect(row).toMatchObject({ paid: 80_050, balance: 37_950, status: 'partially_paid' });
  });

  it('marks the invoice paid on an exact full payment, then refuses more', () => {
    const b = paid(book, '1,180.00');
    expect(invoiceRow(b, base)).toMatchObject({ balance: 0, status: 'paid' });
    expect(pay(b, '1')).toEqual({ ok: false, errors: { invoice: 'This invoice is already fully paid.' } });
  });

  it('refuses a payment above the remaining balance (no overpayments)', () => {
    expect(pay(book, '1180.01')).toEqual({ ok: false, errors: { amount: 'This is more than the ₹1,180.00 still due.' } });
    const b = paid(book, '1000');
    expect(pay(b, '180.01')).toEqual({ ok: false, errors: { amount: 'This is more than the ₹180.00 still due.' } });
    expect(pay(b, '180').ok).toBe(true);
  });

  it('refuses zero, negative and malformed amounts', () => {
    const msg = (amount: string) => {
      const r = pay(book, amount);
      return r.ok ? null : r.errors.amount;
    };
    expect(msg('0')).toBe('Enter an amount greater than zero.');
    expect(msg('0.00')).toBe('Enter an amount greater than zero.');
    expect(msg('-100')).toBe('Enter an amount greater than zero.');
    expect(msg('')).toBe('Enter the amount received.');
    expect(msg('abc')).toBe('Use rupees and paise only, like 12500.50.');
    expect(msg('10.001')).toBe('Use rupees and paise only, like 12500.50.');
  });

  it('refuses a payment for an unknown invoice', () => {
    const r = recordPayment(book, { invoiceId: 'nope', amount: '100', date: TODAY, method: 'UPI' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.invoice).toMatch(/doesn’t exist/);
  });

  it('checks the date, method and reference', () => {
    const errors = (extra: Partial<PaymentInput>) => {
      const r = pay(book, '100', extra);
      return r.ok ? {} : r.errors;
    };
    expect(errors({ date: '2026-10-13' }).date).toBe('The payment date can’t be in the future.');
    expect(errors({ date: '2026-09-30' }).date).toBe('The payment can’t be earlier than the invoice date.');
    expect(errors({ date: '2026-02-30' }).date).toBe('Choose the date the payment arrived.');
    expect(errors({ date: '' }).date).toBe('Choose the date the payment arrived.');
    expect(errors({ method: 'Bitcoin' }).method).toBe('Choose how the payment was made.');
    expect(errors({ reference: 'x'.repeat(101) }).reference).toMatch(/under 100 characters/);
    expect(pay(book, '100', { date: base.issueDate }).ok).toBe(true);
  });
});

// ---------------------------------------------------------------- Statuses

describe('statuses and dates', () => {
  it('is awaiting payment before and on the due date', () => {
    expect(statusFor(base, 118_000, 0, '2026-10-14')).toBe('awaiting');
    expect(statusFor(base, 118_000, 0, '2026-10-15')).toBe('awaiting');
  });

  it('is overdue from the day after the due date', () => {
    expect(statusFor(base, 118_000, 0, '2026-10-16')).toBe('overdue');
  });

  it('treats a partly paid late invoice as overdue, with the right balance', () => {
    const late = { ...base, dueDate: '2026-10-05' };
    const b = paid(bookWith([late]), '500');
    expect(invoiceRow(b, late)).toMatchObject({ status: 'overdue', paid: 50_000, balance: 68_000, daysOverdue: 7 });
    expect(statusFor(late, 118_000, 50_000, '2026-10-05')).toBe('partially_paid');
  });

  it('keeps a fully paid invoice paid, even past its due date', () => {
    const late = { ...base, dueDate: '2026-09-01', issueDate: '2026-08-15' };
    const b = paid(bookWith([late]), '1180');
    expect(invoiceRow(b, late)).toMatchObject({ status: 'paid', daysOverdue: 0 });
    expect(statusFor(late, 118_000, 118_000, '2027-01-01')).toBe('paid');
  });

  it('keeps drafts as drafts whatever the date', () => {
    expect(statusFor({ ...base, draft: true }, 118_000, 0, '2027-01-01')).toBe('draft');
  });

  it('only accepts real calendar dates', () => {
    expect(isIsoDay('2028-02-29')).toBe(true);
    expect(isIsoDay('2026-02-29')).toBe(false);
    expect(isIsoDay('2026-13-01')).toBe(false);
    expect(isIsoDay('12/10/2026')).toBe(false);
  });
});

// ---------------------------------------------------------------- Overview

describe('overview figures', () => {
  // ₹1,180 each: awaiting, overdue unpaid, overdue with ₹500 paid, paid in full, and a draft.
  const invoices: Invoice[] = [
    { ...base, id: 'a' },
    { ...base, id: 'b', number: 'INV-2026-011', dueDate: '2026-10-05' },
    { ...base, id: 'c', number: 'INV-2026-012', dueDate: '2026-09-20', issueDate: '2026-09-01' },
    { ...base, id: 'd', number: 'INV-2026-013', dueDate: '2026-09-20', issueDate: '2026-09-01' },
    { ...base, id: 'e', number: 'INV-2026-014', draft: true },
  ];
  let book = bookWith(invoices);
  book = paid(book, '500', { invoiceId: 'c' });
  book = paid(book, '1180', { invoiceId: 'd' });
  const rows = invoiceRows(book);
  const o = overview(rows);

  it('adds up collected, outstanding and overdue correctly', () => {
    expect(Object.fromEntries(rows.map((r) => [r.invoice.id, r.status]))).toEqual({
      a: 'awaiting',
      b: 'overdue',
      c: 'overdue',
      d: 'paid',
      e: 'draft',
    });
    expect(o).toEqual({
      invoiced: 4 * 118_000,
      invoicedCount: 4,
      collected: 50_000 + 118_000,
      paymentCount: 2,
      outstanding: 118_000 + 118_000 + 68_000,
      outstandingCount: 3,
      overdue: 118_000 + 68_000,
      overdueCount: 2,
    });
    expect(o.invoiced).toBe(o.collected + o.outstanding);
  });

  it('updates every figure together when a payment is recorded', () => {
    const after = overview(invoiceRows(paid(book, '200', { invoiceId: 'b' })));
    expect(after.collected - o.collected).toBe(20_000);
    expect(o.outstanding - after.outstanding).toBe(20_000);
    expect(o.overdue - after.overdue).toBe(20_000);
    expect(after.invoiced).toBe(o.invoiced);
  });

  it('agrees with the list rows and the detail view', () => {
    for (const r of rows) {
      const listed = filterRows(rows, r.invoice.number, 'all').find((x) => x.invoice.id === r.invoice.id);
      expect(listed).toEqual(r);
      expect(invoiceRow(book, r.invoice)).toEqual(r);
    }
    const overdueRows = filterRows(rows, '', 'overdue');
    expect(overdueRows.reduce((a, r) => a + r.balance, 0)).toBe(o.overdue);
    expect(overdueRows).toHaveLength(o.overdueCount);
  });
});

// ---------------------------------------------------------------- Sample data

describe('sample data', () => {
  const sample = createInvoiceSample(TODAY);
  const rows = invoiceRows(sample);

  it('is internally consistent', () => {
    expect(bookProblems(sample)).toEqual([]);
    expect(new Set(sample.invoices.map((i) => i.number)).size).toBe(sample.invoices.length);
  });

  it('shows every status', () => {
    expect(new Set(rows.map((r) => r.status))).toEqual(new Set(['draft', 'awaiting', 'partially_paid', 'overdue', 'paid']));
  });

  it('reconciles: invoiced = collected + outstanding, and collected = every payment', () => {
    const o = overview(rows);
    expect(o.invoiced).toBe(o.collected + o.outstanding);
    expect(o.collected).toBe(sample.payments.reduce((a, p) => a + p.amountPaise, 0));
    expect(o.paymentCount).toBe(sample.payments.length);
  });

  it('restores the same state for the same day (reset)', () => {
    expect(createInvoiceSample(TODAY)).toEqual(sample);
  });
});
