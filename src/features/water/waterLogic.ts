import type { WaterCustomer, CustomerKind, WaterOrder, PaymentStatus, WaterState } from '../../types/water';

// ---------- Calculations ----------

export function orderTotal(order: Pick<WaterOrder, 'quantity' | 'unitPrice'>): number {
  return order.quantity * order.unitPrice;
}

export interface DaySummary {
  ordersToday: number;
  delivered: number;
  pending: number;
  unitsDelivered: number;
  unitsPending: number;
  billedToday: number;
  collectedToday: number;
  /** Total of every unpaid order, across all days. */
  outstanding: number;
  unpaidOrders: number;
  customersWithDues: number;
}

export function summarize(state: Pick<WaterState, 'orders'>, today: string): DaySummary {
  const todays = state.orders.filter((o) => o.date === today);
  const unpaid = state.orders.filter((o) => o.payment === 'unpaid');
  const sum = (list: WaterOrder[]) => list.reduce((acc, o) => acc + orderTotal(o), 0);
  const units = (list: WaterOrder[]) => list.reduce((acc, o) => acc + o.quantity, 0);
  const delivered = todays.filter((o) => o.delivery === 'delivered');
  const pending = todays.filter((o) => o.delivery === 'pending');
  return {
    ordersToday: todays.length,
    delivered: delivered.length,
    pending: pending.length,
    unitsDelivered: units(delivered),
    unitsPending: units(pending),
    billedToday: sum(todays),
    collectedToday: sum(todays.filter((o) => o.payment === 'paid')),
    outstanding: sum(unpaid),
    unpaidOrders: unpaid.length,
    customersWithDues: new Set(unpaid.map((o) => o.customerId)).size,
  };
}

export interface CustomerBalance {
  customer: WaterCustomer;
  orderCount: number;
  outstanding: number;
  unpaidCount: number;
  lastOrderDate: string | undefined;
}

export function customerBalances(state: Pick<WaterState, 'customers' | 'orders'>): CustomerBalance[] {
  return state.customers.map((customer) => {
    const own = state.orders.filter((o) => o.customerId === customer.id);
    const unpaid = own.filter((o) => o.payment === 'unpaid');
    const lastOrderDate = own.reduce<string | undefined>((latest, o) => (!latest || o.date > latest ? o.date : latest), undefined);
    return {
      customer,
      orderCount: own.length,
      outstanding: unpaid.reduce((acc, o) => acc + orderTotal(o), 0),
      unpaidCount: unpaid.length,
      lastOrderDate,
    };
  });
}

/** Customers who owe money, largest balance first. */
export function duesList(state: Pick<WaterState, 'customers' | 'orders'>): CustomerBalance[] {
  return customerBalances(state)
    .filter((b) => b.outstanding > 0)
    .sort((a, b) => b.outstanding - a.outstanding);
}

// ---------- Search & filtering ----------

export type OrderFilter = 'all' | 'pending' | 'delivered' | 'unpaid' | 'paid';

export const orderFilters: { value: OrderFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'To deliver' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'paid', label: 'Paid' },
];

export function matchesFilter(order: WaterOrder, filter: OrderFilter): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'pending':
    case 'delivered':
      return order.delivery === filter;
    case 'unpaid':
    case 'paid':
      return order.payment === filter;
  }
}

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

export function matchesQuery(order: WaterOrder, customer: WaterCustomer | undefined, query: string): boolean {
  const q = normalize(query);
  if (!q) return true;
  return [order.number, customer?.name ?? '', customer?.area ?? '', order.note ?? ''].some((field) =>
    normalize(field).includes(q),
  );
}

export interface OrderQuery {
  query: string;
  filter: OrderFilter;
  /** When set, only orders on this day are included. */
  day?: string;
}

/** Filters orders and sorts newest first, pending before delivered within a day. */
export function filterOrders(state: Pick<WaterState, 'customers' | 'orders'>, q: OrderQuery): WaterOrder[] {
  const byId = indexCustomers(state.customers);
  return state.orders
    .filter((o) => (q.day ? o.date === q.day : true))
    .filter((o) => matchesFilter(o, q.filter))
    .filter((o) => matchesQuery(o, byId.get(o.customerId), q.query))
    .sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      if (a.delivery !== b.delivery) return a.delivery === 'pending' ? -1 : 1;
      return a.number < b.number ? 1 : -1;
    });
}

