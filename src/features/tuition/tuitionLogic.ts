import type {
  AttendanceRecord,
  Batch,
  ClassSession,
  Enrolment,
  FeePayment,
  FeeRecord,
  IsoDay,
  Mark,
  Paise,
  PaymentMethod,
  Period,
  Student,
  TuitionBook,
  Weekday,
} from '../../types/tuition';
import { addDays, daysBetween, weekday } from '../../utils/dates';
import { formatAmount } from '../../utils/format';
import { parseMoney, toRupees } from '../invoices/money';

/*
 * Tuition Centre Management — business rules shared by every screen.
 *
 * Enrolment and eligibility
 *   - An enrolment runs from its start date until the day it ends (exclusive).
 *     Removing a student from a batch ends the enrolment today; it isn't deleted,
 *     so attendance and fees from before stay intact.
 *   - A student is eligible for a class session if an enrolment in that batch
 *     covers the session date and they hadn't left the centre by then.
 *   - One open enrolment per student per batch; a batch only takes students
 *     whose grade is within its grade range.
 *
 * Sessions and attendance
 *   - Each class is a session record, created from the batch's weekly schedule
 *     (Sep 2026 to 4 weeks ahead). Editing a schedule replaces future sessions
 *     that have no attendance; past ones never change.
 *   - Attendance can be taken for today's or past sessions. Every eligible
 *     student is marked present, late or absent, at most once per session;
 *     saving again updates the same records.
 *   - Attendance % = (present + late) ÷ eligible students in sessions where
 *     attendance was taken. Students who weren't enrolled don't count.
 *
 * Fees (integer paise)
 *   - A monthly fee record per student, batch and month, for every enrolment
 *     open at any point in that month. Its amount is copied from the
 *     student-specific fee or the batch fee when it's created, so later fee
 *     changes don't rewrite it. Due on the 25th, or 7 days after joining if
 *     that's later. A month can be generated more than once: existing records
 *     are skipped, never duplicated.
 *   - Paid = sum of payments for the record; balance = amount − paid.
 *   - Status: Paid (balance 0); Overdue (balance left after the due date);
 *     Part paid (some paid, not yet overdue); Due (nothing paid, not yet due).
 *   - A payment must be more than ₹0 and no more than the balance.
 *   - Fees collected in a month = payments dated in that month.
 */

export const DUE_DAY = 25;
export const GRADES = [5, 6, 7, 8, 9, 10, 11, 12];
export const SESSIONS_FROM = '2026-09-01';
export const SESSION_WEEKS_AHEAD = 4;

export const weekdays: { value: Weekday; short: string; long: string }[] = [
  { value: 1, short: 'Mon', long: 'Monday' },
  { value: 2, short: 'Tue', long: 'Tuesday' },
  { value: 3, short: 'Wed', long: 'Wednesday' },
  { value: 4, short: 'Thu', long: 'Thursday' },
  { value: 5, short: 'Fri', long: 'Friday' },
  { value: 6, short: 'Sat', long: 'Saturday' },
  { value: 0, short: 'Sun', long: 'Sunday' },
];

