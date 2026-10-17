import type { ReactNode } from 'react';
import { CircleAlert, CircleCheck, CircleOff, CircleX, Clock, type LucideIcon } from 'lucide-react';
import type { AppointmentStatus } from '../../types/salon';
import { Badge, type BadgeTone } from '../../components/Badge';
import { cn } from '../../utils/cn';
import { formatDate, formatWeekday } from '../../utils/format';
import type { PayState } from './salonLogic';

export const statusMeta: Record<AppointmentStatus, { label: string; tone: BadgeTone; icon: LucideIcon }> = {
  booked: { label: 'Upcoming', tone: 'accent', icon: Clock },
  completed: { label: 'Completed', tone: 'success', icon: CircleCheck },
  cancelled: { label: 'Cancelled', tone: 'neutral', icon: CircleX },
};

/** "Sat 17 Oct". */
export function shortDay(day: string): string {
  return `${formatWeekday(day)} ${formatDate(day).replace(/ \d{4}$/, '')}`;
}

export const longDate = formatDate;

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  const m = statusMeta[status];
  return (
    <Badge tone={m.tone} icon={m.icon}>
      {m.label}
    </Badge>
  );
}

export function PayBadge({ state }: { state: PayState }) {
  if (state === 'none') return null;
  return state === 'paid' ? (
    <Badge tone="success" icon={CircleCheck}>
      Paid
    </Badge>
  ) : (
    <Badge tone="danger" icon={CircleAlert}>
      Unpaid
    </Badge>
  );
}

export function Initials({ name, size = 'md', muted = false }: { name: string; size?: 'sm' | 'md' | 'lg'; muted?: boolean }) {
  const parts = name.trim().split(/\s+/);
  const text = ((parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '')).toUpperCase();
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold select-none',
        muted ? 'bg-subtle text-fg-muted' : 'bg-accent-soft text-accent-strong',
        size === 'sm' && 'h-8 w-8 text-xs',
        size === 'md' && 'h-9 w-9 text-xs',
        size === 'lg' && 'h-14 w-14 text-lg',
      )}
    >
      {text}
    </span>
  );
}

export function Empty({ icon: Icon = CircleOff, title, text }: { icon?: LucideIcon; title: string; text: string }) {
  return (
    <div className="flex flex-col items-center px-4 py-10 text-center">
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-subtle text-fg-subtle">
        <Icon size={20} aria-hidden="true" />
      </span>
      <p className="mt-3 font-medium text-fg">{title}</p>
      <p className="mt-1 max-w-[46ch] text-sm text-fg-muted">{text}</p>
    </div>
  );
}

export interface Figure {
  label: string;
  value: ReactNode;
  note: ReactNode;
  tone?: string;
  /** Spans both columns on the two-column (phone) layout, so an odd count leaves no gap. */
  wide?: boolean;
}

/** Compact row of headline numbers, joined by hairlines. */
export function Figures({ figures, label, className }: { figures: Figure[]; label: string; className?: string }) {
  return (
    <dl className={cn('grid grid-cols-2 overflow-hidden rounded-[var(--radius-panel)] border border-line bg-line shadow-[var(--shadow-panel)] [gap:1px]', className)} aria-label={label}>
      {figures.map((f) => (
        <div key={f.label} className={cn('flex flex-col bg-surface px-4 py-3', f.wide && 'col-span-2 lg:col-span-1')}>
          <dt className="text-xs font-medium text-fg-muted">{f.label}</dt>
          <dd className={cn('tabular mt-0.5 text-xl leading-tight font-semibold tracking-[-0.01em]', f.tone ?? 'text-fg')}>{f.value}</dd>
          <dd className="text-xs text-fg-subtle">{f.note}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Segmented radio group (arrow keys move between options, as native radios do). */
export function Choice<T extends string>({
  id,
  legend,
  options,
  value,
  onChange,
  error,
  columns = 3,
}: {
  id: string;
  legend: string;
  options: { value: T; label: string }[];
  value: string;
  onChange: (v: T) => void;
  error?: string;
  columns?: 2 | 3;
}) {
  return (
    <fieldset aria-describedby={error ? `${id}-error` : undefined}>
      <legend className="mb-1.5 block text-sm font-medium text-fg">{legend}</legend>
      <div id={id} tabIndex={-1} className={cn('grid gap-2', columns === 2 ? 'grid-cols-2' : 'grid-cols-3')}>
        {options.map((o) => {
          const checked = value === o.value;
          return (
            <label
              key={o.value}
              className={cn(
                'flex min-h-10 cursor-pointer items-center justify-center rounded-[var(--radius-control)] border px-2 text-center text-sm font-medium transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus)] has-[:focus-visible]:outline-solid',
                checked ? 'border-accent bg-accent-soft text-accent-strong' : error ? 'border-danger text-fg-muted hover:text-fg' : 'border-line-strong text-fg-muted hover:text-fg',
              )}
            >
              <input type="radio" name={id} value={o.value} checked={checked} onChange={() => onChange(o.value)} className="sr-only" />
              {o.label}
            </label>
          );
        })}
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-sm font-medium text-danger-strong">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
