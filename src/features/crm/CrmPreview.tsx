import { useMemo } from 'react';
import { createCrmSample } from '../../data/crmSample';
import { crmOverview, customerRows } from './crmLogic';
import { CustomerTable } from './CustomerTable';

/** Read-only glimpse of the CRM for its product page, built from the demo's sample data. */
export function CrmPreview() {
  const { rows, summary, today } = useMemo(() => {
    const book = createCrmSample();
    const r = customerRows(book);
    return { rows: r, summary: crmOverview(r), today: book.today };
  }, []);
  const figures = [
    ['Customers', summary.total],
    ['Prospects', summary.prospects],
    ['Active', summary.active],
    ['No contact in 30+ days', summary.needsCatchUp],
  ] as const;
  return (
    <figure className="overflow-hidden rounded-[var(--radius-panel)] border border-line bg-surface shadow-[var(--shadow-panel)]">
      <dl className="grid grid-cols-2 gap-px border-b border-line bg-line sm:grid-cols-4">
        {figures.map(([label, value]) => (
          <div key={label} className="bg-surface px-4 py-3">
            <dt className="text-xs text-fg-muted">{label}</dt>
            <dd className="tabular mt-0.5 font-semibold text-fg">{value}</dd>
          </div>
        ))}
      </dl>
      <div inert className="pointer-events-none">
        <CustomerTable rows={rows.slice(0, 4)} today={today} onOpen={() => undefined} caption="Sample customers" />
      </div>
      <figcaption className="border-t border-line px-4 py-2.5 text-xs text-fg-muted">Fictional sample customers from the demo.</figcaption>
    </figure>
  );
}
