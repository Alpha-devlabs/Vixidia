/**
 * Invoice & Payment Tracker domain types.
 *
 * Money is stored as whole paise (integers), never as floating-point rupees, so
 * sums and comparisons are exact. Convert to rupees only for display.
 *
 * Only the facts a person enters are stored. Everything derived from them —
 * line amounts, subtotal, GST, total, amount paid, balance and status — is
 * computed by `invoiceLogic.ts`, so there is no second copy that can disagree.
 */

/** A calendar date as YYYY-MM-DD, with no time or timezone. */
export type IsoDay = string;

/** An amount of money in whole paise (₹1 = 100 paise). Always an integer. */
export type Paise = number;

export interface InvoiceCustomer {
  id: string;
  name: string;
  city: string;
}

export interface InvoiceLine {
  description: string;
  /** Positive, up to three decimal places (e.g. 2.5 kg). */
  quantity: number;
  /** Unit price before GST, in paise. Zero is allowed (a free item). */
  ratePaise: Paise;
}

export interface Invoice {
  id: string;
  /** e.g. "INV-2026-041" */
  number: string;
  customerId: string;
  issueDate: IsoDay;
  /** Last day the customer can pay before the invoice is overdue. */
  dueDate: IsoDay;
  lines: InvoiceLine[];
  /**
   * GST for the whole invoice in basis points of the subtotal (1800 = 18%).
   * Prices are GST-exclusive; GST is added on top of the subtotal.
   */
  gstBasisPoints: number;
  /** Drafts are not yet sent to the customer: they don't count as invoiced and can't take payments. */
  draft?: boolean;
  notes?: string;
}

export type PaymentMethod = 'UPI' | 'Bank transfer' | 'Cash' | 'Cheque' | 'Card';

/** One payment received against one invoice. Payments are kept individually, never merged. */
export interface Payment {
  id: string;
  invoiceId: string;
  date: IsoDay;
  amountPaise: Paise;
  method: PaymentMethod;
  reference?: string;
}

/**
 * Display status, derived from the invoice, its payments and today's date.
 * "awaiting" is the unpaid state, shown as "Awaiting payment".
 */
export type InvoiceStatus = 'draft' | 'awaiting' | 'partially_paid' | 'overdue' | 'paid';

/** Everything the tracker knows. One instance is the single source of truth for every screen. */
export interface InvoiceBook {
  /** The demo's "today"; fixed when the demo starts so dates stay consistent. */
  today: IsoDay;
  customers: InvoiceCustomer[];
  invoices: Invoice[];
  payments: Payment[];
}
