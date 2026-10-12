import { useState } from 'react';
import { Info, TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react';
import type { Insight, InsightTone } from './pulseLogic';
import { cn } from '../../utils/cn';

const toneStyle: Record<InsightTone, { icon: LucideIcon; label: string; className: string }> = {
  negative: { icon: TrendingDown, label: 'Worth a look', className: 'bg-danger-soft text-danger-strong' },
  positive: { icon: TrendingUp, label: 'Going well', className: 'bg-success-soft text-success-strong' },
  neutral: { icon: Info, label: 'For context', className: 'bg-subtle text-fg-muted' },
};

interface Props {
  items: Insight[];
  /** Show this many until the visitor asks for all; omit to show everything. */
  limit?: number;
}

/** Rule-based observations, each tagged with an icon and a word as well as colour. */
export function InsightsList({ items, limit }: Props) {
  const [expanded, setExpanded] = useState(false);
  if (items.length === 0) return <p className="px-4 py-6 text-sm text-fg-muted">No notable changes in this period.</p>;
  const collapsible = limit !== undefined && items.length > limit;
  const shown = collapsible && !expanded ? items.slice(0, limit) : items;

  return (
    <>
      <ul className="divide-y divide-line">
        {shown.map((i) => {
          const { icon: Icon, label, className } = toneStyle[i.tone];
          return (
            <li key={i.id} className="flex gap-3 px-4 py-3">
              <span className={cn('mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full', className)}>
                <Icon size={16} aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="sr-only">{label}: </span>
                <span className="block text-sm font-medium">{i.title}</span>
                <span className="block text-xs text-fg-muted">{i.detail}</span>
              </span>
            </li>
          );
        })}
      </ul>
      {collapsible ? (
        <div className="border-t border-line px-4 py-2.5">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="text-sm font-medium text-accent-strong hover:underline"
          >
            {expanded ? 'Show fewer' : `Show all ${items.length} insights`}
          </button>
        </div>
      ) : null}
    </>
  );
}
