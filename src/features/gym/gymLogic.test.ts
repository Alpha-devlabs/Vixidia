import { describe, expect, it } from 'vitest';
import type { GymBook } from '../../types/gym';
import { createGymSample, GYM_TODAY, PLANS } from '../../data/gymSample';
import { addDays } from '../../utils/dates';
import {
  addMonths,
  checkIn,
  checkInBlock,
  checkInsOn,
  emptyRegisterInput,
  filterMembers,
  ledgerOf,
  memberRows,
  membershipEnd,
  membershipPayments,
  money,
  paymentLog,
  previewRenewal,
  recentActivity,
  recordPayment,
  registerMember,
  renewalBlock,
  renewalsDue,
  renewMembership,
  rowOf,
  statusOn,
  summarize,
  updateMember,
} from './gymLogic';

const sample = () => createGymSample();
const id = (book: GymBook, name: string) => book.members.find((m) => m.name === name)!.id;
const balance = (book: GymBook, name: string) => ledgerOf(book, id(book, name)).balance;
const status = (book: GymBook, name: string, date = book.today) => statusOn(book, id(book, name), date).status;

function ok<T extends { ok: boolean }>(r: T): Extract<T, { ok: true }> {
  if (!r.ok) throw new Error(`Expected ok, got ${JSON.stringify(r)}`);
  return r as Extract<T, { ok: true }>;
}

describe('calendar rules', () => {
  it('adds months keeping the day, clamping to the end of shorter months', () => {
    expect(addMonths('2026-01-15', 1)).toBe('2026-02-15');
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29');
    expect(addMonths('2026-03-31', 1)).toBe('2026-04-30');
    expect(addMonths('2026-08-31', 6)).toBe('2027-02-28');
    expect(addMonths('2026-11-30', 3)).toBe('2027-02-28');
    expect(addMonths('2026-12-15', 1)).toBe('2027-01-15');
    expect(addMonths('2026-05-31', 12)).toBe('2027-05-31');
  });

  it('ends a membership the day before the same date N months later', () => {
    expect(membershipEnd('2026-01-15', 1)).toBe('2026-02-14');
    expect(membershipEnd('2026-01-31', 1)).toBe('2026-02-27');
    expect(membershipEnd('2026-01-01', 3)).toBe('2026-03-31');
    expect(membershipEnd('2026-03-01', 12)).toBe('2027-02-28');
    expect(membershipEnd('2026-08-31', 1)).toBe('2026-09-29');
    expect(membershipEnd('2026-09-30', 1)).toBe('2026-10-29');
  });

  it('gives each plan a duration and price in paise', () => {
    expect(PLANS.map((p) => [p.id, p.months, p.pricePaise])).toEqual([
      ['monthly', 1, 150_000],
      ['quarterly', 3, 400_000],
      ['half_yearly', 6, 750_000],
      ['annual', 12, 1_350_000],
    ]);
  });
});

describe('membership status on a date', () => {
  const book = sample();
  it('is active, expiring within 7 days, expired, or starting later', () => {
    expect(status(book, 'Rahul Menon')).toBe('active');
    expect(status(book, 'Imran Sheikh')).toBe('active'); // 9 days left
    expect(status(book, 'Lakshmi Narayan')).toBe('expiring'); // last day today
    expect(status(book, 'Ananya Bose')).toBe('expiring'); // 6 days left
    expect(status(book, 'Kabir Sethi')).toBe('expired'); // ended yesterday
    expect(status(book, 'Gaurav Singh')).toBe('upcoming');
  });

  it('depends on the date asked about', () => {
    expect(status(book, 'Kabir Sethi', addDays(GYM_TODAY, -1))).toBe('expiring');
    expect(status(book, 'Rahul Menon', '2026-12-01')).toBe('expired');
    expect(status(book, 'Gaurav Singh', '2026-10-19')).toBe('active');
    expect(status(book, 'Aditi Rao', '2026-01-31')).toBe('upcoming'); // before her first membership
  });

  it('follows back-to-back renewals for "valid until"', () => {
    const tanvi = statusOn(book, id(book, 'Tanvi Mehta'), GYM_TODAY);
    expect(tanvi.status).toBe('active'); // would expire on 19 Oct, but renewed to Jan
    expect(tanvi.validUntil).toBe('2027-01-19');
    const arjun = statusOn(book, id(book, 'Arjun Nair'), GYM_TODAY);
    expect(arjun.current?.start).toBe('2026-09-30');
    expect(arjun.validUntil).toBe('2026-10-29');
  });
});

