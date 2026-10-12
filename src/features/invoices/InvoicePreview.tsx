import { useMemo } from 'react';
import { createInvoiceSample } from '../../data/invoiceSample';
import { invoiceRows, overview } from './invoiceView';
import { InvoiceTable } from './InvoiceTable';
import { formatCurrency } from '../../utils/format';

/** Read-only glimpse of the tracker for its product page, built from the preview's sample data. */
export function InvoicePreview({ onOpen }: { onOpen?: (id: string) => void }) {
  const { rows, summary } = useMemo(() => {
    const data = createInvoiceSample();
    const r = invoiceRows(data);
    return { rows: r, summary: overview(r, data.payments) };
  }, []);
  const figures = [
    ['Invoiced', summary.invoiced],
    ['Collected', summary.collected],
    ['Outstanding', summary.outstanding],
    ['Overdue', summary.overdue],
  ] as const;
  return (
    <figure className="overflow-hidden rounded-[var(--radius-panel)] border border-line bg-surface shadow-[var(--shadow-panel)]">
      <dl className="grid grid-cols-2 gap-px border-b border-line bg-line sm:grid-cols-4">
        {figures.map(([label, value]) => (
          <div key={label} className="bg-surface px-4 py-3">
            <dt className="text-xs text-fg-muted">{label}</dt>
            <dd className="tabular mt-0.5 font-semibold text-fg">{formatCurrency(value)}</dd>
          </div>
        ))}
      </dl>
      <div inert className="pointer-events-none">
        <InvoiceTable rows={rows.slice(0, 4)} onOpen={onOpen ?? (() => undefined)} caption="Sample invoices" />
      </div>
      <figcaption className="border-t border-line px-4 py-2.5 text-xs text-fg-muted">
        Fictional sample invoices from the design preview.
      </figcaption>
    </figure>
  );
}
