import type {
  Customer,
  DistributorBook,
  IsoDay,
  Line,
  MovementType,
  OrderStatus,
  Paise,
  Party,
  Payment,
  PaymentMethod,
  Product,
  Purchase,
  PurchaseStatus,
  SalesOrder,
  StockMovement,
  Supplier,
  Unit,
} from '../../types/distributor';
import { addDays, daysBetween } from '../../utils/dates';
import { formatAmount } from '../../utils/format';
import { parseMoney, toRupees } from '../invoices/money';

/*
 * Small Distributor Management — business rules shared by every screen.
 *
 * Stock (whole units of each product's unit: bags, cartons, cases…)
 *   - A product's stock is the sum of its stock movements. Nothing else stores
 *     stock. Movements are only written by moveStock(), which applies a whole
 *     batch of movements or none, and refuses any that would take a product
 *     below zero.
 *   - Opening stock + received purchases + adjustments in − fulfilled sales
 *     − adjustments out = current stock, for every product.
 *   - Low stock: an active product at or below its reorder level.
 *   - Inventory value (cost) = stock × the product's current purchase cost.
 *     Potential sales value = stock × current selling price. Neither is revenue.
 *
 * Purchases
 *   - Draft → Received, or Draft → Cancelled. Only drafts can be edited.
 *   - Receiving adds every line to stock once, dated the day it's received, and
 *     sets the due date from the supplier's credit days. A received purchase
 *     can't be received again, edited or cancelled.
 *
 * Sales orders
 *   - Draft → Confirmed → Fulfilled; drafts and confirmed orders can be
 *     cancelled or edited. Fulfilled and cancelled orders are final.
 *   - Stock is deducted once, when an order is fulfilled (delivered). Confirming
 *     checks there's enough stock not already promised to other confirmed
 *     orders, but deducts nothing. Fulfilment checks the stock on hand and is
 *     all-or-nothing: no partial fulfilment.
 *
 * Lines
 *   - Product name, SKU, unit and price/cost are copied onto each line when the
 *     document is saved, so later product edits never rewrite history.
 *   - Only active products, suppliers and customers can be used on new or
 *     edited documents. No tax or discount: total = sum of the lines.
 *
 * Money (integer paise)
 *   - Sales = fulfilled orders by fulfilment date. Purchases = received
 *     purchases by receiving date. Collected and paid are actual payments by
 *     payment date. These are always shown separately.
 *   - Payments are recorded against a fulfilled order (from the customer) or a
 *     received purchase (to the supplier). Drafts, confirmed orders and
 *     cancelled documents owe nothing and can't be paid.
 *   - A payment is more than ₹0 and no more than the balance. Each payment form
 *     carries a request id, so submitting twice records it once. Payments
 *     can't be edited or deleted in this demo.
 *   - Receivable = fulfilled orders − customer payments; payable = received
 *     purchases − supplier payments. Overdue = balance left after the due date.
 */

export const MIN_DATE = '2026-08-01';
export const MAX_QTY = 100_000;
export const MAX_LINES = 20;

export const units: { value: Unit; label: string; plural: string }[] = [
  { value: 'piece', label: 'Piece', plural: 'pieces' },
  { value: 'pack', label: 'Pack', plural: 'packs' },
  { value: 'box', label: 'Box', plural: 'boxes' },
  { value: 'carton', label: 'Carton', plural: 'cartons' },
  { value: 'case', label: 'Case', plural: 'cases' },
  { value: 'bag', label: 'Bag', plural: 'bags' },
];

export const paymentMethods: { value: PaymentMethod; label: string }[] = [
  { value: 'upi', label: 'UPI' },
  { value: 'bank', label: 'Bank transfer' },
  { value: 'cash', label: 'Cash' },
];

export type AdjustReason = 'count' | 'damaged' | 'expired' | 'sample' | 'other';
export const adjustReasons: { value: AdjustReason; label: string; directions: ('in' | 'out')[] }[] = [
  { value: 'count', label: 'Stock count correction', directions: ['in', 'out'] },
  { value: 'damaged', label: 'Damaged in storage', directions: ['out'] },
  { value: 'expired', label: 'Expired', directions: ['out'] },
  { value: 'sample', label: 'Free samples given', directions: ['out'] },
  { value: 'other', label: 'Other (explain in the note)', directions: ['in', 'out'] },
];

export const movementLabels: Record<MovementType, string> = {
  opening: 'Opening stock',
  purchase: 'Purchase received',
  sale: 'Order delivered',
  adjustment: 'Adjustment',
};

export const purchaseStatusLabels: Record<PurchaseStatus, string> = { draft: 'Draft', received: 'Received', cancelled: 'Cancelled' };
export const orderStatusLabels: Record<OrderStatus, string> = { draft: 'Draft', confirmed: 'Confirmed', fulfilled: 'Delivered', cancelled: 'Cancelled' };

export type Errors = Record<string, string>;
export type Result<T> = ({ ok: true; book: DistributorBook } & T) | { ok: false; errors: Errors };
const fail = (errors: Errors): { ok: false; errors: Errors } => ({ ok: false, errors });

// ---------- Formatting ----------

export function labelOf<T extends string>(list: { value: T; label: string }[], value: T): string {
  return list.find((x) => x.value === value)?.label ?? value;
}
export function money(paise: Paise): string {
  return formatAmount(toRupees(paise));
}
/** "₹1,500" (no paise when whole). */
export function rupees(paise: Paise): string {
  return money(paise).replace(/\.00$/, '');
}
export function unitText(unit: Unit, n: number): string {
  const u = units.find((x) => x.value === unit)!;
  return `${n.toLocaleString('en-IN')} ${n === 1 ? u.label.toLowerCase() : u.plural}`;
}
export function isIsoDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y!, m! - 1, d!));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m! - 1 && date.getUTCDate() === d;
}
const tidy = (v: string) => v.trim().replace(/\s+/g, ' ');

function nextId(prefix: string, taken: { id: string }[]): string {
  const ids = new Set(taken.map((t) => t.id));
  let n = taken.length + 1;
  while (ids.has(`${prefix}${n}`)) n += 1;
  return `${prefix}${n}`;
}

/** Next free reference: SO-1043, PO-2019. */
export function nextRef(book: DistributorBook, kind: 'order' | 'purchase'): string {
  const [prefix, start, list] = kind === 'order' ? ['SO-', 1001, book.orders] : ['PO-', 2001, book.purchases];
  let n = start;
  for (const d of list as { ref: string }[]) {
    const m = new RegExp(`^${prefix}(\\d+)$`).exec(d.ref);
    if (m) n = Math.max(n, Number(m[1]) + 1);
  }
  return `${prefix}${n}`;
}

export function productOf(book: DistributorBook, id: string): Product | undefined {
  return book.products.find((p) => p.id === id);
}
export function supplierOf(book: DistributorBook, id: string): Supplier | undefined {
  return book.suppliers.find((s) => s.id === id);
}
export function customerOf(book: DistributorBook, id: string): Customer | undefined {
  return book.customers.find((c) => c.id === id);
}

// ---------- Stock ----------

