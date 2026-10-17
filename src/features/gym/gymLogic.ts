import type { CheckIn, GymBook, GymPayment, IsoDay, Member, Membership, Paise, PaymentMethod, Plan, PlanId } from '../../types/gym';
import { addDays, daysBetween } from '../../utils/dates';
import { formatAmount, formatDate } from '../../utils/format';
import { parseMoney, toRupees } from '../invoices/money';

/*
 * Gym Membership Management — business rules shared by every screen.
 *
 * Calendar
 *   - Dates are calendar days (YYYY-MM-DD), compared as strings: no time zones.
 *   - Adding months keeps the day of the month. If that day doesn't exist in the
 *     target month it becomes the month's last day (31 Jan + 1 month = 28 Feb, or
 *     29 Feb in a leap year). It never spills into the following month.
 *   - A membership of N months starting on S runs from S up to and including the
 *     day before S + N months. 15 Jan monthly → 14 Feb. 31 Jan monthly → 27 Feb
 *     (the day before 28 Feb), and the next one starts on 28 Feb.
 *
 * Status on a date
 *   - Active: a membership covers the date. "Valid until" follows renewals that
 *     start the day after the previous one ends.
 *   - Expiring soon: active, and valid until is at most 7 days away.
 *   - Expired: no membership covers the date and none starts later.
 *   - Starts later: the only membership begins after the date.
 *
 * Renewal
 *   - Before expiry (still valid on the renewal date): the new membership starts
 *     the day after the current valid-until date, so no paid day is lost.
 *   - After expiry: it starts on the renewal date.
 *   - Duplicate protection: a member who already has a renewal waiting to start,
 *     or who was already renewed today, can't be renewed again.
 *
 * Attendance
 *   - Only on the demo's today, at most one check-in per member per day.
 *   - Only members whose membership covers today. Expired members are refused with
 *     an explanation; check-in never renews anything.
 *
 * Money (integer paise)
 *   - Every membership, new or renewal, is one charge at the plan price.
 *   - Balance = charges − payments. A payment must be more than zero and no more
 *     than the balance at that moment, and reduces it once.
 *   - Payments are matched to memberships oldest first, only to show which
 *     membership is paid; it never changes the balance.
 */

export const EXPIRING_DAYS = 7;
export const MAX_START_DAYS_AHEAD = 30;
export const ATTENDANCE_DAYS = 14;

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

// ---------- Calendar ----------

export function isIsoDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y!, m! - 1, d!));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m! - 1 && date.getUTCDate() === d;
}

function daysInMonth(year: number, month1: number): number {
  return new Date(Date.UTC(year, month1, 0)).getUTCDate();
}

