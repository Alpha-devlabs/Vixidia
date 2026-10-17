/**
 * Tuition Centre Management domain types.
 *
 * Only facts are stored: teachers, batches (with a recurring schedule), the
 * individual class sessions generated from it, students, enrolments (with dates,
 * so history survives changes), attendance marks, fee records and payments.
 * Rosters, eligibility, fee status, balances and dashboard figures are derived
 * in `features/tuition/tuitionLogic.ts`.
 */
import type { IsoDay, Paise } from './invoice';

export type { IsoDay, Paise };

/** 0 = Sunday … 6 = Saturday. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** "YYYY-MM". */
export type Period = string;

export interface Teacher {
  id: string;
  name: string;
}

export interface Batch {
  id: string;
  name: string;
  subject: string;
  gradeFrom: number;
  gradeTo: number;
  teacherId: string;
  days: Weekday[];
  /** "HH:MM". */
  start: string;
  durationMin: number;
  room: string;
  monthlyFeePaise: Paise;
  status: 'active' | 'inactive';
}

/** One class on one day. Created from the batch schedule so attendance has something fixed to refer to. */
export interface ClassSession {
  id: string;
  batchId: string;
  date: IsoDay;
  start: string;
  durationMin: number;
}

export interface Student {
  id: string;
  name: string;
  grade: number;
  school: string;
  guardianName: string;
  /** Fictional numbers only. */
  guardianPhone: string;
  /** Optional; fictional (example.com). */
  guardianEmail: string;
  joinedOn: IsoDay;
  /** Set when the student stops attending. Past attendance and fees stay. */
  leftOn?: IsoDay;
}

/**
 * A student in a batch from `from` (inclusive) until `to` (exclusive), or still
 * enrolled if `to` is missing. A student-specific monthly fee overrides the
 * batch fee for this enrolment.
 */
export interface Enrolment {
  id: string;
  studentId: string;
  batchId: string;
  from: IsoDay;
  to?: IsoDay;
  feePaise?: Paise;
}

export type Mark = 'present' | 'absent' | 'late';

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  studentId: string;
  mark: Mark;
}

/** One month's fee for one student in one batch. The amount is fixed when the record is created. */
export interface FeeRecord {
  id: string;
  studentId: string;
  batchId: string;
  period: Period;
  amountPaise: Paise;
  dueDate: IsoDay;
}

export type PaymentMethod = 'cash' | 'upi' | 'card';

export interface FeePayment {
  id: string;
  feeId: string;
  date: IsoDay;
  amountPaise: Paise;
  method: PaymentMethod;
}

/** Everything the demo knows. One instance is the single source of truth for every screen. */
export interface TuitionBook {
  today: IsoDay;
  teachers: Teacher[];
  batches: Batch[];
  sessions: ClassSession[];
  students: Student[];
  enrolments: Enrolment[];
  attendance: AttendanceRecord[];
  fees: FeeRecord[];
  payments: FeePayment[];
}
