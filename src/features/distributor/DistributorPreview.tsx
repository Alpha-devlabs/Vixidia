import { useMemo } from 'react';
import { createDistributorSample } from '../../data/distributorSample';
import { lowStockRows, overview, rangeFor, rupees, unitText } from './distributorLogic';
import { formatLongDay } from '../../utils/format';

/** Read-only glimpse for the product page: this month's figures and low-stock products, from the demo's sample data. */
export function DistributorPreview() {
  const { o, low, today } = useMemo(() => {
    const book = createDistributorSample();
    return { o: overview(book, rangeFor(book.today, 'mtd')), low: lowStockRows(book).slice(0, 4), today: book.today };
  }, []);
  const figures = [
    ['Sales this month', rupees(o.sales.value)],
    ['Collected', rupees(o.collected.value)],
    ['Customers owe', rupees(o.receivables.total)],
    ['Stock at cost', rupees(o.inventoryCost)],
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
      <p className="px-4 pt-3 text-xs font-semibold tracking-wide text-fg-muted uppercase">Low stock</p>
      <ul inert className="divide-y divide-line">
        {low.map((r) => (
          <li key={r.product.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium text-fg">{r.product.name}</span>
              <span className="tabular block text-xs text-fg-muted">
                {r.product.sku} · reorder at {r.product.reorderLevel}
              </span>
            </span>
            <span className="tabular font-semibold text-warning-strong">{unitText(r.product.unit, r.stock)}</span>
          </li>
        ))}
      </ul>
      <figcaption className="border-t border-line px-4 py-2.5 text-xs text-fg-muted">Fictional wholesaler on {formatLongDay(today)}, from the demo.</figcaption>
    </figure>
  );
}