/** Same day of the month, n months later; clamped to the last day of a shorter month. */
export function addMonths(day: IsoDay, n: number): IsoDay {
  const [y, m, d] = day.split('-').map(Number);
  const total = y! * 12 + (m! - 1) + n;
  const year = Math.floor(total / 12);
  const month1 = (total % 12) + 1;
  const dd = Math.min(d!, daysInMonth(year, month1));
  return `${String(year).padStart(4, '0')}-${String(month1).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

/** Last day (inclusive) of a membership of `months` starting on `start`. */
export function membershipEnd(start: IsoDay, months: number): IsoDay {
  return addDays(addMonths(start, months), -1);
}

export function planOf(book: Pick<GymBook, 'plans'>, id: PlanId | string): Plan | undefined {
  return book.plans.find((p) => p.id === id);
}

// ---------- Status ----------

export type MemberStatus = 'active' | 'expiring' | 'expired' | 'upcoming' | 'none';

export const statusLabels: Record<MemberStatus, string> = {
  active: 'Active',
  expiring: 'Expiring soon',
  expired: 'Expired',
  upcoming: 'Starts later',
  none: 'No membership',
};

export interface StatusInfo {
  status: MemberStatus;
  /** The membership covering the date, if any. */
  current?: Membership;
  /** Last day covered without a gap (follows back-to-back renewals). */
  validUntil?: IsoDay;
  /** Days from the date to validUntil (0 = last day today). */
  daysLeft?: number;
  /** The most recent membership by start date. */
  latest?: Membership;
  /** A membership starting after the date (a renewal waiting to start, or a future start). */
  next?: Membership;
}

export function membershipsOf(book: Pick<GymBook, 'memberships'>, memberId: string): Membership[] {
  return book.memberships.filter((m) => m.memberId === memberId).sort((a, b) => a.start.localeCompare(b.start) || a.id.localeCompare(b.id));
}

export function statusOn(book: Pick<GymBook, 'memberships'>, memberId: string, date: IsoDay): StatusInfo {
  const list = membershipsOf(book, memberId);
  if (list.length === 0) return { status: 'none' };
  const latest = list[list.length - 1]!;
  const next = list.find((m) => m.start > date);
  const current = list.find((m) => m.start <= date && date <= m.end);
  if (current) {
    let validUntil = current.end;
    for (;;) {
      const follow = list.find((m) => m.start === addDays(validUntil, 1));
      if (!follow) break;
      validUntil = follow.end;
    }
    const daysLeft = daysBetween(date, validUntil);
    return { status: daysLeft <= EXPIRING_DAYS ? 'expiring' : 'active', current, validUntil, daysLeft, latest, ...(next ? { next } : {}) };
  }
  if (next) return { status: 'upcoming', latest, next };
  return { status: 'expired', latest };
}

/** Covered on the date (active or expiring soon). */
export const isCovered = (s: MemberStatus) => s === 'active' || s === 'expiring';

// ---------- Money ----------

export interface Ledger {
  charges: Paise;
  paid: Paise;
  balance: Paise;
}

export function ledgerOf(book: Pick<GymBook, 'memberships' | 'payments'>, memberId: string): Ledger {
  const charges = book.memberships.filter((m) => m.memberId === memberId).reduce((s, m) => s + m.pricePaise, 0);
  const paid = book.payments.filter((p) => p.memberId === memberId).reduce((s, p) => s + p.amountPaise, 0);
  return { charges, paid, balance: charges - paid };
}

export type MembershipPayState = 'paid' | 'part' | 'unpaid';

/** Payments matched to memberships oldest first, for display only. */
export function membershipPayments(book: Pick<GymBook, 'memberships' | 'payments'>, memberId: string): Map<string, { paid: Paise; state: MembershipPayState }> {
  let pool = book.payments.filter((p) => p.memberId === memberId).reduce((s, p) => s + p.amountPaise, 0);
  const out = new Map<string, { paid: Paise; state: MembershipPayState }>();
  for (const m of membershipsOf(book, memberId)) {
    const paid = Math.min(pool, m.pricePaise);
    pool -= paid;
    out.set(m.id, { paid, state: paid >= m.pricePaise ? 'paid' : paid > 0 ? 'part' : 'unpaid' });
  }
  return out;
}

// ---------- Rows and summaries ----------

export interface MemberRow {
  member: Member;
  info: StatusInfo;
  /** The membership shown in lists: the current one, otherwise the latest. */
  shown?: Membership;
  plan?: Plan;
  ledger: Ledger;
  lastCheckIn?: CheckIn;
  checkedInToday: boolean;
}

export function memberRow(book: GymBook, member: Member): MemberRow {
  const info = statusOn(book, member.id, book.today);
  const shown = info.current ?? info.next ?? info.latest;
  const plan = shown ? planOf(book, shown.planId) : undefined;
  const mine = book.checkIns.filter((c) => c.memberId === member.id).sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`));
  return {
    member,
    info,
    ...(shown ? { shown } : {}),
    ...(plan ? { plan } : {}),
    ledger: ledgerOf(book, member.id),
    ...(mine[0] ? { lastCheckIn: mine[0] } : {}),
    checkedInToday: mine.some((c) => c.date === book.today),
  };
}

export function memberRows(book: GymBook): MemberRow[] {
  return book.members.map((m) => memberRow(book, m)).sort((a, b) => a.member.name.localeCompare(b.member.name));
}

export function rowOf(book: GymBook, memberId: string): MemberRow | undefined {
  const m = book.members.find((x) => x.id === memberId);
  return m ? memberRow(book, m) : undefined;
}

