import { useId, useMemo, useState, type ReactNode } from 'react';
import { Activity, ChartColumn, Gauge, Lightbulb, ListOrdered, ChartPie, RotateCcw, type LucideIcon } from 'lucide-react';
import { usePulseDemo } from './usePulseDemo';
import { MetricCards } from './MetricCards';
import { TrendChart } from './TrendChart';
import { BreakdownList } from './BreakdownList';
import { InsightsList } from './InsightsList';
import { ActivityFeed } from './ActivityFeed';
import { TargetProgress } from './TargetProgress';
import {
  activityFeed,
  breakdown,
  insights,
  periods,
  summarize,
  targetProgress,
  trendMetrics,
  trendSeries,
  type BreakdownBy,
  type PeriodDays,
  type TrendMetric,
} from './pulseLogic';
import { sampleBusiness } from '../../data/pulseSample';
import { Button } from '../../components/Button';
import { formatDayRange, formatLongDay } from '../../utils/format';
import { cn } from '../../utils/cn';

const sections: { id: string; label: string; icon: LucideIcon }[] = [
  { id: 'pulse-overview', label: 'Overview', icon: Gauge },
  { id: 'pulse-trend', label: 'Trends', icon: ChartColumn },
  { id: 'pulse-insights', label: 'Insights', icon: Lightbulb },
  { id: 'pulse-breakdown', label: 'Breakdown', icon: ChartPie },
  { id: 'pulse-activity', label: 'Activity', icon: ListOrdered },
];

const DEFAULT_DAYS: PeriodDays = 30;

