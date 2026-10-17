import type { AttendanceRecord, Batch, ClassSession, Enrolment, FeePayment, Mark, PaymentMethod, Student, Teacher, TuitionBook } from '../types/tuition';
import { addDays, daysBetween } from '../utils/dates';
import { SESSIONS_FROM, generateFees, scheduleSessions } from '../features/tuition/tuitionLogic';

/*
 * Fictional tuition centre for the Tuition Centre Management demo. Every
 * student, guardian, phone number (+91 90000 4xxxx), email (@example.com),
 * school and teacher is invented.
 *
 * Fixed sample day: Wednesday 21 October 2026. Classes are recorded from
 * 1 September; September and October fees exist. Before anyone touches the
 * demo: 20 active students (2 have left), 5 running batches, 3 classes today.
 */

export const TUITION_TODAY = '2026-10-21';

export const centre = { name: 'Bright Path Tuition Centre', city: 'Nagpur' };

export const TEACHERS: Teacher[] = [
  { id: 't1', name: 'Mrs. Kavitha Rao' },
  { id: 't2', name: 'Mr. Suresh Menon' },
  { id: 't3', name: 'Mr. Pradeep Joshi' },
  { id: 't4', name: 'Ms. Ayesha Khan' },
];

export const BATCHES: Batch[] = [
  { id: 'b1', name: 'Maths 8–9', subject: 'Mathematics', gradeFrom: 8, gradeTo: 9, teacherId: 't1', days: [1, 3, 5], start: '17:00', durationMin: 60, room: 'Room 1', monthlyFeePaise: 150_000, status: 'active' },
  { id: 'b2', name: 'Maths 10 Board Prep', subject: 'Mathematics', gradeFrom: 10, gradeTo: 10, teacherId: 't1', days: [2, 4, 6], start: '17:30', durationMin: 90, room: 'Room 1', monthlyFeePaise: 220_000, status: 'active' },
  { id: 'b3', name: 'Science 8–9', subject: 'Science', gradeFrom: 8, gradeTo: 9, teacherId: 't2', days: [2, 4], start: '16:00', durationMin: 60, room: 'Room 2', monthlyFeePaise: 140_000, status: 'active' },
  { id: 'b4', name: 'Science 10', subject: 'Physics & Chemistry', gradeFrom: 10, gradeTo: 10, teacherId: 't3', days: [1, 3], start: '18:15', durationMin: 90, room: 'Room 2', monthlyFeePaise: 200_000, status: 'active' },
  { id: 'b5', name: 'English 6–8', subject: 'English', gradeFrom: 6, gradeTo: 8, teacherId: 't4', days: [3, 6], start: '16:00', durationMin: 60, room: 'Room 3', monthlyFeePaise: 100_000, status: 'active' },
  { id: 'b6', name: 'Maths 11–12', subject: 'Mathematics', gradeFrom: 11, gradeTo: 12, teacherId: 't3', days: [0], start: '10:00', durationMin: 120, room: 'Room 1', monthlyFeePaise: 280_000, status: 'inactive' },
];

const S = SESSIONS_FROM;

/** [name, grade, school, guardian, phone suffix, enrolments [batch, from?, to?, fee rupees?], joined?, left?] */
type Seed = [string, number, string, string, number, [string, string?, string?, number?][], string?, string?];

const seeds: Seed[] = [
  ['Aarav Sharma', 8, 'Green Valley School', 'Rakesh Sharma', 1, [['b1'], ['b3'], ['b5']], '2026-06-15'],
  ['Diya Patel', 8, 'St. Anne’s Convent', 'Hetal Patel', 2, [['b1'], ['b5']], '2026-07-01'],
  ['Ishaan Verma', 9, 'Lakeview Public School', 'Sunil Verma', 3, [['b1'], ['b3']]],
  ['Myra Iyer', 9, 'Green Valley School', 'Lakshmi Iyer', 4, [['b1'], ['b3']]],
  ['Kabir Nair', 9, 'Sunrise Vidyalaya', 'Anil Nair', 5, [['b3']]],
  ['Anika Reddy', 10, 'Lakeview Public School', 'Srinivas Reddy', 6, [['b2'], ['b4']], '2026-06-01'],
  ['Vihaan Gupta', 10, 'St. Anne’s Convent', 'Neha Gupta', 7, [['b2'], ['b4']]],
  ['Riya Das', 10, 'Sunrise Vidyalaya', 'Partha Das', 8, [['b2']]],
  ['Arjun Pillai', 10, 'Green Valley School', 'Maya Pillai', 9, [['b2'], ['b4']]],
  ['Tara Menon', 7, 'Lakeview Public School', 'Deepa Menon', 10, [['b5']]],
  ['Neil D’Souza', 6, 'St. Anne’s Convent', 'Clara D’Souza', 11, [['b5']]],
  ['Zara Sheikh', 7, 'Sunrise Vidyalaya', 'Farhan Sheikh', 12, [['b5']]],
  ['Rohan Kulkarni', 8, 'Green Valley School', 'Prakash Kulkarni', 13, [['b1']]],
  ['Meera Joshi', 10, 'Lakeview Public School', 'Asha Joshi', 14, [['b4']]],
  ['Aditya Rao', 9, 'St. Anne’s Convent', 'Ganesh Rao', 15, [['b1', S, '2026-10-01'], ['b3', S, '2026-10-01']], undefined, '2026-10-01'],
  ['Kavya Singh', 8, 'Sunrise Vidyalaya', 'Ritu Singh', 16, [['b3'], ['b5']]],
  ['Dev Malhotra', 10, 'Green Valley School', 'Karan Malhotra', 17, [['b2'], ['b4', '2026-10-05']]],
  ['Pooja Bhat', 6, 'Lakeview Public School', 'Vinay Bhat', 18, [['b5']]],
  // Siblings: same guardian and phone, each with a sibling fee for Maths.
  ['Nikhil Shetty', 9, 'St. Anne’s Convent', 'Sudha Shetty', 19, [['b1', S, undefined, 1200]]],
  ['Ananya Shetty', 8, 'St. Anne’s Convent', 'Sudha Shetty', 19, [['b1', S, undefined, 1200], ['b3']]],
  ['Yash Agarwal', 11, 'Lakeview Public School', 'Mohit Agarwal', 21, [['b6', '2026-06-01', S]], '2026-06-01', S],
  ['Sneha Kapoor', 10, 'Sunrise Vidyalaya', 'Rina Kapoor', 22, [['b2', '2026-10-12']], '2026-10-12'],
];