export interface GymSummary {
  members: number;
  /** Covered today, including those expiring soon. */
  active: number;
  expiring: number;
  expired: number;
  upcoming: number;
  checkInsToday: number;
  outstanding: Paise;
  owing: number;
}

export function summarize(book: GymBook): GymSummary {
  const rows = book.members.map((m) => memberRow(book, m));
  const owing = rows.filter((r) => r.ledger.balance > 0);
  return {
    members: rows.length,
    active: rows.filter((r) => isCovered(r.info.status)).length,
    expiring: rows.filter((r) => r.info.status === 'expiring').length,
    expired: rows.filter((r) => r.info.status === 'expired').length,
    upcoming: rows.filter((r) => r.info.status === 'upcoming').length,
    checkInsToday: book.checkIns.filter((c) => c.date === book.today).length,
    outstanding: owing.reduce((s, r) => s + r.ledger.balance, 0),
    owing: owing.length,
  };
}

export type MemberFilter = 'all' | 'active' | 'expiring' | 'expired' | 'owes';

export const memberFilters: { value: MemberFilter; label: string }[] = [
  { value: 'all', label: 'All members' },
  { value: 'active', label: 'Active' },
  { value: 'expiring', label: 'Expiring soon' },
  { value: 'expired', label: 'Expired' },
  { value: 'owes', label: 'Owes money' },
];

/** "Active" includes members expiring soon, matching the dashboard figure. */
export function filterMembers(rows: MemberRow[], filter: MemberFilter, query = ''): MemberRow[] {
  const q = query.trim().toLowerCase();
  const digits = q.replace(/\D/g, '');
  return rows.filter((r) => {
    const s = r.info.status;
    if (filter === 'active' && !isCovered(s)) return false;
    if (filter === 'expiring' && s !== 'expiring') return false;
    if (filter === 'expired' && s !== 'expired') return false;
    if (filter === 'owes' && r.ledger.balance <= 0) return false;
    if (!q) return true;
    const m = r.member;
    return `${m.name} ${m.email}`.toLowerCase().includes(q) || (digits.length >= 3 && m.phone.replace(/\D/g, '').includes(digits));
  });
}

/** Members to renew: expiring soon (soonest first), then expired (most recent first). */
export function renewalsDue(book: GymBook): MemberRow[] {
  const rows = memberRows(book);
  const expiring = rows.filter((r) => r.info.status === 'expiring').sort((a, b) => (a.info.validUntil ?? '').localeCompare(b.info.validUntil ?? ''));
  const expired = rows.filter((r) => r.info.status === 'expired').sort((a, b) => (b.info.latest?.end ?? '').localeCompare(a.info.latest?.end ?? ''));
  return [...expiring, ...expired];
}

export interface CheckInRow {
  checkIn: CheckIn;
  member: Member;
}

export function checkInsOn(book: GymBook, date: IsoDay): CheckInRow[] {
  return book.checkIns
    .filter((c) => c.date === date)
    .sort((a, b) => b.time.localeCompare(a.time))
    .flatMap((c) => {
      const member = book.members.find((m) => m.id === c.memberId);
      return member ? [{ checkIn: c, member }] : [];
    });
}

export function attendanceStart(book: Pick<GymBook, 'today'>): IsoDay {
  return addDays(book.today, -(ATTENDANCE_DAYS - 1));
}

export type Activity =
  | { kind: 'joined' | 'renewed'; date: IsoDay; memberId: string; membership: Membership; order: number }
  | { kind: 'checkin'; date: IsoDay; memberId: string; time: string; order: number }
  | { kind: 'payment'; date: IsoDay; memberId: string; payment: GymPayment; order: number };

/** Newest first. Within a day: check-ins by time, other records in the order they were recorded. */
export function recentActivity(book: GymBook, limit = 8): Activity[] {
  const items: Activity[] = [
    ...book.memberships.map((m, i): Activity => ({ kind: m.kind === 'new' ? 'joined' : 'renewed', date: m.createdOn, memberId: m.memberId, membership: m, order: 1000 + i })),
    ...book.checkIns.map((c): Activity => ({ kind: 'checkin', date: c.date, memberId: c.memberId, time: c.time, order: Number(c.time.replace(':', '')) })),
    ...book.payments.map((p, i): Activity => ({ kind: 'payment', date: p.date, memberId: p.memberId, payment: p, order: 1000 + i })),
  ];
  return items.sort((a, b) => b.date.localeCompare(a.date) || b.order - a.order).slice(0, limit);
}