/** Stock on hand: the sum of the product's movements. */
export function stockOf(book: DistributorBook, productId: string): number {
  let n = 0;
  for (const m of book.movements) if (m.productId === productId) n += m.qty;
  return n;
}
export function stockMap(book: DistributorBook): Map<string, number> {
  const map = new Map<string, number>();
  for (const m of book.movements) map.set(m.productId, (map.get(m.productId) ?? 0) + m.qty);
  return map;
}

/** Quantity promised to confirmed (not yet delivered) orders, optionally ignoring one order. */
export function committedOf(book: DistributorBook, productId: string, exceptOrderId?: string): number {
  let n = 0;
  for (const o of book.orders) if (o.status === 'confirmed' && o.id !== exceptOrderId) for (const l of o.lines) if (l.productId === productId) n += l.qty;
  return n;
}

export interface MoveInput {
  productId: string;
  qty: number;
  type: MovementType;
  ref?: { kind: 'purchase' | 'order'; id: string };
  reason: string;
  note?: string;
  requestId?: string;
}

/**
 * The one inventory operation. Applies all movements or none: every quantity
 * must be a non-zero whole number and no product may end below zero.
 */
export function moveStock(book: DistributorBook, moves: MoveInput[]): Result<{ movements: StockMovement[] }> {
  if (moves.length === 0) return fail({ stock: 'Nothing to move.' });
  const stock = stockMap(book);
  const short: string[] = [];
  const after = new Map<string, number>();
  for (const m of moves) {
    const p = productOf(book, m.productId);
    if (!p) return fail({ stock: 'Unknown product.' });
    if (!Number.isInteger(m.qty) || m.qty === 0 || Math.abs(m.qty) > MAX_QTY) return fail({ stock: `Invalid quantity for ${p.name}.` });
    after.set(m.productId, (after.get(m.productId) ?? stock.get(m.productId) ?? 0) + m.qty);
  }
  for (const [id, n] of after) {
    if (n < 0) {
      const p = productOf(book, id)!;
      short.push(`${p.name} has ${unitText(p.unit, stock.get(id) ?? 0)}`);
    }
  }
  if (short.length) return fail({ stock: `Not enough stock: ${short.join('; ')}.` });
  let seq = book.movements.reduce((s, m) => Math.max(s, m.seq), 0);
  const running = new Map(stock);
  const created: StockMovement[] = [];
  const taken = [...book.movements];
  for (const m of moves) {
    seq += 1;
    const bal = (running.get(m.productId) ?? 0) + m.qty;
    running.set(m.productId, bal);
    const mv: StockMovement = {
      id: nextId('m', taken),
      seq,
      date: book.today,
      productId: m.productId,
      type: m.type,
      qty: m.qty,
      balanceAfter: bal,
      reason: m.reason,
      note: m.note ?? '',
      ...(m.ref ? { ref: m.ref } : {}),
      ...(m.requestId ? { requestId: m.requestId } : {}),
    };
    taken.push(mv);
    created.push(mv);
  }
  return { ok: true, book: { ...book, movements: [...book.movements, ...created] }, movements: created };
}

export interface Reconciliation {
  opening: number;
  received: number;
  adjustedIn: number;
  sold: number;
  adjustedOut: number;
  current: number;
  /** opening + received + adjusted in − sold − adjusted out */
  expected: number;
}
export function reconcile(book: DistributorBook, productId: string): Reconciliation {
  const r = { opening: 0, received: 0, adjustedIn: 0, sold: 0, adjustedOut: 0 };
  for (const m of book.movements) {
    if (m.productId !== productId) continue;
    if (m.type === 'opening') r.opening += m.qty;
    else if (m.type === 'purchase') r.received += m.qty;
    else if (m.type === 'sale') r.sold -= m.qty;
    else if (m.qty > 0) r.adjustedIn += m.qty;
    else r.adjustedOut -= m.qty;
  }
  return { ...r, current: stockOf(book, productId), expected: r.opening + r.received + r.adjustedIn - r.sold - r.adjustedOut };
}

export interface LedgerRow {
  movement: StockMovement;
  product: Product;
  refText?: string;
}
export function ledger(book: DistributorBook, filter: { productId?: string; type?: MovementType | 'all'; query?: string } = {}): LedgerRow[] {
  const q = filter.query?.trim().toLowerCase() ?? '';
  return [...book.movements]
    .sort((a, b) => b.seq - a.seq)
    .filter((m) => (!filter.productId || filter.productId === 'all' || m.productId === filter.productId) && (!filter.type || filter.type === 'all' || m.type === filter.type))
    .map((m) => {
      const refText = m.ref ? (m.ref.kind === 'purchase' ? book.purchases.find((p) => p.id === m.ref!.id)?.ref : book.orders.find((o) => o.id === m.ref!.id)?.ref) : undefined;
      return { movement: m, product: productOf(book, m.productId)!, ...(refText ? { refText } : {}) };
    })
    .filter((r) => !q || [r.product.name, r.product.sku, r.refText ?? '', r.movement.reason, r.movement.note].some((t) => t.toLowerCase().includes(q)));
}

export function adjustStock(book: DistributorBook, input: { productId: string; direction: 'in' | 'out' | ''; qty: string; reason: string; note: string; requestId: string }): Result<{ movement: StockMovement }> {
  const p = productOf(book, input.productId);
  if (!p) return fail({ product: 'Choose a product.' });
  if (input.requestId && book.movements.some((m) => m.requestId === input.requestId)) return fail({ form: 'This adjustment has already been saved.' });
  const e: Errors = {};
  if (input.direction !== 'in' && input.direction !== 'out') e.direction = 'Choose whether stock goes up or down.';
  const qty = parseCount(input.qty);
  if (typeof qty === 'string') e.qty = qty;
  const reason = adjustReasons.find((r) => r.value === input.reason);
  if (!reason) e.reason = 'Choose a reason.';
  else if ((input.direction === 'in' || input.direction === 'out') && !reason.directions.includes(input.direction)) e.reason = `“${reason.label}” can only reduce stock.`;
  const note = tidy(input.note);
  if (reason?.value === 'other' && !note) e.note = 'Explain the adjustment.';
  if (note.length > 200) e.note = 'Keep the note under 200 characters.';
  if (Object.keys(e).length) return fail(e);
  const signed = input.direction === 'in' ? (qty as number) : -(qty as number);
  const r = moveStock(book, [{ productId: p.id, qty: signed, type: 'adjustment', reason: reason!.label, note, requestId: input.requestId }]);
  if (!r.ok) return fail({ qty: `Only ${unitText(p.unit, stockOf(book, p.id))} in stock. Stock can’t go below zero.` });
  return { ok: true, book: r.book, movement: r.movements[0]! };
}

/** A whole, positive count of units; an error message otherwise. */
function parseCount(text: string): number | string {
  const t = text.replace(/[,\s]/g, '');
  if (!t) return 'Enter a quantity.';
  if (!/^\d+$/.test(t)) return /^\d*\.\d+$/.test(t) ? 'Use whole units. Stock is counted in whole packs.' : 'Enter a whole number.';
  const n = Number(t);
  if (n <= 0) return 'Enter a quantity greater than zero.';
  if (n > MAX_QTY) return `Enter at most ${MAX_QTY.toLocaleString('en-IN')}.`;
  return n;
}

// ---------- Products ----------