describe('sample reconciliation and dashboard', () => {
  it('matches the documented scenario', () => {
    const s = summarize(sample());
    expect(s).toEqual({ members: 24, active: 19, expiring: 4, expired: 4, upcoming: 1, checkInsToday: 6, outstanding: 1_150_000, owing: 6 });
    expect(money(s.outstanding)).toBe('₹11,500.00');
  });

  it('derives every figure from the records', () => {
    const book = sample();
    const rows = memberRows(book);
    expect(summarize(book).active).toBe(rows.filter((r) => r.info.status === 'active' || r.info.status === 'expiring').length);
    const charges = book.memberships.reduce((a, m) => a + m.pricePaise, 0);
    const paid = book.payments.reduce((a, p) => a + p.amountPaise, 0);
    expect(rows.reduce((a, r) => a + r.ledger.balance, 0)).toBe(charges - paid);
    for (const r of rows) expect(r.ledger.balance >= 0, r.member.name).toBe(true);
    expect(checkInsOn(book, GYM_TODAY)).toHaveLength(summarize(book).checkInsToday);
  });

  it('only records check-ins on days a membership covered', () => {
    const book = sample();
    for (const c of book.checkIns) {
      const s = statusOn(book, c.memberId, c.date).status;
      expect(s === 'active' || s === 'expiring', `${c.memberId} ${c.date}`).toBe(true);
    }
    expect(rowOf(book, id(book, 'Nisha Reddy'))!.lastCheckIn).toBeUndefined();
    expect(rowOf(book, id(book, 'Aditi Rao'))!.checkedInToday).toBe(true);
  });

  it('uses fictional contact details', () => {
    for (const m of sample().members) {
      expect(m.phone).toMatch(/^\+91 90000 2\d{4}$/);
      expect(m.email).toMatch(/@example\.com$/);
    }
  });

  it('is deterministic, so reset restores the same data', () => {
    const changed = ok(recordPayment(sample(), { memberId: 'm04', amount: '100', method: 'upi' })).book;
    expect(summarize(changed).outstanding === summarize(sample()).outstanding).toBe(false);
    expect(createGymSample()).toEqual(sample());
  });

  it('lists renewals due: expiring soonest first, then expired', () => {
    expect(renewalsDue(sample()).map((r) => r.member.name)).toEqual([
      'Lakshmi Narayan',
      'Pooja Desai',
      'Rohan Gupta',
      'Ananya Bose',
      'Kabir Sethi',
      'Priya Raman',
      'Sunita Rao',
      'Deepak Verma',
    ]);
  });

  it('shows recent activity newest first', () => {
    const a = recentActivity(sample(), 3);
    expect(a.map((x) => [x.kind, x.date])).toEqual([
      ['checkin', GYM_TODAY],
      ['checkin', GYM_TODAY],
      ['checkin', GYM_TODAY],
    ]);
    expect(a[0]!.kind === 'checkin' && a[0]!.time).toBe('08:15');
  });
});

describe('renewals', () => {
  it('extends from the current expiry when renewed early, never shortening it', () => {
    const book = sample();
    const p = previewRenewal(book, id(book, 'Rohan Gupta'), 'monthly')!;
    expect(p).toMatchObject({ from: 'expiry', start: '2026-10-20', end: '2026-11-19', charge: 150_000 });
    const r = ok(renewMembership(book, id(book, 'Rohan Gupta'), { planId: 'monthly', amount: '', method: '' }));
    expect(r.from).toBe('expiry');
    const s = statusOn(r.book, id(book, 'Rohan Gupta'), GYM_TODAY);
    expect(s.status).toBe('active');
    expect(s.validUntil).toBe('2026-11-19');
    expect(s.current?.end).toBe('2026-10-19'); // the existing membership is untouched
  });

  it('starts from today when already expired', () => {
    const book = sample();
    const r = ok(renewMembership(book, id(book, 'Kabir Sethi'), { planId: 'quarterly', amount: '4000', method: 'upi' }));
    expect(r.from).toBe('today');
    expect(r.membership).toMatchObject({ start: GYM_TODAY, end: '2027-01-14', kind: 'renewal', pricePaise: 400_000 });
    expect(status(r.book, 'Kabir Sethi')).toBe('active');
    expect(balance(r.book, 'Kabir Sethi')).toBe(0);
    expect(summarize(r.book).expired).toBe(3);
    expect(summarize(r.book).active).toBe(20);
  });

  it('creates exactly one charge per renewal', () => {
    const book = sample();
    const r = ok(renewMembership(book, id(book, 'Pooja Desai'), { planId: 'annual', amount: '', method: '' }));
    expect(balance(r.book, 'Pooja Desai')).toBe(balance(book, 'Pooja Desai') + 1_350_000);
    expect(r.book.memberships).toHaveLength(book.memberships.length + 1);
  });

  it('blocks accidental duplicate renewals', () => {
    const book = sample();
    const once = ok(renewMembership(book, id(book, 'Pooja Desai'), { planId: 'monthly', amount: '', method: '' })).book;
    const twice = renewMembership(once, id(book, 'Pooja Desai'), { planId: 'monthly', amount: '', method: '' });
    expect(twice.ok).toBe(false);
    if (!twice.ok) expect(twice.errors.renewal).toMatch(/Already renewed/);
    // Expired member renewed today: the new membership has started, but a second renewal today is still refused.
    const kabir = ok(renewMembership(book, id(book, 'Kabir Sethi'), { planId: 'monthly', amount: '', method: '' })).book;
    expect(renewalBlock(kabir, id(book, 'Kabir Sethi'))).toBe('Already renewed today.');
    // Seeded renewals waiting to start.
    expect(renewalBlock(book, id(book, 'Tanvi Mehta'))).toMatch(/starts on 20 Oct 2026/);
    expect(renewalBlock(book, id(book, 'Gaurav Singh'))).toMatch(/hasn’t started yet/);
  });

  it('validates the plan and any payment taken with the renewal', () => {
    const book = sample();
    expect(balance(book, 'Pooja Desai')).toBe(0);
    for (const [amount, re] of [
      ['0', /greater than zero/],
      ['-1', /greater than zero/],
      ['1500.01', /more than the ₹1,500.00 owed/],
      ['abc', /rupees and paise/],
    ] as const) {
      const r = renewMembership(book, id(book, 'Pooja Desai'), { planId: 'monthly', amount, method: 'upi' });
      expect(r.ok, amount).toBe(false);
      if (!r.ok) expect(r.errors.amount, amount).toMatch(re);
    }
    expect(renewMembership(book, id(book, 'Pooja Desai'), { planId: 'weekly', amount: '', method: '' }).ok).toBe(false);
    expect(renewMembership(book, id(book, 'Pooja Desai'), { planId: 'monthly', amount: '100', method: '' }).ok).toBe(false);
  });
});

