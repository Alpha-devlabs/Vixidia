import { useMemo, useState } from 'react';
import type { TaskBook } from '../../types/tasks';
import { createTasksSample } from '../../data/tasksSample';
import { createTask, setCompleted, taskRows, taskSummary, updateTask, type TaskInput } from './taskLogic';

/**
 * The tasks demo's single source of truth: one in-memory book (the same pattern
 * as the invoice and CRM demos). Every view reads rows derived from it, so
 * completing a task updates the list and the overview together. Nothing is
 * saved; reloading or resetting restores the sample data.
 */
export function useTasksDemo() {
  const [book, setBook] = useState<TaskBook>(() => createTasksSample());
  // The data as last loaded or reset; anything else means the visitor has changed something.
  const [baseline, setBaseline] = useState<TaskBook>(book);
  // Keep the first "today" so a reset restores exactly the data first shown.
  const [initialToday] = useState(book.today);

  const rows = useMemo(() => taskRows(book), [book]);
  const summary = useMemo(() => taskSummary(rows), [rows]);

  const actions = useMemo(() => {
    function commit<R extends { ok: true; book: TaskBook } | { ok: false }>(result: R): R {
      const r: { ok: true; book: TaskBook } | { ok: false } = result;
      if (r.ok) setBook(r.book);
      return result;
    }
    return {
      create: (input: TaskInput) => commit(createTask(book, input)),
      update: (id: string, input: TaskInput) => commit(updateTask(book, id, input)),
      setCompleted: (id: string, completed: boolean) => commit(setCompleted(book, id, completed)),
      reset: () => {
        const fresh = createTasksSample(initialToday);
        setBaseline(fresh);
        setBook(fresh);
      },
    };
  }, [book, initialToday]);

  return { book, rows, summary, actions, changed: book !== baseline };
}
