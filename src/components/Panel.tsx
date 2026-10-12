import { useId, type ReactNode } from 'react';
import { cn } from '../utils/cn';

interface PanelProps {
  title: string;
  /** Optional one-line description under the title. */
  description?: string;
  /** Right-aligned header content: a total, a link, a small control. */
  aside?: ReactNode;
  id?: string;
  className?: string;
  children: ReactNode;
}

/** A card with a titled header, used for dashboard sections. */
export function Panel({ title, description, aside, id, className, children }: PanelProps) {
  const headingId = useId();
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn('min-w-0 scroll-mt-20 rounded-[var(--radius-panel)] border border-line bg-surface shadow-[var(--shadow-panel)]', className)}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-line px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <h2 id={headingId} className="text-[0.95rem] font-semibold text-fg">
            {title}
          </h2>
          {description ? <p className="text-xs text-fg-muted">{description}</p> : null}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** A plain card surface. */
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('rounded-[var(--radius-panel)] border border-line bg-surface shadow-[var(--shadow-panel)]', className)}>
      {children}
    </div>
  );
}