export interface ProductRow {
  product: Product;
  stock: number;
  committed: number;
  available: number;
  low: boolean;
  costValue: Paise;
  saleValue: Paise;
}
export function productRow(book: DistributorBook, p: Product, stock = stockOf(book, p.id)): ProductRow {
  const committed = committedOf(book, p.id);
  return { product: p, stock, committed, available: stock - committed, low: p.active && stock <= p.reorderLevel, costValue: stock * p.costPaise, saleValue: stock * p.pricePaise };
}
export function productRows(book: DistributorBook): ProductRow[] {
  const stock = stockMap(book);
  return [...book.products].sort((a, b) => a.sku.localeCompare(b.sku)).map((p) => productRow(book, p, stock.get(p.id) ?? 0));
}
export function categoriesOf(book: DistributorBook): string[] {
  return [...new Set(book.products.map((p) => p.category))].sort();
}
export function filterProducts(rows: ProductRow[], f: { query?: string; category?: string; status?: 'active' | 'inactive' | 'all'; stock?: 'all' | 'low' | 'out' }): ProductRow[] {
  const q = f.query?.trim().toLowerCase() ?? '';
  return rows.filter(
    (r) =>
      (!q || r.product.name.toLowerCase().includes(q) || r.product.sku.toLowerCase().includes(q) || r.product.category.toLowerCase().includes(q)) &&
      (!f.category || f.category === 'all' || r.product.category === f.category) &&
      (!f.status || f.status === 'all' || (f.status === 'active') === r.product.active) &&
      (!f.stock || f.stock === 'all' || (f.stock === 'low' ? r.low : r.stock === 0)),
  );
}

export interface ProductInput {
  sku: string;
  name: string;
  category: string;
  unit: Unit | '';
  price: string;
  cost: string;
  reorderLevel: string;
  openingStock: string;
  active: boolean;
}
export const emptyProduct = (): ProductInput => ({ sku: '', name: '', category: '', unit: '', price: '', cost: '', reorderLevel: '', openingStock: '0', active: true });
export function productToInput(p: Product): ProductInput {
  return { sku: p.sku, name: p.name, category: p.category, unit: p.unit, price: String(toRupees(p.pricePaise)), cost: String(toRupees(p.costPaise)), reorderLevel: String(p.reorderLevel), openingStock: '0', active: p.active };
}

function moneyError(text: string, what: string): string | Paise {
  const p = parseMoney(text);
  if (!p.ok) return p.reason === 'empty' ? `Enter the ${what}.` : p.reason === 'too_large' ? 'That amount is too large.' : 'Use rupees and paise, like 1250 or 1250.50.';
  if (p.value <= 0) return `Enter a ${what} greater than zero.`;
  return p.value;
}

export function validateProduct(book: DistributorBook, input: ProductInput, editingId?: string): Errors {
  const e: Errors = {};
  const sku = tidy(input.sku).toUpperCase();
  if (!sku) e.sku = 'Enter a SKU.';
  else if (!/^[A-Z0-9-]{2,20}$/.test(sku)) e.sku = 'Use 2–20 letters, numbers or dashes.';
  else if (book.products.some((p) => p.id !== editingId && p.sku.toUpperCase() === sku)) e.sku = 'Another product already uses this SKU.';
  const name = tidy(input.name);
  if (!name) e.name = 'Enter the product name.';
  else if (name.length > 80) e.name = 'Keep the name under 80 characters.';
  if (!tidy(input.category)) e.category = 'Enter a category.';
  if (!units.some((u) => u.value === input.unit)) e.unit = 'Choose a unit.';
  const price = moneyError(input.price, 'selling price');
  if (typeof price === 'string') e.price = price;
  const cost = moneyError(input.cost, 'purchase cost');
  if (typeof cost === 'string') e.cost = cost;
  const reorder = input.reorderLevel.trim();
  if (!/^\d+$/.test(reorder)) e.reorderLevel = 'Enter a whole number, or 0 for no reorder level.';
  else if (Number(reorder) > MAX_QTY) e.reorderLevel = `Enter at most ${MAX_QTY.toLocaleString('en-IN')}.`;
  if (!editingId) {
    const o = input.openingStock.trim();
    if (o && !/^\d+$/.test(o)) e.openingStock = 'Enter a whole number of units, or 0.';
    else if (Number(o) > MAX_QTY) e.openingStock = `Enter at most ${MAX_QTY.toLocaleString('en-IN')}.`;
  }
  return e;
}

function cleanProduct(input: ProductInput) {
  return {
    sku: tidy(input.sku).toUpperCase(),
    name: tidy(input.name),
    category: tidy(input.category),
    unit: input.unit as Unit,
    pricePaise: (parseMoney(input.price) as { value: Paise }).value,
    costPaise: (parseMoney(input.cost) as { value: Paise }).value,
    reorderLevel: Number(input.reorderLevel.trim()),
    active: input.active,
  };
}

/** Adds a product. Opening stock, if any, is written as an opening movement. */
export function createProduct(book: DistributorBook, input: ProductInput): Result<{ product: Product }> {
  const e = validateProduct(book, input);
  if (Object.keys(e).length) return fail(e);
  const product: Product = { id: nextId('p', book.products), ...cleanProduct(input) };
  let next: DistributorBook = { ...book, products: [...book.products, product] };
  const opening = Number(input.openingStock.trim() || '0');
  if (opening > 0) {
    const r = moveStock(next, [{ productId: product.id, qty: opening, type: 'opening', reason: 'Opening stock' }]);
    if (!r.ok) return fail({ openingStock: r.errors.stock ?? 'Couldn’t add opening stock.' });
    next = r.book;
  }
  return { ok: true, book: next, product };
}

/** Edits product details. Stock is unchanged (use an adjustment) and existing documents keep their copies. */
export function updateProduct(book: DistributorBook, id: string, input: ProductInput): Result<{ product: Product }> {
  const existing = productOf(book, id);
  if (!existing) return fail({ form: 'Product not found.' });
  const e = validateProduct(book, input, id);
  if (Object.keys(e).length) return fail(e);
  const product: Product = { ...existing, ...cleanProduct(input) };
  return { ok: true, book: { ...book, products: book.products.map((p) => (p.id === id ? product : p)) }, product };
}

// ---------- Suppliers and customers ----------

export interface PartyInput {
  name: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  creditDays: string;
  active: boolean;
}
export const emptyParty = (): PartyInput => ({ name: '', contactName: '', phone: '', email: '', address: '', notes: '', creditDays: '15', active: true });
export function partyToInput(p: Party): PartyInput {
  return { name: p.name, contactName: p.contactName, phone: p.phone, email: p.email, address: p.address, notes: p.notes, creditDays: String(p.creditDays), active: p.active };
}
export function isPhone(v: string): boolean {
  const t = v.trim();
  if (!/^\+?[\d\s-]+$/.test(t)) return false;
  const d = t.replace(/\D/g, '').length;
  return d >= 6 && d <= 15;
}
export function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}
export function normalizePhone(v: string): string {
  const t = v.trim().replace(/\s+/g, ' ');
  const d = t.replace(/\D/g, '');
  if (!t.startsWith('+') && d.length === 10) return `+91 ${d.slice(0, 5)} ${d.slice(5)}`;
  return t;
}

export type PartyKind = 'supplier' | 'customer';
const partyList = (book: DistributorBook, kind: PartyKind) => (kind === 'supplier' ? book.suppliers : book.customers);

