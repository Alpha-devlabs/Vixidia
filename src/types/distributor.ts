/**
 * Small Distributor Management domain types.
 *
 * Only facts are stored: products, suppliers, customers, purchases, sales
 * orders, payments and stock movements. Current stock, inventory value,
 * balances, due dates' overdue state and every dashboard figure are derived in
 * `features/distributor/distributorLogic.ts`.
 *
 * Stock is never stored on a product. It is the running sum of the product's
 * movements, and movements are only ever written by one function (moveStock).
 */
import type { IsoDay, Paise } from './invoice';

export type { IsoDay, Paise };

/** Every unit is a countable pack, so stock is always a whole number of that unit. */
export type Unit = 'piece' | 'pack' | 'box' | 'carton' | 'case' | 'bag';

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: Unit;
  /** Current selling price per unit. Orders copy it onto their lines. */
  pricePaise: Paise;
  /** Current purchase cost per unit. Purchases copy it as a default; inventory is valued at it. */
  costPaise: Paise;
  reorderLevel: number;
  active: boolean;
}

export interface Party {
  id: string;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  /** Days of credit: a fulfilled order or received purchase falls due this many days later. */
  creditDays: number;
  active: boolean;
}

export type Supplier = Party;
export type Customer = Party;

/** A line as it was on the day: name, SKU, unit and price are copies, not references. */
export interface Line {
  productId: string;
  sku: string;
  name: string;
  unit: Unit;
  qty: number;
  /** Unit cost on a purchase, unit selling price on an order. */
  unitPaise: Paise;
}

export type PurchaseStatus = 'draft' | 'received' | 'cancelled';

export interface Purchase {
  id: string;
  ref: string;
  supplierId: string;
  date: IsoDay;
  lines: Line[];
  status: PurchaseStatus;
  receivedOn?: IsoDay;
  dueDate?: IsoDay;
  cancelledOn?: IsoDay;
  notes: string;
}

export type OrderStatus = 'draft' | 'confirmed' | 'fulfilled' | 'cancelled';

export interface SalesOrder {
  id: string;
  ref: string;
  customerId: string;
  date: IsoDay;
  lines: Line[];
  status: OrderStatus;
  confirmedOn?: IsoDay;
  fulfilledOn?: IsoDay;
  dueDate?: IsoDay;
  cancelledOn?: IsoDay;
  notes: string;
}

export type PaymentMethod = 'cash' | 'upi' | 'bank';

export interface Payment {
  id: string;
  /** 'in' = received from a customer against an order; 'out' = paid to a supplier against a purchase. */
  direction: 'in' | 'out';
  docId: string;
  date: IsoDay;
  amountPaise: Paise;
  method: PaymentMethod;
  note: string;
  /** One per payment form opening, so a repeated submit can't record it twice. */
  requestId: string;
}

export type MovementType = 'opening' | 'purchase' | 'sale' | 'adjustment';

export interface StockMovement {
  id: string;
  /** Order of writing; the ledger is read in this order. */
  seq: number;
  date: IsoDay;
  productId: string;
  type: MovementType;
  /** Positive = into stock, negative = out of stock. Never zero. */
  qty: number;
  /** Stock of the product straight after this movement. */
  balanceAfter: number;
  ref?: { kind: 'purchase' | 'order'; id: string };
  reason: string;
  note: string;
  /** Set on manual adjustments: one per adjustment form opening, so a repeated submit can't apply twice. */
  requestId?: string;
}

export interface DistributorBook {
  today: IsoDay;
  products: Product[];
  suppliers: Supplier[];
  customers: Customer[];
  purchases: Purchase[];
  orders: SalesOrder[];
  payments: Payment[];
  movements: StockMovement[];
}
