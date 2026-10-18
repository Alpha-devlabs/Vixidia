import { useMemo, useState } from 'react';
import type { LeaveBook } from '../../types/leave';
import { createLeaveSample } from '../../data/leaveSample';
import { checkIn, checkOut, decideLeave, submitLeave, type LeaveInput } from './leaveLogic';

/**
 * The demo's single source of truth: one in-memory book of employees,
 * attendance and leave (the same pattern as the other Vixidia demos). Every
 * screen derives its rows and counts from it, so a check-in or an approval
 * updates them all at once. Nothing is saved; reloading or resetting restores
 * the sample data.
 */
export function useLeaveDemo() {
  const [book, setBook] = useState<LeaveBook>(() => createLeaveSample());
  // The data as last loaded or reset; anything else means the visitor has changed something.
  const [baseline, setBaseline] = useState<LeaveBook>(book);
  // Keep the first date so a reset restores exactly the data first shown.
  const [initialToday] = useState(book.today);

  const actions = useMemo(() => {
    function commit<R extends { ok: true; book: LeaveBook } | { ok: false }>(result: R): R {
      const r: { ok: true; book: LeaveBook } | { ok: false } = result;
      if (r.ok) setBook(r.book);
      return result;
    }
    return {
      checkIn: (employeeId: string, time: string) => commit(checkIn(book, employeeId, time)),
      checkOut: (employeeId: string, time: string) => commit(checkOut(book, employeeId, time)),
      submitLeave: (input: LeaveInput) => commit(submitLeave(book, input)),
      decideLeave: (id: string, decision: 'approved' | 'rejected') => commit(decideLeave(book, id, decision)),
      reset: () => {
        const fresh = createLeaveSample(initialToday);
        setBaseline(fresh);
        setBook(fresh);
      },
    };
  }, [book, initialToday]);

  return { book, actions, changed: book !== baseline };
}
