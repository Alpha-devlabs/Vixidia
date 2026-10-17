import type { ReactNode } from 'react';
import { CalendarClock, CircleAlert, CircleCheck, CircleDashed, CircleDot, CircleOff, CirclePause, CircleX, Truck, type LucideIcon } from 'lucide-react';
import type { CustomerStatus, DeliveryStatus } from '../../types/water';
import { Badge, type BadgeTone } from '../../components/Badge';
import { cn } from '../../utils/cn';
import { formatDate, formatWeekday } from '../../utils/format';
import type { PaymentState } from './waterLogic';

export const deliveryStatusMeta: Record<DeliveryStatus, { label: string; tone: BadgeTone; icon: LucideIcon }> = {
  scheduled: { label: 'Pending', tone: 'warning', icon: Truck },
  completed: { label: 'Delivered', tone: 'success', icon: CircleCheck },
  failed: { label: 'Failed', tone: 'danger', icon: CircleX },
  rescheduled: { label: 'Rescheduled', tone: 'accent', icon: CalendarClock },
};

export const paymentStateMeta: Record<PaymentState, { label: string; tone: BadgeTone; icon: LucideIcon }> = {
  paid: { label: 'Paid', tone: 'success', icon: CircleCheck },
  part: { label: 'Part paid', tone: 'warning', icon: CircleDot },
  unpaid: { label: 'Unpaid', tone: 'danger', icon: CircleAlert },
  none: { label: 'Not charged', tone: 'neutral', icon: CircleDashed },
};

/** "Mon 19 Oct" (the year is clear from context in the demo). */
export function shortDay(day: string): string {
  return `${formatWeekday(day)} ${formatDate(day).replace(/ \d{4}$/, '')}`;
}

export function DeliveryStatusBadge({ status, movedTo }: { status: DeliveryStatus; movedTo?: string }) {
  const m = deliveryStatusMeta[status];
  return (
    <Badge tone={m.tone} icon={m.icon}>
      {m.label}
      {status === 'rescheduled' && movedTo ? ` to ${shortDay(movedTo)}` : ''}
    </Badge>
  );
}

export function PaymentBadge({ state }: { state: PaymentState }) {
  const m = paymentStateMeta[state];
  if (state === 'none') return <span className="text-xs text-fg-subtle">{m.label}</span>;
  return (
    <Badge tone={m.tone} icon={m.icon}>
      {m.label}
    </Badge>
  );
}

export function CustomerStatusBadge({ status }: { status: CustomerStatus }) {
  return status === 'active' ? (
    <Badge tone="success" icon={CircleCheck}>
      Active
    </Badge>
  ) : (
    <Badge tone="neutral" icon={CirclePause}>
      Paused
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

/** Balance owed, in danger text when above zero. */
export function Owed({ paise, text, className }: { paise: number; text: string; className?: string }) {
  return <span className={cn('tabular', paise > 0 ? 'font-semibold text-danger-strong' : 'text-fg-muted', className)}>{paise > 0 ? text : '₹0'}</span>;
}

export function Empty({ icon: Icon = CircleOff, title, text }: { icon?: LucideIcon; title: string; text: string }) {
  return (
    <div className="flex flex-col items-center px-4 py-12 text-center">
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

/** Row of headline numbers, joined by hairlines. */
export function Figures({ figures, label, className }: { figures: Figure[]; label: string; className?: string }) {
  return (
    <dl className={cn('grid grid-cols-2 overflow-hidden rounded-[var(--radius-panel)] border border-line bg-line shadow-[var(--shadow-panel)] [gap:1px]', className)} aria-label={label}>
      {figures.map((f) => (
        <div key={f.label} className={cn('flex flex-col bg-surface px-4 py-3.5 sm:px-5', f.wide && 'col-span-2 xl:col-span-1')}>
          <dt className="text-sm font-medium text-fg-muted">{f.label}</dt>
          <dd className={cn('tabular mt-1 text-2xl leading-tight font-semibold tracking-[-0.02em]', f.tone ?? 'text-fg')}>{f.value}</dd>
          <dd className="text-xs text-fg-subtle">{f.note}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Segmented radio group (keyboard: arrow keys move between options, as native radios do). */
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
  options: { value: T; label: string; icon?: LucideIcon }[];
  value: string;
  onChange: (v: T) => void;
  error?: string;
  columns?: 2 | 3 | 4;
}) {
  return (
    <fieldset aria-describedby={error ? `${id}-error` : undefined}>
      <legend className="mb-1.5 block text-sm font-medium text-fg">{legend}</legend>
      <div id={id} tabIndex={-1} className={cn('grid gap-2', columns === 2 ? 'grid-cols-2' : columns === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3')}>
        {options.map((o) => {
          const checked = value === o.value;
          return (
            <label
              key={o.value}
              className={cn(
                'flex min-h-10 cursor-pointer items-center justify-center gap-1.5 rounded-[var(--radius-control)] border px-2 text-center text-sm font-medium transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus)] has-[:focus-visible]:outline-solid',
                checked ? 'border-accent bg-accent-soft text-accent-strong' : error ? 'border-danger text-fg-muted hover:text-fg' : 'border-line-strong text-fg-muted hover:text-fg',
              )}
            >
              <input type="radio" name={id} value={o.value} checked={checked} onChange={() => onChange(o.value)} className="sr-only" />
              {o.icon ? <o.icon size={15} aria-hidden="true" /> : null}
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
