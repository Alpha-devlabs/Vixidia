import type { AttendanceRecord, ClockTime, Employee, IsoDay, LeaveBook, LeaveRequest, LeaveStatus, LeaveType } from '../../types/leave';
import { addDays, daysBetween, weekday } from '../../utils/dates';
import { formatDate } from '../../utils/format';

/*
 * Leave & Attendance — rules shared by every screen.
 *
 * Calendar rule (explicit, shown in the UI):
 *   Working days are Monday to Friday. Saturday and Sunday are non-working days
 *   and never count as absence. Public holidays are not modelled.
 *   The working day starts at 09:30; a check-in after 09:45 is a late arrival.
 *
 * One status per person per working day, in this order, so no one is counted twice:
 *   on leave        – an APPROVED leave request covers the date (pending/rejected don't)
 *   present         – a check-in is recorded (flags: late, incomplete check-out)
 *   absent          – a past working day with no check-in and no approved leave
 *   not checked in  – today, no check-in yet (not yet absent: the day isn't over)
 *
 * Dates are calendar days (YYYY-MM-DD) and times are "HH:MM" on that date, so
 * there are no timezone shifts. Mutations are pure and return a new book or errors.
 */

export const WORK_START: ClockTime = '09:30';
export const LATE_AFTER: ClockTime = '09:45';
/** Longest single leave request, in calendar days. */
export const MAX_LEAVE_DAYS = 60;

export const leaveTypes: { value: LeaveType; label: string }[] = [
  { value: 'annual', label: 'Annual leave' },
  { value: 'sick', label: 'Sick leave' },
  { value: 'casual', label: 'Casual leave' },
  { value: 'unpaid', label: 'Unpaid leave' },
];

export const leaveStatuses: { value: LeaveStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

export function labelOf<T extends string>(list: { value: T; label: string }[], value: T): string {
  return list.find((x) => x.value === value)?.label ?? value;
}

// ---------- Calendar ----------

export function isIsoDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y!, m! - 1, d!));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m! - 1 && date.getUTCDate() === d;
}

export function isWorkingDay(day: IsoDay): boolean {
  const w = weekday(day);
  return w >= 1 && w <= 5;
}

/** The latest working day on or before `day`. */
export function latestWorkingDay(day: IsoDay): IsoDay {
  let d = day;
  while (!isWorkingDay(d)) d = addDays(d, -1);
  return d;
}

export function previousWorkingDay(day: IsoDay): IsoDay {
  return latestWorkingDay(addDays(day, -1));
}

export function nextWorkingDay(day: IsoDay): IsoDay {
  let d = addDays(day, 1);
  while (!isWorkingDay(d)) d = addDays(d, 1);
  return d;
}

/** Working days in an inclusive range. */
export function workingDaysIn(start: IsoDay, end: IsoDay): IsoDay[] {
  const days: IsoDay[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) if (isWorkingDay(d)) days.push(d);
  return days;
}

// ---------- Clock times ----------

