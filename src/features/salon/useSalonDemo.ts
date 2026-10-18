import { useMemo, useState } from 'react';
import type { SalonBook } from '../../types/salon';
import { createSalonSample } from '../../data/salonSample';
import { bookAppointment, cancelAppointment, completeAppointment, createCustomer, recordPayment, rescheduleAppointment, updateCustomer, type BookingInput, type CustomerInput } from './salonLogic';

/**
 * The demo's single source of truth: one in-memory book of services, stylists,
 * customers, appointments and payments (the same pattern as the other Vixidia
 * demos). Schedules, visit history and revenue are derived from it, so every
 * action updates every screen at once. Nothing is saved; reloading or
 * resetting restores the sample data.
 */
export function useSalonDemo() {
  const [book, setBook] = useState<SalonBook>(() => createSalonSample());
  // The data as last loaded or reset; anything else means the visitor has changed something.
  const [baseline, setBaseline] = useState<SalonBook>(book);

  const actions = useMemo(() => {
    function commit<R extends { ok: true; book: SalonBook } | { ok: false }>(result: R): R {
      const r: { ok: true; book: SalonBook } | { ok: false } = result;
      if (r.ok) setBook(r.book);
      return result;
    }
    return {
      book: (input: BookingInput) => commit(bookAppointment(book, input)),
      reschedule: (id: string, input: { date: string; start: string; stylistId: string }) => commit(rescheduleAppointment(book, id, input)),
      cancel: (id: string, reason: string) => commit(cancelAppointment(book, id, reason)),
      complete: (id: string, payNow: { method: string } | null) => commit(completeAppointment(book, id, payNow)),
      pay: (id: string, method: string) => commit(recordPayment(book, id, method)),
      createCustomer: (input: CustomerInput) => commit(createCustomer(book, input)),
      updateCustomer: (id: string, input: CustomerInput) => commit(updateCustomer(book, id, input)),
      reset: () => {
        const fresh = createSalonSample();
        setBaseline(fresh);
        setBook(fresh);
      },
    };
  }, [book]);

  return { book, actions, changed: book !== baseline };
}