export function searchCustomers(balances: CustomerBalance[], query: string): CustomerBalance[] {
  const q = normalize(query);
  if (!q) return balances;
  return balances.filter((b) => normalize(`${b.customer.name} ${b.customer.area}`).includes(q));
}

export function indexCustomers(customers: WaterCustomer[]): Map<string, WaterCustomer> {
  return new Map(customers.map((c) => [c.id, c]));
}

// ---------- New order validation ----------

export interface NewOrderInput {
  customerMode: 'existing' | 'new';
  customerId: string;
  newName: string;
  newArea: string;
  newKind: CustomerKind;
  quantity: string;
  payment: PaymentStatus;
  note: string;
}

export type NewOrderErrors = Partial<Record<'customerId' | 'newName' | 'newArea' | 'quantity', string>>;

export const MAX_QUANTITY = 50;

export function emptyNewOrder(): NewOrderInput {
  return {
    customerMode: 'existing',
    customerId: '',
    newName: '',
    newArea: '',
    newKind: 'home',
    quantity: '1',
    payment: 'unpaid',
    note: '',
  };
}

export function validateNewOrder(input: NewOrderInput, customers: WaterCustomer[]): NewOrderErrors {
  const errors: NewOrderErrors = {};
  if (input.customerMode === 'existing') {
    if (!input.customerId) errors.customerId = 'Choose a customer for this order.';
    else if (!customers.some((c) => c.id === input.customerId)) errors.customerId = 'That customer no longer exists.';
  } else {
    const name = input.newName.trim();
    if (name.length < 2) errors.newName = 'Enter the customer’s name (at least 2 characters).';
    else if (name.length > 60) errors.newName = 'Keep the name under 60 characters.';
    else if (customers.some((c) => normalize(c.name) === normalize(name)))
      errors.newName = 'A customer with this name already exists. Choose them from the list instead.';
    if (!input.newArea.trim()) errors.newArea = 'Enter the area or street for delivery.';
  }
  const qty = Number(input.quantity);
  if (!input.quantity.trim() || !Number.isInteger(qty)) errors.quantity = 'Enter a whole number of cans.';
  else if (qty < 1 || qty > MAX_QUANTITY) errors.quantity = `Enter between 1 and ${MAX_QUANTITY} cans.`;
  return errors;
}

// ---------- State updates ----------

export type WaterAction =
  | { type: 'markDelivered'; orderId: string }
  | { type: 'markPaid'; orderId: string }
  | { type: 'settleCustomer'; customerId: string }
  | { type: 'addOrder'; input: NewOrderInput; today: string; unitPrice: number; prefix: string }
  | { type: 'reset'; state: WaterState };

export function waterReducer(state: WaterState, action: WaterAction): WaterState {
  switch (action.type) {
    case 'markDelivered':
      return {
        ...state,
        orders: state.orders.map((o) => (o.id === action.orderId ? { ...o, delivery: 'delivered' } : o)),
      };
    case 'markPaid':
      return {
        ...state,
        orders: state.orders.map((o) => (o.id === action.orderId ? { ...o, payment: 'paid' } : o)),
      };
    case 'settleCustomer':
      return {
        ...state,
        orders: state.orders.map((o) => (o.customerId === action.customerId ? { ...o, payment: 'paid' } : o)),
      };
    case 'addOrder':
      return addOrder(state, action.input, action.today, action.unitPrice, action.prefix);
    case 'reset':
      return action.state;
  }
}

function addOrder(state: WaterState, input: NewOrderInput, today: string, unitPrice: number, prefix: string): WaterState {
  if (Object.keys(validateNewOrder(input, state.customers)).length > 0) return state;

  let customers = state.customers;
  let customerId = input.customerId;
  let nextCustomerSeq = state.nextCustomerSeq;
  if (input.customerMode === 'new') {
    customerId = `c${String(nextCustomerSeq).padStart(2, '0')}`;
    nextCustomerSeq += 1;
    customers = [
      ...customers,
      { id: customerId, name: input.newName.trim(), area: input.newArea.trim(), kind: input.newKind },
    ];
  }

  const seq = state.nextOrderSeq;
  const note = input.note.trim();
  const order: WaterOrder = {
    id: `o${seq}`,
    number: `${prefix}-${seq}`,
    customerId,
    date: today,
    quantity: Number(input.quantity),
    unitPrice,
    delivery: 'pending',
    payment: input.payment,
    ...(note ? { note } : {}),
  };
  return { customers, orders: [order, ...state.orders], nextOrderSeq: seq + 1, nextCustomerSeq };
}
