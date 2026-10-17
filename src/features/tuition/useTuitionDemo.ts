import { useMemo, useState } from 'react';
import type { Period, TuitionBook } from '../../types/tuition';
import { createTuitionSample } from '../../data/tuitionSample';
import {
  createBatch,
  createStudent,
  enrol,
  generateFees,
  recordPayment,
  saveAttendance,
  setStudentActive,
  unenrol,
  updateBatch,
  updateStudent,
  type BatchInput,
  type StudentInput,
} from './tuitionLogic';

/**
 * The demo's single source of truth: one in-memory book of batches, sessions,
 * students, enrolments, attendance, fees and payments (the same pattern as the
 * other Vixidia demos). Every roster, balance and figure is derived from it.
 * Nothing is saved; reloading or resetting restores the sample data.
 */
export function useTuitionDemo() {
  const [book, setBook] = useState<TuitionBook>(() => createTuitionSample());

  const actions = useMemo(() => {
    function commit<R extends { ok: true; book: TuitionBook } | { ok: false }>(result: R): R {
      const r: { ok: true; book: TuitionBook } | { ok: false } = result;
      if (r.ok) setBook(r.book);
      return result;
    }
    return {
      saveAttendance: (sessionId: string, marks: Record<string, string>) => commit(saveAttendance(book, sessionId, marks)),
      generateFees: (p: Period) => commit(generateFees(book, p)),
      pay: (input: { feeId: string; amount: string; method: string }) => commit(recordPayment(book, input)),
      createStudent: (input: StudentInput) => commit(createStudent(book, input)),
      updateStudent: (id: string, input: StudentInput) => commit(updateStudent(book, id, input)),
      setStudentActive: (id: string, active: boolean) => commit(setStudentActive(book, id, active)),
      enrol: (input: { studentId: string; batchId: string; fee: string }) => commit(enrol(book, input)),
      unenrol: (enrolmentId: string) => commit(unenrol(book, enrolmentId)),
      createBatch: (input: BatchInput) => commit(createBatch(book, input)),
      updateBatch: (id: string, input: BatchInput) => commit(updateBatch(book, id, input)),
      reset: () => setBook(createTuitionSample()),
    };
  }, [book]);

  return { book, actions };
}
