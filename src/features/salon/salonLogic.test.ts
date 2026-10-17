import { describe, expect, it } from 'vitest';
import type { SalonBook } from '../../types/salon';
import { createSalonSample, SALON_TODAY, SERVICES } from '../../data/salonSample';
import { addDays, weekday } from '../../utils/dates';
import {
  bookAppointment,
  cancelAppointment,
  checkSlot,
  completeAppointment,
  createCustomer,
  customerSummaries,
  customerSummary,
  dayRows,
  daySummary,
  emptyBooking,
  emptyCustomer,
  endOf,
  filterRows,
  formatDuration,
  formatTime,
  freeStartTimes,
  money,
  recordPayment,
  rescheduleAppointment,
  samePhone,
  searchCustomers,
  snapshot,
  startTimes,
  toMinutes,
  totalDuration,
  totalPrice,
  updateCustomer,
  type BookingInput,
} from './salonLogic';

const sample = () => createSalonSample();
const T = SALON_TODAY;
const cust = (book: SalonBook, name: string) => book.customers.find((c) => c.name === name)!.id;
const appt = (book: SalonBook, name: string, date = T) => book.appointments.find((a) => a.customerId === cust(book, name) && a.date === date)!;
const booking = (over: Partial<BookingInput> = {}): BookingInput => ({ ...emptyBooking(T), customerId: 'c7', serviceIds: ['s1'], stylistId: 'st2', date: T, start: '18:00', ...over });

function ok<R extends { ok: boolean }>(r: R): Extract<R, { ok: true }> {
  if (!r.ok) throw new Error(`Expected ok, got ${JSON.stringify(r)}`);
  return r as Extract<R, { ok: true }>;
}

describe('durations, prices and times', () => {
  it('adds up the selected services', () => {
    const items = snapshot([SERVICES[0]!, SERVICES[1]!, SERVICES[4]!]); // haircut, wash & styling, beard trim
    expect(totalDuration(items)).toBe(90);
    expect(totalPrice(items)).toBe(120_000);
    expect(money(totalPrice(items))).toBe('₹1,200.00');
    expect(endOf({ start: '10:30', services: items })).toBe('12:00');
    expect(formatDuration(90)).toBe('1 h 30 min');
    expect(formatDuration(45)).toBe('45 min');
    expect(formatTime('13:05')).toBe('1:05 pm');
    expect(formatTime('10:00')).toBe('10:00 am');
    expect(formatTime('12:00')).toBe('12:00 pm');
  });

  it('offers quarter-hour starts that finish by closing', () => {
    const book = sample();
    const times = startTimes(book, 90);
    expect(times[0]).toBe('10:00');
    expect(times.at(-1)).toBe('18:30');
    expect(times.every((t) => toMinutes(t) % 15 === 0)).toBe(true);
  });
});

describe('sample consistency', () => {
  it('matches the documented day', () => {
    const s = daySummary(sample(), T);
    expect(s).toEqual({ appointments: 13, upcoming: 8, completed: 5, cancelled: 1, unpaid: 1, unpaidAmount: 250_000, revenue: 470_000 });
  });

  it('has no clashes, nothing outside opening hours and nothing on a Tuesday', () => {
    const book = sample();
    for (const a of book.appointments) {
      expect(weekday(a.date) === 2, a.id).toBe(false);
      expect(a.start >= '10:00' && endOf(a) <= '20:00', a.id).toBe(true);
      const stylist = book.stylists.find((s) => s.id === a.stylistId)!;
      expect(a.services.every((s) => stylist.categories.includes(s.category)), a.id).toBe(true);
      if (a.status === 'cancelled') continue;
      const others = book.appointments.filter((b) => b.id !== a.id && b.status !== 'cancelled' && b.date === a.date);
      for (const b of others) {
        const clash = toMinutes(a.start) < toMinutes(endOf(b)) && toMinutes(b.start) < toMinutes(endOf(a));
        if (clash) expect(b.stylistId !== a.stylistId && b.customerId !== a.customerId, `${a.id}/${b.id}`).toBe(true);
      }
    }
  });

  it('pays only completed appointments, once, for their booked total', () => {
    const book = sample();
    const ids = book.payments.map((p) => p.appointmentId);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of book.payments) {
      const a = book.appointments.find((x) => x.id === p.appointmentId)!;
      expect(a.status).toBe('completed');
      expect(p.amountPaise).toBe(totalPrice(a.services));
      expect(p.date).toBe(a.date);
    }
    expect(book.appointments.filter((a) => a.status === 'booked').every((a) => a.date >= T)).toBe(true);
  });

  it('is deterministic, so reset restores the same data', () => {
    const changed = ok(cancelAppointment(sample(), appt(sample(), 'Aarav Patel').id, 'customer')).book;
    expect(daySummary(changed, T).cancelled).toBe(2);
    expect(createSalonSample()).toEqual(sample());
  });
});

