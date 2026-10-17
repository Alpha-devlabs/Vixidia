import type { CheckIn, GymBook, GymPayment, Member, Membership, PaymentMethod, Plan, PlanId } from '../types/gym';
import { addDays, daysBetween, weekday } from '../utils/dates';
import { membershipEnd } from '../features/gym/gymLogic';

/*
 * Fictional gym for the Gym Membership Management demo. Every name, phone number
 * (+91 90000 2xxxx) and email (@example.com) is invented.
 *
 * The demo runs on a fixed sample day so every status, count and test is
 * repeatable: Thursday 15 October 2026. Before anyone touches the demo it has
 * 24 members: 19 covered today (4 of them expiring within 7 days), 4 expired and
 * 1 whose membership starts later; 6 members owe ₹11,500 in total; 6 check-ins
 * so far today.
 */

export const GYM_TODAY = '2026-10-15';

export const gymBusiness = { name: 'Banyan Fitness Club', city: 'Bengaluru' };

export const PLANS: Plan[] = [
  { id: 'monthly', name: 'Monthly', months: 1, pricePaise: 150_000 },
  { id: 'quarterly', name: 'Quarterly', months: 3, pricePaise: 400_000 },
  { id: 'half_yearly', name: 'Half-yearly', months: 6, pricePaise: 750_000 },
  { id: 'annual', name: 'Annual', months: 12, pricePaise: 1_350_000 },
];

/** A membership in the seed: plan, start, and (for renewals) the day it was recorded. */
type SeedMs = [PlanId, string] | [PlanId, string, string];

interface Seed {
  name: string;
  memberships: SeedMs[];
  /**
   * Rupees paid per membership, by position. Missing = paid in full on the day
   * it was recorded; 0 = unpaid.
   */
  paid?: Record<number, number>;
  /** Out of 10: how often they come on a day they're covered. */
  visits?: number;
}

const seeds: Seed[] = [
  { name: 'Aditi Rao', memberships: [['monthly', '2026-02-01'], ['annual', '2026-03-01', '2026-02-27']], visits: 7 },
  { name: 'Rahul Menon', memberships: [['quarterly', '2026-09-01']] },
  { name: 'Sneha Kulkarni', memberships: [['quarterly', '2026-03-10'], ['half_yearly', '2026-06-10', '2026-06-08']], visits: 8 },
  { name: 'Vikram Shetty', memberships: [['monthly', '2026-10-05']], paid: { 0: 0 } },
  { name: 'Farah Khan', memberships: [['quarterly', '2026-08-20']], paid: { 0: 2000 }, visits: 4 },
  // Month-end: 31 Aug monthly runs to 29 Sep; the renewal starts 30 Sep and runs to 29 Oct.
  { name: 'Arjun Nair', memberships: [['monthly', '2026-08-31'], ['monthly', '2026-09-30', '2026-09-28']] },
  { name: 'Meera Pillai', memberships: [['annual', '2025-11-01']], visits: 5 },
  { name: 'Karan Malhotra', memberships: [['half_yearly', '2026-05-01']] },
  { name: 'Divya Iyer', memberships: [['quarterly', '2026-09-15']], visits: 8 },
  { name: 'Siddharth Joshi', memberships: [['monthly', '2026-10-01']], visits: 3 },
  { name: 'Nisha Reddy', memberships: [['annual', '2026-01-20']], visits: 0 },
  { name: 'Imran Sheikh', memberships: [['quarterly', '2026-07-25']] },
  { name: 'Pooja Desai', memberships: [['monthly', '2026-09-18']] },
  { name: 'Rohan Gupta', memberships: [['quarterly', '2026-07-20']], visits: 4 },
  { name: 'Ananya Bose', memberships: [['monthly', '2026-09-22']], paid: { 0: 0 } },
  { name: 'Kabir Sethi', memberships: [['half_yearly', '2026-04-15']] },
  { name: 'Lakshmi Narayan', memberships: [['monthly', '2026-09-16']], visits: 7 },
  { name: 'Tanvi Mehta', memberships: [['monthly', '2026-09-20'], ['quarterly', '2026-10-20', '2026-10-12']] },
  { name: 'Harish Kumar', memberships: [['quarterly', '2026-07-22'], ['monthly', '2026-10-22', '2026-10-14']], paid: { 1: 0 } },
  { name: 'Sunita Rao', memberships: [['monthly', '2026-07-01'], ['monthly', '2026-08-01', '2026-07-31']] },
  { name: 'Deepak Verma', memberships: [['quarterly', '2026-05-10']], paid: { 0: 3000 } },
  { name: 'Priya Raman', memberships: [['monthly', '2026-09-01']] },
  { name: 'Zoya Ahmed', memberships: [['monthly', '2026-10-13']], visits: 0 },
  { name: 'Gaurav Singh', memberships: [['quarterly', '2026-10-19', '2026-10-14']], paid: { 0: 0 } },
];

