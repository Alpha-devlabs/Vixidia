/**
 * Water Delivery Management domain types (ported unchanged from the original
 * water-delivery demo). Amounts are whole rupees.
 */
export type CustomerKind = 'home' | 'shop' | 'office';
export type DeliveryStatus = 'pending' | 'delivered';
export type PaymentStatus = 'unpaid' | 'paid';

export interface WaterCustomer {
  id: string;
  name: string;
  area: string;
  kind: CustomerKind;
  /** Free-text note, e.g. delivery instructions. */
  note?: string;
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
}