export function validateParty(book: DistributorBook, kind: PartyKind, input: PartyInput, editingId?: string): Errors {
  const e: Errors = {};
  const name = tidy(input.name);
  if (!name) e.name = 'Enter the business name.';
  else if (name.length > 80) e.name = 'Keep the name under 80 characters.';
  else if (partyList(book, kind).some((p) => p.id !== editingId && p.name.toLowerCase() === name.toLowerCase())) e.name = `A ${kind} with this name already exists.`;
  if (!tidy(input.contactName)) e.contactName = 'Enter a contact person.';
  const phone = input.phone.trim();
  if (!phone) e.phone = 'Enter a phone number.';
  else if (!isPhone(phone)) e.phone = 'Use digits, spaces or dashes, with an optional + and country code (6–15 digits).';
  const email = input.email.trim();
  if (email && !isEmail(email)) e.email = 'Enter an email like name@example.com, or leave it blank.';
  if (tidy(input.address).length > 160) e.address = 'Keep the address under 160 characters.';
  if (tidy(input.notes).length > 300) e.notes = 'Keep notes under 300 characters.';
  const days = input.creditDays.trim();
  if (!/^\d+$/.test(days) || Number(days) > 120) e.creditDays = 'Enter 0 to 120 days.';
  return e;
}

export function saveParty(book: DistributorBook, kind: PartyKind, input: PartyInput, editingId?: string): Result<{ party: Party }> {
  const list = partyList(book, kind);
  const existing = editingId ? list.find((p) => p.id === editingId) : undefined;
  if (editingId && !existing) return fail({ form: 'Not found.' });
  const e = validateParty(book, kind, input, editingId);
  if (Object.keys(e).length) return fail(e);
  const party: Party = {
    id: existing?.id ?? nextId(kind === 'supplier' ? 's' : 'c', list),
    name: tidy(input.name),
    contactName: tidy(input.contactName),
    phone: normalizePhone(input.phone),
    email: input.email.trim().toLowerCase(),
    address: tidy(input.address),
    notes: tidy(input.notes),
    creditDays: Number(input.creditDays.trim()),
    active: input.active,
  };
  const next = existing ? list.map((p) => (p.id === party.id ? party : p)) : [...list, party];
  return { ok: true, book: kind === 'supplier' ? { ...book, suppliers: next } : { ...book, customers: next }, party };
}

// ---------- Lines ----------

export interface LineInput {
  productId: string;
  qty: string;
  /** Unit cost (purchase) or unit selling price (order), in rupees. */
  price: string;
}
export function lineTotal(l: Line): Paise {
  return l.qty * l.unitPaise;
}
export function docTotal(lines: Line[]): Paise {
  return lines.reduce((s, l) => s + lineTotal(l), 0);
}
export function lineToInput(l: Line): LineInput {
  return { productId: l.productId, qty: String(l.qty), price: String(toRupees(l.unitPaise)) };
}

/** Checks and snapshots lines. Only active products may appear on a new or edited document. */
function buildLines(book: DistributorBook, inputs: LineInput[], e: Errors): Line[] {
  const used = inputs.filter((l) => l.productId || l.qty.trim() || l.price.trim());
  if (used.length === 0) {
    e.lines = 'Add at least one product.';
    return [];
  }
  if (used.length > MAX_LINES) {
    e.lines = `Use at most ${MAX_LINES} lines.`;
    return [];
  }
  const seen = new Set<string>();
  const out: Line[] = [];
  inputs.forEach((l, i) => {
    if (!l.productId && !l.qty.trim() && !l.price.trim()) return;
    const p = productOf(book, l.productId);
    if (!p) e[`line${i}.product`] = 'Choose a product.';
    else if (!p.active) e[`line${i}.product`] = `${p.name} is inactive. Remove this line.`;
    else if (seen.has(p.id)) e[`line${i}.product`] = 'This product is already on another line.';
    if (p) seen.add(p.id);
    const qty = parseCount(l.qty);
    if (typeof qty === 'string') e[`line${i}.qty`] = qty;
    const price = moneyError(l.price, 'price');
    if (typeof price === 'string') e[`line${i}.price`] = price;
    if (p && typeof qty === 'number' && typeof price === 'number') out.push({ productId: p.id, sku: p.sku, name: p.name, unit: p.unit, qty, unitPaise: price });
  });
  if (!e.lines && Object.keys(e).some((k) => k.startsWith('line'))) e.lines = 'Fix the highlighted lines.';
  return out;
}

function checkHeader(book: DistributorBook, kind: 'order' | 'purchase', input: { partyId: string; ref: string; date: string; notes: string }, editingId: string | undefined, e: Errors) {
  const party = kind === 'order' ? customerOf(book, input.partyId) : supplierOf(book, input.partyId);
  const who = kind === 'order' ? 'customer' : 'supplier';
  if (!party) e.party = `Choose a ${who}.`;
  else if (!party.active) e.party = `${party.name} is inactive. Choose an active ${who}.`;
  const ref = tidy(input.ref).toUpperCase();
  const docs: { id: string; ref: string }[] = kind === 'order' ? book.orders : book.purchases;
  if (!ref) e.ref = 'Enter a reference number.';
  else if (!/^[A-Z0-9/-]{2,24}$/.test(ref)) e.ref = 'Use 2–24 letters, numbers, dashes or slashes.';
  else if (docs.some((d) => d.id !== editingId && d.ref.toUpperCase() === ref)) e.ref = `Another ${kind === 'order' ? 'order' : 'purchase'} already uses ${ref}.`;
  if (!isIsoDay(input.date)) e.date = 'Enter a date.';
  else if (input.date > book.today) e.date = 'The date can’t be in the future.';
  else if (input.date < MIN_DATE) e.date = 'Use a date from August 2026 onwards.';
  if (tidy(input.notes).length > 300) e.notes = 'Keep notes under 300 characters.';
  return ref;
}

// ---------- Payments (shared) ----------

export function paymentsFor(book: DistributorBook, direction: 'in' | 'out', docId: string): Payment[] {
  return book.payments.filter((p) => p.direction === direction && p.docId === docId).sort((a, b) => a.date.localeCompare(b.date));
}
export type PayState = 'not_due' | 'unpaid' | 'partial' | 'paid';
export const payStateLabels: Record<PayState, string> = { not_due: 'Nothing owed', unpaid: 'Unpaid', partial: 'Part paid', paid: 'Paid' };

// ---------- Purchases ----------

export interface PurchaseInput {
  supplierId: string;
  ref: string;
  date: string;
  notes: string;
  lines: LineInput[];
}
export function emptyPurchase(book: DistributorBook): PurchaseInput {
  return { supplierId: '', ref: nextRef(book, 'purchase'), date: book.today, notes: '', lines: [{ productId: '', qty: '', price: '' }] };
}
export function purchaseToInput(p: Purchase): PurchaseInput {
  return { supplierId: p.supplierId, ref: p.ref, date: p.date, notes: p.notes, lines: p.lines.map(lineToInput) };
}

