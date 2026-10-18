import { useMemo, useState } from 'react';
import type { CrmBook } from '../../types/crm';
import { createCrmSample } from '../../data/crmSample';
import { addInteraction, createCustomer, crmOverview, customerRows, updateCustomer, type CustomerInput, type InteractionInput } from './crmLogic';

/**
 * The CRM demo's single source of truth: one in-memory book of customers and
 * interactions (the same pattern as the invoice demo). Every screen reads rows
 * derived from it. Nothing is saved; reloading or resetting restores the sample data.
 */
export function useCrmDemo() {
  const [book, setBook] = useState<CrmBook>(() => createCrmSample());
  // The data as last loaded or reset; anything else means the visitor has changed something.
  const [baseline, setBaseline] = useState<CrmBook>(book);
  // Keep the first "today" so a reset restores exactly the data first shown.
  const [initialToday] = useState(book.today);

  const rows = useMemo(() => customerRows(book), [book]);
  const summary = useMemo(() => crmOverview(rows), [rows]);

  const actions = useMemo(() => {
    function commit<R extends { ok: true; book: CrmBook } | { ok: false }>(result: R): R {
      const r: { ok: true; book: CrmBook } | { ok: false } = result;
      if (r.ok) setBook(r.book);
      return result;
    }
    return {
      createCustomer: (input: CustomerInput) => commit(createCustomer(book, input)),
      updateCustomer: (id: string, input: CustomerInput) => commit(updateCustomer(book, id, input)),
      addInteraction: (input: InteractionInput) => commit(addInteraction(book, input)),
      reset: () => {
        const fresh = createCrmSample(initialToday);
        setBaseline(fresh);
        setBook(fresh);
      },
    };
  }, [book, initialToday]);

  return { book, rows, summary, actions, changed: book !== baseline };
}
