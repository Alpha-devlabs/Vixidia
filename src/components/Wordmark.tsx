import { brand } from '../config/brand';
import { cn } from '../utils/cn';

/** Geometric mark: a check stroke inside a square — work done, nothing missed. Drawn from theme tokens. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('h-7 w-7 shrink-0', className)} aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="8" style={{ fill: 'var(--accent)' }} />
      <path
        d="M8.5 10.5 16 22l7.5-11.5"
        fill="none"
        style={{ stroke: 'var(--on-accent)' }}
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Wordmark({ inverse = false }: { inverse?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <BrandMark />
      <span className={cn('text-[1.15rem] font-bold tracking-[-0.02em]', inverse ? 'text-on-inverse' : 'text-fg')}>
        {brand.name}
      </span>
    </span>
  );
}