export interface PurchaseRow {
  purchase: Purchase;
  supplier: Supplier;
  total: Paise;
  paid: Paise;
  /** Owed to the supplier: only for received purchases. */
  balance: Paise;
  pay: PayState;
  overdue: boolean;
  payments: Payment[];
}
export function purchaseRow(book: DistributorBook, p: Purchase): PurchaseRow {
  const total = docTotal(p.lines);
  const payments = paymentsFor(book, 'out', p.id);
  const paid = payments.reduce((s, x) => s + x.amountPaise, 0);
  const owed = p.status === 'received';
  const balance = owed ? total - paid : 0;
  return {
    purchase: p,
    supplier: supplierOf(book, p.supplierId)!,
    total,
    paid,
    balance,
    pay: !owed ? 'not_due' : balance <= 0 ? 'paid' : paid > 0 ? 'partial' : 'unpaid',
    overdue: owed && balance > 0 && !!p.dueDate && book.today > p.dueDate,
    payments,
  };
}
export function purchaseRows(book: DistributorBook): PurchaseRow[] {
  return [...book.purchases].sort((a, b) => b.date.localeCompare(a.date) || b.ref.localeCompare(a.ref)).map((p) => purchaseRow(book, p));
}
export function filterPurchases(rows: PurchaseRow[], f: { query?: string; status?: PurchaseStatus | 'all' | 'unpaid'; supplierId?: string }): PurchaseRow[] {
  const q = f.query?.trim().toLowerCase() ?? '';
  return rows.filter(
    (r) =>
      (!q || r.purchase.ref.toLowerCase().includes(q) || r.supplier.name.toLowerCase().includes(q) || r.purchase.lines.some((l) => l.name.toLowerCase().includes(q) || l.sku.toLowerCase().includes(q))) &&
      (!f.supplierId || f.supplierId === 'all' || r.purchase.supplierId === f.supplierId) &&
      (!f.status || f.status === 'all' || (f.status === 'unpaid' ? r.balance > 0 : r.purchase.status === f.status)),
  );
}

function buildPurchase(book: DistributorBook, input: PurchaseInput, editingId?: string): { errors: Errors; ref: string; lines: Line[] } {
  const errors: Errors = {};
  const ref = checkHeader(book, 'purchase', { partyId: input.supplierId, ref: input.ref, date: input.date, notes: input.notes }, editingId, errors);
  const lines = buildLines(book, input.lines, errors);
  return { errors, ref, lines };
}

/** Saves a new purchase as a draft, or receives it straight away (atomically) when `receive` is set. */
export function createPurchase(book: DistributorBook, input: PurchaseInput, opts: { receive?: boolean } = {}): Result<{ purchase: Purchase }> {
  const { errors, ref, lines } = buildPurchase(book, input);
  if (Object.keys(errors).length) return fail(errors);
  const purchase: Purchase = { id: nextId('pu', book.purchases), ref, supplierId: input.supplierId, date: input.date, lines, status: 'draft', notes: tidy(input.notes) };
  const next = { ...book, purchases: [...book.purchases, purchase] };
  if (!opts.receive) return { ok: true, book: next, purchase };
  const r = receivePurchase(next, purchase.id);
  if (!r.ok) return r;
  return { ok: true, book: r.book, purchase: r.purchase };
}

export function updatePurchase(book: DistributorBook, id: string, input: PurchaseInput): Result<{ purchase: Purchase }> {
  const existing = book.purchases.find((p) => p.id === id);
  if (!existing) return fail({ form: 'Purchase not found.' });
  if (existing.status !== 'draft') return fail({ form: `A ${purchaseStatusLabels[existing.status].toLowerCase()} purchase can’t be edited.` });
  const { errors, ref, lines } = buildPurchase(book, input, id);
  if (Object.keys(errors).length) return fail(errors);
  const purchase: Purchase = { ...existing, ref, supplierId: input.supplierId, date: input.date, lines, notes: tidy(input.notes) };
  return { ok: true, book: { ...book, purchases: book.purchases.map((p) => (p.id === id ? purchase : p)) }, purchase };
}

/** Draft → Received: adds every line to stock once and sets the due date. */
export function receivePurchase(book: DistributorBook, id: string): Result<{ purchase: Purchase }> {
  const existing = book.purchases.find((p) => p.id === id);
  if (!existing) return fail({ form: 'Purchase not found.' });
  if (existing.status === 'received') return fail({ form: `${existing.ref} was already received on ${existing.receivedOn}. Stock wasn’t added again.` });
  if (existing.status === 'cancelled') return fail({ form: `${existing.ref} is cancelled and can’t be received.` });
  if (existing.lines.length === 0) return fail({ form: 'This purchase has no lines.' });
  const r = moveStock(
    book,
    existing.lines.map((l) => ({ productId: l.productId, qty: l.qty, type: 'purchase' as const, ref: { kind: 'purchase' as const, id }, reason: `Received from ${supplierOf(book, existing.supplierId)?.name ?? 'supplier'}` })),
  );
  if (!r.ok) return fail({ form: r.errors.stock ?? 'Couldn’t add the stock.' });
  const credit = supplierOf(book, existing.supplierId)?.creditDays ?? 0;
  const purchase: Purchase = { ...existing, status: 'received', receivedOn: book.today, dueDate: addDays(book.today, credit) };
  return { ok: true, book: { ...r.book, purchases: r.book.purchases.map((p) => (p.id === id ? purchase : p)) }, purchase };
}

export function cancelPurchase(book: DistributorBook, id: string): Result<{ purchase: Purchase }> {
  const existing = book.purchases.find((p) => p.id === id);
  if (!existing) return fail({ form: 'Purchase not found.' });
  if (existing.status !== 'draft') return fail({ form: existing.status === 'received' ? 'A received purchase can’t be cancelled: its stock is already in the ledger.' : 'This purchase is already cancelled.' });
  const purchase: Purchase = { ...existing, status: 'cancelled', cancelledOn: book.today };
  return { ok: true, book: { ...book, purchases: book.purchases.map((p) => (p.id === id ? purchase : p)) }, purchase };
}

// ---------- Sales orders ----------

export interface OrderInput {
  customerId: string;
  ref: string;
  date: string;
  notes: string;
  lines: LineInput[];
}
export function emptyOrder(book: DistributorBook): OrderInput {
  return { customerId: '', ref: nextRef(book, 'order'), date: book.today, notes: '', lines: [{ productId: '', qty: '', price: '' }] };
}
export function orderToInput(o: SalesOrder): OrderInput {
  return { customerId: o.customerId, ref: o.ref, date: o.date, notes: o.notes, lines: o.lines.map(lineToInput) };
}

