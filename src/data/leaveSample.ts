import type { AttendanceRecord, Employee, LeaveBook, LeaveRequest } from '../types/leave';
import { addDays, localToday } from '../utils/dates';
import { latestWorkingDay, nextWorkingDay, previousWorkingDay } from '../features/leave/leaveLogic';

/*
 * Fictional staff, attendance and leave for the Leave & Attendance demo.
 * Every name is invented. The demo's "today" is the latest working day
 * (Monday–Friday) on or before the visitor's date, and all records are placed
 * relative to it, so the data is deterministic for any given day.
 */

export const leaveBusiness = { name: 'Harbor & Pine Supply Co.' };

/** How many past working days of attendance the demo holds. */
export const HISTORY_DAYS = 15;

const staff: (Omit<Employee, 'joinedOn'> & { joinedDaysAgo: number })[] = [
  { id: 'e1', name: 'Aarav Shah', department: 'Store', role: 'Store manager', joinedDaysAgo: 1400 },
  { id: 'e2', name: 'Divya Menon', department: 'Store', role: 'Sales associate', joinedDaysAgo: 600 },
  { id: 'e3', name: 'Imran Qureshi', department: 'Store', role: 'Sales associate', joinedDaysAgo: 380 },
  { id: 'e4', name: 'Kavya Iyer', department: 'Warehouse', role: 'Warehouse lead', joinedDaysAgo: 1100 },
  { id: 'e5', name: 'Manoj Kumar', department: 'Warehouse', role: 'Packer', joinedDaysAgo: 700 },
  { id: 'e6', name: 'Suresh Babu', department: 'Warehouse', role: 'Delivery driver', joinedDaysAgo: 900 },
  { id: 'e7', name: 'Pooja Nair', department: 'Warehouse', role: 'Packer', joinedDaysAgo: 250 },
  { id: 'e8', name: 'Rohan Das', department: 'Sales', role: 'Account manager', joinedDaysAgo: 820 },
  { id: 'e9', name: 'Sneha Reddy', department: 'Sales', role: 'Sales executive', joinedDaysAgo: 300 },
  { id: 'e10', name: 'Arjun Varma', department: 'Accounts', role: 'Accountant', joinedDaysAgo: 1500 },
  { id: 'e11', name: 'Fatima Sheikh', department: 'Accounts', role: 'Accounts assistant', joinedDaysAgo: 450 },
  { id: 'e12', name: 'Neha Joshi', department: 'Design', role: 'Designer', joinedDaysAgo: 680 },
  { id: 'e13', name: 'Vivek Rao', department: 'Design', role: 'Photographer', joinedDaysAgo: 520 },
  { id: 'e14', name: 'Tara Fernandes', department: 'Design', role: 'Junior designer', joinedDaysAgo: 10 },
];

/** Deterministic 0–1 value from a string, so the generated times are stable. */
function rand(s: string): number {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

const clock = (mins: number) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;

/** Today's records: who has checked in so far (and one early check-out). */
const todaySeeds: Record<string, [string, string?]> = {
  e1: ['09:05'],
  e2: ['09:12'],
  e3: ['09:51'],
  e5: ['09:28'],
  e6: ['08:55', '13:10'],
  e7: ['09:20'],
  e8: ['09:40'],
  e10: ['09:02'],
  e12: ['10:05'],
  e14: ['09:25'],
};

/** Past exceptions, by employee and working-day offset (1 = previous working day). */
const absences: [string, number][] = [
  ['e11', 3],
  ['e7', 2],
  ['e3', 6],
];
const missingCheckOut: [string, number][] = [
  ['e5', 1],
  ['e12', 4],
];

export function createLeaveSample(realToday: string = localToday()): LeaveBook {
  const today = latestWorkingDay(realToday);
  const back: string[] = [today]; // back[k] = k-th working day before today
  for (let k = 1; k <= HISTORY_DAYS; k++) back.push(previousWorkingDay(back[k - 1]!));
  const ahead = (n: number) => {
    let d = today;
    for (let i = 0; i < n; i++) d = nextWorkingDay(d);
    return d;
  };

  const employees: Employee[] = staff.map(({ joinedDaysAgo, ...e }) => ({ ...e, joinedOn: addDays(today, -joinedDaysAgo) }));

  const leave: LeaveRequest[] = [
    { id: 'l1', employeeId: 'e4', type: 'annual', start: today, end: ahead(2), reason: 'Family wedding in Thrissur.', status: 'approved', requestedOn: back[8]!, decidedOn: back[7]! },
    { id: 'l2', employeeId: 'e13', type: 'sick', start: back[1]!, end: back[1]!, reason: 'Fever.', status: 'approved', requestedOn: back[1]!, decidedOn: back[1]! },
    { id: 'l3', employeeId: 'e9', type: 'casual', start: today, end: today, reason: 'Bank and passport office visit.', status: 'pending', requestedOn: back[1]! },
    { id: 'l4', employeeId: 'e2', type: 'annual', start: ahead(5), end: ahead(7), status: 'pending', requestedOn: back[2]! },
    { id: 'l5', employeeId: 'e10', type: 'annual', start: ahead(8), end: ahead(9), reason: 'Short trip.', status: 'rejected', requestedOn: back[6]!, decidedOn: back[4]! },
    { id: 'l6', employeeId: 'e6', type: 'annual', start: back[6]!, end: back[5]!, status: 'approved', requestedOn: back[12]!, decidedOn: back[11]! },
    { id: 'l7', employeeId: 'e11', type: 'sick', start: back[3]!, end: back[3]!, reason: 'Migraine; forgot to apply on the day.', status: 'pending', requestedOn: back[2]! },
    { id: 'l8', employeeId: 'e8', type: 'annual', start: ahead(10), end: ahead(12), status: 'approved', requestedOn: back[3]!, decidedOn: back[2]! },
  ];
  const onApprovedLeave = (id: string, d: string) => leave.some((l) => l.status === 'approved' && l.employeeId === id && l.start <= d && d <= l.end);

  const attendance: AttendanceRecord[] = [];
  let n = 0;
  for (let k = HISTORY_DAYS; k >= 1; k--) {
    const date = back[k]!;
    for (const e of employees) {
      if (e.joinedOn > date || onApprovedLeave(e.id, date)) continue;
      if (absences.some(([id, o]) => id === e.id && o === k)) continue;
      const r1 = rand(`${e.id}|${k}|in`);
      const late = rand(`${e.id}|${k}|late`) < 0.12;
      const inMins = late ? 9 * 60 + 46 + Math.floor(r1 * 35) : 9 * 60 + Math.floor(r1 * 45);
      const outMins = 18 * 60 + Math.floor(rand(`${e.id}|${k}|out`) * 40) - (e.id === 'e6' ? 30 : 0);
      const noOut = missingCheckOut.some(([id, o]) => id === e.id && o === k);
      attendance.push({ id: `a${++n}`, employeeId: e.id, date, checkIn: clock(inMins), ...(noOut ? {} : { checkOut: clock(outMins) }) });
    }
  }
  for (const [id, [inT, outT]] of Object.entries(todaySeeds)) {
    attendance.push({ id: `a${++n}`, employeeId: id, date: today, checkIn: inT, ...(outT ? { checkOut: outT } : {}) });
  }

  return { today, employees, attendance, leave };
}