/** Already checked in today, at these times. */
const today: [number, string][] = [
  [0, '06:05'],
  [1, '06:20'],
  [5, '06:45'],
  [8, '07:10'],
  [12, '07:35'],
  [16, '08:15'],
];

const methods: PaymentMethod[] = ['upi', 'cash', 'card', 'upi'];

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '');
}

export function createGymSample(): GymBook {
  const members: Member[] = [];
  const memberships: Membership[] = [];
  const payments: GymPayment[] = [];
  const checkIns: CheckIn[] = [];
  const pending: { date: string; memberId: string; amount: number; method: PaymentMethod }[] = [];

  seeds.forEach((s, i) => {
    const id = `m${String(i + 1).padStart(2, '0')}`;
    const firstStart = s.memberships[0]![1];
    const joinedOn = s.memberships[0]![2] ?? firstStart;
    members.push({ id, name: s.name, phone: `+91 90000 2${String(i + 1).padStart(4, '0')}`, email: `${slug(s.name)}@example.com`, joinedOn });
    s.memberships.forEach(([planId, start, recorded], k) => {
      const plan = PLANS.find((p) => p.id === planId)!;
      const createdOn = recorded ?? start;
      memberships.push({ id: `ms${memberships.length + 1}`, memberId: id, planId, start, end: membershipEnd(start, plan.months), pricePaise: plan.pricePaise, kind: k === 0 ? 'new' : 'renewal', createdOn });
      const rupees = s.paid?.[k] ?? plan.pricePaise / 100;
      if (rupees > 0) pending.push({ date: createdOn, memberId: id, amount: rupees * 100, method: methods[(i + k) % methods.length]! });
    });
  });

  pending.sort((a, b) => a.date.localeCompare(b.date) || a.memberId.localeCompare(b.memberId));
  pending.forEach((p, n) => payments.push({ id: `p${n + 1}`, memberId: p.memberId, date: p.date, amountPaise: p.amount, method: p.method }));

  // Attendance for the 13 days before today, from a fixed pattern; only on days a membership covered.
  for (let d = 13; d >= 1; d--) {
    const date = addDays(GYM_TODAY, -d);
    const sunday = weekday(date) === 0;
    seeds.forEach((s, i) => {
      const id = members[i]!.id;
      const covered = memberships.some((m) => m.memberId === id && m.start <= date && date <= m.end);
      const visits = s.visits ?? 6;
      if (!covered || visits === 0) return;
      if ((i * 7 + d * 13) % 10 >= (sunday ? Math.min(visits, 2) : visits)) return;
      const minutes = 6 * 60 + ((i * 37 + d * 11) % 210) + ((i + d) % 3 === 0 ? 11 * 60 : 0);
      const time = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
      checkIns.push({ id: `c${checkIns.length + 1}`, memberId: id, date, time });
    });
  }
  for (const [i, time] of today) checkIns.push({ id: `c${checkIns.length + 1}`, memberId: members[i]!.id, date: GYM_TODAY, time });

  return { today: GYM_TODAY, plans: PLANS.map((p) => ({ ...p })), members, memberships, checkIns, payments };
}

/** Days of attendance history in the sample (today included). */
export const SAMPLE_HISTORY_DAYS = daysBetween(addDays(GYM_TODAY, -13), GYM_TODAY) + 1;