export interface OrderRow {
  order: SalesOrder;
  customer: Customer;
  total: Paise;
  received: Paise;
  /** Owed by the customer: only for delivered orders. */
  balance: Paise;
  pay: PayState;
  overdue: boolean;
  payments: Payment[];
}
export function orderRow(book: DistributorBook, o: SalesOrder): OrderRow {
  const total = docTotal(o.lines);
  const payments = paymentsFor(book, 'in', o.id);
  const received = payments.reduce((s, x) => s + x.amountPaise, 0);
  const owed = o.status === 'fulfilled';
  const balance = owed ? total - received : 0;
  return {
    order: o,
    customer: customerOf(book, o.customerId)!,
    total,
    received,
    balance,
    pay: !owed ? 'not_due' : balance <= 0 ? 'paid' : received > 0 ? 'partial' : 'unpaid',
    overdue: owed && balance > 0 && !!o.dueDate && book.today > o.dueDate,
    payments,
  };
}
export function orderRows(book: DistributorBook): OrderRow[] {
  return [...book.orders].sort((a, b) => b.date.localeCompare(a.date) || b.ref.localeCompare(a.ref)).map((o) => orderRow(book, o));
}
export function filterOrders(rows: OrderRow[], f: { query?: string; status?: OrderStatus | 'all' | 'unpaid' | 'open'; customerId?: string }): OrderRow[] {
  const q = f.query?.trim().toLowerCase() ?? '';
  return rows.filter(
    (r) =>
      (!q || r.order.ref.toLowerCase().includes(q) || r.customer.name.toLowerCase().includes(q) || r.order.lines.some((l) => l.name.toLowerCase().includes(q) || l.sku.toLowerCase().includes(q))) &&
      (!f.customerId || f.customerId === 'all' || r.order.customerId === f.customerId) &&
      (!f.status || f.status === 'all' || (f.status === 'unpaid' ? r.balance > 0 : f.status === 'open' ? r.order.status === 'draft' || r.order.status === 'confirmed' : r.order.status === f.status)),
  );
}

export interface Shortfall {
  line: Line;
  product: Product;
  onHand: number;
  committed: number;
  available: number;
}
/** Lines that can't be covered. For confirming, stock promised to other confirmed orders counts as taken. */
export function shortfalls(book: DistributorBook, order: Pick<SalesOrder, 'id' | 'lines'>, mode: 'confirm' | 'fulfil'): Shortfall[] {
  const out: Shortfall[] = [];
  for (const l of order.lines) {
    const product = productOf(book, l.productId)!;
    const onHand = stockOf(book, l.productId);
    const committed = mode === 'confirm' ? committedOf(book, l.productId, order.id) : 0;
    const available = onHand - committed;
    if (l.qty > available) out.push({ line: l, product, onHand, committed, available });
  }
  return out;
}
export function shortfallText(list: Shortfall[], mode: 'confirm' | 'fulfil'): string {
  const parts = list.map((s) => `${s.line.name}: needs ${unitText(s.line.unit, s.line.qty)}, ${mode === 'confirm' && s.committed ? `${Math.max(0, s.available)} free (${s.onHand} in stock, ${s.committed} promised to other confirmed orders)` : `${Math.max(0, s.onHand)} in stock`}`);
  return `Not enough stock. ${parts.join('; ')}.${mode === 'fulfil' ? ' Nothing was delivered or deducted.' : ''}`;
}

function buildOrder(book: DistributorBook, input: OrderInput, editingId?: string): { errors: Errors; ref: string; lines: Line[] } {
  const errors: Errors = {};
  const ref = checkHeader(book, 'order', { partyId: input.customerId, ref: input.ref, date: input.date, notes: input.notes }, editingId, errors);
  const lines = buildLines(book, input.lines, errors);
  return { errors, ref, lines };
}

/** Saves a new order as a draft, or confirmed (after the stock check) when `confirm` is set. */
export function createOrder(book: DistributorBook, input: OrderInput, opts: { confirm?: boolean } = {}): Result<{ order: SalesOrder }> {
  const { errors, ref, lines } = buildOrder(book, input);
  if (Object.keys(errors).length) return fail(errors);
  const order: SalesOrder = { id: nextId('o', book.orders), ref, customerId: input.customerId, date: input.date, lines, status: 'draft', notes: tidy(input.notes) };
  const next = { ...book, orders: [...book.orders, order] };
  if (!opts.confirm) return { ok: true, book: next, order };
  const r = confirmOrder(next, order.id);
  if (!r.ok) return fail({ lines: r.errors.form ?? 'Couldn’t confirm.' });
  return r;
}

/** Drafts and confirmed orders can be edited; a confirmed order is re-checked against free stock. */
export function updateOrder(book: DistributorBook, id: string, input: OrderInput): Result<{ order: SalesOrder }> {
  const existing = book.orders.find((o) => o.id === id);
  if (!existing) return fail({ form: 'Order not found.' });
  if (existing.status === 'fulfilled') return fail({ form: 'A delivered order can’t be edited: its stock and payments are on record.' });
  if (existing.status === 'cancelled') return fail({ form: 'A cancelled order can’t be edited.' });
  const { errors, ref, lines } = buildOrder(book, input, id);
  if (Object.keys(errors).length) return fail(errors);
  const order: SalesOrder = { ...existing, ref, customerId: input.customerId, date: input.date, lines, notes: tidy(input.notes) };
  if (existing.status === 'confirmed') {
    const short = shortfalls(book, order, 'confirm');
    if (short.length) return fail({ lines: shortfallText(short, 'confirm') });
  }
  return { ok: true, book: { ...book, orders: book.orders.map((o) => (o.id === id ? order : o)) }, order };
}

export function confirmOrder(book: DistributorBook, id: string): Result<{ order: SalesOrder }> {
  const existing = book.orders.find((o) => o.id === id);
  if (!existing) return fail({ form: 'Order not found.' });
  if (existing.status !== 'draft') return fail({ form: `This order is already ${orderStatusLabels[existing.status].toLowerCase()}.` });
  const c = customerOf(book, existing.customerId);
  if (!c?.active) return fail({ form: `${c?.name ?? 'This customer'} is inactive. Orders for inactive customers can’t be confirmed.` });
  const inactive = existing.lines.find((l) => !productOf(book, l.productId)?.active);
  if (inactive) return fail({ form: `${inactive.name} is inactive. Edit the order to remove it.` });
  const short = shortfalls(book, existing, 'confirm');
  if (short.length) return fail({ form: shortfallText(short, 'confirm') });
  const order: SalesOrder = { ...existing, status: 'confirmed', confirmedOn: book.today };
  return { ok: true, book: { ...book, orders: book.orders.map((o) => (o.id === id ? order : o)) }, order };
}

/** Confirmed → Delivered: deducts every line from stock once, or nothing at all. */
export function fulfilOrder(book: DistributorBook, id: string): Result<{ order: SalesOrder }> {
  const existing = book.orders.find((o) => o.id === id);
  if (!existing) return fail({ form: 'Order not found.' });
  if (existing.status === 'fulfilled') return fail({ form: `${existing.ref} was already delivered on ${existing.fulfilledOn}. Stock wasn’t deducted again.` });
  if (existing.status !== 'confirmed') return fail({ form: existing.status === 'draft' ? 'Confirm the order before delivering it.' : 'A cancelled order can’t be delivered.' });
  const short = shortfalls(book, existing, 'fulfil');
  if (short.length) return fail({ form: shortfallText(short, 'fulfil') });
  const r = moveStock(
    book,
    existing.lines.map((l) => ({ productId: l.productId, qty: -l.qty, type: 'sale' as const, ref: { kind: 'order' as const, id }, reason: `Delivered to ${customerOf(book, existing.customerId)?.name ?? 'customer'}` })),
  );
  if (!r.ok) return fail({ form: r.errors.stock ?? 'Not enough stock.' });
  const credit = customerOf(book, existing.customerId)?.creditDays ?? 0;
  const order: SalesOrder = { ...existing, status: 'fulfilled', fulfilledOn: book.today, dueDate: addDays(book.today, credit) };
  return { ok: true, book: { ...r.book, orders: r.book.orders.map((o) => (o.id === id ? order : o)) }, order };
}

