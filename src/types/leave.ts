/**
 * Leave & Attendance domain types.
 *
 * Only facts are stored: who checked in and out at what time, and which leave
 * was requested and decided. A person's status on a day (present, absent, on
 * leave, not checked in) is derived in `features/leave/leaveLogic.ts`, so every
 * screen agrees and no one is counted twice.
 */
import type { IsoDay } from './invoice';

export type { IsoDay };

/** Wall-clock time on the record's own date, "HH:MM" (24-hour). No timezone. */
export type ClockTime = string;

export interface Employee {
  id: string;
  name: string;
  department: string;
  role: string;
  joinedOn: IsoDay;
}

/** One person's check-in (and, later, check-out) on one date. At most one per person per date. */
export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: IsoDay;
  checkIn: ClockTime;
  checkOut?: ClockTime;
}

export type LeaveType = 'annual' | 'sick' | 'casual' | 'unpaid';
/** Only approved leave changes attendance. Pending and rejected requests do not. */
export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  type: LeaveType;
  /** Inclusive range of calendar dates. */
  start: IsoDay;
  end: IsoDay;
  reason?: string;
  status: LeaveStatus;
  requestedOn: IsoDay;
  decidedOn?: IsoDay;
}

/** Everything the demo knows. One instance is the single source of truth for every screen. */
export interface LeaveBook {
  /** The demo's working "today": the latest Monday–Friday on or before the visitor's date. */
  today: IsoDay;
  employees: Employee[];
  attendance: AttendanceRecord[];
  leave: LeaveRequest[];
}
