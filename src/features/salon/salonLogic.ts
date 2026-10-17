import type { Appointment, BookedService, CancelReason, Customer, IsoDay, Paise, PaymentMethod, SalonBook, SalonPayment, Service, ServiceCategory, Stylist } from '../../types/salon';
import { addDays, daysBetween, weekday } from '../../utils/dates';
import { formatAmount, formatDate } from '../../utils/format';
import { toRupees } from '../invoices/money';

/*
 * Salon Management — business rules shared by every screen.
 *
 * Time
 *   - Times are "HH:MM" on a calendar day; appointments start on a 15-minute
 *     step. Duration = the sum of the booked services; end = start + duration.
 *   - The salon is open 10:00–20:00 and closed on Tuesdays. An appointment must
 *     start at or after opening and finish by closing, on an open day.
 *   - New bookings and reschedules: today up to 60 days ahead.
 *
 * Conflicts (cancelled appointments never count)
 *   - A stylist can't have two appointments that overlap. Back-to-back is fine
 *     (one ends 11:00, the next starts 11:00).
 *   - A customer can't be in two overlapping appointments.
 *   - A stylist only does the service categories listed for them.
 *
 * Status
 *   - Booked → completed (checkout, on or before the demo's today) or cancelled.
 *   - Only booked appointments can be rescheduled or cancelled. Completed and
 *     cancelled appointments are final in this demo.
 *
 * Money (integer paise)
 *   - The appointment total is the sum of the prices copied onto it at booking,
 *     so later menu changes don't rewrite it.
 *   - Only a completed appointment can be paid, in full, once. One payment
 *     record per appointment.
 *   - Revenue for a day = payments recorded that day. Bookings and unpaid or
 *     cancelled appointments are never revenue.
 */

export const SLOT_MIN = 15;
export const MAX_DAYS_AHEAD = 60;

export const categories: { value: ServiceCategory; label: string }[] = [
  { value: 'hair', label: 'Hair' },
  { value: 'skin', label: 'Skin' },
  { value: 'nails', label: 'Nails' },
];

export const cancelReasons: { value: CancelReason; label: string }[] = [
  { value: 'customer', label: 'Customer cancelled' },
  { value: 'no_show', label: 'Didn’t turn up' },
  { value: 'salon', label: 'Salon cancelled' },
];

export const paymentMethods: { value: PaymentMethod; label: string }[] = [
  { value: 'upi', label: 'UPI' },
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
];

export function labelOf<T extends string>(list: { value: T; label: string }[], value: T): string {
  return list.find((x) => x.value === value)?.label ?? value;
}

export function money(paise: Paise): string {
  return formatAmount(toRupees(paise));
}

export function isIsoDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y!, m! - 1, d!));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m! - 1 && date.getUTCDate() === d;
}

export function isClock(v: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
}

export function toMinutes(clock: string): number {
  const [h, m] = clock.split(':').map(Number);
  return h! * 60 + m!;
}

export function fromMinutes(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}

