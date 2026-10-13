/**
 * Simple CRM domain types.
 *
 * Only what a person enters is stored. Derived facts — last contact date,
 * "not contacted recently", counts on the overview — are computed in
 * `features/crm/crmLogic.ts`, so every screen agrees.
 */
import type { IsoDay } from './invoice';

export type { IsoDay };

/**
 * prospect – someone you are talking to who hasn't bought yet
 * active   – a current customer
 * inactive – a past customer, kept for their history
 */
export type CustomerStatus = 'prospect' | 'active' | 'inactive';

export interface Customer {
  id: string;
  name: string;
  company?: string;
  role?: string;
  email?: string;
  /** As entered; any country format. */
  phone?: string;
  city?: string;
  status: CustomerStatus;
  /** Short lowercase labels, e.g. "wholesale". */
  tags: string[];
  notes?: string;
  addedOn: IsoDay;
  /** Last time the record itself was edited. */
  updatedOn: IsoDay;
}

export type InteractionType = 'call' | 'meeting' | 'email' | 'message' | 'note';

/** One entry in a customer's history. A record of what happened; nothing is sent. */
export interface Interaction {
  id: string;
  customerId: string;
  date: IsoDay;
  type: InteractionType;
  summary: string;
}

/** Everything the CRM demo knows. One instance is the single source of truth for every screen. */
export interface CrmBook {
  today: IsoDay;
  customers: Customer[];
  interactions: Interaction[];
}