/** The Pulse sample-data analytics dashboard. All state is local to this component tree. */
export function PulseDemo() {
  const { state, actions, toast } = usePulseDemo();
  const [days, setDays] = useState<PeriodDays>(DEFAULT_DAYS);
  const [metric, setMetric] = useState<TrendMetric>('revenue');
  const [by, setBy] = useState<BreakdownBy>('category');

  const periodWord = `${days} days`;
  const summary = useMemo(() => summarize(state, days), [state, days]);
  const series = useMemo(() => trendSeries(state, days), [state, days]);
  const rows = useMemo(() => breakdown(state, days, by), [state, days, by]);
  // The target has its own panel, so its insight isn't repeated in the list.
  const notes = useMemo(() => insights(state, days).filter((i) => i.id !== 'target'), [state, days]);
  const progress = useMemo(() => targetProgress(state, days), [state, days]);
  const activity = useMemo(() => activityFeed(state, 8), [state]);

  const reset = () => {
    setDays(DEFAULT_DAYS);
    setMetric('revenue');
    setBy('category');
    actions.reset();
  };

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col lg:flex-row">
      <aside className="on-inverse border-b border-inverse-line bg-inverse text-on-inverse lg:w-56 lg:shrink-0 lg:border-r lg:border-b-0">
        <div className="flex flex-col gap-4 px-4 py-4 lg:sticky lg:top-14 lg:px-5 lg:py-6">
          <div className="flex items-center justify-between gap-3 lg:block">
            <p className="flex items-center gap-2 text-lg font-bold tracking-[-0.02em]">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-accent text-on-accent">
                <Activity size={17} strokeWidth={2.4} aria-hidden="true" />
              </span>
              Pulse
            </p>
            <p className="text-xs text-on-inverse-muted lg:mt-3">
              <span className="block text-on-inverse-muted max-lg:sr-only">Sample business</span>
              <span className="font-medium text-on-inverse">{sampleBusiness.name}</span>
            </p>
          </div>
          <nav aria-label="Dashboard sections" className="relative -mx-1 flex gap-1 overflow-x-auto px-1 lg:mt-4 lg:flex-col">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="inline-flex min-h-10 shrink-0 items-center gap-2.5 rounded-[var(--radius-control)] px-3 text-sm font-medium text-on-inverse-muted transition-colors hover:bg-on-inverse/10 hover:text-on-inverse"
              >
                <s.icon size={17} aria-hidden="true" />
                {s.label}
              </a>
            ))}
          </nav>
        </div>
      </aside>

      <div className="min-w-0 flex-1 bg-canvas">
        <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
          <div id="pulse-overview" className="flex scroll-mt-20 flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-[-0.02em] sm:text-3xl">Performance overview</h1>
              <p className="mt-1 text-sm text-fg-muted">
                {formatDayRange(summary.range.start, summary.range.end)} · today is {formatLongDay(state.today)}
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={reset}>
              <RotateCcw size={16} aria-hidden="true" /> Reset demo
            </Button>
          </div>

          {/* Reporting period: one control above everything it scopes. */}
          <Segmented
            label="Reporting period"
            visibleLabel="Period"
            options={periods.map((p) => ({ value: p.days, label: p.label }))}
            value={days}
            onChange={setDays}
          />

          <MetricCards summary={summary} periodWord={periodWord} />

          <div className="grid grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <Panel id="pulse-trend" title="Trend">
              <div className="border-b border-line px-4 py-3">
                <Segmented
                  label="Chart metric"
                  options={trendMetrics.map((m) => ({ value: m.value, label: m.label }))}
                  value={metric}
                  onChange={setMetric}
                  small
                />
              </div>
              <div className="p-4">
                <TrendChart series={series} metric={metric} />
              </div>
            </Panel>
            <div className="grid content-start gap-5">
              <Panel id="pulse-target" title="Revenue target">
                <TargetProgress progress={progress} days={days} target30={state.revenueTarget30} onSetTarget={actions.setTarget} />
              </Panel>
              <Panel
                id="pulse-insights"
                title="Insights"
                aside={<span className="text-xs text-fg-muted">Rule-based, from the sample data</span>}
              >
                <InsightsList items={notes} limit={4} />
              </Panel>
            </div>
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-2">
            <Panel id="pulse-breakdown" title="Sales breakdown">
              <div className="border-b border-line px-4 py-3">
                <Segmented
                  label="Break down by"
                  options={[
                    { value: 'category' as const, label: 'By category' },
                    { value: 'product' as const, label: 'By product' },
                  ]}
                  value={by}
                  onChange={setBy}
                  small
                />
              </div>
              <div className="p-4">
                <BreakdownList rows={rows} periodWord={periodWord} />
              </div>
            </Panel>
            <Panel id="pulse-activity" title="Recent activity" aside={<span className="text-xs text-fg-muted">Last 30 days</span>}>
              <ActivityFeed events={activity} today={state.today} />
            </Panel>
          </div>
        </div>
      </div>

      <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
        {toast ? (
          <p key={toast.id} className="animate-pop rounded-[var(--radius-control)] bg-fg px-4 py-3 text-sm font-medium text-canvas shadow-[var(--shadow-lift)]">
            {toast.message}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Panel({ id, title, aside, children }: { id: string; title: string; aside?: ReactNode; children: ReactNode }) {
  const headingId = useId();
  return (
    <section id={id} aria-labelledby={headingId} className="min-w-0 scroll-mt-20 rounded-[var(--radius-panel)] border border-line bg-surface">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-line px-4 py-3">
        <h2 id={headingId} className="text-base font-semibold">
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

interface SegmentedProps<T extends string | number> {
  label: string;
  visibleLabel?: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  small?: boolean;
}

/** A row of toggle buttons; the pressed one is the current choice. */
function Segmented<T extends string | number>({ label, visibleLabel, options, value, onChange, small }: SegmentedProps<T>) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-2">
      {visibleLabel ? (
        <span className="text-sm font-medium text-fg-muted" aria-hidden="true">
          {visibleLabel}
        </span>
      ) : null}
      <div className="inline-flex max-w-full overflow-x-auto rounded-[var(--radius-control)] border border-line-strong bg-surface p-0.5">
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              'shrink-0 rounded-[6px] font-medium whitespace-nowrap transition-colors',
              small ? 'min-h-8 px-2.5 text-[0.8rem]' : 'min-h-9 px-3 text-sm',
              value === o.value ? 'bg-fg text-canvas' : 'text-fg-muted hover:text-fg',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