// ---------- Actions ----------

export type FieldErrors = Partial<Record<'member' | 'name' | 'phone' | 'email' | 'plan' | 'start' | 'amount' | 'method' | 'time' | 'renewal', string>>;
export type Result<T> = ({ ok: true; book: GymBook } & T) | { ok: false; errors: FieldErrors };

function nextId(prefix: string, taken: { id: string }[]): string {
  const ids = new Set(taken.map((t) => t.id));
  let n = taken.length + 1;
  while (ids.has(`${prefix}${n}`)) n += 1;
  return `${prefix}${n}`;
}

/** Validates an amount against what is owed. Empty text means "no payment" when `optional`. */
function checkAmount(text: string, owed: Paise, optional: boolean): { paise: Paise } | { error: string } | null {
  const raw = text.trim();
  if (!raw) return optional ? null : { error: 'Enter the amount received.' };
  if (/^-/.test(raw)) return { error: 'Enter an amount greater than zero.' };
  const p = parseMoney(raw);
  if (!p.ok) return { error: p.reason === 'too_large' ? `This is more than the ${money(owed)} owed.` : 'Use rupees and paise only, like 1500 or 1500.50.' };
  if (p.value <= 0) return { error: 'Enter an amount greater than zero.' };
  if (p.value > owed) return { error: owed > 0 ? `This is more than the ${money(owed)} owed.` : 'Nothing is owed, so no payment can be recorded.' };
  return { paise: p.value };
}

function paymentFor(book: GymBook, memberId: string, paise: Paise | undefined, method: string): GymPayment | undefined {
  return paise === undefined ? undefined : { id: nextId('p', book.payments), memberId, date: book.today, amountPaise: paise, method: method as PaymentMethod };
}

export interface MemberInput {
  name: string;
  phone: string;
  email: string;
}

export interface RegisterInput extends MemberInput {
  planId: string;
  start: string;
  /** Rupees received now; empty for none. */
  amount: string;
  method: string;
}

export function emptyRegisterInput(today: IsoDay): RegisterInput {
  return { name: '', phone: '', email: '', planId: 'monthly', start: today, amount: '', method: 'upi' };
}

export function isPhone(v: string): boolean {
  if (!/^\+?[\d\s().-]+$/.test(v)) return false;
  const n = v.replace(/\D/g, '').length;
  return n >= 6 && n <= 15;
}

export function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
}

export function validateMember(book: GymBook, input: MemberInput, editingId?: string): FieldErrors {
  const e: FieldErrors = {};
  const name = input.name.trim();
  if (!name) e.name = 'Enter the member’s name.';
  else if (name.length > 80) e.name = 'Keep the name under 80 characters.';
  const phone = input.phone.trim();
  const digits = phone.replace(/\D/g, '');
  if (!phone) e.phone = 'Enter a phone number.';
  else if (!isPhone(phone)) e.phone = 'Use digits, spaces or dashes, with an optional + and country code (6–15 digits).';
  else if (book.members.some((m) => m.id !== editingId && m.phone.replace(/\D/g, '') === digits)) e.phone = 'Another member already has this phone number.';
  const email = input.email.trim();
  if (email && !isEmail(email)) e.email = 'Enter an email like name@example.com, or leave it blank.';
  else if (email && book.members.some((m) => m.id !== editingId && m.email.toLowerCase() === email.toLowerCase())) e.email = 'Another member already has this email.';
  return e;
}

function cleanMember(input: MemberInput): MemberInput {
  return { name: input.name.trim().replace(/\s+/g, ' '), phone: input.phone.trim().replace(/\s+/g, ' '), email: input.email.trim() };
}

/** What registering with a plan and start date would create. */
export function previewNew(book: GymBook, planId: string, start: string) {
  const plan = planOf(book, planId);
  if (!plan || !isIsoDay(start)) return undefined;
  return { plan, start, end: membershipEnd(start, plan.months) };
}

