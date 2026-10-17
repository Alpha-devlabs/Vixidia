import { useId } from 'react';
import { CircleCheck } from 'lucide-react';
import type { WaterState } from '../../types/water';
import { duesList } from './waterLogic';
import type { WaterActions } from './useWaterDemo';
import { Button } from '../../components/Button';
import { formatCurrency, pluralize } from '../../utils/format';

export function DuesPanel({ state, actions }: { state: WaterState; actions: WaterActions }) {
  const headingId = useId();
  const dues = duesList(state);
  const total = dues.reduce((acc, d) => acc + d.outstanding, 0);

  return (
    <section aria-labelledby={headingId} className="rounded-[var(--radius-panel)] border border-line bg-surface shadow-[var(--shadow-panel)]">
      <div className="flex items-baseline justify-between gap-2 border-b border-line px-4 py-3">
        <h2 id={headingId} className="text-base font-semibold text-fg">
          Money to collect
        </h2>
        <span className="tabular text-sm font-semibold text-danger-strong">{formatCurrency(total)}</span>
      </div>
      {dues.length === 0 ? (
        <p className="flex items-center gap-2 px-4 py-6 text-sm text-success-strong">
          <CircleCheck size={18} aria-hidden="true" /> Every order is paid. Nothing to chase.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {dues.map((d) => (
            <li key={d.customer.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-fg">{d.customer.name}</p>
                <p className="tabular text-xs text-fg-muted">
                  {formatCurrency(d.outstanding)} · {pluralize(d.unpaidCount, 'order')}
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => actions.settleCustomer(d.customer.id, d.customer.name)} ariaLabel={`Mark all dues from ${d.customer.name} paid`}>
                Mark paid
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
