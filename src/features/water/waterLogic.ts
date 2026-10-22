import type { DeliverySchedule, WaterCustomer, CustomerKind, WaterOrder, PaymentStatus, WaterState } from '../../types/water';

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

// ---------- Cans & deposits ----------

/**
 * Empty cans taken back with an order. A delivered order with nothing recorded
 * counts as a straight swap (one empty back for each full can), which is how
 * most rounds work; pending orders haven't moved any cans yet.
 */
export function emptiesFor(order: Pick<WaterOrder, 'delivery' | 'quantity' | 'emptiesCollected'>): number {
  if (order.delivery !== 'delivered') return 0;
  return order.emptiesCollected ?? order.quantity;
}

/** Cans a customer has right now: what they started with, plus full cans delivered, minus empties returned. */
export function cansHeld(customer: Pick<WaterCustomer, 'id' | 'openingCans'>, orders: WaterOrder[]): number {
  return orders
    .filter((o) => o.customerId === customer.id && o.delivery === 'delivered')
    .reduce((acc, o) => acc + o.quantity - emptiesFor(o), customer.openingCans ?? 0);
}

export interface CanBalance {
  customer: WaterCustomer;
  cansHeld: number;
  depositCans: number;
  /** Cans held beyond what the deposit covers. */
  beyondDeposit: number;
  /** Deposit money held for this customer, in rupees. */
  depositHeld: number;
}

/** Every customer's cans, those holding cans beyond their deposit first. */
export function canBalances(state: Pick<WaterState, 'customers' | 'orders'>, depositPerCan: number): CanBalance[] {
  return state.customers
    .map((customer) => {
      const held = cansHeld(customer, state.orders);
      const depositCans = customer.depositCans ?? 0;
      return { customer, cansHeld: held, depositCans, beyondDeposit: Math.max(0, held - depositCans), depositHeld: depositCans * depositPerCan };
    })
    .sort((a, b) => b.beyondDeposit - a.beyondDeposit || b.cansHeld - a.cansHeld || a.customer.name.localeCompare(b.customer.name));
}

export interface CanSummary {
  cansOut: number;
  beyondDeposit: number;
  customersBeyond: number;
  depositHeld: number;
}

export function canSummary(balances: CanBalance[]): CanSummary {
  return balances.reduce<CanSummary>(
    (acc, b) => ({
      cansOut: acc.cansOut + b.cansHeld,
      beyondDeposit: acc.beyondDeposit + b.beyondDeposit,
      customersBeyond: acc.customersBeyond + (b.beyondDeposit > 0 ? 1 : 0),
      depositHeld: acc.depositHeld + b.depositHeld,
    }),
    { cansOut: 0, beyondDeposit: 0, customersBeyond: 0, depositHeld: 0 },
  );
}

// ---------- Regular deliveries ----------

function dayNumber(day: string): number {
  const [y, m, d] = day.split('-').map(Number);
  return Date.UTC(y!, m! - 1, d!) / 86_400_000;
}

/** 0 = Sunday … 6 = Saturday, for a YYYY-MM-DD day. */
export function weekdayOf(day: string): number {
  return (((dayNumber(day) + 4) % 7) + 7) % 7; // 1 Jan 1970 was a Thursday.
}

export function isDueOn(schedule: DeliverySchedule, day: string): boolean {
  switch (schedule.pattern) {
    case 'daily':
      return true;
    case 'alternate': {
      const diff = dayNumber(day) - dayNumber(schedule.start);
      return diff >= 0 && diff % 2 === 0;
    }
    case 'weekdays':
      return schedule.days.includes(weekdayOf(day));
  }
}

const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Plain description of a regular delivery, e.g. "Mon, Wed, Fri · 3 cans". */
export function scheduleLabel(schedule: DeliverySchedule): string {
  const when =
    schedule.pattern === 'daily'
      ? 'Every day'
      : schedule.pattern === 'alternate'
        ? 'Every other day'
        : [...schedule.days].sort((a, b) => a - b).map((d) => weekdayNames[d]).join(', ');
  return `${when} · ${schedule.quantity} ${schedule.quantity === 1 ? 'can' : 'cans'}`;
}

/** Regular customers due on this day who don't have an order for it yet. */
export function dueRegulars(state: Pick<WaterState, 'customers' | 'orders'>, day: string): WaterCustomer[] {
  const ordered = new Set(state.orders.filter((o) => o.date === day).map((o) => o.customerId));
  return state.customers.filter((c) => c.schedule && isDueOn(c.schedule, day) && !ordered.has(c.id));
}

// ---------- Delivery round ----------

export interface RoundStop {
  order: WaterOrder;
  customer: WaterCustomer | undefined;
  /** Cans the customer holds before this stop, used to cap empties collected. */
  cansBefore: number;
}

