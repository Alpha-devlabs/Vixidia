import { Award, ShoppingBag, Trophy, UserPlus, type LucideIcon } from 'lucide-react';
import type { ActivityEvent, ActivityKind } from './pulseLogic';
import { formatCurrency, formatRelativeDay } from '../../utils/format';

const kindIcon: Record<ActivityKind, LucideIcon> = {
  order: ShoppingBag,
  'new-customer': UserPlus,
  milestone: Trophy,
  'best-day': Award,
};

/** Recent business events: new orders, first orders from new customers, milestones and record days. */
export function ActivityFeed({ events, today }: { events: ActivityEvent[]; today: string }) {
  if (events.length === 0) return <p className="px-4 py-6 text-sm text-fg-muted">No activity yet.</p>;
  return (
    <ol className="divide-y divide-line">
      {events.map((e) => {
        const Icon = kindIcon[e.kind];
        const highlight = e.kind === 'milestone' || e.kind === 'best-day';
        return (
          <li key={e.key} className="flex items-start gap-3 px-4 py-3">
            <span
              className={
                highlight
                  ? 'mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-strong'
                  : 'mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-canvas text-fg-muted'
              }
            >
              <Icon size={16} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{e.title}</span>
              <span className="block truncate text-xs text-fg-muted">{e.detail}</span>
            </span>
            <span className="tabular shrink-0 text-right text-xs text-fg-muted">
              {e.amount !== undefined && e.kind !== 'milestone' ? (
                <span className="block text-sm font-semibold text-fg">{formatCurrency(e.amount)}</span>
              ) : null}
              {formatRelativeDay(e.date, today)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
