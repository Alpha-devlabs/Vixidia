import type { ReactNode } from 'react';
import { CircleAlert, CircleCheck, CircleDot, CircleOff, CirclePause, CircleX, Clock, Hourglass, type LucideIcon } from 'lucide-react';
import type { Mark } from '../../types/tuition';
import { Badge, type BadgeTone } from '../../components/Badge';
import { cn } from '../../utils/cn';
import { formatDate, formatWeekday } from '../../utils/format';
import { feeStatusLabels, type FeeStatus } from './tuitionLogic';

/** "Wed 21 Oct". */
export function shortDay(day: string): string {
  return `${formatWeekday(day)} ${formatDate(day).replace(/ \d{4}$/, '')}`;
}

export const longDate = formatDate;

const feeMeta: Record<FeeStatus, { tone: BadgeTone; icon: LucideIcon }> = {
  paid: { tone: 'success', icon: CircleCheck },
  partial: { tone: 'warning', icon: CircleDot },
  due: { tone: 'neutral', icon: Hourglass },
  overdue: { tone: 'danger', icon: CircleAlert },
};

export function FeeBadge({ status }: { status: FeeStatus }) {
  const m = feeMeta[status];
  return (
    <Badge tone={m.tone} icon={m.icon}>
      {feeStatusLabels[status]}
    </Badge>
  );
}

const markMeta: Record<Mark, { label: string; tone: BadgeTone; icon: LucideIcon }> = {
  present: { label: 'Present', tone: 'success', icon: CircleCheck },
  late: { label: 'Late', tone: 'warning', icon: Clock },
  absent: { label: 'Absent', tone: 'danger', icon: CircleX },
};

export function MarkBadge({ mark }: { mark: Mark }) {
  const m = markMeta[mark];
  return (
    <Badge tone={m.tone} icon={m.icon}>
      {m.label}
    </Badge>
  );
}

export function ActiveBadge({ active, label = ['Active', 'Inactive'] }: { active: boolean; label?: [string, string] }) {
  return active ? (
    <Badge tone="success" icon={CircleCheck}>
      {label[0]}
    </Badge>
  ) : (
    <Badge tone="neutral" icon={CirclePause}>
      {label[1]}
    </Badge>
  );
}

export function Initials({ name, size = 'md', muted = false }: { name: string; size?: 'sm' | 'md' | 'lg'; muted?: boolean }) {
  const parts = name.replace(/^(Mrs?|Ms|Dr)\.\s+/, '').trim().split(/\s+/);
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

export function Empty({ icon: Icon = CircleOff, title, text, children }: { icon?: LucideIcon; title: string; text: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-4 py-10 text-center">
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-subtle text-fg-subtle">
        <Icon size={20} aria-hidden="true" />
      </span>
      <p className="mt-3 font-medium text-fg">{title}</p>
      <p className="mt-1 max-w-[50ch] text-sm text-fg-muted">{text}</p>
      {children}
    </div>
  );
}

export interface Figure {
  label: string;
  value: ReactNode;
  note: ReactNode;
  tone?: string;
}

/** Compact row of headline numbers, joined by hairlines. Two columns on phones, three on tablets, six on wide screens. */
export function Figures({ figures, label, className }: { figures: Figure[]; label: string; className?: string }) {
  return (
    <dl className={cn('grid grid-cols-2 overflow-hidden rounded-[var(--radius-panel)] border border-line bg-line shadow-[var(--shadow-panel)] [gap:1px]', className)} aria-label={label}>
      {figures.map((f) => (
        <div key={f.label} className="flex flex-col bg-surface px-4 py-3">
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
  legendHidden = false,
  size = 'md',
}: {
  id: string;
  legend: string;
  options: { value: T; label: string }[];
  value: string;
  onChange: (v: T) => void;
  error?: string;
  columns?: 2 | 3;
  legendHidden?: boolean;
  size?: 'sm' | 'md';
}) {
  return (
    <fieldset aria-describedby={error ? `${id}-error` : undefined}>
      <legend className={legendHidden ? 'sr-only' : 'mb-1.5 block text-sm font-medium text-fg'}>{legend}</legend>
      <div id={id} tabIndex={-1} className={cn('grid gap-1.5', columns === 2 ? 'grid-cols-2' : 'grid-cols-3')}>
        {options.map((o) => {
          const checked = value === o.value;
          return (
            <label
              key={o.value}
              className={cn(
                'flex cursor-pointer items-center justify-center rounded-[var(--radius-control)] border px-2 text-center font-medium transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus)] has-[:focus-visible]:outline-solid',
                size === 'sm' ? 'min-h-9 text-xs' : 'min-h-10 text-sm',
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

/** Amount field with a ₹ prefix. */
export function AmountInput({ id, value, onChange, invalid, describedBy }: { id: string; value: string; onChange: (v: string) => void; invalid: boolean; describedBy?: string }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fg-subtle" aria-hidden="true">
        ₹
      </span>
      <input
        id={id}
        inputMode="decimal"
        autoComplete="off"
        value={value}
        onChange={(e: { target: { value: string } }) => onChange(e.target.value)}
        className={cn(
          'tabular h-10 w-full rounded-[var(--radius-control)] border bg-surface pr-3 pl-7 text-[0.95rem] text-fg transition-colors',
          invalid ? 'border-danger' : 'border-line-strong hover:border-fg-subtle focus:border-accent',
        )}
        aria-invalid={invalid}
        {...(describedBy ? { 'aria-describedby': describedBy } : {})}
      />
    </div>
  );
}