export function cancelOrder(book: DistributorBook, id: string): Result<{ order: SalesOrder }> {
  const existing = book.orders.find((o) => o.id === id);
  if (!existing) return fail({ form: 'Order not found.' });
  if (existing.status === 'fulfilled') return fail({ form: 'A delivered order can’t be cancelled: its stock has left and it may have payments.' });
  if (existing.status === 'cancelled') return fail({ form: 'This order is already cancelled.' });
  const order: SalesOrder = { ...existing, status: 'cancelled', cancelledOn: book.today };
  return { ok: true, book: { ...book, orders: book.orders.map((o) => (o.id === id ? order : o)) }, order };
}

// ---------- Payments ----------

export interface PaymentInput {
  direction: 'in' | 'out';
  docId: string;
  amount: string;
  method: string;
  note: string;
  requestId: string;
}

/** Documents a payment can be recorded against right now: delivered orders or received purchases with a balance. */
export function payableDocs(book: DistributorBook, direction: 'in' | 'out'): (OrderRow | PurchaseRow)[] {
  const rows: (OrderRow | PurchaseRow)[] = direction === 'in' ? orderRows(book) : purchaseRows(book);
  return rows.filter((r) => r.balance > 0).sort((a, b) => Number(b.overdue) - Number(a.overdue) || (dueOf(a) ?? '').localeCompare(dueOf(b) ?? ''));
}
export function dueOf(r: OrderRow | PurchaseRow): IsoDay | undefined {
  return 'order' in r ? r.order.dueDate : r.purchase.dueDate;
}
export function docOf(r: OrderRow | PurchaseRow): { id: string; ref: string; partyName: string } {
  return 'order' in r ? { id: r.order.id, ref: r.order.ref, partyName: r.customer.name } : { id: r.purchase.id, ref: r.purchase.ref, partyName: r.supplier.name };
}

export function recordPayment(book: DistributorBook, input: PaymentInput): Result<{ payment: Payment; row: OrderRow | PurchaseRow }> {
  if (input.requestId && book.payments.some((p) => p.requestId === input.requestId)) return fail({ form: 'This payment has already been recorded.' });
  const e: Errors = {};
  let row: OrderRow | PurchaseRow | undefined;
  if (input.direction === 'in') {
    const o = book.orders.find((x) => x.id === input.docId);
    if (!o) e.doc = 'Choose an order.';
    else if (o.status !== 'fulfilled') e.doc = 'Payments are recorded against delivered orders only.';
    else row = orderRow(book, o);
  } else {
    const p = book.purchases.find((x) => x.id === input.docId);
    if (!p) e.doc = 'Choose a purchase.';
    else if (p.status !== 'received') e.doc = 'Payments are recorded against received purchases only.';
    else row = purchaseRow(book, p);
  }
  if (row && row.balance <= 0) e.doc = 'This is fully paid.';
  const raw = input.amount.trim();
  const parsed = parseMoney(raw);
  if (!raw) e.amount = 'Enter the amount.';
  else if (/^-/.test(raw)) e.amount = 'Enter an amount greater than zero.';
  else if (!parsed.ok) e.amount = parsed.reason === 'too_large' ? 'That amount is too large.' : 'Use rupees and paise, like 2500 or 2500.50.';
  else if (parsed.value <= 0) e.amount = 'Enter an amount greater than zero.';
  else if (row && row.balance > 0 && parsed.value > row.balance) e.amount = `That’s more than the ${money(row.balance)} still due.`;
  if (!paymentMethods.some((m) => m.value === input.method)) e.method = 'Choose how it was paid.';
  if (tidy(input.note).length > 120) e.note = 'Keep the note under 120 characters.';
  if (Object.keys(e).length || !row || !parsed.ok) return fail(e);
  const payment: Payment = {
    id: nextId('pay', book.payments),
    direction: input.direction,
    docId: input.docId,
    date: book.today,
    amountPaise: parsed.value,
    method: input.method as PaymentMethod,
    note: tidy(input.note),
    requestId: input.requestId,
  };
  const next = { ...book, payments: [...book.payments, payment] };
  const fresh = input.direction === 'in' ? orderRow(next, next.orders.find((o) => o.id === input.docId)!) : purchaseRow(next, next.purchases.find((p) => p.id === input.docId)!);
  return { ok: true, book: next, payment, row: fresh };
}

export interface PaymentRow {
  payment: Payment;
  ref: string;
  partyName: string;
  partyId: string;
}
export function paymentRows(book: DistributorBook): PaymentRow[] {
  return [...book.payments]
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id, undefined, { numeric: true }))
    .map((p) => {
      if (p.direction === 'in') {
        const o = book.orders.find((x) => x.id === p.docId)!;
        return { payment: p, ref: o.ref, partyName: customerOf(book, o.customerId)!.name, partyId: o.customerId };
      }
      const pu = book.purchases.find((x) => x.id === p.docId)!;
      return { payment: p, ref: pu.ref, partyName: supplierOf(book, pu.supplierId)!.name, partyId: pu.supplierId };
    });
}
export function filterPayments(rows: PaymentRow[], f: { query?: string; direction?: 'in' | 'out' | 'all'; method?: PaymentMethod | 'all'; from?: string; to?: string }): PaymentRow[] {
  const q = f.query?.trim().toLowerCase() ?? '';
  return rows.filter(
    (r) =>
      (!q || r.ref.toLowerCase().includes(q) || r.partyName.toLowerCase().includes(q)) &&
      (!f.direction || f.direction === 'all' || r.payment.direction === f.direction) &&
      (!f.method || f.method === 'all' || r.payment.method === f.method) &&
      (!f.from || r.payment.date >= f.from) &&
      (!f.to || r.payment.date <= f.to),
  );
}

// ---------- Balances ----------

export interface Outstanding {
  total: Paise;
  overdue: Paise;
  notDue: Paise;
  docs: number;
  parties: number;
}
function outstandingOf(rows: { balance: Paise; overdue: boolean; partyId: string }[]): Outstanding {
  const o = { total: 0, overdue: 0, notDue: 0, docs: 0 };
  const parties = new Set<string>();
  for (const r of rows) {
    if (r.balance <= 0) continue;
    o.total += r.balance;
    if (r.overdue) o.overdue += r.balance;
    else o.notDue += r.balance;
    o.docs += 1;
    parties.add(r.partyId);
  }
  return { ...o, parties: parties.size };
}
export function receivables(book: DistributorBook, customerId?: string): Outstanding {
  return outstandingOf(orderRows(book).filter((r) => !customerId || r.order.customerId === customerId).map((r) => ({ balance: r.balance, overdue: r.overdue, partyId: r.order.customerId })));
}
export function payables(book: DistributorBook, supplierId?: string): Outstanding {
  return outstandingOf(purchaseRows(book).filter((r) => !supplierId || r.purchase.supplierId === supplierId).map((r) => ({ balance: r.balance, overdue: r.overdue, partyId: r.purchase.supplierId })));
}

