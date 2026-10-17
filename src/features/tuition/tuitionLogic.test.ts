import { describe, expect, it } from 'vitest';
import type { TuitionBook } from '../../types/tuition';
import { createTuitionSample, TUITION_TODAY } from '../../data/tuitionSample';
import { weekday } from '../../utils/dates';
import {
  batchToInput,
  collectedIn,
  createBatch,
  createStudent,
  currentRoster,
  dayAttendance,
  dueDateFor,
  emptyBatch,
  emptyStudent,
  enrol,
  enrolBlock,
  feeRows,
  feeStatus,
  feeTotals,
  filterFees,
  filterStudents,
  followUps,
  generateFees,
  isEligible,
  money,
  normalizePhone,
  overview,
  recordPayment,
  saveAttendance,
  sessionFor,
  sessionRoster,
  sessionSummary,
  sessionsOn,
  setStudentActive,
  studentAttendance,
  studentRows,
  unenrol,
  updateBatch,
  updateStudent,
} from './tuitionLogic';

const sample = () => createTuitionSample();
const T = TUITION_TODAY;
const sid = (book: TuitionBook, name: string) => book.students.find((s) => s.name === name)!.id;
const fee = (book: TuitionBook, name: string, batchId: string, period: string) => book.fees.find((f) => f.studentId === sid(book, name) && f.batchId === batchId && f.period === period)!;
const row = (book: TuitionBook, name: string, batchId: string, period: string) => feeRows(book).find((r) => r.fee.id === fee(book, name, batchId, period).id)!;

function ok<R extends { ok: boolean }>(r: R): Extract<R, { ok: true }> {
  if (!r.ok) throw new Error(`Expected ok, got ${JSON.stringify(r)}`);
  return r as Extract<R, { ok: true }>;
}

describe('sample consistency', () => {
  it('matches the documented overview', () => {
    const o = overview(sample(), T, '2026-10');
    expect([o.activeStudents, o.activeBatches, o.classesToday]).toEqual([20, 5, 3]);
    expect(o.collected.total).toBe(3_500_000);
    expect(o.outstanding).toBe(1_540_000);
    expect(o.overdue).toBe(190_000);
    expect(o.owing).toBe(8);
    expect(money(o.outstanding)).toBe('₹15,400.00');
  });

  it('reconciles fees: outstanding = assessed − received, revenue = payments', () => {
    const book = sample();
    const t = feeTotals(feeRows(book));
    expect(t.outstanding).toBe(t.assessed - t.received);
    const paymentsTotal = book.payments.reduce((s, p) => s + p.amountPaise, 0);
    expect(t.received).toBe(paymentsTotal);
    expect(collectedIn(book, '2026-09').total + collectedIn(book, '2026-10').total).toBe(paymentsTotal);
    // October: ₹48,500 charged but only ₹35,000 collected.
    const oct = feeTotals(filterFees(feeRows(book), { period: '2026-10' }));
    expect([oct.assessed, oct.received, oct.outstanding]).toEqual([4_850_000, 3_500_000, 1_350_000]);
  });

  it('has a mix of fee statuses relative to the sample day', () => {
    const counts = feeRows(sample()).reduce<Record<string, number>>((m, r) => ({ ...m, [r.status]: (m[r.status] ?? 0) + 1 }), {});
    expect(counts).toEqual({ paid: 51, overdue: 2, partial: 3, due: 6 });
  });

  it('keeps relationships consistent', () => {
    const book = sample();
    expect(book.students).toHaveLength(22);
    for (const s of book.sessions) {
      const b = book.batches.find((x) => x.id === s.batchId)!;
      expect(b.days.includes(weekday(s.date) as 0), s.id).toBe(true);
    }
    for (const a of book.attendance) {
      const s = book.sessions.find((x) => x.id === a.sessionId)!;
      expect(isEligible(book, a.studentId, s), a.id).toBe(true);
      expect(s.date <= T).toBe(true);
    }
    const keys = book.attendance.map((a) => `${a.sessionId}|${a.studentId}`);
    expect(new Set(keys).size).toBe(keys.length);
    for (const p of book.payments) expect(book.fees.some((f) => f.id === p.feeId)).toBe(true);
    const feeKeys = book.fees.map((f) => `${f.studentId}|${f.batchId}|${f.period}`);
    expect(new Set(feeKeys).size).toBe(feeKeys.length);
    for (const r of feeRows(book)) expect(r.balance >= 0, r.fee.id).toBe(true);
  });

  it('is deterministic, so reset restores the same data', () => {
    expect(createTuitionSample()).toEqual(sample());
  });
});