/** "10:30 am". */
export function formatTime(clock: string): string {
  const m = toMinutes(clock);
  const h = Math.floor(m / 60);
  return `${((h + 11) % 12) + 1}:${String(m % 60).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
}

/** "1 h 15 min", "45 min". */
export function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return [h ? `${h} h` : '', m ? `${m} min` : ''].filter(Boolean).join(' ') || '0 min';
}

// ---------- Services, durations and totals ----------

/** Copies the current menu details onto a booking. */
export function snapshot(services: Service[]): BookedService[] {
  return services.map((s) => ({ serviceId: s.id, name: s.name, category: s.category, durationMin: s.durationMin, pricePaise: s.pricePaise }));
}

export function totalDuration(items: Pick<BookedService, 'durationMin'>[]): number {
  return items.reduce((s, x) => s + x.durationMin, 0);
}

export function totalPrice(items: Pick<BookedService, 'pricePaise'>[]): Paise {
  return items.reduce((s, x) => s + x.pricePaise, 0);
}

export function endOf(a: Pick<Appointment, 'start' | 'services'>): string {
  return fromMinutes(toMinutes(a.start) + totalDuration(a.services));
}

export function servicesText(items: Pick<BookedService, 'name'>[]): string {
  return items.map((s) => s.name).join(' + ');
}

export function isOpenDay(book: Pick<SalonBook, 'hours'>, date: IsoDay): boolean {
  return weekday(date) !== book.hours.closedWeekday;
}

/** Start times on the 15-minute step at which `duration` fits before closing. */
export function startTimes(book: Pick<SalonBook, 'hours'>, duration: number): string[] {
  const out: string[] = [];
  const last = toMinutes(book.hours.close) - Math.max(duration, SLOT_MIN);
  for (let m = toMinutes(book.hours.open); m <= last; m += SLOT_MIN) out.push(fromMinutes(m));
  return out;
}

// ---------- Queries ----------

const byTime = (a: Appointment, b: Appointment) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start) || a.id.localeCompare(b.id);

export function paymentFor(book: Pick<SalonBook, 'payments'>, appointmentId: string): SalonPayment | undefined {
  return book.payments.find((p) => p.appointmentId === appointmentId);
}

export type PayState = 'paid' | 'unpaid' | 'none';

/** Paid or unpaid for completed appointments; "none" otherwise (nothing is owed for a booking or a cancellation). */
export function payState(book: Pick<SalonBook, 'payments'>, a: Appointment): PayState {
  if (a.status !== 'completed') return 'none';
  return paymentFor(book, a.id) ? 'paid' : 'unpaid';
}

export interface AppointmentRow {
  appointment: Appointment;
  customer: Customer;
  stylist: Stylist;
  end: string;
  duration: number;
  total: Paise;
  pay: PayState;
}

export function rowFor(book: SalonBook, a: Appointment): AppointmentRow | undefined {
  const customer = book.customers.find((c) => c.id === a.customerId);
  const stylist = book.stylists.find((s) => s.id === a.stylistId);
  if (!customer || !stylist) return undefined;
  return { appointment: a, customer, stylist, end: endOf(a), duration: totalDuration(a.services), total: totalPrice(a.services), pay: payState(book, a) };
}

export function dayRows(book: SalonBook, date: IsoDay): AppointmentRow[] {
  return book.appointments
    .filter((a) => a.date === date)
    .sort(byTime)
    .flatMap((a) => {
      const r = rowFor(book, a);
      return r ? [r] : [];
    });
}

export interface DaySummary {
  /** Booked + completed (cancellations aren't appointments any more). */
  appointments: number;
  upcoming: number;
  completed: number;
  cancelled: number;
  unpaid: number;
  unpaidAmount: Paise;
  /** Payments recorded on the day. */
  revenue: Paise;
}

export function daySummary(book: SalonBook, date: IsoDay): DaySummary {
  const rows = dayRows(book, date);
  const unpaid = rows.filter((r) => r.pay === 'unpaid');
  return {
    appointments: rows.filter((r) => r.appointment.status !== 'cancelled').length,
    upcoming: rows.filter((r) => r.appointment.status === 'booked').length,
    completed: rows.filter((r) => r.appointment.status === 'completed').length,
    cancelled: rows.filter((r) => r.appointment.status === 'cancelled').length,
    unpaid: unpaid.length,
    unpaidAmount: unpaid.reduce((s, r) => s + r.total, 0),
    revenue: book.payments.filter((p) => p.date === date).reduce((s, p) => s + p.amountPaise, 0),
  };
}

/** Booked appointments after a day, soonest first. */
export function upcomingAfter(book: SalonBook, date: IsoDay, days = 7): AppointmentRow[] {
  const until = addDays(date, days);
  return book.appointments
    .filter((a) => a.status === 'booked' && a.date > date && a.date <= until)
    .sort(byTime)
    .flatMap((a) => {
      const r = rowFor(book, a);
      return r ? [r] : [];
    });
}

export type ScheduleFilter = 'all' | 'upcoming' | 'completed' | 'unpaid' | 'cancelled';

export const scheduleFilters: { value: ScheduleFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'completed', label: 'Completed' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function filterRows(rows: AppointmentRow[], filter: ScheduleFilter, stylistId = 'all', query = ''): AppointmentRow[] {
  const q = query.trim().toLowerCase();
  return rows.filter((r) => {
    const s = r.appointment.status;
    if (filter === 'upcoming' && s !== 'booked') return false;
    if (filter === 'completed' && s !== 'completed') return false;
    if (filter === 'cancelled' && s !== 'cancelled') return false;
    if (filter === 'unpaid' && r.pay !== 'unpaid') return false;
    if (stylistId !== 'all' && r.stylist.id !== stylistId) return false;
    if (!q) return true;
    return `${r.customer.name} ${r.customer.phone} ${servicesText(r.appointment.services)}`.toLowerCase().includes(q);
  });
}

// ---------- Customers ----------

export interface CustomerSummary {
  customer: Customer;
  visits: number;
  lastVisit?: IsoDay;
  next?: Appointment;
  /** Most booked service across completed visits (ties: most recent). */
  favourite?: string;
  spent: Paise;
  history: AppointmentRow[];
}

export function customerSummary(book: SalonBook, customer: Customer): CustomerSummary {
  const mine = book.appointments.filter((a) => a.customerId === customer.id).sort(byTime);
  const done = mine.filter((a) => a.status === 'completed');
  const counts = new Map<string, { n: number; last: string }>();
  for (const a of done) for (const s of a.services) counts.set(s.name, { n: (counts.get(s.name)?.n ?? 0) + 1, last: `${a.date}${a.start}` });
  const favourite = [...counts.entries()].sort((a, b) => b[1].n - a[1].n || b[1].last.localeCompare(a[1].last))[0]?.[0];
  const next = mine.find((a) => a.status === 'booked' && a.date >= book.today);
  const last = done[done.length - 1];
  return {
    customer,
    visits: done.length,
    ...(last ? { lastVisit: last.date } : {}),
    ...(next ? { next } : {}),
    ...(favourite ? { favourite } : {}),
    spent: book.payments.filter((p) => mine.some((a) => a.id === p.appointmentId)).reduce((s, p) => s + p.amountPaise, 0),
    history: [...mine].reverse().flatMap((a) => {
      const r = rowFor(book, a);
      return r ? [r] : [];
    }),
  };
}

export function customerSummaries(book: SalonBook): CustomerSummary[] {
  return book.customers.map((c) => customerSummary(book, c)).sort((a, b) => a.customer.name.localeCompare(b.customer.name));
}

export function searchCustomers(list: CustomerSummary[], query: string): CustomerSummary[] {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  const digits = q.replace(/\D/g, '');
  return list.filter((s) => `${s.customer.name} ${s.customer.email}`.toLowerCase().includes(q) || (digits.length >= 3 && s.customer.phone.replace(/\D/g, '').includes(digits)));
}

export function isPhone(v: string): boolean {
  if (!/^\+?[\d\s().-]+$/.test(v)) return false;
  const n = v.replace(/\D/g, '').length;
  return n >= 6 && n <= 15;
}

export function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
}

/**
 * Phone numbers are compared on their last 10 digits when both have at least
 * 10 (so "+91 98450 12345" and "098450 12345" match), otherwise on all digits.
 * Any country's format is accepted.
 */
export function samePhone(a: string, b: string): boolean {
  const x = a.replace(/\D/g, '');
  const y = b.replace(/\D/g, '');
  if (x.length >= 10 && y.length >= 10) return x.slice(-10) === y.slice(-10);
  return x === y;
}

export interface CustomerInput {
  name: string;
  phone: string;
  email: string;
  notes: string;
}

export const emptyCustomer = (): CustomerInput => ({ name: '', phone: '', email: '', notes: '' });

export type FieldErrors = Partial<
  Record<'appointment' | 'customer' | 'name' | 'phone' | 'email' | 'notes' | 'services' | 'stylist' | 'date' | 'start' | 'reason' | 'method' | 'amount', string>
>;
export type Result<T> = ({ ok: true; book: SalonBook } & T) | { ok: false; errors: FieldErrors };

function nextId(prefix: string, taken: { id: string }[]): string {
  const ids = new Set(taken.map((t) => t.id));
  let n = taken.length + 1;
  while (ids.has(`${prefix}${n}`)) n += 1;
  return `${prefix}${n}`;
}

export function validateCustomer(book: SalonBook, input: CustomerInput, editingId?: string): FieldErrors {
  const e: FieldErrors = {};
  const name = input.name.trim();
  if (!name) e.name = 'Enter the customer’s name.';
  else if (name.length > 80) e.name = 'Keep the name under 80 characters.';
  const phone = input.phone.trim();
  if (!phone) e.phone = 'Enter a phone number.';
  else if (!isPhone(phone)) e.phone = 'Use digits, spaces or dashes, with an optional + and country code (6–15 digits).';
  else {
    const dup = book.customers.find((c) => c.id !== editingId && samePhone(c.phone, phone));
    if (dup) e.phone = `${dup.name} already has this phone number.`;
  }
  const email = input.email.trim();
  if (email && !isEmail(email)) e.email = 'Enter an email like name@example.com, or leave it blank.';
  else if (email) {
    const dup = book.customers.find((c) => c.id !== editingId && c.email.toLowerCase() === email.toLowerCase());
    if (dup) e.email = `${dup.name} already has this email.`;
  }
  if (input.notes.length > 300) e.notes = 'Keep notes under 300 characters.';
  return e;
}

function cleanCustomer(input: CustomerInput) {
  return { name: input.name.trim().replace(/\s+/g, ' '), phone: input.phone.trim().replace(/\s+/g, ' '), email: input.email.trim(), notes: input.notes.trim() };
}

export function createCustomer(book: SalonBook, input: CustomerInput): Result<{ customer: Customer }> {
  const errors = validateCustomer(book, input);
  if (Object.keys(errors).length) return { ok: false, errors };
  const customer: Customer = { id: nextId('c', book.customers), ...cleanCustomer(input), createdOn: book.today };
  return { ok: true, customer, book: { ...book, customers: [...book.customers, customer] } };
}

export function updateCustomer(book: SalonBook, id: string, input: CustomerInput): Result<{ customer: Customer }> {
  const existing = book.customers.find((c) => c.id === id);
  if (!existing) return { ok: false, errors: { customer: 'This customer doesn’t exist.' } };
  const errors = validateCustomer(book, input, id);
  if (Object.keys(errors).length) return { ok: false, errors };
  const customer: Customer = { ...existing, ...cleanCustomer(input) };
  return { ok: true, customer, book: { ...book, customers: book.customers.map((c) => (c.id === id ? customer : c)) } };
}

// ---------- Booking rules ----------

export interface Slot {
  date: string;
  start: string;
  stylistId: string;
  customerId: string;
  /** For a booked appointment's snapshot or the current menu. */
  services: Pick<BookedService, 'durationMin' | 'category' | 'name'>[];
  /** Appointment being moved, so it doesn't conflict with itself. */
  ignoreId?: string;
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/** Validates date, time, opening hours, stylist skills and conflicts for a slot. */
export function checkSlot(book: SalonBook, slot: Slot): FieldErrors {
  const e: FieldErrors = {};
  const stylist = book.stylists.find((s) => s.id === slot.stylistId);
  if (!stylist) e.stylist = 'Choose a stylist.';
  if (!isIsoDay(slot.date)) e.date = 'Choose a date.';
  else if (slot.date < book.today) e.date = 'Choose today or a later date.';
  else if (daysBetween(book.today, slot.date) > MAX_DAYS_AHEAD) e.date = `Choose a date within ${MAX_DAYS_AHEAD} days.`;
  else if (!isOpenDay(book, slot.date)) e.date = 'The salon is closed on Tuesdays.';
  const duration = totalDuration(slot.services);
  if (!isClock(slot.start)) e.start = 'Choose a start time.';
  else if (toMinutes(slot.start) % SLOT_MIN !== 0) e.start = 'Start on the quarter hour (:00, :15, :30 or :45).';
  else if (toMinutes(slot.start) < toMinutes(book.hours.open)) e.start = `The salon opens at ${formatTime(book.hours.open)}.`;
  else if (toMinutes(slot.start) + duration > toMinutes(book.hours.close)) e.start = `This would end at ${formatTime(fromMinutes(toMinutes(slot.start) + duration))}, after closing at ${formatTime(book.hours.close)}.`;
  if (stylist && slot.services.length) {
    const cannot = slot.services.find((s) => !stylist.categories.includes(s.category));
    if (cannot) e.stylist = `${stylist.name} doesn’t do ${labelOf(categories, cannot.category).toLowerCase()} services such as ${cannot.name}.`;
  }
  if (!Object.keys(e).length) {
    const from = toMinutes(slot.start);
    const to = from + duration;
    const active = book.appointments.filter((a) => a.id !== slot.ignoreId && a.status !== 'cancelled' && a.date === slot.date);
    const clash = active.find((a) => a.stylistId === slot.stylistId && overlaps(from, to, toMinutes(a.start), toMinutes(endOf(a))));
    if (clash) {
      const who = book.customers.find((c) => c.id === clash.customerId)?.name ?? 'another customer';
      e.start = `${stylist!.name} is with ${who} from ${formatTime(clash.start)} to ${formatTime(endOf(clash))}.`;
    } else {
      const self = active.find((a) => a.customerId === slot.customerId && overlaps(from, to, toMinutes(a.start), toMinutes(endOf(a))));
      if (self) e.start = `This customer already has an appointment from ${formatTime(self.start)} to ${formatTime(endOf(self))}.`;
    }
  }
  return e;
}

/** Stylist-free start times for the given services (for the time picker). */
export function freeStartTimes(book: SalonBook, slot: Omit<Slot, 'start'>): string[] {
  if (!isIsoDay(slot.date) || !isOpenDay(book, slot.date)) return [];
  return startTimes(book, totalDuration(slot.services)).filter((start) => Object.keys(checkSlot(book, { ...slot, start })).length === 0);
}

export interface BookingInput {
  customerMode: 'existing' | 'new';
  customerId: string;
  customer: CustomerInput;
  serviceIds: string[];
  stylistId: string;
  date: string;
  start: string;
}

export function emptyBooking(today: IsoDay, customerId = ''): BookingInput {
  return { customerMode: 'existing', customerId, customer: emptyCustomer(), serviceIds: [], stylistId: '', date: today, start: '' };
}

/** Selected services in menu order. */
export function chosenServices(book: SalonBook, ids: string[]): Service[] {
  return book.services.filter((s) => ids.includes(s.id));
}

/** Books an appointment (and a new customer, if requested), with a snapshot of the selected services. */
export function bookAppointment(book: SalonBook, input: BookingInput): Result<{ appointment: Appointment; customer: Customer; isNewCustomer: boolean }> {
  const errors: FieldErrors = {};
  const services = chosenServices(book, input.serviceIds);
  if (services.length === 0) errors.services = 'Choose at least one service.';
  let customer: Customer | undefined;
  if (input.customerMode === 'new') Object.assign(errors, validateCustomer(book, input.customer));
  else {
    customer = book.customers.find((c) => c.id === input.customerId);
    if (!customer) errors.customer = 'Choose a customer, or add a new one.';
  }
  // Slot errors use their own keys (stylist, date, start), so nothing above is overwritten.
  Object.assign(errors, checkSlot(book, { date: input.date, start: input.start, stylistId: input.stylistId, customerId: customer?.id ?? '', services }));
  if (Object.keys(errors).length) return { ok: false, errors };

  let next = book;
  const isNewCustomer = input.customerMode === 'new';
  if (isNewCustomer) {
    const created = createCustomer(book, input.customer);
    if (!created.ok) return created;
    customer = created.customer;
    next = created.book;
  }
  const appointment: Appointment = { id: nextId('a', book.appointments), customerId: customer!.id, stylistId: input.stylistId, date: input.date, start: input.start, services: snapshot(services), status: 'booked' };
  return { ok: true, appointment, customer: customer!, isNewCustomer, book: { ...next, appointments: [...next.appointments, appointment] } };
}

function findBooked(book: SalonBook, id: string): Appointment | FieldErrors {
  const a = book.appointments.find((x) => x.id === id);
  if (!a) return { appointment: 'This appointment doesn’t exist.' };
  if (a.status === 'completed') return { appointment: 'This appointment is completed and can’t be changed.' };
  if (a.status === 'cancelled') return { appointment: 'This appointment was cancelled.' };
  return a;
}

/** Moves a booked appointment; the booked services and prices stay as they were. */
export function rescheduleAppointment(book: SalonBook, id: string, input: { date: string; start: string; stylistId: string }): Result<{ appointment: Appointment }> {
  const a = findBooked(book, id);
  if (!('id' in a)) return { ok: false, errors: a };
  if (a.date === input.date && a.start === input.start && a.stylistId === input.stylistId) return { ok: false, errors: { start: 'Choose a different date, time or stylist.' } };
  const errors = checkSlot(book, { ...input, customerId: a.customerId, services: a.services, ignoreId: a.id });
  if (Object.keys(errors).length) return { ok: false, errors };
  const appointment: Appointment = { ...a, date: input.date, start: input.start, stylistId: input.stylistId, movedFrom: { date: a.date, start: a.start, stylistId: a.stylistId } };
  return { ok: true, appointment, book: { ...book, appointments: book.appointments.map((x) => (x.id === id ? appointment : x)) } };
}

export function cancelAppointment(book: SalonBook, id: string, reason: string): Result<{ appointment: Appointment }> {
  const a = findBooked(book, id);
  if (!('id' in a)) return { ok: false, errors: a };
  if (!cancelReasons.some((r) => r.value === reason)) return { ok: false, errors: { reason: 'Choose why it was cancelled.' } };
  if (reason === 'no_show' && a.date > book.today) return { ok: false, errors: { reason: 'A future appointment can’t be a no-show.' } };
  const appointment: Appointment = { ...a, status: 'cancelled', cancelReason: reason as CancelReason };
  return { ok: true, appointment, book: { ...book, appointments: book.appointments.map((x) => (x.id === id ? appointment : x)) } };
}

/**
 * Checkout: marks a booked appointment completed (today or earlier only) and,
 * if a method is given, records full payment of its total in the same step.
 */
export function completeAppointment(book: SalonBook, id: string, payNow: { method: string } | null): Result<{ appointment: Appointment; payment?: SalonPayment }> {
  const a = findBooked(book, id);
  if (!('id' in a)) return { ok: false, errors: a };
  if (a.date > book.today) return { ok: false, errors: { appointment: `This appointment is on ${formatDate(a.date)}; it can be completed on the day.` } };
  if (payNow && !paymentMethods.some((m) => m.value === payNow.method)) return { ok: false, errors: { method: 'Choose how the customer paid.' } };
  const appointment: Appointment = { ...a, status: 'completed' };
  const after: SalonBook = { ...book, appointments: book.appointments.map((x) => (x.id === id ? appointment : x)) };
  if (!payNow) return { ok: true, appointment, book: after };
  const paid = recordPayment(after, id, payNow.method);
  if (!paid.ok) return paid;
  return { ok: true, appointment, payment: paid.payment, book: paid.book };
}

/** Records full payment for a completed appointment, once. */
export function recordPayment(book: SalonBook, appointmentId: string, method: string): Result<{ payment: SalonPayment }> {
  const a = book.appointments.find((x) => x.id === appointmentId);
  if (!a) return { ok: false, errors: { appointment: 'This appointment doesn’t exist.' } };
  if (a.status !== 'completed') return { ok: false, errors: { appointment: a.status === 'cancelled' ? 'A cancelled appointment can’t be paid.' : 'Complete the appointment before taking payment.' } };
  if (paymentFor(book, a.id)) return { ok: false, errors: { appointment: 'This appointment is already paid.' } };
  const amount = totalPrice(a.services);
  if (!(amount > 0)) return { ok: false, errors: { amount: 'There is nothing to pay for this appointment.' } };
  if (!paymentMethods.some((m) => m.value === method)) return { ok: false, errors: { method: 'Choose how the customer paid.' } };
  const payment: SalonPayment = { id: nextId('p', book.payments), appointmentId: a.id, date: book.today, amountPaise: amount, method: method as PaymentMethod };
  return { ok: true, payment, book: { ...book, payments: [...book.payments, payment] } };
}
