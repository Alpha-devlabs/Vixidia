import { useMemo } from 'react';
import { Activity, ChartColumn, Gauge, Lightbulb, ChartPie, type LucideIcon } from 'lucide-react';
import { createSampleState, sampleBusiness } from '../../data/pulseSample';
import { insights, summarize, trendSeries } from './pulseLogic';
import { MetricCards } from './MetricCards';
import { TrendChart } from './TrendChart';
import { formatCurrency } from '../../utils/format';

const PREVIEW_DAYS = 30;

function usePreviewData() {
  return useMemo(() => {
    const s = createSampleState();
    return {
      summary: summarize(s, PREVIEW_DAYS),
      series: trendSeries(s, PREVIEW_DAYS),
      insight: insights(s, PREVIEW_DAYS).find((i) => i.id === 'revenue'),
    };
  }, []);
}

const previewNav: { icon: LucideIcon; label: string }[] = [
  { icon: Gauge, label: 'Overview' },
  { icon: ChartColumn, label: 'Trends' },
  { icon: Lightbulb, label: 'Insights' },
  { icon: ChartPie, label: 'Breakdown' },
];

/** Read-only snapshot of the Business Analytics overview for the product page, from the demo's sample data. */
export function PulsePreview() {
  const { summary, series } = usePreviewData();
  return (
    <figure className="overflow-hidden rounded-[var(--radius-panel)] border border-line-strong bg-canvas shadow-[var(--shadow-panel)]">
      <div className="flex">
        <div className="hidden w-40 shrink-0 flex-col gap-1 bg-inverse p-3 text-on-inverse sm:flex" aria-hidden="true">
          <p className="mb-3 flex items-center gap-1.5 px-1 text-sm font-bold">
            <Activity size={15} className="shrink-0 text-on-inverse" /> Business Analytics
          </p>
          {previewNav.map(({ icon: Icon, label }, i) => (
            <span
              key={label}
              className={
                i === 0
                  ? 'flex items-center gap-2 rounded-md bg-accent px-2 py-1.5 text-xs font-medium text-on-accent'
                  : 'flex items-center gap-2 px-2 py-1.5 text-xs text-on-inverse-muted'
              }
            >
              <Icon size={14} /> {label}
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1 space-y-3 p-3 sm:p-4">
          <MetricCards summary={summary} periodWord="30 days" compact />
          <div className="rounded-[var(--radius-panel)] border border-line bg-surface p-3">
            <p className="mb-2 text-sm font-semibold">Revenue, last 30 days</p>
            <TrendChart series={series} compact />
          </div>
        </div>
      </div>
      <figcaption className="border-t border-line bg-surface px-4 py-2.5 text-xs text-fg-muted">
        Sample data for {sampleBusiness.name}, a fictional business — not a connected account.
      </figcaption>
    </figure>
  );
}

/** A small homepage glimpse of Business Analytics: three figures, a revenue sparkline and one insight. */
export function PulseSnapshot() {
  const { summary, series, insight } = usePreviewData();
  const { current } = summary;
  const figures = [
    ['Revenue', formatCurrency(current.revenue)],
    ['Orders', current.orders.toLocaleString('en-IN')],
    ['Avg. order', formatCurrency(current.averageOrderValue)],
  ] as const;
  return (
    <figure className="rounded-[var(--radius-panel)] border border-line bg-surface p-4">
      <dl className="grid grid-cols-3 gap-3">
        {figures.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-fg-muted">{label}</dt>
            <dd className="tabular text-base font-bold tracking-[-0.01em] sm:text-lg">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-3">
        <TrendChart series={series} compact />
      </div>
      <figcaption className="mt-2 text-xs text-fg-muted">
        {insight ? `${insight.title} vs the previous 30 days · ` : ''}fictional sample data
      </figcaption>
    </figure>
  );
}
