import { Link, useLocation } from 'react-router';
import { ArrowRight, Lightbulb } from 'lucide-react';
import { Badge } from '../../components/Badge';
import { Button, buttonClass } from '../../components/Button';
import { StatusBadge } from '../../components/StatusBadge';
import { cn } from '../../utils/cn';
import type { SolutionEntry } from './catalog';
import { originState } from '../../utils/origin';

/** One compact result: what it is, where it stands, and what you can do with it. */
export function SolutionResult({ entry, onInterest }: { entry: SolutionEntry; onInterest: () => void }) {
  const Icon = entry.icon;
  const isProduct = entry.type === 'product';
  return (
    <article className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className={cn('inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-control)]', isProduct && entry.demoPath ? 'bg-accent-soft text-accent-strong' : 'bg-subtle text-fg-muted')}>
          <Icon size={20} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="font-semibold text-fg">{entry.name}</h3>
            {isProduct ? (
              <StatusBadge status={entry.product.status} />
            ) : (
              <Badge tone="neutral" icon={Lightbulb} dashed>
                Planned idea
              </Badge>
            )}
          </div>
          <p className="text-xs font-medium text-fg-muted">{entry.label}</p>
          <p className="mt-1 text-sm leading-relaxed text-fg-muted">{entry.summary}</p>
          {!isProduct ? <p className="mt-1 text-xs text-fg-subtle">Not available yet · no demo</p> : null}
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2 pl-13 sm:pl-0">
        {entry.type === 'product' ? (
          <ProductActions name={entry.name} detailPath={entry.detailPath} {...(entry.demoPath ? { demoPath: entry.demoPath } : {})} />
        ) : (
          <Button variant="secondary" size="sm" onClick={onInterest} ariaLabel={`I’d use this: ${entry.name}`}>
            I’d use this
          </Button>
        )}
      </div>
    </article>
  );
}

/** Links for an existing product. They remember these results, so its page can offer a way back. */
function ProductActions({ name, detailPath, demoPath }: { name: string; detailPath: string; demoPath?: string }) {
  const state = originState(useLocation());
  return (
    <>
      {demoPath ? (
        <Link to={demoPath} state={state} className={buttonClass('primary', 'sm', 'min-h-10')} aria-label={`Try demo: ${name}`}>
          Try demo <ArrowRight size={15} aria-hidden="true" />
        </Link>
      ) : null}
      <Link to={detailPath} state={state} className={buttonClass(demoPath ? 'subtle' : 'secondary', 'sm', 'min-h-10')} aria-label={`View solution: ${name}`}>
        View solution
      </Link>
    </>
  );
}
