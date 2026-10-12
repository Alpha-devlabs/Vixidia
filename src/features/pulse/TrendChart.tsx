import { useId, useState } from 'react';
import { Table2 } from 'lucide-react';
import { bucketValue, trendMetrics, type TrendBucket, type TrendMetric, type TrendSeries } from './pulseLogic';
import { formatCompactCurrency, formatCurrency, formatDay, formatDayRange, formatWeekday, pluralize } from '../../utils/format';
import { cn } from '../../utils/cn';

/** Rounds up to a clean axis maximum: 1, 2, 2.5 or 5 × a power of ten. */
export function niceMax(value: number): number {
  if (value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * power >= value) ?? 10;
  return step * power;
}

function bucketLabel(b: TrendBucket, granularity: TrendSeries['granularity']): string {
  return granularity === 'day' ? `${formatWeekday(b.start)} ${formatDay(b.start)}` : formatDayRange(b.start, b.end);
}

/** Which x-axis labels to print so they never collide; the latest bucket is always labelled. */
function showTick(index: number, count: number): boolean {
  const every = count <= 7 ? 1 : count <= 14 ? 3 : count <= 31 ? 5 : 3;
  return (count - 1 - index) % every === 0;
}

const formatAxis = (metric: TrendMetric, v: number) => (metric === 'orders' ? String(v) : formatCompactCurrency(v));

function describe(b: TrendBucket, metric: TrendMetric, granularity: TrendSeries['granularity']): string {
  const v = bucketValue(b, metric);
  const label = bucketLabel(b, granularity);
  if (v === null) return `${label}: no orders`;
  if (metric === 'revenue') return `${label}: ${formatCurrency(v)} from ${pluralize(b.orders, 'order')}`;
  if (metric === 'orders') return `${label}: ${pluralize(v, 'order')}, ${formatCurrency(b.revenue)}`;
  return `${label}: ${formatCurrency(v)} average across ${pluralize(b.orders, 'order')}`;
}

interface Props {
  series: TrendSeries;
  metric?: TrendMetric;
  /** Compact previews are not interactive and hide the table toggle. */
  compact?: boolean;
}

export function TrendChart({ series, metric = 'revenue', compact = false }: Props) {
  const [active, setActive] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const tableId = useId();
  const { buckets, granularity } = series;
  const metricLabel = trendMetrics.find((m) => m.value === metric)!.label;
  const values = buckets.map((b) => bucketValue(b, metric));
  const rawMax = Math.max(0, ...values.map((v) => v ?? 0));
  const max = metric === 'orders' ? Math.max(2, Math.ceil(niceMax(rawMax) / 2) * 2) : niceMax(rawMax);
  const ticks = [max, max / 2, 0];
  const height = compact ? 'h-28' : 'h-52 sm:h-64 xl:h-72';
  const current = active !== null ? buckets[active] : undefined;
  const dense = buckets.length > 14;

  return (
    <div>
      {compact ? null : (
        <div className="mb-3 flex min-h-11 flex-wrap items-center justify-between gap-2">
          <p className="tabular text-sm text-fg-muted" aria-hidden="true">
            {current ? (
              <span className="text-fg">{describe(current, metric, granularity)}</span>
            ) : (
              `${granularity === 'day' ? 'Daily' : 'Weekly'} ${metricLabel.toLowerCase()}. Hover, tap or focus a bar for details.`
            )}
          </p>
          <button
            type="button"
            onClick={() => setShowTable((v) => !v)}
            aria-expanded={showTable}
            aria-controls={tableId}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-[var(--radius-control)] px-2 text-sm font-medium text-fg-muted hover:bg-subtle hover:text-fg"
          >
            <Table2 size={16} aria-hidden="true" />
            {showTable ? 'Hide table' : 'Show as table'}
          </button>
        </div>
      )}

      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2">
        <div className={cn('tabular flex flex-col justify-between text-right text-[11px] text-fg-subtle', height)} aria-hidden="true">
          {ticks.map((t) => (
            <span key={t} className="-translate-y-1/2 leading-none first:translate-y-0 last:translate-y-0">
              {formatAxis(metric, t)}
            </span>
          ))}
        </div>

        <div className={cn('relative', height)}>
          {ticks.map((t) => (
            <div
              key={t}
              className="pointer-events-none absolute inset-x-0 border-t border-line"
              style={{ bottom: `${(t / max) * 100}%` }}
              aria-hidden="true"
            />
          ))}
          <div
            className={cn('absolute inset-0 flex items-end', dense ? 'gap-[2px]' : 'gap-1')}
            role={compact ? undefined : 'group'}
            aria-label={compact ? undefined : `${metricLabel} by ${granularity}`}
            onMouseLeave={() => setActive(null)}
          >
            {buckets.map((b, i) => {
              const v = values[i] ?? null;
              const pct = v === null ? 0 : (v / max) * 100;
              const bar = (
                <span
                  className={cn('block w-full max-w-6 rounded-t-[4px] transition-colors', active === i ? 'bg-accent-strong' : 'bg-chart')}
                  style={{ height: `${pct}%`, minHeight: v ? 2 : 0 }}
                />
              );
              return compact ? (
                <span key={b.start} className="flex h-full flex-1 items-end justify-center" aria-hidden="true">
                  {bar}
                </span>
              ) : (
                <button
                  key={b.start}
                  type="button"
                  className="flex h-full min-w-0 flex-1 items-end justify-center rounded-sm hover:bg-subtle/60 focus-visible:bg-subtle/60"
                  aria-label={describe(b, metric, granularity)}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  onClick={() => setActive(i)}
                >
                  {bar}
                </button>
              );
            })}
          </div>
        </div>

        <div aria-hidden="true" />
        <div className="relative mt-1.5 flex h-4 text-[11px] text-fg-subtle" aria-hidden="true">
          {buckets.map((b, i) => (
            <span key={b.start} className="relative flex-1">
              {showTick(i, buckets.length) ? (
                <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap">
                  {granularity === 'day' && buckets.length <= 7 ? formatWeekday(b.start) : formatDay(b.start)}
                </span>
              ) : null}
            </span>
          ))}
        </div>
      </div>

      {showTable && !compact ? (
        <div id={tableId} className="mt-4 max-h-72 overflow-auto rounded-[var(--radius-control)] border border-line">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">
              {metricLabel} by {granularity}
            </caption>
            <thead className="sticky top-0 bg-canvas text-fg-muted">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">{granularity === 'day' ? 'Day' : 'Week'}</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Orders</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Revenue</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Avg. order</th>
              </tr>
            </thead>
            <tbody>
              {[...buckets].reverse().map((b) => (
                <tr key={b.start} className="border-t border-line">
                  <td className="px-3 py-1.5">{bucketLabel(b, granularity)}</td>
                  <td className="tabular px-3 py-1.5 text-right">{b.orders}</td>
                  <td className="tabular px-3 py-1.5 text-right">{formatCurrency(b.revenue)}</td>
                  <td className="tabular px-3 py-1.5 text-right">{b.averageOrderValue === null ? '—' : formatCurrency(b.averageOrderValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
