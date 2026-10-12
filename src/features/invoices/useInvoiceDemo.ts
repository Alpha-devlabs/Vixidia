import { useMemo, useState } from 'react';
import type { InvoiceBook } from '../../types/invoice';
import { createInvoiceSample } from '../../data/invoiceSample';
import { createInvoice, invoiceRows, markSent, overview, recordPayment, type NewInvoiceInput, type PaymentInput } from './invoiceLogic';

/**
 * The tracker's single source of truth: one in-memory book of invoices and payments.
 * Every screen reads rows and the overview derived from it, so a change shows up
 * everywhere at once. Nothing is stored or sent; reloading or resetting restores
 * the sample data.
 */
export function useInvoiceDemo() {
  const [book, setBook] = useState<InvoiceBook>(() => createInvoiceSample());
  // Keep the first "today" so a reset restores exactly the data first shown.
  const [initialToday] = useState(book.today);

  const rows = useMemo(() => invoiceRows(book), [book]);
  const summary = useMemo(() => overview(rows), [rows]);

  const actions = useMemo(() => {
    /** Validates against the current book and only commits a valid change. */
    function commit<R extends { ok: true; book: InvoiceBook } | { ok: false }>(result: R): R {
      const r: { ok: true; book: InvoiceBook } | { ok: false } = result;
      if (r.ok) setBook(r.book);
      return result;
    }
    return {
      create: (input: NewInvoiceInput) => commit(createInvoice(book, input)),
      recordPayment: (input: PaymentInput) => commit(recordPayment(book, input)),
      markSent: (invoiceId: string) => commit(markSent(book, invoiceId)),
      reset: () => setBook(createInvoiceSample(initialToday)),
    };
  }, [book, initialToday]);

  return { book, rows, summary, actions };
}
