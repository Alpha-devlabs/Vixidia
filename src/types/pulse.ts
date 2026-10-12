/** Calendar days are stored as YYYY-MM-DD strings throughout the demo. */
export type IsoDay = string;

export const productCategories = ['Home & kitchen', 'Stationery', 'Gifts', 'Services'] as const;
export type ProductCategory = (typeof productCategories)[number];

/** Something the sample business sells. */
export interface CatalogItem {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
}

export interface Customer {
  id: string;
  name: string;
}

export interface OrderLine {
  productId: string;
  quantity: number;
  unitPrice: number;
}

/** A completed order. Revenue is counted on the order date. */
export interface Order {
  id: string;
  /** Human-facing reference, e.g. "ORD-1042". */
  ref: string;
  date: IsoDay;
  customerId: string;
  lines: OrderLine[];
}

export interface PulseState {
  /** The day the demo treats as "today". */
  today: IsoDay;
  catalog: CatalogItem[];
  customers: Customer[];
  orders: Order[];
  /** Revenue target for a 30-day period; scaled for 7 and 90 days. Editable in the demo. */
  revenueTarget30: number;
}

export interface SampleBusiness {
  name: string;
  description: string;
}
