/**
 * Gym Membership Management domain types.
 *
 * Only facts are stored: members, the memberships they were given, check-ins
 * and payments. Membership status, balances and every dashboard figure are
 * derived from these in `features/gym/gymLogic.ts`, so nothing can drift.
 */
import type { IsoDay, Paise } from './invoice';

export type { IsoDay, Paise };

export type PlanId = 'monthly' | 'quarterly' | 'half_yearly' | 'annual';

export interface Plan {
  id: PlanId;
  name: string;
  /** Length in calendar months. */
  months: number;
  pricePaise: Paise;
}

export interface Member {
  id: string;
  name: string;
  /** Fictional numbers only. */
  phone: string;
  /** Fictional addresses only (example.com). */
  email: string;
  joinedOn: IsoDay;
}

/**
 * One period of membership. `start` and `end` are both inclusive. The price is
 * copied from the plan when the membership is given, so later price changes
 * never rewrite history. Each membership is one charge.
 */
export interface Membership {
  id: string;
  memberId: string;
  planId: PlanId;
  start: IsoDay;
  end: IsoDay;
  pricePaise: Paise;
  kind: 'new' | 'renewal';
  /** The day it was recorded (used for duplicate-renewal protection). */
  createdOn: IsoDay;
}

export interface CheckIn {
  id: string;
  memberId: string;
  date: IsoDay;
  /** 24-hour "HH:MM". */
  time: string;
}

export type PaymentMethod = 'upi' | 'cash' | 'card';

export interface GymPayment {
  id: string;
  memberId: string;
  date: IsoDay;
  amountPaise: Paise;
  method: PaymentMethod;
}

/** Everything the demo knows. One instance is the single source of truth for every screen. */
export interface GymBook {
  today: IsoDay;
  plans: Plan[];
  members: Member[];
  memberships: Membership[];
  checkIns: CheckIn[];
  payments: GymPayment[];
}
