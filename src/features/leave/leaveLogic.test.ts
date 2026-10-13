import { describe, expect, it } from 'vitest';
import type { Employee, LeaveBook } from '../../types/leave';
import { createLeaveSample, HISTORY_DAYS } from '../../data/leaveSample';
import {
  checkIn,
  checkOut,
  clockMinutes,
  dayRow,
  dayRows,
  daySummary,
  decideLeave,
  filterDayRows,
  formatClock,
  formatDuration,
  historyStart,
  isWorkingDay,
  latestWorkingDay,
  leaveDays,
  nextWorkingDay,
  previousWorkingDay,
  recentDays,
  sortLeave,
  submitLeave,
  validateLeave,
  workedMinutes,
  type LeaveInput,
} from './leaveLogic';

// Wednesday 14 October 2026.
const WED = '2026-10-14';
const sample = createLeaveSample(WED);
const today = sample.today;
const yesterday = previousWorkingDay(today);

const emp: Employee = { id: 'x', name: 'Test Person', department: 'Store', role: 'Tester', joinedOn: '2020-01-01' };
const tiny = (o: Partial<LeaveBook> = {}): LeaveBook => ({ today: WED, employees: [emp], attendance: [], leave: [], ...o });
const ok = <T,>(r: ({ ok: true; book: LeaveBook } & T) | { ok: false; errors: object }) => {
  if (!r.ok) throw new Error(JSON.stringify(r.errors));
  return r;
};
const req = (o: Partial<LeaveInput> = {}): LeaveInput => ({ employeeId: 'e1', type: 'annual', start: '2026-11-02', end: '2026-11-03', reason: '', ...o });

describe('calendar rule', () => {
  it('treats Monday–Friday as working days and weekends as non-working', () => {
    expect(isWorkingDay('2026-10-16')).toBe(true); // Friday
    expect(isWorkingDay('2026-10-17')).toBe(false); // Saturday
    expect(isWorkingDay('2026-10-18')).toBe(false); // Sunday
    expect(latestWorkingDay('2026-10-18')).toBe('2026-10-16');
    expect(previousWorkingDay('2026-10-19')).toBe('2026-10-16');
    expect(nextWorkingDay('2026-10-16')).toBe('2026-10-19');
  });

  it('anchors the demo on the latest working day, so a weekend visit shows Friday', () => {
    expect(createLeaveSample('2026-10-18').today).toBe('2026-10-16');
    expect(sample.today).toBe(WED);
  });

  it('has no rows on non-working days or future dates (no one is marked absent on a weekend)', () => {
    expect(dayRows(sample, '2026-10-11')).toEqual([]);
    expect(dayRows(sample, nextWorkingDay(today))).toEqual([]);
  });

  it('counts leave in working days only', () => {
    expect(leaveDays({ start: '2026-10-16', end: '2026-10-19' })).toBe(2); // Fri + Mon
  });
});

describe('clock times and worked duration', () => {
  it('parses and formats 24-hour times', () => {
    expect(clockMinutes('09:05')).toBe(545);
    expect(clockMinutes('24:00')).toBeNull();
    expect(clockMinutes('9:05')).toBeNull();
    expect(formatClock('09:05')).toBe('9:05 am');
    expect(formatClock('13:40')).toBe('1:40 pm');
    expect(formatClock('00:15')).toBe('12:15 am');
  });

  it('calculates duration only when both times exist and check-out is later', () => {
    expect(workedMinutes({ checkIn: '09:10', checkOut: '18:25' })).toBe(555);
    expect(formatDuration(555)).toBe('9h 15m');
    expect(workedMinutes({ checkIn: '09:10' })).toBeNull();
    expect(workedMinutes({ checkIn: '18:00', checkOut: '09:00' })).toBeNull();
  });
});