describe('fees and payments', () => {
  it('derives status from paid amount, due date and the sample day', () => {
    const f = { amountPaise: 100_000, dueDate: '2026-10-25' };
    expect(feeStatus(f, 0, '2026-10-21')).toBe('due');
    expect(feeStatus(f, 40_000, '2026-10-21')).toBe('partial');
    expect(feeStatus(f, 40_000, '2026-10-26')).toBe('overdue');
    expect(feeStatus(f, 0, '2026-10-25')).toBe('due');
    expect(feeStatus(f, 100_000, '2026-12-01')).toBe('paid');
    expect(row(sample(), 'Rohan Kulkarni', 'b1', '2026-09').status).toBe('overdue');
    expect(row(sample(), 'Zara Sheikh', 'b5', '2026-10').status).toBe('partial');
    expect(row(sample(), 'Riya Das', 'b2', '2026-10').status).toBe('due');
  });

  it('uses the student-specific fee where set', () => {
    expect(fee(sample(), 'Nikhil Shetty', 'b1', '2026-10').amountPaise).toBe(120_000);
    expect(fee(sample(), 'Aarav Sharma', 'b1', '2026-10').amountPaise).toBe(150_000);
  });

  it('records part and full payments, reducing the balance once', () => {
    const book = sample();
    const f = fee(book, 'Riya Das', 'b2', '2026-10');
    const part = ok(recordPayment(book, { feeId: f.id, amount: '1200.50', method: 'upi' }));
    expect([part.row.paid, part.row.balance, part.row.status]).toEqual([120_050, 99_950, 'partial']);
    const full = ok(recordPayment(part.book, { feeId: f.id, amount: '999.50', method: 'cash' }));
    expect([full.row.balance, full.row.status]).toEqual([0, 'paid']);
    expect(collectedIn(full.book, '2026-10').total).toBe(3_500_000 + 220_000);
    expect(overview(full.book, T, '2026-10').outstanding).toBe(1_540_000 - 220_000);
  });

  it('rejects zero, negative, malformed and over-balance payments, and paying a paid fee', () => {
    const book = sample();
    const f = fee(book, 'Zara Sheikh', 'b5', '2026-10'); // ₹500 left
    for (const [amount, re] of [
      ['', /Enter the amount/],
      ['0', /greater than zero/],
      ['-5', /greater than zero/],
      ['500.01', /more than the ₹500.00 still due/],
      ['5.555', /rupees and paise/],
    ] as const) {
      const r = recordPayment(book, { feeId: f.id, amount, method: 'upi' });
      expect(r.ok, amount).toBe(false);
      if (!r.ok) expect(r.errors.amount, amount).toMatch(re);
    }
    expect(recordPayment(book, { feeId: f.id, amount: '100', method: '' }).ok).toBe(false);
    const paid = ok(recordPayment(book, { feeId: f.id, amount: '500', method: 'cash' }));
    const again = recordPayment(paid.book, { feeId: f.id, amount: '1', method: 'cash' });
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.errors.amount).toBe('This fee is fully paid.');
  });

  it('generates a month once; running it again creates nothing', () => {
    const book = sample();
    const again = ok(generateFees(book, '2026-10'));
    expect(again.created).toHaveLength(0);
    expect(again.skipped).toBe(31);
    const nov = ok(generateFees(book, '2026-11'));
    expect(nov.created).toHaveLength(31); // Aditya and Yash have left; everyone else continues
    expect(nov.created.every((f) => f.dueDate === '2026-11-25')).toBe(true);
    expect(ok(generateFees(nov.book, '2026-11')).created).toHaveLength(0);
    expect(generateFees(book, '2026-12').ok).toBe(false);
    // Revenue doesn't change when fees are charged.
    expect(collectedIn(nov.book, '2026-10')).toEqual(collectedIn(book, '2026-10'));
  });

  it('keeps old fee amounts when the batch fee changes', () => {
    const book = sample();
    const b5 = book.batches.find((b) => b.id === 'b5')!;
    const changed = ok(updateBatch(book, 'b5', { ...batchToInput(b5), fee: '1200' })).book;
    expect(fee(changed, 'Tara Menon', 'b5', '2026-10').amountPaise).toBe(100_000);
    const nov = ok(generateFees(changed, '2026-11')).book;
    expect(fee(nov, 'Tara Menon', 'b5', '2026-11').amountPaise).toBe(120_000);
  });

  it('gives a mid-month joiner at least a week to pay', () => {
    expect(dueDateFor('2026-10', '2026-10-21')).toBe('2026-10-28');
    expect(dueDateFor('2026-10', '2026-10-02')).toBe('2026-10-25');
    expect(dueDateFor('2026-11', '2026-10-21')).toBe('2026-11-25');
  });

  it('orders follow-ups overdue first', () => {
    const list = followUps(sample());
    expect(list.slice(0, 2).map((r) => r.status)).toEqual(['overdue', 'overdue']);
    expect(list).toHaveLength(11);
  });

  it('filters fee records by student, batch, month and status', () => {
    const rows = feeRows(sample());
    expect(filterFees(rows, { status: 'overdue' })).toHaveLength(2);
    expect(filterFees(rows, { status: 'unpaid' })).toHaveLength(11);
    expect(filterFees(rows, { batchId: 'b2', period: '2026-10' })).toHaveLength(6);
    expect(filterFees(rows, { query: 'shetty' })).toHaveLength(6);
    expect(filterFees(rows, { query: 'sudha', period: '2026-10', status: 'paid' })).toHaveLength(3);
  });
});

