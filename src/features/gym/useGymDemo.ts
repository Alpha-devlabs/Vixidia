import { useMemo, useState } from 'react';
import type { GymBook } from '../../types/gym';
import { createGymSample } from '../../data/gymSample';
import { checkIn, recordPayment, registerMember, renewMembership, updateMember, type MemberInput, type RegisterInput, type RenewInput } from './gymLogic';

/**
 * The demo's single source of truth: one in-memory book of members,
 * memberships, check-ins and payments (the same pattern as the other Vixidia
 * demos). Every status, balance and dashboard figure is derived from it, so an
 * action updates every screen at once. Nothing is saved; reloading or
 * resetting restores the sample data.
 */
export function useGymDemo() {
  const [book, setBook] = useState<GymBook>(() => createGymSample());
  // The data as last loaded or reset; anything else means the visitor has changed something.
  const [baseline, setBaseline] = useState<GymBook>(book);

  const actions = useMemo(() => {
    function commit<R extends { ok: true; book: GymBook } | { ok: false }>(result: R): R {
      const r: { ok: true; book: GymBook } | { ok: false } = result;
      if (r.ok) setBook(r.book);
      return result;
    }
    return {
      register: (input: RegisterInput) => commit(registerMember(book, input)),
      update: (id: string, input: MemberInput) => commit(updateMember(book, id, input)),
      renew: (memberId: string, input: RenewInput) => commit(renewMembership(book, memberId, input)),
      checkIn: (memberId: string, time: string) => commit(checkIn(book, memberId, time)),
      pay: (input: { memberId: string; amount: string; method: string }) => commit(recordPayment(book, input)),
      reset: () => {
        const fresh = createGymSample();
        setBaseline(fresh);
        setBook(fresh);
      },
    };
  }, [book]);

  return { book, actions, changed: book !== baseline };
}