describe('attendance', () => {
  it('checks in a covered member once per day', () => {
    const book = sample();
    const r = ok(checkIn(book, id(book, 'Sneha Kulkarni'), '18:30'));
    expect(summarize(r.book).checkInsToday).toBe(7);
    expect(checkInsOn(r.book, GYM_TODAY)[0]!.checkIn.time).toBe('18:30');
    const again = checkIn(r.book, id(book, 'Sneha Kulkarni'), '19:00');
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.errors.member).toBe('Already checked in today.');
    expect(checkIn(book, id(book, 'Aditi Rao'), '10:00').ok).toBe(false);
  });

  it('lets members expiring soon check in, but not expired or not-yet-started ones', () => {
    const book = sample();
    expect(checkInBlock(book, id(book, 'Ananya Bose'))).toBeUndefined();
    expect(checkInBlock(book, id(book, 'Kabir Sethi'))).toBe('Membership expired on 14 Oct 2026. Renew it before checking in.');
    expect(checkInBlock(book, id(book, 'Gaurav Singh'))).toBe('Membership starts on 19 Oct 2026.');
    const r = checkIn(book, id(book, 'Kabir Sethi'), '07:00');
    expect(r.ok).toBe(false);
    // Check-in never renews.
    expect(book.memberships).toHaveLength(sample().memberships.length);
  });

  it('accepts check-in after renewal of an expired membership', () => {
    const book = ok(renewMembership(sample(), 'm16', { planId: 'monthly', amount: '', method: '' })).book;
    expect(ok(checkIn(book, 'm16', '07:00')).checkIn.date).toBe(GYM_TODAY);
  });

  it('validates the time', () => {
    for (const t of ['', '7:00', '24:00', '12:60', 'noon']) expect(checkIn(sample(), id(sample(), 'Sneha Kulkarni'), t).ok, t).toBe(false);
  });
});

describe('payments', () => {
  it('reduce the balance exactly once and reconcile', () => {
    const book = sample();
    const r = ok(recordPayment(book, { memberId: id(book, 'Farah Khan'), amount: '1500.50', method: 'cash' }));
    expect(r.payment.amountPaise).toBe(150_050);
    expect(balance(r.book, 'Farah Khan')).toBe(200_000 - 150_050);
    expect(summarize(r.book).outstanding).toBe(1_150_000 - 150_050);
    expect(paymentLog(r.book)[0]!.id).toBe(r.payment.id);
  });

  it('settling a balance removes the member from the owing count', () => {
    const book = sample();
    const r = ok(recordPayment(book, { memberId: id(book, 'Deepak Verma'), amount: '1000', method: 'upi' }));
    expect(summarize(r.book).owing).toBe(5);
    expect(filterMembers(memberRows(r.book), 'owes')).toHaveLength(5);
  });

  it('rejects zero, negative, over-balance and malformed amounts', () => {
    const book = sample();
    for (const [amount, re] of [
      ['', /Enter the amount/],
      ['0', /greater than zero/],
      ['-10', /greater than zero/],
      ['2000.01', /more than the ₹2,000.00 owed/],
      ['12.345', /rupees and paise/],
    ] as const) {
      const r = recordPayment(book, { memberId: id(book, 'Farah Khan'), amount, method: 'upi' });
      expect(r.ok, amount).toBe(false);
      if (!r.ok) expect(r.errors.amount, amount).toMatch(re);
    }
    const none = recordPayment(book, { memberId: id(book, 'Rahul Menon'), amount: '1', method: 'upi' });
    expect(none.ok).toBe(false);
    if (!none.ok) expect(none.errors.amount).toMatch(/Nothing is owed/);
    expect(recordPayment(book, { memberId: id(book, 'Farah Khan'), amount: '10', method: '' }).ok).toBe(false);
  });

  it('shows which memberships are paid, oldest first, without changing the balance', () => {
    const book = sample();
    const harish = id(book, 'Harish Kumar');
    expect([...membershipPayments(book, harish).values()].map((x) => x.state)).toEqual(['paid', 'unpaid']);
    const farah = id(book, 'Farah Khan');
    expect([...membershipPayments(book, farah).values()]).toEqual([{ paid: 200_000, state: 'part' }]);
  });
});