/** Registers a member with their first membership (one charge), plus an optional payment. */
export function registerMember(book: GymBook, input: RegisterInput): Result<{ member: Member; membership: Membership; payment?: GymPayment }> {
  const errors = validateMember(book, input);
  const plan = planOf(book, input.planId);
  if (!plan) errors.plan = 'Choose a plan.';
  if (!isIsoDay(input.start)) errors.start = 'Choose a start date.';
  else if (input.start < book.today) errors.start = 'The membership can’t start before today.';
  else if (daysBetween(book.today, input.start) > MAX_START_DAYS_AHEAD) errors.start = `Choose a start within ${MAX_START_DAYS_AHEAD} days.`;
  let paise: Paise | undefined;
  if (plan) {
    const a = checkAmount(input.amount, plan.pricePaise, true);
    if (a && 'error' in a) errors.amount = a.error;
    else if (a) paise = a.paise;
  }
  if (paise !== undefined && !paymentMethods.some((m) => m.value === input.method)) errors.method = 'Choose how they paid.';
  if (Object.keys(errors).length) return { ok: false, errors };

  const member: Member = { id: nextId('m', book.members), ...cleanMember(input), joinedOn: book.today };
  const membership: Membership = { id: nextId('ms', book.memberships), memberId: member.id, planId: plan!.id, start: input.start, end: membershipEnd(input.start, plan!.months), pricePaise: plan!.pricePaise, kind: 'new', createdOn: book.today };
  const payment = paymentFor(book, member.id, paise, input.method);
  return {
    ok: true,
    member,
    membership,
    ...(payment ? { payment } : {}),
    book: { ...book, members: [...book.members, member], memberships: [...book.memberships, membership], payments: payment ? [...book.payments, payment] : book.payments },
  };
}

/** Edits contact details only; memberships and payments are records and aren't edited here. */
export function updateMember(book: GymBook, id: string, input: MemberInput): Result<{ member: Member }> {
  const existing = book.members.find((m) => m.id === id);
  if (!existing) return { ok: false, errors: { member: 'This member doesn’t exist.' } };
  const errors = validateMember(book, input, id);
  if (Object.keys(errors).length) return { ok: false, errors };
  const member: Member = { ...existing, ...cleanMember(input) };
  return { ok: true, member, book: { ...book, members: book.members.map((m) => (m.id === id ? member : m)) } };
}

/** Why a renewal is blocked, or undefined if it's allowed. */
export function renewalBlock(book: GymBook, memberId: string): string | undefined {
  const list = membershipsOf(book, memberId);
  const waiting = list.find((m) => m.kind === 'renewal' && m.start > book.today);
  if (waiting) return `Already renewed: the next membership starts on ${formatDate(waiting.start)}.`;
  if (list.some((m) => m.kind === 'renewal' && m.createdOn === book.today)) return 'Already renewed today.';
  if (list.some((m) => m.start > book.today)) return 'This membership hasn’t started yet.';
  return undefined;
}

export interface RenewalPreview {
  plan: Plan;
  start: IsoDay;
  end: IsoDay;
  /** Before expiry the renewal follows on from the current valid-until date; after expiry it starts today. */
  from: 'expiry' | 'today';
  charge: Paise;
  balanceBefore: Paise;
  owedAfter: Paise;
}

export function previewRenewal(book: GymBook, memberId: string, planId: string): RenewalPreview | undefined {
  const plan = planOf(book, planId);
  if (!plan || !book.members.some((m) => m.id === memberId)) return undefined;
  const info = statusOn(book, memberId, book.today);
  const from = isCovered(info.status) ? 'expiry' : 'today';
  const start = from === 'expiry' ? addDays(info.validUntil!, 1) : book.today;
  const balanceBefore = ledgerOf(book, memberId).balance;
  return { plan, start, end: membershipEnd(start, plan.months), from, charge: plan.pricePaise, balanceBefore, owedAfter: balanceBefore + plan.pricePaise };
}

export interface RenewInput {
  planId: string;
  amount: string;
  method: string;
}

