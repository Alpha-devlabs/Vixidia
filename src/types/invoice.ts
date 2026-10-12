/**
 * Invoice & Payment Tracker types — design-preview phase.
 * Deliberately small; the full domain model (status transitions, part payments,
 * validation rules) arrives in the next phase.
 */
export type IsoDay = string;

export interface InvoiceCustomer {
  id: string;
  name: string;
  city: string;
}

export interface InvoiceLine {
  description: string;
  quantity: number;
  rate: number;
}

export interface Invoice {
  id: string;
  /** e.g. "INV-2026-041" */
  number: string;
  customerId: string;
  issueDate: IsoDay;
  dueDate: IsoDay;
  lines: InvoiceLine[];
  /** GST rate as a fraction, e.g. 0.18. */
  taxRate: number;
  /** Drafts are not yet sent to the customer and don't count as invoiced. */
  draft?: boolean;
  notes?: string;
}

export type PaymentMethod = 'UPI' | 'Bank transfer' | 'Cash' | 'Cheque' | 'Card';

export interface Payment {
  id: string;
  invoiceId: string;
  date: IsoDay;
  amount: number;
  method: PaymentMethod;
  reference?: string;
}

/** Display status, derived from the invoice, its payments and today's date. */
export type InvoiceStatus = 'draft' | 'awaiting' | 'partially_paid' | 'overdue' | 'paid';
