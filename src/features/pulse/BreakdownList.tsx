import type { BreakdownRow } from './pulseLogic';
import { ChangeLabel } from './MetricCards';
import { formatCurrency } from '../../utils/format';

/**
 * Revenue share as horizontal bars. Every value is printed beside its bar, so the
 * chart needs no tooltip and doubles as its own table.
 */
export function BreakdownList({ rows, periodWord }: { rows: BreakdownRow[]; periodWord: string }) {
  const visible = rows.filter((r) => r.revenue > 0);
  if (visible.length === 0) return <p className="py-6 text-sm text-fg-muted">No sales in this period.</p>;
  const largest = visible[0]!.revenue;
  return (
    <ul className="space-y-4">
      {visible.map((r) => (
        <li key={r.key}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-sm">
            <span className="font-medium">{r.label}</span>
            <span className="tabular text-fg-muted">
              <span className="font-semibold text-fg">{formatCurrency(r.revenue)}</span> · {Math.round(r.share * 100)}%
            </span>
          </div>
          <div className="mt-1.5 h-2 rounded-full bg-subtle" aria-hidden="true">
            <div className="h-full rounded-full bg-chart" style={{ width: `${(r.revenue / largest) * 100}%` }} />
          </div>
          <p className="mt-1 text-xs">
            <ChangeLabel value={r.change} suffix={`vs previous ${periodWord} · ${r.itemsSold.toLocaleString('en-IN')} sold`} />
          </p>
        </li>
      ))}
    </ul>
  );
}
