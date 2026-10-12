import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../utils/cn';

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

const tones: Record<BadgeTone, string> = {
  neutral: 'border-line bg-subtle text-fg-muted',
  accent: 'border-accent/30 bg-accent-soft text-accent-strong',
  success: 'border-success/30 bg-success-soft text-success-strong',
  warning: 'border-warning/30 bg-warning-soft text-warning-strong',
  danger: 'border-danger/30 bg-danger-soft text-danger-strong',
};

interface Props {
  tone?: BadgeTone;
  icon?: LucideIcon;
  children: ReactNode;
  /** Dashed border marks something tentative, such as a planned product. */
  dashed?: boolean;
  className?: string;
}

/** Status label. Always text (plus an optional icon), so meaning never relies on colour alone. */
export function Badge({ tone = 'neutral', icon: Icon, children, dashed, className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap',
        tones[tone],
        dashed && 'border-dashed',
        className,
      )}
    >
      {Icon ? <Icon size={13} strokeWidth={2.4} aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