describe('booking', () => {
  it('books a valid appointment with a snapshot of the services', () => {
    const before = sample();
    const r = ok(bookAppointment(before, booking({ serviceIds: ['s1', 's5'] })));
    expect(r.appointment).toMatchObject({ customerId: 'c7', stylistId: 'st2', date: T, start: '18:00', status: 'booked' });
    expect(r.appointment.services.map((s) => [s.name, s.durationMin, s.pricePaise])).toEqual([
      ['Haircut', 30, 40_000],
      ['Beard trim', 15, 20_000],
    ]);
    expect(endOf(r.appointment)).toBe('18:45');
    const s = daySummary(r.book, T);
    expect([s.appointments, s.upcoming, s.revenue]).toEqual([14, 9, 470_000]);
  });

  it('keeps historical totals when the menu price changes later', () => {
    const r = ok(bookAppointment(sample(), booking()));
    const repriced: SalonBook = { ...r.book, services: r.book.services.map((s) => (s.id === 's1' ? { ...s, pricePaise: 55_000 } : s)) };
    expect(totalPrice(repriced.appointments.find((a) => a.id === r.appointment.id)!.services)).toBe(40_000);
    const done = ok(completeAppointment(repriced, r.appointment.id, { method: 'upi' }));
    expect(done.payment!.amountPaise).toBe(40_000);
    expect(ok(bookAppointment(repriced, booking({ start: '19:00' }))).appointment.services[0]!.pricePaise).toBe(55_000);
  });

  it('requires a customer, services, stylist, date and time', () => {
    const r = bookAppointment(sample(), { ...emptyBooking(T), date: '' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(['customer', 'date', 'services', 'start', 'stylist']);
  });

  it('enforces opening hours, closed Tuesdays and the date range', () => {
    for (const [over, key, re] of [
      [{ start: '09:45' }, 'start', /opens at 10:00 am/],
      [{ start: '19:45' }, 'start', /end at 8:15 pm, after closing at 8:00 pm/],
      [{ start: '10:10' }, 'start', /quarter hour/],
      [{ start: '25:00' }, 'start', /Choose a start time/],
      [{ date: '2026-10-20' }, 'date', /closed on Tuesdays/],
      [{ date: addDays(T, -1) }, 'date', /today or a later date/],
      [{ date: addDays(T, 61) }, 'date', /within 60 days/],
    ] as const) {
      const r = bookAppointment(sample(), booking(over));
      expect(r.ok, JSON.stringify(over)).toBe(false);
      if (!r.ok) expect(r.errors[key], JSON.stringify(over)).toMatch(re);
    }
    expect(bookAppointment(sample(), booking({ start: '19:30' })).ok).toBe(true); // ends exactly at closing
  });

  it('prevents overlaps for the same stylist; back-to-back is fine', () => {
    // Meena: 10:00–11:15, 11:30–13:00, 13:30–14:00 …
    const clash = bookAppointment(sample(), booking({ stylistId: 'st1', start: '12:30' }));
    expect(clash.ok).toBe(false);
    if (!clash.ok) expect(clash.errors.start).toBe('Meena Iyer is with Priya Sharma from 11:30 am to 1:00 pm.');
    expect(bookAppointment(sample(), booking({ stylistId: 'st1', start: '13:00' })).ok).toBe(true); // 13:00–13:30, then 13:30 next
    expect(bookAppointment(sample(), booking({ stylistId: 'st1', start: '11:15' })).ok).toBe(false); // 11:15–11:45 overlaps 11:30
    expect(bookAppointment(sample(), booking({ stylistId: 'st1', start: '11:15', serviceIds: ['s5'] })).ok).toBe(true); // 11:15–11:30 fits the gap
  });

  it('prevents a customer being booked twice at the same time', () => {
    // Priya is with Meena 11:30–13:00 today.
    const r = bookAppointment(sample(), booking({ customerId: cust(sample(), 'Priya Sharma'), stylistId: 'st2', start: '12:00' }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.start).toMatch(/already has an appointment from 11:30 am to 1:00 pm/);
  });

  it('ignores cancelled appointments when checking availability', () => {
    // Ravi's 12:00 haircut for Sanjana is cancelled, so the slot is free.
    expect(Object.keys(checkSlot(sample(), { date: T, start: '12:00', stylistId: 'st2', customerId: 'c3', services: snapshot([SERVICES[0]!]) }))).toEqual([]);
    expect(freeStartTimes(sample(), { date: T, stylistId: 'st2', customerId: 'c3', services: snapshot([SERVICES[0]!]) })).toContain('12:00');
  });

  it('only books services the stylist does', () => {
    const r = bookAppointment(sample(), booking({ stylistId: 'st3', serviceIds: ['s1'] }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.stylist).toBe('Shalini Das doesn’t do hair services such as Haircut.');
  });

  it('can add a new customer in the same step, with duplicate checks', () => {
    const dup = bookAppointment(sample(), booking({ customerMode: 'new', customer: { ...emptyCustomer(), name: 'Lakshmi M', phone: '090000 30001' } }));
    expect(dup.ok).toBe(false);
    if (!dup.ok) expect(dup.errors.phone).toBe('Lakshmi Menon already has this phone number.');
    const r = ok(bookAppointment(sample(), booking({ customerMode: 'new', customer: { ...emptyCustomer(), name: 'Tara Singh', phone: '+1 (555) 010-0199' } })));
    expect(r.isNewCustomer).toBe(true);
    expect(r.customer).toMatchObject({ id: 'c17', name: 'Tara Singh' });
    expect(r.book.customers).toHaveLength(17);
  });
});

describe('rescheduling, cancelling and completing', () => {
  it('reschedules a booked appointment to a free valid slot, keeping its services and prices', () => {
    const book = sample();
    const a = appt(book, 'Aarav Patel'); // Meena 13:30 haircut
    const r = ok(rescheduleAppointment(book, a.id, { date: addDays(T, 1), start: '16:00', stylistId: 'st2' }));
    expect(r.appointment).toMatchObject({ date: addDays(T, 1), start: '16:00', stylistId: 'st2', movedFrom: { date: T, start: '13:30', stylistId: 'st1' } });
    expect(r.appointment.services).toEqual(a.services);
    expect(daySummary(r.book, T).upcoming).toBe(7);
  });

  it('checks the new slot, but not against the appointment itself', () => {
    const book = sample();
    const a = appt(book, 'Neha Kapoor'); // Meena 15:00–16:00
    expect(rescheduleAppointment(book, a.id, { date: T, start: '15:15', stylistId: 'st1' }).ok).toBe(true);
    const clash = rescheduleAppointment(book, a.id, { date: T, start: '16:45', stylistId: 'st1' });
    expect(clash.ok).toBe(false);
    if (!clash.ok) expect(clash.errors.start).toMatch(/Meena Iyer is with Arjun Reddy/);
    const same = rescheduleAppointment(book, a.id, { date: T, start: '15:00', stylistId: 'st1' });
    expect(same.ok).toBe(false);
    expect(rescheduleAppointment(book, a.id, { date: '2026-10-20', start: '15:00', stylistId: 'st1' }).ok).toBe(false);
  });

  it('cancels with a reason; cancelled work is not revenue and frees the slot', () => {
    const book = sample();
    const a = appt(book, 'Aarav Patel');
    expect(cancelAppointment(book, a.id, '').ok).toBe(false);
    const r = ok(cancelAppointment(book, a.id, 'customer'));
    const s = daySummary(r.book, T);
    expect([s.appointments, s.upcoming, s.cancelled, s.revenue]).toEqual([12, 7, 2, 470_000]);
    expect(ok(bookAppointment(r.book, booking({ stylistId: 'st1', start: '13:30' }))).appointment.start).toBe('13:30');
    expect(completeAppointment(r.book, a.id, null).ok).toBe(false);
    expect(recordPayment(r.book, a.id, 'upi').ok).toBe(false);
    const future = appt(book, 'Sara Thomas', addDays(T, 1));
    const ns = cancelAppointment(book, future.id, 'no_show');
    expect(ns.ok).toBe(false);
  });

  it('completed appointments are final', () => {
    const book = sample();
    const done = appt(book, 'Lakshmi Menon');
    for (const r of [rescheduleAppointment(book, done.id, { date: addDays(T, 1), start: '16:00', stylistId: 'st1' }), cancelAppointment(book, done.id, 'customer'), completeAppointment(book, done.id, null)]) {
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.errors.appointment).toMatch(/completed and can’t be changed/);
    }
  });

  it('completes with or without payment; revenue comes only from payments', () => {
    const book = sample();
    const a = appt(book, 'Aarav Patel');
    const later = ok(completeAppointment(book, a.id, null));
    let s = daySummary(later.book, T);
    expect([s.completed, s.unpaid, s.unpaidAmount, s.revenue]).toEqual([6, 2, 290_000, 470_000]);
    const paid = ok(recordPayment(later.book, a.id, 'cash'));
    s = daySummary(paid.book, T);
    expect([s.unpaid, s.revenue]).toEqual([1, 510_000]);
    const now = ok(completeAppointment(book, a.id, { method: 'upi' }));
    expect(now.payment!.amountPaise).toBe(40_000);
    expect(daySummary(now.book, T).revenue).toBe(510_000);
    expect(completeAppointment(book, appt(book, 'Sara Thomas', addDays(T, 1)).id, null).ok).toBe(false);
    expect(completeAppointment(book, a.id, { method: 'cheque' }).ok).toBe(false);
  });

  it('prevents duplicate payments and paying before completion', () => {
    const book = sample();
    const unpaid = appt(book, 'Priya Sharma'); // colouring, completed, unpaid
    const once = ok(recordPayment(book, unpaid.id, 'upi'));
    expect(once.payment.amountPaise).toBe(250_000);
    const twice = recordPayment(once.book, unpaid.id, 'upi');
    expect(twice.ok).toBe(false);
    if (!twice.ok) expect(twice.errors.appointment).toBe('This appointment is already paid.');
    const booked = recordPayment(book, appt(book, 'Aarav Patel').id, 'upi');
    expect(booked.ok).toBe(false);
    if (!booked.ok) expect(booked.errors.appointment).toMatch(/Complete the appointment before/);
    expect(recordPayment(book, unpaid.id, '').ok).toBe(false);
  });
});

describe('schedule filters', () => {
  it('filters by status, stylist and search', () => {
    const rows = dayRows(sample(), T);
    expect(filterRows(rows, 'all')).toHaveLength(14);
    expect(filterRows(rows, 'upcoming')).toHaveLength(8);
    expect(filterRows(rows, 'completed')).toHaveLength(5);
    expect(filterRows(rows, 'unpaid').map((r) => r.customer.name)).toEqual(['Priya Sharma']);
    expect(filterRows(rows, 'cancelled').map((r) => r.customer.name)).toEqual(['Sanjana Gupta']);
    expect(filterRows(rows, 'all', 'st3')).toHaveLength(5);
    expect(filterRows(rows, 'upcoming', 'st1').map((r) => r.appointment.start)).toEqual(['13:30', '15:00', '17:00']);
    expect(filterRows(rows, 'all', 'all', 'facial').map((r) => r.customer.name)).toEqual(['Meghna Joshi', 'Anjali Nair']);
    expect(filterRows(rows, 'all', 'all', 'priya')).toHaveLength(2);
  });
});

describe('customers', () => {
  it('derives visits, last visit and favourite service from history', () => {
    const book = sample();
    const lakshmi = customerSummary(book, book.customers.find((c) => c.name === 'Lakshmi Menon')!);
    expect(lakshmi.visits).toBe(6);
    expect(lakshmi.lastVisit).toBe(T);
    expect(lakshmi.favourite).toBe('Haircut');
    expect(lakshmi.next?.date).toBe(addDays(T, 1));
    const sanjana = customerSummary(book, book.customers.find((c) => c.name === 'Sanjana Gupta')!);
    expect([sanjana.visits, sanjana.lastVisit, sanjana.favourite]).toEqual([0, undefined, undefined]);
    expect(sanjana.history).toHaveLength(1);
  });

  it('searches by name, email or phone digits', () => {
    const all = customerSummaries(sample());
    expect(all).toHaveLength(16);
    expect(searchCustomers(all, 'nair').map((s) => s.customer.name)).toEqual(['Anjali Nair']);
    expect(searchCustomers(all, 'carter@').map((s) => s.customer.name)).toEqual(['Emily Carter']);
    expect(searchCustomers(all, '7946').map((s) => s.customer.name)).toEqual(['Emily Carter']);
    expect(searchCustomers(all, 'zzz')).toHaveLength(0);
  });

  it('validates customers and spots duplicates by normalised phone or email', () => {
    const book = sample();
    const empty = createCustomer(book, emptyCustomer());
    expect(empty.ok).toBe(false);
    if (!empty.ok) expect(Object.keys(empty.errors).sort()).toEqual(['name', 'phone']);
    expect(samePhone('+91 90000 30001', '9000030001')).toBe(true);
    expect(samePhone('+91 90000 30001', '+44 90000 30002')).toBe(false);
    const dupEmail = createCustomer(book, { ...emptyCustomer(), name: 'X', phone: '+61 2 5550 1234', email: 'PRIYA.SHARMA@example.com' });
    expect(dupEmail.ok).toBe(false);
    if (!dupEmail.ok) expect(dupEmail.errors.email).toBe('Priya Sharma already has this email.');
    for (const phone of ['+44 20 7946 0123', '+1 (555) 010-0100', '+65 6555 0100', '0118 496 0000']) expect(createCustomer(book, { ...emptyCustomer(), name: 'Intl', phone }).ok, phone).toBe(true);
    expect(createCustomer(book, { ...emptyCustomer(), name: 'X', phone: 'call me' }).ok).toBe(false);
    const edited = ok(updateCustomer(book, 'c3', { name: 'Aarav P', phone: '+91 90000 30003', email: '', notes: 'Likes a short fade.' }));
    expect(edited.customer).toMatchObject({ name: 'Aarav P', notes: 'Likes a short fade.' });
    expect(edited.book.appointments).toEqual(book.appointments);
  });
});