export interface PartyRow {
  party: Party;
  docs: number;
  /** Delivered orders (customers) or received purchases (suppliers), all time. */
  value: Paise;
  outstanding: Outstanding;
  lastDate?: IsoDay;
}
export function customerRows(book: DistributorBook): PartyRow[] {
  const rows = orderRows(book);
  return [...book.customers]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((c) => {
      const mine = rows.filter((r) => r.order.customerId === c.id && r.order.status !== 'cancelled');
      return { party: c, docs: mine.length, value: mine.filter((r) => r.order.status === 'fulfilled').reduce((s, r) => s + r.total, 0), outstanding: receivables(book, c.id), ...(mine[0] ? { lastDate: mine[0].order.date } : {}) };
    });
}
export function supplierRows(book: DistributorBook): PartyRow[] {
  const rows = purchaseRows(book);
  return [...book.suppliers]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((s) => {
      const mine = rows.filter((r) => r.purchase.supplierId === s.id && r.purchase.status !== 'cancelled');
      return { party: s, docs: mine.length, value: mine.filter((r) => r.purchase.status === 'received').reduce((x, r) => x + r.total, 0), outstanding: payables(book, s.id), ...(mine[0] ? { lastDate: mine[0].purchase.date } : {}) };
    });
}
export function filterParties(rows: PartyRow[], f: { query?: string; status?: 'active' | 'inactive' | 'all'; balance?: 'all' | 'owing' | 'overdue' }): PartyRow[] {
  const q = f.query?.trim().toLowerCase() ?? '';
  const digits = q.replace(/\D/g, '');
  return rows.filter(
    (r) =>
      (!q || [r.party.name, r.party.contactName, r.party.email, r.party.address].some((t) => t.toLowerCase().includes(q)) || (digits.length >= 3 && r.party.phone.replace(/\D/g, '').includes(digits))) &&
      (!f.status || f.status === 'all' || (f.status === 'active') === r.party.active) &&
      (!f.balance || f.balance === 'all' || (f.balance === 'owing' ? r.outstanding.total > 0 : r.outstanding.overdue > 0)),
  );
}

// ---------- Dashboard ----------

export type PeriodKey = 'mtd' | 'last7' | 'last30' | 'prev';
export const periodOptions: { value: PeriodKey; label: string }[] = [
  { value: 'mtd', label: 'This month so far' },
  { value: 'last7', label: 'Last 7 days' },
  { value: 'last30', label: 'Last 30 days' },
  { value: 'prev', label: 'Last month' },
];
export interface Range {
  from: IsoDay;
  to: IsoDay;
  label: string;
}
export function rangeFor(today: IsoDay, key: PeriodKey): Range {
  const fmt = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const d = (s: string) => fmt.format(new Date(`${s}T00:00:00Z`));
  const monthStart = `${today.slice(0, 8)}01`;
  let from: string;
  let to = today;
  if (key === 'mtd') from = monthStart;
  else if (key === 'last7') from = addDays(today, -6);
  else if (key === 'last30') from = addDays(today, -29);
  else {
    to = addDays(monthStart, -1);
    from = `${to.slice(0, 8)}01`;
  }
  return { from, to, label: `${d(from)} – ${d(to)} (${daysBetween(from, to) + 1} days)` };
}
const inRange = (day: string | undefined, r: Range) => !!day && day >= r.from && day <= r.to;

export interface Overview {
  activeProducts: number;
  lowStock: number;
  outOfStock: number;
  inventoryCost: Paise;
  inventorySaleValue: Paise;
  purchases: { value: Paise; count: number };
  paidOut: { value: Paise; count: number };
  sales: { value: Paise; count: number };
  collected: { value: Paise; count: number };
  receivables: Outstanding;
  payables: Outstanding;
}
export function overview(book: DistributorBook, range: Range): Overview {
  const rows = productRows(book);
  const sum = <T>(list: T[], f: (x: T) => number) => list.reduce((s, x) => s + f(x), 0);
  const received = book.purchases.filter((p) => p.status === 'received' && inRange(p.receivedOn, range));
  const delivered = book.orders.filter((o) => o.status === 'fulfilled' && inRange(o.fulfilledOn, range));
  const pin = book.payments.filter((p) => p.direction === 'in' && inRange(p.date, range));
  const pout = book.payments.filter((p) => p.direction === 'out' && inRange(p.date, range));
  return {
    activeProducts: rows.filter((r) => r.product.active).length,
    lowStock: rows.filter((r) => r.low).length,
    outOfStock: rows.filter((r) => r.product.active && r.stock === 0).length,
    inventoryCost: sum(rows, (r) => r.costValue),
    inventorySaleValue: sum(rows, (r) => r.saleValue),
    purchases: { value: sum(received, (p) => docTotal(p.lines)), count: received.length },
    paidOut: { value: sum(pout, (p) => p.amountPaise), count: pout.length },
    sales: { value: sum(delivered, (o) => docTotal(o.lines)), count: delivered.length },
    collected: { value: sum(pin, (p) => p.amountPaise), count: pin.length },
    receivables: receivables(book),
    payables: payables(book),
  };
}

export function lowStockRows(book: DistributorBook): ProductRow[] {
  return productRows(book)
    .filter((r) => r.low)
    .sort((a, b) => a.stock / Math.max(1, a.product.reorderLevel) - b.stock / Math.max(1, b.product.reorderLevel));
}

export interface Activity {
  date: IsoDay;
  kind: 'received' | 'delivered' | 'payment_in' | 'payment_out' | 'adjustment';
  text: string;
  detail: string;
  amount?: Paise;
  seq: number;
}
/** Recent stock and money events, newest first. */
export function recentActivity(book: DistributorBook, limit = 8): Activity[] {
  const out: Activity[] = [];
  const firstSeq = (kind: 'purchase' | 'order', id: string) => book.movements.find((m) => m.ref?.kind === kind && m.ref.id === id)?.seq ?? 0;
  for (const p of book.purchases)
    if (p.status === 'received') out.push({ date: p.receivedOn!, kind: 'received', text: `${p.ref} stock received`, detail: supplierOf(book, p.supplierId)?.name ?? '', amount: docTotal(p.lines), seq: firstSeq('purchase', p.id) });
  for (const o of book.orders)
    if (o.status === 'fulfilled') out.push({ date: o.fulfilledOn!, kind: 'delivered', text: `${o.ref} delivered`, detail: customerOf(book, o.customerId)?.name ?? '', amount: docTotal(o.lines), seq: firstSeq('order', o.id) });
  for (const r of paymentRows(book))
    out.push({ date: r.payment.date, kind: r.payment.direction === 'in' ? 'payment_in' : 'payment_out', text: `${r.payment.direction === 'in' ? 'Payment from' : 'Payment to'} ${r.partyName}`, detail: `${r.ref} · ${labelOf(paymentMethods, r.payment.method)}`, amount: r.payment.amountPaise, seq: 1e6 + Number(r.payment.id.replace(/\D/g, '')) });
  for (const m of book.movements)
    if (m.type === 'adjustment') {
      const p = productOf(book, m.productId)!;
      out.push({ date: m.date, kind: 'adjustment', text: `${p.name} ${m.qty > 0 ? '+' : '−'}${Math.abs(m.qty)}`, detail: m.reason, seq: m.seq });
    }
  return out.sort((a, b) => b.date.localeCompare(a.date) || b.seq - a.seq).slice(0, limit);
}

export function daysUntil(today: IsoDay, day: IsoDay): number {
  return daysBetween(today, day);
}