/** Renews once: one new membership (one charge) that never shortens the current one, plus an optional payment. */
export function renewMembership(book: GymBook, memberId: string, input: RenewInput): Result<{ membership: Membership; payment?: GymPayment; from: 'expiry' | 'today' }> {
  if (!book.members.some((m) => m.id === memberId)) return { ok: false, errors: { member: 'This member doesn’t exist.' } };
  const block = renewalBlock(book, memberId);
  if (block) return { ok: false, errors: { renewal: block } };
  const errors: FieldErrors = {};
  const p = previewRenewal(book, memberId, input.planId);
  if (!p) errors.plan = 'Choose a plan.';
  let paise: Paise | undefined;
  if (p) {
    const a = checkAmount(input.amount, p.owedAfter, true);
    if (a && 'error' in a) errors.amount = a.error;
    else if (a) paise = a.paise;
  }
  if (paise !== undefined && !paymentMethods.some((m) => m.value === input.method)) errors.method = 'Choose how they paid.';
  if (Object.keys(errors).length || !p) return { ok: false, errors };
  const membership: Membership = { id: nextId('ms', book.memberships), memberId, planId: p.plan.id, start: p.start, end: p.end, pricePaise: p.charge, kind: 'renewal', createdOn: book.today };
  const payment = paymentFor(book, memberId, paise, input.method);
  return {
    ok: true,
    membership,
    from: p.from,
    ...(payment ? { payment } : {}),
    book: { ...book, memberships: [...book.memberships, membership], payments: payment ? [...book.payments, payment] : book.payments },
  };
}

export function isClock(v: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
}

/** Why a member can't check in today, or undefined if they can. */
export function checkInBlock(book: GymBook, memberId: string): string | undefined {
  const info = statusOn(book, memberId, book.today);
  if (book.checkIns.some((c) => c.memberId === memberId && c.date === book.today)) return 'Already checked in today.';
  if (info.status === 'expired') return `Membership expired on ${formatDate(info.latest!.end)}. Renew it before checking in.`;
  if (info.status === 'upcoming') return `Membership starts on ${formatDate(info.next!.start)}.`;
  if (info.status === 'none') return 'No membership yet.';
  return undefined;
}

/** Records today's check-in for a covered member, once per day. */
export function checkIn(book: GymBook, memberId: string, time: string): Result<{ checkIn: CheckIn }> {
  if (!book.members.some((m) => m.id === memberId)) return { ok: false, errors: { member: 'Choose a member.' } };
  const block = checkInBlock(book, memberId);
  if (block) return { ok: false, errors: { member: block } };
  if (!isClock(time)) return { ok: false, errors: { time: 'Enter a time like 07:30.' } };
  const record: CheckIn = { id: nextId('c', book.checkIns), memberId, date: book.today, time };
  return { ok: true, checkIn: record, book: { ...book, checkIns: [...book.checkIns, record] } };
}

/** Records a payment against a member's balance. */
export function recordPayment(book: GymBook, input: { memberId: string; amount: string; method: string }): Result<{ payment: GymPayment }> {
  if (!book.members.some((m) => m.id === input.memberId)) return { ok: false, errors: { member: 'Choose a member.' } };
  const errors: FieldErrors = {};
  const a = checkAmount(input.amount, ledgerOf(book, input.memberId).balance, false);
  let paise: Paise | undefined;
  if (a && 'error' in a) errors.amount = a.error;
  else if (a) paise = a.paise;
  if (!paymentMethods.some((m) => m.value === input.method)) errors.method = 'Choose how they paid.';
  if (Object.keys(errors).length || paise === undefined) return { ok: false, errors };
  const payment = paymentFor(book, input.memberId, paise, input.method)!;
  return { ok: true, payment, book: { ...book, payments: [...book.payments, payment] } };
}

/** All payments, newest first (same day: most recently recorded first). */
export function paymentLog(book: GymBook): GymPayment[] {
  return book.payments
    .map((p, i) => ({ p, i }))
    .sort((a, b) => (a.p.date === b.p.date ? b.i - a.i : a.p.date < b.p.date ? 1 : -1))
    .map(({ p }) => p);
}