describe('daily status', () => {
  const rows = dayRows(sample, today);
  const s = daySummary(rows);

  it('gives every employee exactly one status; the four counts add up', () => {
    expect(s.present + s.absent + s.onLeave + s.notCheckedIn).toBe(s.total);
    expect(s.total).toBe(sample.employees.length);
    expect(s).toMatchObject({ present: 10, onLeave: 1, notCheckedIn: 3, absent: 0 });
  });

  it('counts approved leave as on leave, never as absent or not checked in', () => {
    const kavya = rows.find((r) => r.employee.id === 'e4')!;
    expect(kavya.status).toBe('on_leave');
    expect(kavya.leave?.id).toBe('l1');
  });

  it('does not treat pending leave as approved', () => {
    const sneha = rows.find((r) => r.employee.id === 'e9')!;
    expect(sneha.status).toBe('not_checked_in');
    expect(sneha.pendingLeave?.id).toBe('l3');
    expect(sneha.leave).toBeUndefined();
  });

  it('marks a past day with no check-in as absent, and a missing check-out as incomplete', () => {
    const past = dayRows(sample, sample.leave.find((l) => l.id === 'l7')!.start);
    expect(past.find((r) => r.employee.id === 'e11')!.status).toBe('absent');
    const y = dayRows(sample, yesterday);
    expect(daySummary(y).notCheckedIn).toBe(0); // only today can be "not checked in"
    const manoj = y.find((r) => r.employee.id === 'e5')!;
    expect(manoj).toMatchObject({ status: 'present', incomplete: true, worked: null });
    expect(y.find((r) => r.employee.id === 'e13')!.status).toBe('on_leave');
  });

  it('flags late arrivals after 09:45 and still-in today without calling it incomplete', () => {
    expect(rows.find((r) => r.employee.id === 'e3')!).toMatchObject({ late: true, stillIn: true, incomplete: false });
    expect(rows.find((r) => r.employee.id === 'e8')!.late).toBe(false); // 09:40, within the grace period
    expect(rows.find((r) => r.employee.id === 'e6')!.worked).toBe(255); // 08:55–13:10
  });

  it('matches counts to the stored records for every day in the history', () => {
    for (let d = today; d >= historyStart(sample); d = previousWorkingDay(d)) {
      const sum = daySummary(dayRows(sample, d));
      const records = sample.attendance.filter((r) => r.date === d).length;
      expect(sum.present, d).toBe(records);
    }
  });

  it('only includes people employed on the date', () => {
    const tara = sample.employees.find((e) => e.id === 'e14')!;
    expect(dayRows(sample, historyStart(sample)).some((r) => r.employee.id === 'e14')).toBe(false);
    expect(tara.joinedOn <= today).toBe(true);
  });
});

describe('filters', () => {
  const rows = dayRows(sample, today);
  it('compose search, department and status', () => {
    expect(filterDayRows(rows, '', 'Warehouse', 'all').map((r) => r.employee.id).sort()).toEqual(['e4', 'e5', 'e6', 'e7']);
    expect(filterDayRows(rows, '', 'Warehouse', 'on_leave').map((r) => r.employee.id)).toEqual(['e4']);
    expect(filterDayRows(rows, 'packer', 'all', 'present').length).toBe(2);
    expect(filterDayRows(rows, '', 'all', 'late').map((r) => r.employee.id).sort()).toEqual(['e12', 'e3']);
    expect(filterDayRows(rows, 'zzz', 'all', 'all')).toEqual([]);
  });
});

describe('check-in and check-out', () => {
  it('records a check-in for today and updates the counts', () => {
    const r = ok(checkIn(sample, 'e11', '09:58'));
    const after = daySummary(dayRows(r.book, today));
    expect(after.present).toBe(11);
    expect(after.notCheckedIn).toBe(2);
    expect(dayRow(r.book, sample.employees.find((e) => e.id === 'e11')!, today).late).toBe(true);
  });

  it('rejects duplicate check-ins, check-ins on approved leave and bad times', () => {
    expect(checkIn(sample, 'e1', '09:30')).toEqual({ ok: false, errors: { employee: 'Aarav Shah has already checked in today.' } });
    expect(checkIn(sample, 'e4', '09:30')).toEqual({ ok: false, errors: { employee: 'Kavya Iyer is on approved leave today.' } });
    expect(checkIn(sample, 'e11', '9am').ok).toBe(false);
    expect(checkIn(sample, 'nobody', '09:30').ok).toBe(false);
    expect(checkIn(tiny({ today: '2026-10-17' }), 'x', '09:30').ok).toBe(false); // Saturday
  });

  it('allows check-out only after a check-in, once, and later than it', () => {
    expect(checkOut(sample, 'e11', '18:00')).toEqual({ ok: false, errors: { employee: 'Fatima Sheikh hasn’t checked in today.' } });
    expect(checkOut(sample, 'e1', '09:00')).toEqual({ ok: false, errors: { time: 'Check-out must be after the check-in at 9:05 am.' } });
    expect(checkOut(sample, 'e6', '18:00')).toEqual({ ok: false, errors: { employee: 'Suresh Babu has already checked out today.' } });
    const r = ok(checkOut(sample, 'e1', '18:20'));
    expect(r.record).toMatchObject({ checkIn: '09:05', checkOut: '18:20' });
    expect(dayRow(r.book, sample.employees[0]!, today)).toMatchObject({ worked: 555, stillIn: false });
  });
});