describe('attendance', () => {
  it('lists only students enrolled on the session date', () => {
    const book = sample();
    const today = sessionFor(book, 'b4', T)!;
    expect(sessionRoster(book, today).map((s) => s.name)).toEqual(['Anika Reddy', 'Arjun Pillai', 'Dev Malhotra', 'Meera Joshi', 'Vihaan Gupta']);
    const early = sessionFor(book, 'b4', '2026-09-02')!;
    expect(sessionRoster(book, early).map((s) => s.name)).not.toContain('Dev Malhotra'); // joined 5 Oct
    const sept = sessionFor(book, 'b1', '2026-09-30')!;
    expect(sessionRoster(book, sept).map((s) => s.name)).toContain('Aditya Rao'); // left 1 Oct, still in history
    expect(sessionRoster(book, sessionFor(book, 'b1', T)!).map((s) => s.name)).not.toContain('Aditya Rao');
  });

  it('saves every eligible mark once and updates on a second save', () => {
    const book = sample();
    const s = sessionFor(book, 'b1', T)!;
    const roster = sessionRoster(book, s);
    const marks = Object.fromEntries(roster.map((st) => [st.id, 'present']));
    const missing = saveAttendance(book, s.id, { ...marks, [roster[0]!.id]: '' });
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.errors.marks).toMatch(/Mark every student/);
    const first = ok(saveAttendance(book, s.id, marks));
    expect([first.created, first.updated]).toEqual([roster.length, 0]);
    const second = ok(saveAttendance(first.book, s.id, { ...marks, [roster[0]!.id]: 'late' }));
    expect([second.created, second.updated]).toEqual([0, 1]);
    expect(second.book.attendance.filter((a) => a.sessionId === s.id)).toHaveLength(roster.length);
  });

  it('refuses students who weren’t enrolled, and future classes', () => {
    const book = sample();
    const s = sessionFor(book, 'b1', T)!;
    const marks = Object.fromEntries(sessionRoster(book, s).map((st) => [st.id, 'present']));
    const stranger = saveAttendance(book, s.id, { ...marks, [sid(book, 'Riya Das')]: 'present' });
    expect(stranger.ok).toBe(false);
    if (!stranger.ok) expect(stranger.errors.marks).toMatch(/wasn’t enrolled/);
    const future = sessionFor(book, 'b1', '2026-10-23')!;
    expect(saveAttendance(book, future.id, {}).ok).toBe(false);
  });

  it('calculates percentages over eligible students in taken sessions', () => {
    const book = sample();
    const s = sessionFor(book, 'b1', T)!;
    const roster = sessionRoster(book, s);
    const marks = Object.fromEntries(roster.map((st, i) => [st.id, i === 0 ? 'absent' : i === 1 ? 'late' : 'present']));
    const after = ok(saveAttendance(book, s.id, marks)).book;
    const sum = sessionSummary(after, s);
    expect([sum.eligible, sum.present, sum.late, sum.absent, sum.taken]).toEqual([roster.length, roster.length - 2, 1, 1, true]);
    expect(sum.rate).toBe((roster.length - 1) / roster.length);
    const before = dayAttendance(book, T);
    expect([before.sessions, before.taken]).toEqual([3, 1]);
    const day = dayAttendance(after, T);
    expect(day.taken).toBe(2);
    expect(day.eligible).toBe(before.eligible + roster.length);
    // Untaken session doesn't count.
    expect(sessionSummary(book, sessionFor(book, 'b3', '2026-10-20')!).taken).toBe(false);
  });

  it('student attendance only counts sessions they were eligible for', () => {
    const book = sample();
    const dev = studentAttendance(book, sid(book, 'Dev Malhotra'), 'b4');
    expect(dev.rows.every((r) => r.session.date >= '2026-10-05')).toBe(true);
    expect(dev.total).toBeGreaterThan(0);
  });

  it('shows no session on days a batch doesn’t meet', () => {
    expect(sessionFor(sample(), 'b1', '2026-10-20')).toBeUndefined(); // Tuesday
    expect(sessionsOn(sample(), '2026-10-25')).toHaveLength(0); // Sunday
  });
});