export const marks: { value: Mark; label: string }[] = [
  { value: 'present', label: 'Present' },
  { value: 'late', label: 'Late' },
  { value: 'absent', label: 'Absent' },
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

/** "₹1,500" (no paise when whole). */
export function rupees(paise: Paise): string {
  return money(paise).replace(/\.00$/, '');
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

export function formatTime(clock: string): string {
  const m = toMinutes(clock);
  const h = Math.floor(m / 60);
  return `${((h + 11) % 12) + 1}:${String(m % 60).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
}

export function endTime(start: string, durationMin: number): string {
  const m = toMinutes(start) + durationMin;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export function gradeText(from: number, to: number): string {
  return from === to ? `Grade ${from}` : `Grades ${from}–${to}`;
}

export function daysText(days: Weekday[]): string {
  return weekdays.filter((w) => days.includes(w.value)).map((w) => w.short).join(', ');
}

export function scheduleText(b: Pick<Batch, 'days' | 'start' | 'durationMin'>): string {
  return `${daysText(b.days)} · ${formatTime(b.start)}–${formatTime(endTime(b.start, b.durationMin))}`;
}

// ---------- Periods ----------

export function periodOf(day: IsoDay): Period {
  return day.slice(0, 7);
}

export function periodStart(p: Period): IsoDay {
  return `${p}-01`;
}

export function periodEnd(p: Period): IsoDay {
  return addDays(nextPeriod(p) + '-01', -1);
}

export function nextPeriod(p: Period): Period {
  const [y, m] = p.split('-').map(Number);
  return m === 12 ? `${y! + 1}-01` : `${y}-${String(m! + 1).padStart(2, '0')}`;
}

export function previousPeriod(p: Period): Period {
  const [y, m] = p.split('-').map(Number);
  return m === 1 ? `${y! - 1}-12` : `${y}-${String(m! - 1).padStart(2, '0')}`;
}

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "October 2026". */
export function formatPeriod(p: Period): string {
  const [y, m] = p.split('-').map(Number);
  return `${monthNames[m! - 1]} ${y}`;
}

// ---------- Lookups ----------

export const batchOf = (book: Pick<TuitionBook, 'batches'>, id: string) => book.batches.find((b) => b.id === id);
export const studentOf = (book: Pick<TuitionBook, 'students'>, id: string) => book.students.find((s) => s.id === id);
export const teacherOf = (book: Pick<TuitionBook, 'teachers'>, id: string) => book.teachers.find((t) => t.id === id);

export const isActiveStudent = (s: Student, on: IsoDay) => !s.leftOn || s.leftOn > on;

/** Enrolment covers a day (from inclusive, to exclusive). */
export const covers = (e: Enrolment, day: IsoDay) => e.from <= day && (!e.to || day < e.to);

export function openEnrolments(book: Pick<TuitionBook, 'enrolments'>, filter: { studentId?: string; batchId?: string }): Enrolment[] {
  return book.enrolments.filter((e) => !e.to && (!filter.studentId || e.studentId === filter.studentId) && (!filter.batchId || e.batchId === filter.batchId));
}

/** Students currently in a batch, by name. */
export function currentRoster(book: TuitionBook, batchId: string): { student: Student; enrolment: Enrolment }[] {
  return openEnrolments(book, { batchId })
    .flatMap((e) => {
      const student = studentOf(book, e.studentId);
      return student && isActiveStudent(student, book.today) ? [{ student, enrolment: e }] : [];
    })
    .sort((a, b) => a.student.name.localeCompare(b.student.name));
}

export function isEligible(book: TuitionBook, studentId: string, session: ClassSession): boolean {
  const s = studentOf(book, studentId);
  if (!s || !(!s.leftOn || session.date < s.leftOn)) return false;
  return book.enrolments.some((e) => e.studentId === studentId && e.batchId === session.batchId && covers(e, session.date));
}

/** Students who were enrolled on the session date, by name. Includes students who have since left. */
export function sessionRoster(book: TuitionBook, session: ClassSession): Student[] {
  const ids = new Set(book.enrolments.filter((e) => e.batchId === session.batchId).map((e) => e.studentId));
  return [...ids]
    .filter((id) => isEligible(book, id, session))
    .map((id) => studentOf(book, id)!)
    .sort((a, b) => a.name.localeCompare(b.name));
}

// ---------- Sessions ----------

const byStart = (a: ClassSession, b: ClassSession) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start) || a.batchId.localeCompare(b.batchId);

export function sessionsOn(book: TuitionBook, date: IsoDay): ClassSession[] {
  return book.sessions.filter((s) => s.date === date).sort(byStart);
}

export function sessionFor(book: TuitionBook, batchId: string, date: IsoDay): ClassSession | undefined {
  return book.sessions.find((s) => s.batchId === batchId && s.date === date);
}

export function batchSessions(book: TuitionBook, batchId: string): ClassSession[] {
  return book.sessions.filter((s) => s.batchId === batchId).sort(byStart);
}

/** Session records for a batch's weekly days from `from` to `to` (inclusive). */
export function scheduleSessions(batch: Batch, from: IsoDay, to: IsoDay, taken: { id: string }[]): ClassSession[] {
  const out: ClassSession[] = [];
  const ids = new Set(taken.map((t) => t.id));
  for (let d = from; d <= to; d = addDays(d, 1)) {
    if (!batch.days.includes(weekday(d) as Weekday)) continue;
    const id = `${batch.id}-${d}`;
    if (!ids.has(id)) out.push({ id, batchId: batch.id, date: d, start: batch.start, durationMin: batch.durationMin });
  }
  return out;
}

export function sessionHorizon(book: Pick<TuitionBook, 'today'>): IsoDay {
  return addDays(book.today, SESSION_WEEKS_AHEAD * 7);
}

/** Upcoming sessions from today (today's included), soonest first. */
export function upcomingSessions(book: TuitionBook, days = 7): ClassSession[] {
  const until = addDays(book.today, days);
  return book.sessions.filter((s) => s.date >= book.today && s.date <= until && batchOf(book, s.batchId)?.status === 'active').sort(byStart);
}

// ---------- Attendance ----------

export function marksFor(book: TuitionBook, sessionId: string): Map<string, AttendanceRecord> {
  return new Map(book.attendance.filter((a) => a.sessionId === sessionId).map((a) => [a.studentId, a]));
}

export interface SessionSummary {
  eligible: number;
  marked: number;
  present: number;
  late: number;
  absent: number;
  taken: boolean;
  /** (present + late) ÷ eligible, when taken. */
  rate: number | null;
}

export function sessionSummary(book: TuitionBook, session: ClassSession): SessionSummary {
  const roster = sessionRoster(book, session);
  const m = marksFor(book, session.id);
  const counted = roster.map((s) => m.get(s.id)?.mark).filter(Boolean) as Mark[];
  const present = counted.filter((x) => x === 'present').length;
  const late = counted.filter((x) => x === 'late').length;
  const absent = counted.filter((x) => x === 'absent').length;
  const taken = roster.length > 0 && counted.length === roster.length;
  return { eligible: roster.length, marked: counted.length, present, late, absent, taken, rate: taken ? (present + late) / roster.length : null };
}

export interface DayAttendance {
  sessions: number;
  taken: number;
  attended: number;
  eligible: number;
  rate: number | null;
}

/** Across the day's sessions where attendance was taken. */
export function dayAttendance(book: TuitionBook, date: IsoDay): DayAttendance {
  const list = sessionsOn(book, date).map((s) => sessionSummary(book, s));
  const taken = list.filter((s) => s.taken);
  const attended = taken.reduce((a, s) => a + s.present + s.late, 0);
  const eligible = taken.reduce((a, s) => a + s.eligible, 0);
  return { sessions: list.length, taken: taken.length, attended, eligible, rate: eligible ? attended / eligible : null };
}

/** A student's attendance across sessions they were eligible for and that were taken. */
export function studentAttendance(book: TuitionBook, studentId: string, batchId?: string) {
  const sessions = book.sessions.filter((s) => (!batchId || s.batchId === batchId) && s.date <= book.today && isEligible(book, studentId, s));
  const rows = sessions
    .map((s) => ({ session: s, mark: book.attendance.find((a) => a.sessionId === s.id && a.studentId === studentId)?.mark }))
    .filter((r) => r.mark)
    .sort((a, b) => byStart(b.session, a.session));
  const attended = rows.filter((r) => r.mark !== 'absent').length;
  return { rows, attended, total: rows.length, rate: rows.length ? attended / rows.length : null };
}

export function percent(rate: number | null): string {
  return rate === null ? '—' : `${Math.round(rate * 100)}%`;
}

export type FieldErrors = Partial<
  Record<
    'student' | 'batch' | 'session' | 'marks' | 'name' | 'grade' | 'school' | 'guardianName' | 'guardianPhone' | 'guardianEmail' | 'batches' | 'subject' | 'grades' | 'teacher' | 'days' | 'start' | 'duration' | 'room' | 'fee' | 'amount' | 'method' | 'period',
    string
  >
>;
export type Result<T> = ({ ok: true; book: TuitionBook } & T) | { ok: false; errors: FieldErrors };

function nextId(prefix: string, taken: { id: string }[]): string {
  const ids = new Set(taken.map((t) => t.id));
  let n = taken.length + 1;
  while (ids.has(`${prefix}${n}`)) n += 1;
  return `${prefix}${n}`;
}

/**
 * Saves attendance for one session: every eligible student must have a mark.
 * Existing records for the session are updated, never duplicated.
 */
export function saveAttendance(book: TuitionBook, sessionId: string, input: Record<string, string>): Result<{ created: number; updated: number }> {
  const session = book.sessions.find((s) => s.id === sessionId);
  if (!session) return { ok: false, errors: { session: 'This class doesn’t exist.' } };
  if (session.date > book.today) return { ok: false, errors: { session: 'Attendance can be taken on the day of the class.' } };
  const roster = sessionRoster(book, session);
  const ids = new Set(roster.map((s) => s.id));
  const stranger = Object.keys(input).find((id) => !ids.has(id));
  if (stranger) return { ok: false, errors: { marks: `${studentOf(book, stranger)?.name ?? 'That student'} wasn’t enrolled in this batch on that day.` } };
  const missing = roster.filter((s) => !marks.some((m) => m.value === input[s.id]));
  if (missing.length) return { ok: false, errors: { marks: `Mark every student. Not marked: ${missing.map((s) => s.name).join(', ')}.` } };
  const existing = marksFor(book, session.id);
  let created = 0;
  let updated = 0;
  const attendance = book.attendance.map((a) => {
    if (a.sessionId !== session.id || !ids.has(a.studentId)) return a;
    const mark = input[a.studentId] as Mark;
    if (mark !== a.mark) updated += 1;
    return { ...a, mark };
  });
  for (const s of roster) {
    if (existing.has(s.id)) continue;
    attendance.push({ id: nextId('at', attendance), sessionId: session.id, studentId: s.id, mark: input[s.id] as Mark });
    created += 1;
  }
  return { ok: true, created, updated, book: { ...book, attendance } };
}

// ---------- Fees ----------

export type FeeStatus = 'paid' | 'partial' | 'due' | 'overdue';

export const feeStatusLabels: Record<FeeStatus, string> = { paid: 'Paid', partial: 'Part paid', due: 'Due', overdue: 'Overdue' };

export interface FeeRow {
  fee: FeeRecord;
  student: Student;
  batch: Batch;
  paid: Paise;
  balance: Paise;
  status: FeeStatus;
  payments: FeePayment[];
}

export function feeStatus(fee: Pick<FeeRecord, 'amountPaise' | 'dueDate'>, paid: Paise, today: IsoDay): FeeStatus {
  const balance = fee.amountPaise - paid;
  if (balance <= 0) return 'paid';
  if (today > fee.dueDate) return 'overdue';
  return paid > 0 ? 'partial' : 'due';
}

export function feeRow(book: TuitionBook, fee: FeeRecord): FeeRow | undefined {
  const student = studentOf(book, fee.studentId);
  const batch = batchOf(book, fee.batchId);
  if (!student || !batch) return undefined;
  const payments = book.payments.filter((p) => p.feeId === fee.id).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const paid = payments.reduce((s, p) => s + p.amountPaise, 0);
  return { fee, student, batch, paid, balance: fee.amountPaise - paid, status: feeStatus(fee, paid, book.today), payments };
}

export function feeRows(book: TuitionBook): FeeRow[] {
  const order: Record<FeeStatus, number> = { overdue: 0, partial: 1, due: 2, paid: 3 };
  return book.fees
    .flatMap((f) => {
      const r = feeRow(book, f);
      return r ? [r] : [];
    })
    .sort((a, b) => b.fee.period.localeCompare(a.fee.period) || order[a.status] - order[b.status] || a.student.name.localeCompare(b.student.name) || a.batch.name.localeCompare(b.batch.name));
}

export type FeeFilter = { query?: string; batchId?: string; period?: string; status?: 'all' | FeeStatus | 'unpaid' };

export function filterFees(rows: FeeRow[], f: FeeFilter): FeeRow[] {
  const q = (f.query ?? '').trim().toLowerCase();
  return rows.filter((r) => {
    if (f.batchId && f.batchId !== 'all' && r.batch.id !== f.batchId) return false;
    if (f.period && f.period !== 'all' && r.fee.period !== f.period) return false;
    if (f.status === 'unpaid' && r.balance <= 0) return false;
    if (f.status && f.status !== 'all' && f.status !== 'unpaid' && r.status !== f.status) return false;
    if (q && !`${r.student.name} ${r.student.guardianName}`.toLowerCase().includes(q)) return false;
    return true;
  });
}

export interface FeeTotals {
  assessed: Paise;
  received: Paise;
  outstanding: Paise;
  overdue: Paise;
  owing: number;
}

export function feeTotals(rows: FeeRow[]): FeeTotals {
  return {
    assessed: rows.reduce((s, r) => s + r.fee.amountPaise, 0),
    received: rows.reduce((s, r) => s + r.paid, 0),
    outstanding: rows.reduce((s, r) => s + Math.max(0, r.balance), 0),
    overdue: rows.filter((r) => r.status === 'overdue').reduce((s, r) => s + r.balance, 0),
    owing: new Set(rows.filter((r) => r.balance > 0).map((r) => r.student.id)).size,
  };
}

/** Payments dated in the month: the only source of "fees collected". */
export function collectedIn(book: TuitionBook, p: Period): { total: Paise; count: number } {
  const list = book.payments.filter((x) => periodOf(x.date) === p);
  return { total: list.reduce((s, x) => s + x.amountPaise, 0), count: list.length };
}

export function periodsInUse(book: TuitionBook): Period[] {
  return [...new Set([...book.fees.map((f) => f.period), ...book.payments.map((p) => periodOf(p.date)), periodOf(book.today)])].sort().reverse();
}

export function dueDateFor(p: Period, from: IsoDay): IsoDay {
  const due = `${p}-${String(DUE_DAY).padStart(2, '0')}`;
  const joinGrace = addDays(from, 7);
  return periodOf(from) === p && joinGrace > due ? joinGrace : due;
}

/** The fee an enrolment would be charged for a month: student-specific, otherwise the batch fee. */
export function feeFor(book: TuitionBook, e: Enrolment): Paise {
  return e.feePaise ?? batchOf(book, e.batchId)?.monthlyFeePaise ?? 0;
}

function enrolmentInPeriod(e: Enrolment, p: Period): boolean {
  return e.from <= periodEnd(p) && (!e.to || e.to > periodStart(p));
}

/** Months whose fees can be generated: from the earliest in the ledger up to next month. */
export function generatablePeriods(book: TuitionBook): Period[] {
  const next = nextPeriod(periodOf(book.today));
  const out: Period[] = [];
  for (let p = next; out.length < 3; p = previousPeriod(p)) out.push(p);
  return out;
}

/**
 * Creates the month's fee records for every enrolment open during it (active
 * batch, student not left before the month). Records that already exist for
 * the same student, batch and month are skipped, so running it twice is safe.
 */
export function generateFees(book: TuitionBook, p: Period): Result<{ created: FeeRecord[]; skipped: number }> {
  if (!/^\d{4}-\d{2}$/.test(p)) return { ok: false, errors: { period: 'Choose a month.' } };
  if (p > nextPeriod(periodOf(book.today))) return { ok: false, errors: { period: `Fees can be generated up to ${formatPeriod(nextPeriod(periodOf(book.today)))}.` } };
  const created: FeeRecord[] = [];
  let skipped = 0;
  const fees = [...book.fees];
  for (const e of book.enrolments) {
    const batch = batchOf(book, e.batchId);
    const student = studentOf(book, e.studentId);
    if (!batch || batch.status !== 'active' || !student || (student.leftOn && student.leftOn <= periodStart(p)) || !enrolmentInPeriod(e, p)) continue;
    if (fees.some((f) => f.studentId === e.studentId && f.batchId === e.batchId && f.period === p)) {
      skipped += 1;
      continue;
    }
    const fee: FeeRecord = { id: nextId('f', fees), studentId: e.studentId, batchId: e.batchId, period: p, amountPaise: feeFor(book, e), dueDate: dueDateFor(p, e.from) };
    fees.push(fee);
    created.push(fee);
  }
  return { ok: true, created, skipped, book: { ...book, fees } };
}

function checkAmount(text: string, owed: Paise): { paise: Paise } | { error: string } {
  const raw = text.trim();
  if (!raw) return { error: 'Enter the amount received.' };
  if (/^-/.test(raw)) return { error: 'Enter an amount greater than zero.' };
  const p = parseMoney(raw);
  if (!p.ok) return { error: p.reason === 'too_large' ? `This is more than the ${money(owed)} still due.` : 'Use rupees and paise only, like 1500 or 1500.50.' };
  if (p.value <= 0) return { error: 'Enter an amount greater than zero.' };
  if (p.value > owed) return { error: owed > 0 ? `This is more than the ${money(owed)} still due.` : 'This fee is fully paid.' };
  return { paise: p.value };
}

/** Records a payment against one fee record: more than ₹0, no more than its balance. */
export function recordPayment(book: TuitionBook, input: { feeId: string; amount: string; method: string }): Result<{ payment: FeePayment; row: FeeRow }> {
  const fee = book.fees.find((f) => f.id === input.feeId);
  const row = fee ? feeRow(book, fee) : undefined;
  if (!fee || !row) return { ok: false, errors: { amount: 'Choose a fee to pay.' } };
  const errors: FieldErrors = {};
  const a = checkAmount(input.amount, row.balance);
  if ('error' in a) errors.amount = a.error;
  if (!paymentMethods.some((m) => m.value === input.method)) errors.method = 'Choose how it was paid.';
  if (Object.keys(errors).length || 'error' in a) return { ok: false, errors };
  const payment: FeePayment = { id: nextId('p', book.payments), feeId: fee.id, date: book.today, amountPaise: a.paise, method: input.method as PaymentMethod };
  const next = { ...book, payments: [...book.payments, payment] };
  return { ok: true, payment, row: feeRow(next, fee)!, book: next };
}

/** Recent payments, newest first. */
export function paymentLog(book: TuitionBook): { payment: FeePayment; row: FeeRow }[] {
  return book.payments
    .map((p, i) => ({ p, i }))
    .sort((a, b) => (a.p.date === b.p.date ? b.i - a.i : a.p.date < b.p.date ? 1 : -1))
    .flatMap(({ p }) => {
      const fee = book.fees.find((f) => f.id === p.feeId);
      const row = fee ? feeRow(book, fee) : undefined;
      return row ? [{ payment: p, row }] : [];
    });
}

// ---------- Students ----------

export interface StudentRow {
  student: Student;
  active: boolean;
  batches: Batch[];
  balance: Paise;
  overdue: boolean;
  attendanceRate: number | null;
}

export function studentRow(book: TuitionBook, student: Student): StudentRow {
  const fees = book.fees.filter((f) => f.studentId === student.id).flatMap((f) => {
    const r = feeRow(book, f);
    return r ? [r] : [];
  });
  return {
    student,
    active: isActiveStudent(student, book.today),
    batches: openEnrolments(book, { studentId: student.id }).flatMap((e) => {
      const b = batchOf(book, e.batchId);
      return b ? [b] : [];
    }),
    balance: fees.reduce((s, r) => s + Math.max(0, r.balance), 0),
    overdue: fees.some((r) => r.status === 'overdue'),
    attendanceRate: studentAttendance(book, student.id).rate,
  };
}

export function studentRows(book: TuitionBook): StudentRow[] {
  return book.students.map((s) => studentRow(book, s)).sort((a, b) => a.student.name.localeCompare(b.student.name));
}

export function filterStudents(rows: StudentRow[], f: { query?: string; grade?: string; status?: 'all' | 'active' | 'inactive' }): StudentRow[] {
  const q = (f.query ?? '').trim().toLowerCase();
  const digits = q.replace(/\D/g, '');
  return rows.filter((r) => {
    if (f.status === 'active' && !r.active) return false;
    if (f.status === 'inactive' && r.active) return false;
    if (f.grade && f.grade !== 'all' && String(r.student.grade) !== f.grade) return false;
    if (!q) return true;
    const s = r.student;
    if (`${s.name} ${s.school} ${s.guardianName} ${s.guardianEmail} grade ${s.grade}`.toLowerCase().includes(q)) return true;
    if (/^(grade |class )?\d{1,2}$/.test(q) && String(s.grade) === digits) return true;
    return digits.length >= 3 && s.guardianPhone.replace(/\D/g, '').includes(digits);
  });
}

export interface StudentInput {
  name: string;
  grade: string;
  school: string;
  guardianName: string;
  guardianPhone: string;
  guardianEmail: string;
  /** New students only: batches to enrol in. */
  batchIds: string[];
}

export const emptyStudent = (): StudentInput => ({ name: '', grade: '', school: '', guardianName: '', guardianPhone: '', guardianEmail: '', batchIds: [] });

export function isPhone(v: string): boolean {
  if (!/^\+?[\d\s().-]+$/.test(v)) return false;
  const n = v.replace(/\D/g, '').length;
  return n >= 6 && n <= 15;
}

export function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
}

/** "9000040001" → "+91 90000 40001"; already-international numbers keep their format, spaces tidied. */
export function normalizePhone(v: string): string {
  const t = v.trim().replace(/\s+/g, ' ');
  const d = t.replace(/\D/g, '');
  if (!t.startsWith('+') && d.length === 10) return `+91 ${d.slice(0, 5)} ${d.slice(5)}`;
  if (!t.startsWith('+') && d.length === 11 && d.startsWith('0')) return `+91 ${d.slice(1, 6)} ${d.slice(6)}`;
  return t;
}

const tidy = (v: string) => v.trim().replace(/\s+/g, ' ');

export function validateStudent(book: TuitionBook, input: StudentInput, editingId?: string): FieldErrors {
  const e: FieldErrors = {};
  const name = tidy(input.name);
  if (!name) e.name = 'Enter the student’s name.';
  else if (name.length > 80) e.name = 'Keep the name under 80 characters.';
  const grade = Number(input.grade);
  if (!GRADES.includes(grade)) e.grade = 'Choose a grade.';
  if (!tidy(input.school)) e.school = 'Enter the school.';
  if (!tidy(input.guardianName)) e.guardianName = 'Enter a parent or guardian’s name.';
  const phone = input.guardianPhone.trim();
  if (!phone) e.guardianPhone = 'Enter the guardian’s phone number.';
  else if (!isPhone(phone)) e.guardianPhone = 'Use digits, spaces or dashes, with an optional + and country code (6–15 digits).';
  else if (book.students.some((s) => s.id !== editingId && s.name.toLowerCase() === name.toLowerCase() && s.guardianPhone.replace(/\D/g, '').slice(-10) === phone.replace(/\D/g, '').slice(-10)))
    e.name = 'This student is already registered with this guardian number.';
  const email = input.guardianEmail.trim();
  if (email && !isEmail(email)) e.guardianEmail = 'Enter an email like name@example.com, or leave it blank.';
  if (!editingId && GRADES.includes(grade)) {
    const wrong = input.batchIds.map((id) => batchOf(book, id)).find((b) => !b || b.status !== 'active' || grade < b.gradeFrom || grade > b.gradeTo);
    if (wrong) e.batches = `${wrong.name} is for ${gradeText(wrong.gradeFrom, wrong.gradeTo).toLowerCase()}.`;
  }
  return e;
}

function cleanStudent(input: StudentInput) {
  return {
    name: tidy(input.name),
    grade: Number(input.grade),
    school: tidy(input.school),
    guardianName: tidy(input.guardianName),
    guardianPhone: normalizePhone(input.guardianPhone),
    guardianEmail: input.guardianEmail.trim().toLowerCase(),
  };
}

/** Adds a student, enrolling them from today in the chosen batches (with this month's fee for each). */
export function createStudent(book: TuitionBook, input: StudentInput): Result<{ student: Student; enrolled: number }> {
  const errors = validateStudent(book, input);
  if (Object.keys(errors).length) return { ok: false, errors };
  const student: Student = { id: nextId('s', book.students), ...cleanStudent(input), joinedOn: book.today };
  let next: TuitionBook = { ...book, students: [...book.students, student] };
  for (const batchId of input.batchIds) {
    const r = enrol(next, { studentId: student.id, batchId, fee: '' });
    if (!r.ok) return r;
    next = r.book;
  }
  return { ok: true, student, enrolled: input.batchIds.length, book: next };
}

/** Edits details only. Enrolments, attendance and fees are records. */
export function updateStudent(book: TuitionBook, id: string, input: StudentInput): Result<{ student: Student }> {
  const existing = studentOf(book, id);
  if (!existing) return { ok: false, errors: { student: 'This student doesn’t exist.' } };
  const errors = validateStudent(book, input, id);
  if (Object.keys(errors).length) return { ok: false, errors };
  const student: Student = { ...existing, ...cleanStudent(input) };
  return { ok: true, student, book: { ...book, students: book.students.map((s) => (s.id === id ? student : s)) } };
}

/** Marks a student as having left today: their open enrolments end today; history stays. */
export function setStudentActive(book: TuitionBook, id: string, active: boolean): Result<{ student: Student; ended: number }> {
  const existing = studentOf(book, id);
  if (!existing) return { ok: false, errors: { student: 'This student doesn’t exist.' } };
  if (active) {
    if (isActiveStudent(existing, book.today)) return { ok: false, errors: { student: 'This student is already active.' } };
    const student: Student = { ...existing };
    delete student.leftOn;
    return { ok: true, student, ended: 0, book: { ...book, students: book.students.map((s) => (s.id === id ? student : s)) } };
  }
  if (!isActiveStudent(existing, book.today)) return { ok: false, errors: { student: 'This student is already inactive.' } };
  const student: Student = { ...existing, leftOn: book.today };
  let ended = 0;
  const enrolments = book.enrolments.map((e) => {
    if (e.studentId !== id || e.to) return e;
    ended += 1;
    return { ...e, to: book.today };
  });
  return { ok: true, student, ended, book: { ...book, students: book.students.map((s) => (s.id === id ? student : s)), enrolments } };
}

// ---------- Enrolment ----------

/** Why a student can't join a batch now, or undefined if they can. */
export function enrolBlock(book: TuitionBook, studentId: string, batchId: string): string | undefined {
  const s = studentOf(book, studentId);
  const b = batchOf(book, batchId);
  if (!s) return 'Choose a student.';
  if (!b) return 'Choose a batch.';
  if (!isActiveStudent(s, book.today)) return `${s.name} is inactive.`;
  if (b.status !== 'active') return `${b.name} isn’t running.`;
  if (openEnrolments(book, { studentId, batchId }).length) return `${s.name} is already in ${b.name}.`;
  if (s.grade < b.gradeFrom || s.grade > b.gradeTo) return `${b.name} is for ${gradeText(b.gradeFrom, b.gradeTo).toLowerCase()}; ${s.name} is in grade ${s.grade}.`;
  return undefined;
}

/**
 * Enrols from today (eligible for today's class). Creates this month's fee for
 * the batch if there isn't one, with an optional student-specific monthly fee.
 */
export function enrol(book: TuitionBook, input: { studentId: string; batchId: string; fee: string }): Result<{ enrolment: Enrolment; fee?: FeeRecord }> {
  const block = enrolBlock(book, input.studentId, input.batchId);
  if (block) return { ok: false, errors: { student: block } };
  let feePaise: Paise | undefined;
  if (input.fee.trim()) {
    const p = parseMoney(input.fee);
    if (!p.ok || p.value <= 0) return { ok: false, errors: { fee: 'Enter a monthly fee greater than zero, or leave it blank for the batch fee.' } };
    feePaise = p.value;
  }
  const enrolment: Enrolment = { id: nextId('e', book.enrolments), studentId: input.studentId, batchId: input.batchId, from: book.today, ...(feePaise !== undefined ? { feePaise } : {}) };
  const after: TuitionBook = { ...book, enrolments: [...book.enrolments, enrolment] };
  const period = periodOf(book.today);
  if (book.fees.some((f) => f.studentId === input.studentId && f.batchId === input.batchId && f.period === period)) return { ok: true, enrolment, book: after };
  const fee: FeeRecord = { id: nextId('f', book.fees), studentId: input.studentId, batchId: input.batchId, period, amountPaise: feeFor(after, enrolment), dueDate: dueDateFor(period, book.today) };
  return { ok: true, enrolment, fee, book: { ...after, fees: [...after.fees, fee] } };
}

/** Ends an enrolment today. Past attendance and fee records stay. */
export function unenrol(book: TuitionBook, enrolmentId: string): Result<{ enrolment: Enrolment }> {
  const e = book.enrolments.find((x) => x.id === enrolmentId);
  if (!e || e.to) return { ok: false, errors: { student: 'This student isn’t in the batch.' } };
  const enrolment: Enrolment = { ...e, to: book.today };
  return { ok: true, enrolment, book: { ...book, enrolments: book.enrolments.map((x) => (x.id === e.id ? enrolment : x)) } };
}

// ---------- Batches ----------

export interface BatchInput {
  name: string;
  subject: string;
  gradeFrom: string;
  gradeTo: string;
  teacherId: string;
  days: Weekday[];
  start: string;
  duration: string;
  room: string;
  fee: string;
  status: 'active' | 'inactive';
}

export const emptyBatch = (): BatchInput => ({ name: '', subject: '', gradeFrom: '', gradeTo: '', teacherId: '', days: [], start: '17:00', duration: '60', room: '', fee: '', status: 'active' });

export function batchToInput(b: Batch): BatchInput {
  return { name: b.name, subject: b.subject, gradeFrom: String(b.gradeFrom), gradeTo: String(b.gradeTo), teacherId: b.teacherId, days: [...b.days], start: b.start, duration: String(b.durationMin), room: b.room, fee: String(b.monthlyFeePaise / 100), status: b.status };
}

export const OPEN = '07:00';
export const CLOSE = '21:00';

export function validateBatch(book: TuitionBook, input: BatchInput, editingId?: string): FieldErrors {
  const e: FieldErrors = {};
  const name = tidy(input.name);
  if (!name) e.name = 'Enter a batch name.';
  else if (book.batches.some((b) => b.id !== editingId && b.name.toLowerCase() === name.toLowerCase())) e.name = 'Another batch already has this name.';
  if (!tidy(input.subject)) e.subject = 'Enter the subject.';
  const from = Number(input.gradeFrom);
  const to = Number(input.gradeTo);
  if (!GRADES.includes(from) || !GRADES.includes(to)) e.grades = 'Choose the grades.';
  else if (to < from) e.grades = 'The last grade can’t be below the first.';
  if (!teacherOf(book, input.teacherId)) e.teacher = 'Choose a teacher.';
  if (input.days.length === 0) e.days = 'Choose at least one day.';
  const duration = Number(input.duration);
  if (!/^\d+$/.test(input.duration.trim()) || duration < 30 || duration > 180 || duration % 15 !== 0) e.duration = 'Use 30 to 180 minutes, in steps of 15.';
  if (!isClock(input.start)) e.start = 'Enter a start time.';
  else if (input.start < OPEN || input.start >= CLOSE || (!e.duration && endTime(input.start, duration) > CLOSE)) e.start = `Classes run between ${formatTime(OPEN)} and ${formatTime(CLOSE)}.`;
  if (!tidy(input.room)) e.room = 'Enter the classroom.';
  const fee = parseMoney(input.fee);
  if (!fee.ok || fee.value <= 0) e.fee = 'Enter the monthly fee in rupees.';
  if (!e.days && !e.start && !e.duration && !e.room) {
    const s = toMinutes(input.start);
    const end = s + duration;
    const clash = book.batches.find(
      (b) => b.id !== editingId && b.status === 'active' && input.status === 'active' && b.room.toLowerCase() === tidy(input.room).toLowerCase() && b.days.some((d) => input.days.includes(d)) && s < toMinutes(b.start) + b.durationMin && toMinutes(b.start) < end,
    );
    if (clash) e.start = `${clash.room} is used by ${clash.name} then (${scheduleText(clash)}).`;
  }
  return e;
}

function fromBatchInput(input: BatchInput) {
  return {
    name: tidy(input.name),
    subject: tidy(input.subject),
    gradeFrom: Number(input.gradeFrom),
    gradeTo: Number(input.gradeTo),
    teacherId: input.teacherId,
    days: [...input.days].sort((a, b) => a - b),
    start: input.start,
    durationMin: Number(input.duration),
    room: tidy(input.room),
    monthlyFeePaise: (parseMoney(input.fee) as { ok: true; value: number }).value,
    status: input.status,
  };
}

export function createBatch(book: TuitionBook, input: BatchInput): Result<{ batch: Batch; sessions: number }> {
  const errors = validateBatch(book, input);
  if (Object.keys(errors).length) return { ok: false, errors };
  const batch: Batch = { id: nextId('b', book.batches), ...fromBatchInput(input) };
  const sessions = batch.status === 'active' ? scheduleSessions(batch, book.today, sessionHorizon(book), book.sessions) : [];
  return { ok: true, batch, sessions: sessions.length, book: { ...book, batches: [...book.batches, batch], sessions: [...book.sessions, ...sessions] } };
}

/**
 * Edits a batch. Fee changes apply to fee records created from now on; existing
 * records keep their amounts. Schedule changes replace future sessions (after
 * today) that have no attendance.
 */
export function updateBatch(book: TuitionBook, id: string, input: BatchInput): Result<{ batch: Batch }> {
  const existing = batchOf(book, id);
  if (!existing) return { ok: false, errors: { batch: 'This batch doesn’t exist.' } };
  const errors = validateBatch(book, input, id);
  if (Object.keys(errors).length) return { ok: false, errors };
  const batch: Batch = { ...existing, ...fromBatchInput(input) };
  const marked = new Set(book.attendance.map((a) => a.sessionId));
  const keep = book.sessions.filter((s) => s.batchId !== id || s.date <= book.today || marked.has(s.id));
  const future = batch.status === 'active' ? scheduleSessions(batch, addDays(book.today, 1), sessionHorizon(book), keep) : [];
  return { ok: true, batch, book: { ...book, batches: book.batches.map((b) => (b.id === id ? batch : b)), sessions: [...keep, ...future] } };
}

// ---------- Dashboard ----------

export interface Overview {
  activeStudents: number;
  activeBatches: number;
  classesToday: number;
  attendance: DayAttendance;
  collected: { total: Paise; count: number };
  outstanding: Paise;
  overdue: Paise;
  owing: number;
}

export function overview(book: TuitionBook, date: IsoDay, p: Period): Overview {
  const totals = feeTotals(feeRows(book));
  return {
    activeStudents: book.students.filter((s) => isActiveStudent(s, book.today)).length,
    activeBatches: book.batches.filter((b) => b.status === 'active').length,
    classesToday: sessionsOn(book, date).length,
    attendance: dayAttendance(book, date),
    collected: collectedIn(book, p),
    outstanding: totals.outstanding,
    overdue: totals.overdue,
    owing: totals.owing,
  };
}

/** Fees to follow up: overdue (oldest due first), then part paid and due. */
export function followUps(book: TuitionBook): FeeRow[] {
  const order: Record<FeeStatus, number> = { overdue: 0, partial: 1, due: 2, paid: 3 };
  return feeRows(book)
    .filter((r) => r.balance > 0)
    .sort((a, b) => order[a.status] - order[b.status] || a.fee.dueDate.localeCompare(b.fee.dueDate) || a.student.name.localeCompare(b.student.name));
}

export const daysUntil = (from: IsoDay, to: IsoDay) => daysBetween(from, to);
