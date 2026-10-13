import type { CrmBook, Customer, CustomerStatus, Interaction, InteractionType, IsoDay } from '../../types/crm';
import { daysBetween } from '../../utils/dates';

/*
 * Simple CRM — rules shared by every screen.
 *
 * Pure functions only: they read a CrmBook and return derived rows, or validate
 * input and return a new book (never mutating the old one) or field errors.
 * The demo keeps the book in memory; nothing is stored or sent.
 */

export const customerStatuses: { value: CustomerStatus; label: string }[] = [
  { value: 'prospect', label: 'Prospect' },
  { value: 'active', label: 'Active customer' },
  { value: 'inactive', label: 'Inactive' },
];

export const interactionTypes: { value: InteractionType; label: string }[] = [
  { value: 'call', label: 'Call' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'email', label: 'Email' },
  { value: 'message', label: 'Message' },
  { value: 'note', label: 'Note' },
];

/**
 * "Not contacted recently": a prospect or active customer whose last recorded
 * interaction — or, if there is none, the day they were added — is more than
 * this many days ago. Inactive customers are never flagged.
 */
export const CATCH_UP_DAYS = 30;

const LIMITS = { name: 100, company: 100, role: 80, email: 254, city: 60, notes: 2000, tag: 24, tags: 8, summary: 500 };

// ---------- Small helpers ----------

/** Up to two initials: "Anjali Raman" → "AR", "Cher" → "C". */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase() || '?';
}

/** "wholesale, Corporate gifting,  wholesale" → ["wholesale", "corporate gifting"] */
export function parseTags(text: string): string[] {
  const seen = new Set<string>();
  for (const raw of text.split(',')) {
    const tag = raw.trim().replace(/\s+/g, ' ').toLowerCase();
    if (tag) seen.add(tag);
  }
  return [...seen];
}

/** A practical email check: one @, no spaces, a dot in the domain. */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= LIMITS.email;
}

/**
 * A phone number in any country's format: digits with optional spaces, dashes,
 * dots or brackets, and an optional leading +. Between 6 and 15 digits
 * (15 is the international maximum). No country is assumed.
 */
export function isValidPhone(phone: string): boolean {
  if (!/^\+?[\d\s().-]+$/.test(phone)) return false;
  const digits = phone.replace(/\D/g, '').length;
  return digits >= 6 && digits <= 15;
}

export function isIsoDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y!, m! - 1, d!));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m! - 1 && date.getUTCDate() === d;
}

// ---------- Derived rows ----------

export interface CustomerRow {
  customer: Customer;
  /** Date of the latest recorded interaction, if any. */
  lastContact: IsoDay | null;
  /** Latest of the last interaction and the last edit — "last updated" in the list. */
  lastActivity: IsoDay;
  interactionCount: number;
  /** Days since the last contact (or since being added, if never contacted). */
  daysSinceContact: number;
  /** See CATCH_UP_DAYS. */
  needsCatchUp: boolean;
}

/** A customer's interactions, newest first (same-day entries: most recently recorded first). */
export function historyFor(book: CrmBook, customerId: string): Interaction[] {
  return book.interactions
    .map((n, i) => ({ n, i }))
    .filter(({ n }) => n.customerId === customerId)
    .sort((a, b) => (a.n.date === b.n.date ? b.i - a.i : a.n.date < b.n.date ? 1 : -1))
    .map(({ n }) => n);
}

export function customerRow(book: CrmBook, customer: Customer): CustomerRow {
  const history = historyFor(book, customer.id);
  const lastContact = history[0]?.date ?? null;
  const lastActivity = lastContact && lastContact > customer.updatedOn ? lastContact : customer.updatedOn;
  const daysSinceContact = Math.max(0, daysBetween(lastContact ?? customer.addedOn, book.today));
  return {
    customer,
    lastContact,
    lastActivity,
    interactionCount: history.length,
    daysSinceContact,
    needsCatchUp: customer.status !== 'inactive' && daysSinceContact > CATCH_UP_DAYS,
  };
}

/** Every customer, most recently active first, then by name. */
export function customerRows(book: CrmBook): CustomerRow[] {
  return book.customers
    .map((c) => customerRow(book, c))
    .sort((a, b) => (a.lastActivity !== b.lastActivity ? (a.lastActivity < b.lastActivity ? 1 : -1) : a.customer.name.localeCompare(b.customer.name)));
}