describe('leave requests', () => {
  it('rejects missing fields and an end before the start', () => {
    expect(Object.keys(validateLeave(sample, { employeeId: '', type: '', start: '', end: '', reason: '' })).sort()).toEqual(['employee', 'end', 'start', 'type']);
    expect(validateLeave(sample, req({ start: '2026-11-05', end: '2026-11-04' })).end).toBe('The end date can’t be before the start date.');
    expect(validateLeave(sample, req({ start: '2026-10-17', end: '2026-10-18' })).start).toMatch(/weekend/);
    expect(validateLeave(sample, req({ start: '2026-11-02', end: '2027-01-15' })).end).toMatch(/60 days/);
  });

  it('rejects overlap with a pending or approved request, but not with a rejected one', () => {
    const l1 = sample.leave.find((l) => l.id === 'l1')!;
    expect(validateLeave(sample, req({ employeeId: 'e4', start: l1.end, end: l1.end })).start).toMatch(/Overlaps an approved request/);
    const l4 = sample.leave.find((l) => l.id === 'l4')!;
    expect(validateLeave(sample, req({ employeeId: 'e2', start: l4.start, end: l4.start })).start).toMatch(/Overlaps a pending request/);
    const l5 = sample.leave.find((l) => l.id === 'l5')!; // rejected
    expect(validateLeave(sample, req({ employeeId: 'e10', start: l5.start, end: l5.end }))).toEqual({});
  });

  it('rejects leave on days with recorded attendance', () => {
    expect(validateLeave(sample, req({ employeeId: 'e1', start: today, end: today })).start).toMatch(/Attendance is already recorded/);
  });

  it('submits as pending, which changes nothing until approved', () => {
    const before = daySummary(dayRows(sample, today));
    const r = ok(submitLeave(sample, req({ employeeId: 'e11', type: 'sick', start: today, end: today, reason: '  Unwell ' })));
    expect(r.request).toMatchObject({ status: 'pending', reason: 'Unwell', requestedOn: today });
    expect(daySummary(dayRows(r.book, today))).toEqual(before);
    const approved = ok(decideLeave(r.book, r.request.id, 'approved'));
    const after = daySummary(dayRows(approved.book, today));
    expect(after.onLeave).toBe(before.onLeave + 1);
    expect(after.notCheckedIn).toBe(before.notCheckedIn - 1);
  });

  it('approving a past pending request turns that absence into leave; rejecting changes nothing', () => {
    const l7 = sample.leave.find((l) => l.id === 'l7')!;
    const before = daySummary(dayRows(sample, l7.start));
    const approved = ok(decideLeave(sample, 'l7', 'approved'));
    const after = daySummary(dayRows(approved.book, l7.start));
    expect(after.absent).toBe(before.absent - 1);
    expect(after.onLeave).toBe(before.onLeave + 1);
    expect(approved.request).toMatchObject({ status: 'approved', decidedOn: today });
    const rejected = ok(decideLeave(sample, 'l7', 'rejected'));
    expect(daySummary(dayRows(rejected.book, l7.start))).toEqual(before);
  });

  it('only decides pending requests, and re-checks conflicts on approval', () => {
    expect(decideLeave(sample, 'l1', 'rejected')).toEqual({ ok: false, errors: { request: 'This request is already approved.' } });
    expect(decideLeave(sample, 'nope', 'approved').ok).toBe(false);
    // Sneha checks in today, then her pending leave for today can't be approved.
    const inToday = ok(checkIn(sample, 'e9', '09:20'));
    expect(decideLeave(inToday.book, 'l3', 'approved').ok).toBe(false);
    expect(decideLeave(inToday.book, 'l3', 'rejected').ok).toBe(true);
  });

  it('lists pending requests first', () => {
    const sorted = sortLeave(sample.leave);
    const firstDecided = sorted.findIndex((l) => l.status !== 'pending');
    expect(sorted.slice(0, firstDecided).every((l) => l.status === 'pending')).toBe(true);
    expect(sorted.slice(firstDecided).every((l) => l.status !== 'pending')).toBe(true);
  });
});

describe('employee history', () => {
  it('shows the last working days, newest first, within the person’s employment', () => {
    const vivek = sample.employees.find((e) => e.id === 'e13')!;
    const days = recentDays(sample, vivek, 5);
    expect(days.map((d) => d.date)).toEqual([today, yesterday, previousWorkingDay(yesterday), previousWorkingDay(previousWorkingDay(yesterday)), previousWorkingDay(previousWorkingDay(previousWorkingDay(yesterday)))]);
    expect(days[1]!.status).toBe('on_leave');
    const tara = sample.employees.find((e) => e.id === 'e14')!;
    expect(recentDays(sample, tara, 30).every((d) => d.date >= tara.joinedOn)).toBe(true);
  });
});

describe('sample data', () => {
  it('is consistent: one record per person per day, never on approved leave, never at weekends', () => {
    const keys = sample.attendance.map((r) => `${r.employeeId}|${r.date}`);
    expect(new Set(keys).size).toBe(keys.length);
    for (const r of sample.attendance) {
      expect(isWorkingDay(r.date)).toBe(true);
      expect(sample.leave.some((l) => l.status === 'approved' && l.employeeId === r.employeeId && l.start <= r.date && r.date <= l.end)).toBe(false);
      if (r.checkOut) expect(workedMinutes(r)).not.toBeNull();
    }
    expect(new Set(sample.leave.map((l) => l.status))).toEqual(new Set(['pending', 'approved', 'rejected']));
    expect(new Set(sample.employees.map((e) => e.department)).size).toBeGreaterThan(3);
  });

  it('covers the history window', () => {
    let d = today;
    for (let i = 0; i < HISTORY_DAYS; i++) d = previousWorkingDay(d);
    expect(historyStart(sample)).toBe(d);
  });

  it('restores the same data for the same date (reset)', () => {
    expect(createLeaveSample(WED)).toEqual(sample);
  });
});
