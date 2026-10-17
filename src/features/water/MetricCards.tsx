import { Banknote, Clock, Truck, Wallet, type LucideIcon } from 'lucide-react';
import type { DaySummary } from './waterLogic';
import { formatCurrency, pluralize } from '../../utils/format';
import { cn } from '../../utils/cn';

interface Metric {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  emphasis?: boolean;
}

function buildMetrics(s: DaySummary): Metric[] {
  return [
    {
      label: 'Orders today',
      value: String(s.ordersToday),
      detail: `${s.delivered} delivered · ${s.unitsDelivered} cans out`,
      icon: Truck,
    },
    {
      label: 'Still to deliver',
      value: String(s.pending),
      detail: s.pending === 0 ? 'Run complete for today' : `${pluralize(s.unitsPending, 'can')} on the van`,
      icon: Clock,
      emphasis: s.pending > 0,
    },
    {
      label: 'Collected today',
      value: formatCurrency(s.collectedToday),
      detail: `of ${formatCurrency(s.billedToday)} billed today`,
      icon: Banknote,
    },
    {
      label: 'Outstanding dues',
      value: formatCurrency(s.outstanding),
      detail:
        s.customersWithDues === 0
          ? 'Nobody owes anything'
          : `${pluralize(s.unpaidOrders, 'unpaid order')} · ${pluralize(s.customersWithDues, 'customer')}`,
      icon: Wallet,
    },
  ];
}

export function MetricCards({ summary }: { summary: DaySummary }) {
  return (
    <section aria-label="Today’s summary">
      <dl className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {buildMetrics(summary).map((m) => (
          <div
            key={m.label}
            className={cn(
              'rounded-[var(--radius-panel)] border p-4 shadow-[var(--shadow-panel)]',
              m.emphasis ? 'border-accent/50 bg-accent-soft' : 'border-line bg-surface',
            )}
          >
            <dt className="flex items-center gap-2 text-sm font-medium text-fg-muted">
              <m.icon size={16} aria-hidden="true" />
              {m.label}
            </dt>
            <dd className="mt-2">
              <span className="tabular block text-2xl font-semibold tracking-[-0.02em] text-fg sm:text-[1.75rem]">{m.value}</span>
              <span className="mt-1 block text-xs leading-snug text-fg-muted sm:text-sm">{m.detail}</span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