/** "09:05" → 545 minutes after midnight; null if not a valid 24-hour time. */
export function clockMinutes(t: string): number | null {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(t);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/** "09:05" → "9:05 am", "13:40" → "1:40 pm". */
export function formatClock(t: ClockTime): string {
  const mins = clockMinutes(t);
  if (mins === null) return t;
  const h = Math.floor(mins / 60);
  const m = String(mins % 60).padStart(2, '0');
  return `${h % 12 || 12}:${m} ${h < 12 ? 'am' : 'pm'}`;
}

/** Minutes between check-in and check-out; null unless both exist and check-out is later. Breaks are not recorded. */
export function workedMinutes(record: Pick<AttendanceRecord, 'checkIn' | 'checkOut'> | undefined): number | null {
  if (!record?.checkOut) return null;
  const a = clockMinutes(record.checkIn);
  const b = clockMinutes(record.checkOut);
  return a === null || b === null || b <= a ? null : b - a;
}

/** 485 → "8h 05m". */
export function formatDuration(mins: number): string {
  return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m`;
}

export function isLate(checkIn: ClockTime): boolean {
  return checkIn > LATE_AFTER;
}

// ---------- Daily status ----------

export type DayStatus = 'present' | 'absent' | 'on_leave' | 'not_checked_in';

export interface DayRow {
  employee: Employee;
  status: DayStatus;
  record?: AttendanceRecord;
  /** The approved leave that makes this person "on leave". */
  leave?: LeaveRequest;
  /** A pending request covering the date — shown as a note only; it does not change the status. */
  pendingLeave?: LeaveRequest;
  late: boolean;
  /** Checked in on a past day but never checked out. */
  incomplete: boolean;
  /** Checked in today and not yet checked out. */
  stillIn: boolean;
  worked: number | null;
}

function covering(book: LeaveBook, employeeId: string, date: IsoDay, status: LeaveStatus): LeaveRequest | undefined {
  return book.leave.find((l) => l.employeeId === employeeId && l.status === status && l.start <= date && date <= l.end);
}

/** The first date with seeded attendance; history before it isn't available in the demo. */
export function historyStart(book: LeaveBook): IsoDay {
  return book.attendance.reduce((min, r) => (r.date < min ? r.date : min), book.today);
}

/** Employees on the books on `date`. */
function employedOn(book: LeaveBook, date: IsoDay): Employee[] {
  return book.employees.filter((e) => e.joinedOn <= date);
}

export function dayRow(book: LeaveBook, employee: Employee, date: IsoDay): DayRow {
  const leave = covering(book, employee.id, date, 'approved');
  const pendingLeave = covering(book, employee.id, date, 'pending');
  const record = book.attendance.find((r) => r.employeeId === employee.id && r.date === date);
  const status: DayStatus = leave ? 'on_leave' : record ? 'present' : date < book.today ? 'absent' : 'not_checked_in';
  const present = status === 'present' && record !== undefined;
  return {
    employee,
    status,
    ...(record ? { record } : {}),
    ...(leave ? { leave } : {}),
    ...(pendingLeave && !leave ? { pendingLeave } : {}),
    late: present && isLate(record.checkIn),
    incomplete: present && !record.checkOut && date < book.today,
    stillIn: present && !record.checkOut && date === book.today,
    worked: present ? workedMinutes(record) : null,
  };
}

/** Everyone's status on a working day, by name. Empty for non-working days or dates after today. */
export function dayRows(book: LeaveBook, date: IsoDay): DayRow[] {
  if (!isWorkingDay(date) || date > book.today) return [];
  return employedOn(book, date)
    .map((e) => dayRow(book, e, date))
    .sort((a, b) => a.employee.name.localeCompare(b.employee.name));
}

export interface DaySummary {
  present: number;
  absent: number;
  onLeave: number;
  notCheckedIn: number;
  /** Subsets of present. */
  late: number;
  incomplete: number;
  total: number;
}

/** The four headline counts are exclusive and add up to `total`. */
export function daySummary(rows: DayRow[]): DaySummary {
  const n = (s: DayStatus) => rows.filter((r) => r.status === s).length;
  return {
    present: n('present'),
    absent: n('absent'),
    onLeave: n('on_leave'),
    notCheckedIn: n('not_checked_in'),
    late: rows.filter((r) => r.late).length,
    incomplete: rows.filter((r) => r.incomplete).length,
    total: rows.length,
  };
}

export type DayFilter = 'all' | DayStatus | 'late' | 'incomplete';
export const dayFilters: { value: DayFilter; label: string }[] = [
  { value: 'all', label: 'Everyone' },
  { value: 'present', label: 'Present' },
  { value: 'late', label: 'Late' },
  { value: 'incomplete', label: 'Incomplete check-out' },
  { value: 'not_checked_in', label: 'Not checked in' },
  { value: 'absent', label: 'Absent' },
  { value: 'on_leave', label: 'On leave' },
];

export function departments(book: LeaveBook): string[] {
  return [...new Set(book.employees.map((e) => e.department))].sort((a, b) => a.localeCompare(b));
}

/** Search (name or role), department and status filters all apply together. */
export function filterDayRows(rows: DayRow[], query: string, department: string, status: DayFilter): DayRow[] {
  const q = query.trim().toLowerCase();
  return rows.filter((r) => {
    if (department !== 'all' && r.employee.department !== department) return false;
    if (status === 'late' ? !r.late : status === 'incomplete' ? !r.incomplete : status !== 'all' && r.status !== status) return false;
    return !q || `${r.employee.name} ${r.employee.role}`.toLowerCase().includes(q);
  });
}

// ---------- Check-in / check-out ----------

export type FieldErrors = Partial<Record<'employee' | 'time' | 'date' | 'type' | 'start' | 'end' | 'reason' | 'request', string>>;
export type Result<T> = ({ ok: true; book: LeaveBook } & T) | { ok: false; errors: FieldErrors };

function nextId(prefix: string, taken: { id: string }[]): string {
  const ids = new Set(taken.map((t) => t.id));
  let n = taken.length + 1;
  while (ids.has(`${prefix}${n}`)) n += 1;
  return `${prefix}${n}`;
}

/**
 * Records a check-in for today only. Rejected if the person already checked in,
 * is on approved leave, or today isn't a working day.
 */
export function checkIn(book: LeaveBook, employeeId: string, time: string): Result<{ record: AttendanceRecord }> {
  const employee = book.employees.find((e) => e.id === employeeId);
  if (!employee) return { ok: false, errors: { employee: 'This employee doesn’t exist.' } };
  if (!isWorkingDay(book.today)) return { ok: false, errors: { date: 'Today isn’t a working day.' } };
  if (covering(book, employeeId, book.today, 'approved')) return { ok: false, errors: { employee: `${employee.name} is on approved leave today.` } };
  if (book.attendance.some((r) => r.employeeId === employeeId && r.date === book.today)) {
    return { ok: false, errors: { employee: `${employee.name} has already checked in today.` } };
  }
  if (clockMinutes(time) === null) return { ok: false, errors: { time: 'Enter a time like 09:15.' } };
  const record: AttendanceRecord = { id: nextId('a', book.attendance), employeeId, date: book.today, checkIn: time };
  return { ok: true, record, book: { ...book, attendance: [...book.attendance, record] } };
}

/** Records today's check-out. Requires a check-in, only once, and later than the check-in. */
export function checkOut(book: LeaveBook, employeeId: string, time: string): Result<{ record: AttendanceRecord }> {
  const employee = book.employees.find((e) => e.id === employeeId);
  if (!employee) return { ok: false, errors: { employee: 'This employee doesn’t exist.' } };
  const existing = book.attendance.find((r) => r.employeeId === employeeId && r.date === book.today);
  if (!existing) return { ok: false, errors: { employee: `${employee.name} hasn’t checked in today.` } };
  if (existing.checkOut) return { ok: false, errors: { employee: `${employee.name} has already checked out today.` } };
  const out = clockMinutes(time);
  if (out === null) return { ok: false, errors: { time: 'Enter a time like 18:00.' } };
  if (out <= clockMinutes(existing.checkIn)!) return { ok: false, errors: { time: `Check-out must be after the check-in at ${formatClock(existing.checkIn)}.` } };
  const record: AttendanceRecord = { ...existing, checkOut: time };
  return { ok: true, record, book: { ...book, attendance: book.attendance.map((r) => (r.id === existing.id ? record : r)) } };
}

// ---------- Leave requests ----------

export interface LeaveInput {
  employeeId: string;
  type: string;
  start: string;
  end: string;
  reason: string;
}

export function range(l: Pick<LeaveRequest, 'start' | 'end'>): string {
  return l.start === l.end ? formatDate(l.start) : `${formatDate(l.start)} – ${formatDate(l.end)}`;
}

/** Working days a request covers. */
export function leaveDays(l: Pick<LeaveRequest, 'start' | 'end'>): number {
  return workingDaysIn(l.start, l.end).length;
}

/**
 * Problems that would stop a request being submitted or approved: it overlaps
 * another pending or approved request for the same person, or attendance is
 * already recorded on one of its working days.
 */
function conflicts(book: LeaveBook, employeeId: string, start: IsoDay, end: IsoDay, ignoreId?: string): string | undefined {
  const clash = book.leave.find(
    (l) => l.id !== ignoreId && l.employeeId === employeeId && l.status !== 'rejected' && l.start <= end && start <= l.end,
  );
  if (clash) return `Overlaps ${clash.status === 'approved' ? 'an approved' : 'a pending'} request for ${range(clash)}.`;
  const worked = book.attendance.find((r) => r.employeeId === employeeId && r.date >= start && r.date <= end);
  if (worked) return `Attendance is already recorded on ${formatDate(worked.date)}.`;
  return undefined;
}

export function validateLeave(book: LeaveBook, input: LeaveInput): FieldErrors {
  const errors: FieldErrors = {};
  if (!book.employees.some((e) => e.id === input.employeeId)) errors.employee = 'Choose an employee.';
  if (!leaveTypes.some((t) => t.value === input.type)) errors.type = 'Choose a leave type.';
  if (!isIsoDay(input.start)) errors.start = 'Choose a start date.';
  if (!isIsoDay(input.end)) errors.end = 'Choose an end date.';
  if (input.reason.trim().length > 300) errors.reason = 'Keep the reason under 300 characters.';
  if (!errors.start && !errors.end) {
    if (input.end < input.start) errors.end = 'The end date can’t be before the start date.';
    else if (daysBetween(input.start, input.end) + 1 > MAX_LEAVE_DAYS) errors.end = `Keep a single request to ${MAX_LEAVE_DAYS} days or fewer.`;
    else if (workingDaysIn(input.start, input.end).length === 0) errors.start = 'These dates are all weekend days, which are not working days.';
    else if (!errors.employee) {
      const c = conflicts(book, input.employeeId, input.start, input.end);
      if (c) errors.start = c;
    }
  }
  return errors;
}

/** Submits a request. It starts as pending and changes nothing until it is approved. */
export function submitLeave(book: LeaveBook, input: LeaveInput): Result<{ request: LeaveRequest }> {
  const errors = validateLeave(book, input);
  if (Object.keys(errors).length) return { ok: false, errors };
  const reason = input.reason.trim();
  const request: LeaveRequest = {
    id: nextId('l', book.leave),
    employeeId: input.employeeId,
    type: input.type as LeaveType,
    start: input.start,
    end: input.end,
    ...(reason ? { reason } : {}),
    status: 'pending',
    requestedOn: book.today,
  };
  return { ok: true, request, book: { ...book, leave: [...book.leave, request] } };
}

/** Demo approval or rejection of a pending request (not real HR authorisation). */
export function decideLeave(book: LeaveBook, id: string, decision: 'approved' | 'rejected'): Result<{ request: LeaveRequest }> {
  const existing = book.leave.find((l) => l.id === id);
  if (!existing) return { ok: false, errors: { request: 'This request no longer exists.' } };
  if (existing.status !== 'pending') return { ok: false, errors: { request: `This request is already ${existing.status}.` } };
  if (decision === 'approved') {
    const c = conflicts(book, existing.employeeId, existing.start, existing.end, existing.id);
    if (c) return { ok: false, errors: { request: c } };
  }
  const request: LeaveRequest = { ...existing, status: decision, decidedOn: book.today };
  return { ok: true, request, book: { ...book, leave: book.leave.map((l) => (l.id === id ? request : l)) } };
}

/** Pending first (soonest start first), then decided requests (latest start first). */
export function sortLeave(list: LeaveRequest[]): LeaveRequest[] {
  return [...list].sort((a, b) => {
    const p = Number(b.status === 'pending') - Number(a.status === 'pending');
    if (p) return p;
    return a.status === 'pending' ? a.start.localeCompare(b.start) : b.start.localeCompare(a.start);
  });
}

// ---------- Employee profile ----------

/** The person's last `count` working days up to today (within the demo's history). */
export function recentDays(book: LeaveBook, employee: Employee, count: number): (DayRow & { date: IsoDay })[] {
  const out: (DayRow & { date: IsoDay })[] = [];
  const start = historyStart(book);
  for (let d = latestWorkingDay(book.today); out.length < count && d >= start && d >= employee.joinedOn; d = previousWorkingDay(d)) {
    out.push({ ...dayRow(book, employee, d), date: d });
  }
  return out;
}

export function employeeLeave(book: LeaveBook, employeeId: string): LeaveRequest[] {
  return sortLeave(book.leave.filter((l) => l.employeeId === employeeId));
}
