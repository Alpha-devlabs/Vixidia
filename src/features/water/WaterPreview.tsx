import { useMemo } from 'react';
import { createWaterSample } from '../../data/waterSample';
import { businessSummary, daySummary, deliveryRows, money } from './waterLogic';
import { DeliveryList } from './DeliveryList';
import { formatLongDay } from '../../utils/format';

/** Read-only glimpse of today's round for the product page, from the demo's sample data. */
export function WaterPreview() {
  const { rows, day, biz, today } = useMemo(() => {
    const book = createWaterSample();
    const r = deliveryRows(book, book.today);
    return { rows: r, day: daySummary(r), biz: businessSummary(book), today: book.today };
  }, []);
  const figures = [
    ['Completed', `${day.completed} of ${day.scheduled}`],
    ['Pending', String(day.pending)],
    ['Outstanding', money(biz.outstanding)],
    ['Cans with customers', String(biz.cansWithCustomers)],
  ] as const;
  const sample = [...rows.filter((r) => r.delivery.status === 'completed').slice(0, 2), ...rows.filter((r) => r.delivery.status === 'scheduled').slice(0, 2)];
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
        <DeliveryList rows={sample} today="" onOpen={() => undefined} onRecord={() => undefined} />
      </div>
      <figcaption className="border-t border-line px-4 py-2.5 text-xs text-fg-muted">Fictional customers on {formatLongDay(today)}, from the demo.</figcaption>
    </figure>
  );
}
