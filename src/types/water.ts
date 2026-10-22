/**
 * Water Delivery Management domain types (ported unchanged from the original
 * water-delivery demo). Amounts are whole rupees.
 */
export type CustomerKind = 'home' | 'shop' | 'office';
export type DeliveryStatus = 'pending' | 'delivered';
export type PaymentStatus = 'unpaid' | 'paid';

/**
 * A regular delivery: every day, every other day (counted from `start`), or
 * on chosen weekdays (0 = Sunday … 6 = Saturday).
 */
export type DeliverySchedule =
  | { pattern: 'daily'; quantity: number }
  | { pattern: 'alternate'; quantity: number; start: string }
  | { pattern: 'weekdays'; quantity: number; days: number[] };

export interface WaterCustomer {
  id: string;
  name: string;
  area: string;
  kind: CustomerKind;
  /** Free-text note, e.g. delivery instructions. */
  note?: string;
  /** Cans the customer already had before the orders on record. */
  openingCans?: number;
  /** How many cans the customer has paid a deposit for. */
  depositCans?: number;
  /** A regular delivery, if they have one. */
  schedule?: DeliverySchedule;
}

export interface WaterOrder {
  id: string;
  /** Human-facing order number, e.g. "TW-1042". */
  number: string;
  customerId: string;
  /** Calendar day in YYYY-MM-DD form. */
  date: string;
  /** Number of 20-litre cans. */
  quantity: number;
  unitPrice: number;
  delivery: DeliveryStatus;
  payment: PaymentStatus;
  note?: string;
  /** Empty cans taken back when this order was delivered. */
  emptiesCollected?: number;
  /** Payment taken in cash by the delivery person on the round. */
  collectedOnRound?: boolean;
  /** Created from the customer's regular delivery rather than entered by hand. */
  fromSchedule?: boolean;
}

export interface WaterState {
  customers: WaterCustomer[];
  orders: WaterOrder[];
  /** Next numeric part for generated order numbers. */
  nextOrderSeq: number;
  /** Next numeric part for generated customer ids. */
  nextCustomerSeq: number;
}

export interface SampleBusiness {
  name: string;
  owner: string;
  town: string;
  /** The "today" the sample data is anchored to. */
  today: string;
  orderPrefix: string;
  unitLabel: string;
  defaultUnitPrice: number;
  /** Deposit charged per can, in rupees. */
  depositPerCan: number;
  /** Areas in the order the delivery round visits them. */
  routeOrder: string[];
  /** Name of the delivery person shown in the round view. */
  deliveryPerson: string;
}