describe('enrolment and batches', () => {
  it('prevents duplicate enrolment and wrong grades', () => {
    const book = sample();
    expect(enrolBlock(book, sid(book, 'Aarav Sharma'), 'b1')).toMatch(/already in Maths 8–9/);
    expect(enrolBlock(book, sid(book, 'Tara Menon'), 'b1')).toMatch(/for grades 8–9; Tara Menon is in grade 7/);
    expect(enrolBlock(book, sid(book, 'Aditya Rao'), 'b1')).toMatch(/inactive/);
    expect(enrolBlock(book, sid(book, 'Yash Agarwal'), 'b6')).toMatch(/inactive/);
  });

  it('enrols from today with this month’s fee, once', () => {
    const book = sample();
    const kabir = sid(book, 'Kabir Nair');
    const r = ok(enrol(book, { studentId: kabir, batchId: 'b1', fee: '' }));
    expect(r.enrolment.from).toBe(T);
    expect(r.fee).toMatchObject({ period: '2026-10', amountPaise: 150_000, dueDate: '2026-10-28' });
    expect(isEligible(r.book, kabir, sessionFor(r.book, 'b1', T)!)).toBe(true);
    expect(isEligible(r.book, kabir, sessionFor(r.book, 'b1', '2026-10-19')!)).toBe(false);
    expect(enrol(r.book, { studentId: kabir, batchId: 'b1', fee: '' }).ok).toBe(false);
    expect(ok(generateFees(r.book, '2026-10')).created).toHaveLength(0);
    expect(ok(enrol(book, { studentId: kabir, batchId: 'b1', fee: '1100' })).fee!.amountPaise).toBe(110_000);
  });

  it('removing keeps history and stops future eligibility and fees', () => {
    const book = sample();
    const e = book.enrolments.find((x) => x.studentId === sid(book, 'Myra Iyer') && x.batchId === 'b3')!;
    const r = ok(unenrol(book, e.id));
    expect(currentRoster(r.book, 'b3').map((x) => x.student.name)).not.toContain('Myra Iyer');
    expect(r.book.attendance).toEqual(book.attendance);
    expect(r.book.fees).toEqual(book.fees);
    const nov = ok(generateFees(r.book, '2026-11')).created;
    expect(nov.some((f) => f.studentId === e.studentId && f.batchId === 'b3')).toBe(false);
    expect(unenrol(r.book, e.id).ok).toBe(false);
  });

  it('creates batches with sessions, and checks schedules and rooms', () => {
    const book = sample();
    const input = { ...emptyBatch(), name: 'English 9–10', subject: 'English', gradeFrom: '9', gradeTo: '10', teacherId: 't4', days: [2, 4] as (2 | 4)[], start: '17:15', duration: '60', room: 'Room 3', fee: '1200' };
    const r = ok(createBatch(book, input));
    expect(r.batch).toMatchObject({ id: 'b7', monthlyFeePaise: 120_000 });
    expect(r.sessions).toBeGreaterThan(0);
    expect(r.book.sessions.filter((s) => s.batchId === 'b7').every((s) => s.date >= T)).toBe(true);
    const clash = createBatch(book, { ...input, name: 'X', room: 'Room 2', start: '16:30' });
    expect(clash.ok).toBe(false);
    if (!clash.ok) expect(clash.errors.start).toMatch(/Room 2 is used by Science 8–9/);
    const bad = createBatch(book, { ...emptyBatch(), gradeFrom: '10', gradeTo: '8', duration: '20', start: '22:00' });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(Object.keys(bad.errors).sort()).toEqual(['days', 'duration', 'fee', 'grades', 'name', 'room', 'start', 'subject', 'teacher']);
    expect(createBatch(book, { ...input, name: 'maths 8–9' }).ok).toBe(false);
  });

  it('a schedule change replaces only future sessions without attendance', () => {
    const book = sample();
    const b3 = book.batches.find((b) => b.id === 'b3')!;
    const r = ok(updateBatch(book, 'b3', { ...batchToInput(b3), days: [1, 5] }));
    const after = r.book.sessions.filter((s) => s.batchId === 'b3');
    expect(after.filter((s) => s.date <= T)).toEqual(book.sessions.filter((s) => s.batchId === 'b3' && s.date <= T));
    expect(after.filter((s) => s.date > T).every((s) => [1, 5].includes(weekday(s.date)))).toBe(true);
    expect(r.book.attendance).toEqual(book.attendance);
  });
});