/** The day's orders in the order the round visits them: by route area, then customer name. */
export function roundStops(state: Pick<WaterState, 'customers' | 'orders'>, day: string, routeOrder: string[]): RoundStop[] {
  const byId = indexCustomers(state.customers);
  const areaRank = (area: string | undefined) => {
    const i = area ? routeOrder.indexOf(area) : -1;
    return i === -1 ? routeOrder.length : i;
  };
  return state.orders
    .filter((o) => o.date === day)
    .map((order) => {
      const customer = byId.get(order.customerId);
      const others = state.orders.filter((o) => o.id !== order.id);
      return { order, customer, cansBefore: customer ? cansHeld(customer, others) : 0 };
    })
    .sort(
      (a, b) =>
        areaRank(a.customer?.area) - areaRank(b.customer?.area) ||
        (a.customer?.name ?? '').localeCompare(b.customer?.name ?? '') ||
        a.order.number.localeCompare(b.order.number),
    );
}

export interface RoundSummary {
  stops: number;
  done: number;
  cansDelivered: number;
  cansToGo: number;
  emptiesBack: number;
  /** Cash taken by the delivery person on this round, to hand over at the end. */
  cashInHand: number;
}

export function roundSummary(stops: RoundStop[]): RoundSummary {
  return stops.reduce<RoundSummary>(
    (acc, { order }) => {
      const done = order.delivery === 'delivered';
      return {
        stops: acc.stops + 1,
        done: acc.done + (done ? 1 : 0),
        cansDelivered: acc.cansDelivered + (done ? order.quantity : 0),
        cansToGo: acc.cansToGo + (done ? 0 : order.quantity),
        emptiesBack: acc.emptiesBack + emptiesFor(order),
        cashInHand: acc.cashInHand + (order.collectedOnRound && order.payment === 'paid' ? orderTotal(order) : 0),
      };
    },
    { stops: 0, done: 0, cansDelivered: 0, cansToGo: 0, emptiesBack: 0, cashInHand: 0 },
  );
}

/** The usual number of empties to take back at a stop: one per full can, but never more than the customer has. */
export function defaultEmpties(stop: Pick<RoundStop, 'order' | 'cansBefore'>): number {
  return Math.max(0, Math.min(stop.order.quantity, stop.cansBefore));
}

// ---------- State updates ----------

export type WaterAction =
  | { type: 'markDelivered'; orderId: string; emptiesCollected?: number }
  | { type: 'completeStop'; orderId: string; emptiesCollected: number; cashCollected: boolean }
  | { type: 'addRegulars'; day: string; unitPrice: number; prefix: string }
  | { type: 'markPaid'; orderId: string }
  | { type: 'settleCustomer'; customerId: string }
  | { type: 'addOrder'; input: NewOrderInput; today: string; unitPrice: number; prefix: string }
  | { type: 'reset'; state: WaterState };

export function waterReducer(state: WaterState, action: WaterAction): WaterState {
  switch (action.type) {
    case 'markDelivered':
      return {
        ...state,
        orders: state.orders.map((o) =>
          o.id === action.orderId
            ? { ...o, delivery: 'delivered', ...(action.emptiesCollected !== undefined ? { emptiesCollected: Math.max(0, Math.floor(action.emptiesCollected)) } : {}) }
            : o,
        ),
      };
    case 'completeStop':
      return completeStop(state, action.orderId, action.emptiesCollected, action.cashCollected);
    case 'addRegulars':
      return addRegulars(state, action.day, action.unitPrice, action.prefix);
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

function completeStop(state: WaterState, orderId: string, empties: number, cash: boolean): WaterState {
  const order = state.orders.find((o) => o.id === orderId);
  if (!order || order.delivery === 'delivered') return state;
  const customer = state.customers.find((c) => c.id === order.customerId);
  const max = customer ? cansHeld(customer, state.orders.filter((o) => o.id !== orderId)) : 0;
  const emptiesCollected = Math.max(0, Math.min(max, Math.floor(empties)));
  const takesCash = cash && order.payment === 'unpaid';
  return {
    ...state,
    orders: state.orders.map((o) =>
      o.id === orderId
        ? { ...o, delivery: 'delivered', emptiesCollected, ...(takesCash ? { payment: 'paid' as const, collectedOnRound: true } : {}) }
        : o,
    ),
  };
}

function addRegulars(state: WaterState, day: string, unitPrice: number, prefix: string): WaterState {
  const due = dueRegulars(state, day);
  if (due.length === 0) return state;
  let seq = state.nextOrderSeq;
  const added: WaterOrder[] = due.map((c) => {
    const order: WaterOrder = {
      id: `o${seq}`,
      number: `${prefix}-${seq}`,
      customerId: c.id,
      date: day,
      quantity: c.schedule!.quantity,
      unitPrice,
      delivery: 'pending',
      payment: 'unpaid',
      fromSchedule: true,
    };
    seq += 1;
    return order;
  });
  return { ...state, orders: [...added, ...state.orders], nextOrderSeq: seq };
}
