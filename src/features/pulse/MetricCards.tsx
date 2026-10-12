import { ArrowDownRight, ArrowUpRight, Minus, Package, ShoppingBag, TrendingUp, Receipt, type LucideIcon } from 'lucide-react';
import { percentChange, type PeriodSummary } from './pulseLogic';
import { formatCurrency } from '../../utils/format';
import { cn } from '../../utils/cn';

interface Metric {
  label: string;
  /** What the number means, in plain words. */
  definition: string;
  value: string;
  change: number | null;
  icon: LucideIcon;
}

function buildMetrics({ current, previous }: PeriodSummary): Metric[] {
  return [
    {
      label: 'Revenue',
      definition: 'Value of all orders',
      value: formatCurrency(current.revenue),
      change: percentChange(current.revenue, previous.revenue),
      icon: TrendingUp,
    },
    {
      label: 'Orders',
      definition: 'Orders placed',
      value: current.orders.toLocaleString('en-IN'),
      change: percentChange(current.orders, previous.orders),
      icon: ShoppingBag,
    },
    {
      label: 'Average order value',
      definition: 'Revenue ÷ orders',
      value: formatCurrency(current.averageOrderValue),
      change: percentChange(current.averageOrderValue, previous.averageOrderValue),
      icon: Receipt,
    },
    {
      label: 'Items sold',
      definition: 'Units across all orders',
      value: current.itemsSold.toLocaleString('en-IN'),
      change: percentChange(current.itemsSold, previous.itemsSold),
      icon: Package,
    },
  ];
}

/** Change vs the previous period, shown with an arrow and a word, never colour alone. */
export function ChangeLabel({ value, suffix }: { value: number | null; suffix?: string }) {
  if (value === null) return <span className="text-fg-muted">No earlier data</span>;
  const rounded = Math.round(value);
  const Icon = rounded > 0 ? ArrowUpRight : rounded < 0 ? ArrowDownRight : Minus;
  const word = rounded > 0 ? 'Up' : rounded < 0 ? 'Down' : 'No change';
  return (
    <span className="inline-flex flex-wrap items-center gap-1 text-fg-muted">
      <span className={cn('inline-flex items-center gap-0.5 font-semibold', rounded < 0 ? 'text-danger-strong' : rounded > 0 ? 'text-success-strong' : 'text-fg')}>
        <Icon size={14} aria-hidden="true" />
        {word}
        {rounded !== 0 ? ` ${Math.abs(rounded)}%` : ''}
      </span>
      {suffix}
    </span>
  );
}

interface Props {
  summary: PeriodSummary;
  /** e.g. "30 days" */
  periodWord: string;
  compact?: boolean;
}

export function MetricCards({ summary, periodWord, compact = false }: Props) {
  return (
    <dl className={cn('grid grid-cols-1 gap-3 min-[420px]:grid-cols-2', !compact && 'xl:grid-cols-4')}>
      {buildMetrics(summary).map((m) => (
        <div key={m.label} className="flex flex-col rounded-[var(--radius-panel)] border border-line bg-surface p-4">
          <dt className="flex items-center gap-2 text-sm font-semibold">
            <m.icon size={16} className="text-accent-strong" aria-hidden="true" />
            {m.label}
          </dt>
          {compact ? null : <dd className="mt-0.5 text-xs text-fg-muted">{m.definition}</dd>}
          <dd className="tabular mt-2 text-2xl font-bold tracking-[-0.02em] sm:text-[1.75rem]">{m.value}</dd>
          {compact ? null : (
            <dd className="mt-1.5 text-xs leading-snug sm:text-sm">
              <ChangeLabel value={m.change} suffix={`vs previous ${periodWord}`} />
            </dd>
          )}
        </div>
      ))}
    </dl>
  );
}