describe('students', () => {
  it('searches by name, grade, school or guardian contact and filters', () => {
    const rows = studentRows(sample());
    expect(filterStudents(rows, { query: 'diya' }).map((r) => r.student.name)).toEqual(['Diya Patel']);
    expect(filterStudents(rows, { query: 'sunrise' })).toHaveLength(5);
    expect(filterStudents(rows, { query: 'sudha' }).map((r) => r.student.name)).toEqual(['Ananya Shetty', 'Nikhil Shetty']);
    expect(filterStudents(rows, { query: '40013' }).map((r) => r.student.name)).toEqual(['Rohan Kulkarni']);
    expect(filterStudents(rows, { query: 'grade 6' }).map((r) => r.student.name)).toEqual(['Neil D’Souza', 'Pooja Bhat']);
    expect(filterStudents(rows, { grade: '10' })).toHaveLength(7);
    expect(filterStudents(rows, { status: 'inactive' }).map((r) => r.student.name)).toEqual(['Aditya Rao', 'Yash Agarwal']);
    expect(filterStudents(rows, { grade: '9', status: 'active' })).toHaveLength(4);
  });

  it('shows enrolled batches and balances on each student', () => {
    const book = sample();
    const aarav = studentRows(book).find((r) => r.student.name === 'Aarav Sharma')!;
    expect(aarav.batches.map((b) => b.id).sort()).toEqual(['b1', 'b3', 'b5']);
    expect(aarav.balance).toBe(0);
    const kabir = studentRows(book).find((r) => r.student.name === 'Kabir Nair')!;
    expect([kabir.balance, kabir.overdue]).toEqual([280_000, true]);
  });

  it('validates and normalises new students, enrolling them', () => {
    const book = sample();
    const empty = createStudent(book, emptyStudent());
    expect(empty.ok).toBe(false);
    if (!empty.ok) expect(Object.keys(empty.errors).sort()).toEqual(['grade', 'guardianName', 'guardianPhone', 'name', 'school']);
    const r = ok(createStudent(book, { ...emptyStudent(), name: '  Ira   Kapoor ', grade: '8', school: 'Green Valley School', guardianName: 'Rina Kapoor', guardianPhone: '9000049999', guardianEmail: 'RINA@Example.com', batchIds: ['b1', 'b5'] }));
    expect(r.student).toMatchObject({ id: 's23', name: 'Ira Kapoor', grade: 8, guardianPhone: '+91 90000 49999', guardianEmail: 'rina@example.com', joinedOn: T });
    expect(r.enrolled).toBe(2);
    expect(r.book.fees.filter((f) => f.studentId === 's23').map((f) => f.batchId).sort()).toEqual(['b1', 'b5']);
    expect(overview(r.book, T, '2026-10').activeStudents).toBe(21);
    const wrongGrade = createStudent(book, { ...emptyStudent(), name: 'X', grade: '6', school: 'Y', guardianName: 'Z', guardianPhone: '+44 20 7946 0001', batchIds: ['b2'] });
    expect(wrongGrade.ok).toBe(false);
    if (!wrongGrade.ok) expect(wrongGrade.errors.batches).toMatch(/grade 10/);
    const dup = createStudent(book, { ...emptyStudent(), name: 'diya patel', grade: '8', school: 'Y', guardianName: 'Z', guardianPhone: '090000 40002' });
    expect(dup.ok).toBe(false);
    expect(normalizePhone('+1 (555) 010-0100')).toBe('+1 (555) 010-0100');
  });

  it('edits details without touching records, and deactivates while keeping history', () => {
    const book = sample();
    const id = sid(book, 'Kabir Nair');
    const k = book.students.find((s) => s.id === id)!;
    const edited = ok(updateStudent(book, id, { ...emptyStudent(), name: k.name, grade: '9', school: 'New School', guardianName: k.guardianName, guardianPhone: k.guardianPhone, guardianEmail: '' }));
    expect(edited.student.school).toBe('New School');
    expect(edited.book.fees).toEqual(book.fees);
    const left = ok(setStudentActive(book, id, false));
    expect(left.ended).toBe(1);
    expect(overview(left.book, T, '2026-10').activeStudents).toBe(19);
    expect(left.book.attendance).toEqual(book.attendance);
    expect(row(left.book, 'Kabir Nair', 'b3', '2026-09').balance).toBe(140_000); // still owed
    expect(ok(generateFees(left.book, '2026-11')).created.some((f) => f.studentId === id)).toBe(false);
    expect(ok(setStudentActive(left.book, id, true)).student.leftOn).toBeUndefined();
  });
});