export interface CrmOverview {
  total: number;
  prospects: number;
  active: number;
  inactive: number;
  needsCatchUp: number;
}

export function crmOverview(rows: CustomerRow[]): CrmOverview {
  const count = (s: CustomerStatus) => rows.filter((r) => r.customer.status === s).length;
  return {
    total: rows.length,
    prospects: count('prospect'),
    active: count('active'),
    inactive: count('inactive'),
    needsCatchUp: rows.filter((r) => r.needsCatchUp).length,
  };
}

export type StatusFilter = 'all' | CustomerStatus;

/** Search name, company, email, phone (digits), city and tags; then filter by status. */
export function filterCustomers(rows: CustomerRow[], query: string, status: StatusFilter): CustomerRow[] {
  const q = query.trim().toLowerCase();
  const qDigits = q.replace(/\D/g, '');
  return rows.filter(({ customer: c }) => {
    if (status !== 'all' && c.status !== status) return false;
    if (!q) return true;
    const text = [c.name, c.company, c.role, c.email, c.city, ...c.tags].filter(Boolean).join(' ').toLowerCase();
    if (text.includes(q)) return true;
    return qDigits.length >= 3 && /^[\d\s()+.-]+$/.test(q) && (c.phone ?? '').replace(/\D/g, '').includes(qDigits);
  });
}

export interface ActivityItem {
  interaction: Interaction;
  customer: Customer;
}

/** Latest interactions across all customers, for the overview. */
export function recentActivity(book: CrmBook, limit: number): ActivityItem[] {
  const byId = new Map(book.customers.map((c) => [c.id, c]));
  return book.interactions
    .map((n, i) => ({ n, i }))
    .sort((a, b) => (a.n.date === b.n.date ? b.i - a.i : a.n.date < b.n.date ? 1 : -1))
    .flatMap(({ n }) => {
      const customer = byId.get(n.customerId);
      return customer ? [{ interaction: n, customer }] : [];
    })
    .slice(0, limit);
}

// ---------- Editing customers ----------

/** The customer form's fields, as typed. */
export interface CustomerInput {
  name: string;
  company: string;
  role: string;
  email: string;
  phone: string;
  city: string;
  status: string;
  /** Comma-separated. */
  tags: string;
  notes: string;
}

export const emptyCustomerInput: CustomerInput = { name: '', company: '', role: '', email: '', phone: '', city: '', status: 'prospect', tags: '', notes: '' };

export function customerToInput(c: Customer): CustomerInput {
  return {
    name: c.name,
    company: c.company ?? '',
    role: c.role ?? '',
    email: c.email ?? '',
    phone: c.phone ?? '',
    city: c.city ?? '',
    status: c.status,
    tags: c.tags.join(', '),
    notes: c.notes ?? '',
  };
}

export type FieldErrors = Partial<Record<keyof CustomerInput | 'summary' | 'type' | 'date' | 'customer', string>>;
export type Result<T> = ({ ok: true; book: CrmBook } & T) | { ok: false; errors: FieldErrors };

function tooLong(value: string, max: number) {
  return value.length > max ? `Keep this under ${max} characters.` : undefined;
}

/**
 * Validates the form. Required: a name, a status, and at least one way to reach
 * the person (email or phone). Email must look like an address and must not
 * already belong to another customer; phone may be in any country's format.
 */