describe('members', () => {
  it('registers a member with one charge and an optional payment', () => {
    const book = sample();
    const r = ok(registerMember(book, { ...emptyRegisterInput(GYM_TODAY), name: '  Ishaan   Batra ', phone: '+91 90000 29999', email: 'ishaan@example.com', planId: 'quarterly', amount: '1000', method: 'cash' }));
    expect(r.member).toMatchObject({ id: 'm25', name: 'Ishaan Batra', joinedOn: GYM_TODAY });
    expect(r.membership).toMatchObject({ planId: 'quarterly', start: GYM_TODAY, end: '2027-01-14', kind: 'new', pricePaise: 400_000 });
    expect(ledgerOf(r.book, 'm25').balance).toBe(300_000);
    const s = summarize(r.book);
    expect([s.members, s.active, s.owing]).toEqual([25, 20, 7]);
  });

  it('validates details, plan, start date and payment', () => {
    const book = sample();
    const bad = registerMember(book, { ...emptyRegisterInput(GYM_TODAY), phone: 'abc', email: 'nope', planId: 'weekly', start: '2026-02-30' });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(Object.keys(bad.errors).sort()).toEqual(['email', 'name', 'phone', 'plan', 'start']);
    const base = { ...emptyRegisterInput(GYM_TODAY), name: 'X', phone: '98450 12345' };
    for (const [start, re] of [
      [addDays(GYM_TODAY, -1), /before today/],
      [addDays(GYM_TODAY, 31), /within 30 days/],
    ] as const) {
      const r = registerMember(book, { ...base, start });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.errors.start).toMatch(re);
    }
    const dup = registerMember(book, { ...base, phone: book.members[0]!.phone, email: book.members[1]!.email });
    expect(dup.ok).toBe(false);
    if (!dup.ok) {
      expect(dup.errors.phone).toMatch(/already/);
      expect(dup.errors.email).toMatch(/already/);
    }
    const over = registerMember(book, { ...base, amount: '1500.01' });
    expect(over.ok).toBe(false);
    const later = ok(registerMember(book, { ...base, start: addDays(GYM_TODAY, 5) }));
    expect(statusOn(later.book, later.member.id, GYM_TODAY).status).toBe('upcoming');
  });

  it('edits contact details without touching memberships or payments', () => {
    const book = sample();
    const r = ok(updateMember(book, 'm05', { name: 'Farah K', phone: '+91 90000 20005', email: '' }));
    expect(r.member).toMatchObject({ name: 'Farah K', email: '' });
    expect(ledgerOf(r.book, 'm05')).toEqual(ledgerOf(book, 'm05'));
    expect(r.book.memberships).toEqual(book.memberships);
  });

  it('searches by name, email or phone digits, and filters by status', () => {
    const rows = memberRows(sample());
    expect(filterMembers(rows, 'all')).toHaveLength(24);
    expect(filterMembers(rows, 'all', 'meera').map((r) => r.member.name)).toEqual(['Meera Pillai']);
    expect(filterMembers(rows, 'all', 'RAO').map((r) => r.member.name)).toEqual(['Aditi Rao', 'Sunita Rao']);
    expect(filterMembers(rows, 'all', '20012').map((r) => r.member.name)).toEqual(['Imran Sheikh']);
    expect(filterMembers(rows, 'active')).toHaveLength(19);
    expect(filterMembers(rows, 'expiring')).toHaveLength(4);
    expect(filterMembers(rows, 'expired')).toHaveLength(4);
    expect(filterMembers(rows, 'owes')).toHaveLength(6);
    expect(filterMembers(rows, 'expired', 'rao').map((r) => r.member.name)).toEqual(['Sunita Rao']);
  });
});
