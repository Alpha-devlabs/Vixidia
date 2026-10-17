/**
 * Water Delivery Management domain types.
 *
 * Only facts are stored: customers, scheduled deliveries and what actually
 * happened on each, and payments. Balances (money and cans) and every dashboard
 * figure are derived from these in `features/water/waterLogic.ts`, so nothing can
 * drift out of step.
 */
import type { IsoDay } from './invoice';
import type { Paise } from './invoice';

export type { IsoDay, Paise };

/** 0 = Sunday … 6 = Saturday. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface Pricing {
  /** One 20-litre reusable can. */
  canPaise: Paise;
  /** One carton of twelve 1-litre bottles (not reusable). */
  cartonPaise: Paise;
}

/** A regular order the customer has asked for. Used to plan the round; it does not create deliveries by itself. */
export interface RecurringOrder {
  cans: number;
  cartons: number;
  days: Weekday[];
}

export type CustomerStatus = 'active' | 'paused';

export interface WaterCustomer {
  id: string;
  name: string;
  /** Fictional numbers only. */
  phone: string;
  locality: string;
  address?: string;
  status: CustomerStatus;
  recurring?: RecurringOrder;
  /**
   * Balances carried forward when the customer's account started in this
   * ledger (`openedOn`). Everything after is a recorded delivery or payment.
   */
  openingBalancePaise: Paise;
  openingCans: number;
  openedOn: IsoDay;
}

/** What actually happened at the door. Recorded once; a completed delivery can't be completed again. */
export interface DeliveryCompletion {
  cans: number;
  cartons: number;
  emptiesCollected: number;
  completedOn: IsoDay;
}

export type FailReason = 'not_home' | 'locked' | 'refused' | 'other';

export type DeliveryStatus = 'scheduled' | 'completed' | 'failed' | 'rescheduled';

export interface Delivery {
  id: string;
  customerId: string;
  date: IsoDay;
  /** What was planned. */
  cans: number;
  cartons: number;
  status: DeliveryStatus;
  completion?: DeliveryCompletion;
  failReason?: FailReason;
  /** For a rescheduled delivery: the id of the new one. */
  movedTo?: string;
  /** For a delivery created by rescheduling: the id of the original. */
  movedFrom?: string;
}

export type PaymentMethod = 'cash' | 'upi' | 'bank';

export interface WaterPayment {
  id: string;
  customerId: string;
  date: IsoDay;
  amountPaise: Paise;
  method: PaymentMethod;
  /** Set when collected during a delivery. */
  deliveryId?: string;
}

/** Everything the demo knows. One instance is the single source of truth for every screen. */
export interface WaterBook {
  today: IsoDay;
  pricing: Pricing;
  customers: WaterCustomer[];
  deliveries: Delivery[];
  payments: WaterPayment[];
}