/**
 * Fee payments, by [student number, batch, month]. Missing = paid in full; a
 * number = rupees paid so far; 0 = nothing paid.
 */
const partial: Record<string, number> = {
  '13|b1|09': 1000,
  '5|b3|09': 0,
  '9|b4|10': 1000,
  '12|b5|10': 500,
  '18|b5|10': 500,
  '5|b3|10': 0,
  '13|b1|10': 0,
  '8|b2|10': 0,
  '17|b2|10': 0,
  '17|b4|10': 0,
  '22|b2|10': 0,
};

/** Yesterday's Science 8–9 class has no attendance yet, to show the "not taken" state. */
const NOT_TAKEN = 'b3-2026-10-20';

const methods: PaymentMethod[] = ['upi', 'cash', 'upi', 'card'];

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '');
}

export function createTuitionSample(): TuitionBook {
  const students: Student[] = [];
  const enrolments: Enrolment[] = [];
  seeds.forEach(([name, grade, school, guardian, phone, list, joined, left], i) => {
    const id = `s${i + 1}`;
    students.push({
      id,
      name,
      grade,
      school,
      guardianName: guardian,
      guardianPhone: `+91 90000 4${String(phone).padStart(4, '0')}`,
      guardianEmail: i % 3 === 0 ? `${slug(guardian)}@example.com` : '',
      joinedOn: joined ?? '2026-08-20',
      ...(left ? { leftOn: left } : {}),
    });
    for (const [batchId, from, to, fee] of list) {
      enrolments.push({ id: `e${enrolments.length + 1}`, studentId: id, batchId, from: from ?? S, ...(to ? { to } : {}), ...(fee ? { feePaise: fee * 100 } : {}) });
    }
  });

  const horizon = addDays(TUITION_TODAY, 28);
  const sessions: ClassSession[] = BATCHES.filter((b) => b.status === 'active').flatMap((b) => scheduleSessions(b, S, horizon, []));

  let book: TuitionBook = { today: TUITION_TODAY, teachers: TEACHERS.map((t) => ({ ...t })), batches: BATCHES.map((b) => ({ ...b, days: [...b.days] })), sessions, students, enrolments, attendance: [], fees: [], payments: [] };

  // Attendance: every past class, and today's 4 pm English class, from a fixed pattern.
  const attendance: AttendanceRecord[] = [];
  const isIn = (studentId: string, s: ClassSession) => {
    const st = students.find((x) => x.id === studentId)!;
    return (!st.leftOn || s.date < st.leftOn) && enrolments.some((e) => e.studentId === studentId && e.batchId === s.batchId && e.from <= s.date && (!e.to || s.date < e.to));
  };
  for (const s of sessions) {
    if (s.id === NOT_TAKEN || s.date > TUITION_TODAY || (s.date === TUITION_TODAY && s.batchId !== 'b5')) continue;
    const day = daysBetween(S, s.date);
    students.forEach((st, i) => {
      if (!isIn(st.id, s)) return;
      const h = (i * 7 + day * 3 + Number(s.batchId.slice(1))) % 17;
      const mark: Mark = h < 2 ? 'absent' : h === 2 ? 'late' : 'present';
      attendance.push({ id: `at${attendance.length + 1}`, sessionId: s.id, studentId: st.id, mark });
    });
  }
  book = { ...book, attendance };

  // Fees for September and October through the same rule the demo uses.
  for (const p of ['2026-09', '2026-10']) {
    const r = generateFees(book, p);
    if (r.ok) book = r.book;
  }

  const payments: FeePayment[] = [];
  book.fees.forEach((f, i) => {
    const n = Number(f.studentId.slice(1));
    const key = `${n}|${f.batchId}|${f.period.slice(5)}`;
    const rupeesPaid = key in partial ? partial[key]! : f.amountPaise / 100;
    if (rupeesPaid <= 0) return;
    const firstDay = f.period === '2026-10' ? (f.studentId === 's22' ? 12 : 1) : 2;
    const day = Math.min(firstDay + ((n * 3 + i) % 14), f.period === '2026-10' ? 20 : 24);
    payments.push({ id: `p${payments.length + 1}`, feeId: f.id, date: `${f.period}-${String(day).padStart(2, '0')}`, amountPaise: rupeesPaid * 100, method: methods[(n + i) % methods.length]! });
  });
  payments.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

  return { ...book, payments };
}