export function validateCustomer(book: CrmBook, input: CustomerInput, editingId?: string): FieldErrors {
  const errors: FieldErrors = {};
  const name = input.name.trim();
  const email = input.email.trim();
  const phone = input.phone.trim();

  if (!name) errors.name = 'Enter the customer’s name.';
  else errors.name = tooLong(name, LIMITS.name);

  errors.company = tooLong(input.company.trim(), LIMITS.company);
  errors.role = tooLong(input.role.trim(), LIMITS.role);
  errors.city = tooLong(input.city.trim(), LIMITS.city);

  if (email && !isValidEmail(email)) errors.email = 'Enter an email address like name@example.com.';
  else if (email && book.customers.some((c) => c.id !== editingId && c.email?.toLowerCase() === email.toLowerCase())) {
    errors.email = 'Another customer already uses this email address.';
  }
  if (phone && !isValidPhone(phone)) errors.phone = 'Use digits, spaces, dashes or brackets, with an optional + and country code (6–15 digits).';
  if (!email && !phone) errors.email = 'Add an email address or a phone number.';

  if (!customerStatuses.some((s) => s.value === input.status)) errors.status = 'Choose a status.';

  const tags = parseTags(input.tags);
  if (tags.length > LIMITS.tags) errors.tags = `Use up to ${LIMITS.tags} tags.`;
  else if (tags.some((t) => t.length > LIMITS.tag)) errors.tags = `Keep each tag under ${LIMITS.tag} characters.`;

  errors.notes = tooLong(input.notes.trim(), LIMITS.notes);

  for (const k of Object.keys(errors) as (keyof FieldErrors)[]) if (!errors[k]) delete errors[k];
  return errors;
}

function fromInput(input: CustomerInput): Omit<Customer, 'id' | 'addedOn' | 'updatedOn'> {
  const opt = (v: string) => (v.trim() ? v.trim().replace(/\s+/g, ' ') : undefined);
  const fields = {
    name: input.name.trim().replace(/\s+/g, ' '),
    company: opt(input.company),
    role: opt(input.role),
    email: opt(input.email)?.toLowerCase(),
    phone: opt(input.phone),
    city: opt(input.city),
    status: input.status as CustomerStatus,
    tags: parseTags(input.tags),
    notes: input.notes.trim() || undefined,
  };
  // Leave optional fields out entirely rather than storing undefined.
  return Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined)) as Omit<Customer, 'id' | 'addedOn' | 'updatedOn'>;
}

function nextId(prefix: string, taken: { id: string }[]): string {
  const ids = new Set(taken.map((t) => t.id));
  let n = taken.length + 1;
  while (ids.has(`${prefix}${n}`)) n += 1;
  return `${prefix}${n}`;
}

export function createCustomer(book: CrmBook, input: CustomerInput): Result<{ customer: Customer }> {
  const errors = validateCustomer(book, input);
  if (Object.keys(errors).length) return { ok: false, errors };
  const customer: Customer = { id: nextId('c', book.customers), ...fromInput(input), addedOn: book.today, updatedOn: book.today };
  return { ok: true, customer, book: { ...book, customers: [...book.customers, customer] } };
}

export function updateCustomer(book: CrmBook, id: string, input: CustomerInput): Result<{ customer: Customer }> {
  const existing = book.customers.find((c) => c.id === id);
  if (!existing) return { ok: false, errors: { customer: 'This customer no longer exists.' } };
  const errors = validateCustomer(book, input, id);
  if (Object.keys(errors).length) return { ok: false, errors };
  const customer: Customer = { id, ...fromInput(input), addedOn: existing.addedOn, updatedOn: book.today };
  return { ok: true, customer, book: { ...book, customers: book.customers.map((c) => (c.id === id ? customer : c)) } };
}

// ---------- Interactions ----------

export interface InteractionInput {
  customerId: string;
  type: string;
  date: string;
  summary: string;
}

/** Records what happened with a customer. Nothing is sent — this is a log entry only. */
export function addInteraction(book: CrmBook, input: InteractionInput): Result<{ interaction: Interaction }> {
  const errors: FieldErrors = {};
  if (!book.customers.some((c) => c.id === input.customerId)) errors.customer = 'This customer no longer exists.';
  if (!interactionTypes.some((t) => t.value === input.type)) errors.type = 'Choose what kind of interaction this was.';
  if (!isIsoDay(input.date)) errors.date = 'Choose the date it happened.';
  else if (input.date > book.today) errors.date = 'The date can’t be in the future.';
  const summary = input.summary.trim();
  if (!summary) errors.summary = 'Describe what happened.';
  else if (summary.length > LIMITS.summary) errors.summary = `Keep this under ${LIMITS.summary} characters.`;
  if (Object.keys(errors).length) return { ok: false, errors };

  const interaction: Interaction = {
    id: nextId('n', book.interactions),
    customerId: input.customerId,
    type: input.type as InteractionType,
    date: input.date,
    summary,
  };
  return { ok: true, interaction, book: { ...book, interactions: [...book.interactions, interaction] } };
}
