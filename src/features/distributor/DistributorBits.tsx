import type { ReactNode } from 'react';
import {
  CircleAlert,
  CircleCheck,
  CircleDashed,
  CircleDot,
  CircleOff,
  CirclePause,
  CircleX,
  FilePen,
  Hourglass,
  PackageCheck,
  RotateCcw,
  Search,
  Truck,
  type LucideIcon,
} from 'lucide-react';
import type { DistributorBook, OrderStatus, PurchaseStatus } from '../../types/distributor';
import { Badge, type BadgeTone } from '../../components/Badge';
import { Button } from '../../components/Button';
import { controlClass } from '../../components/forms';
import { cn } from '../../utils/cn';
import { formatDate, formatLongDay, formatWeekday } from '../../utils/format';
import { orderStatusLabels, payStateLabels, purchaseStatusLabels, type PayState } from './distributorLogic';

/** "Fri 23 Oct". */
export function shortDay(day: string): string {
  return `${formatWeekday(day)} ${formatDate(day).replace(/ \d{4}$/, '')}`;
}
/** "23 Oct 2026". */
export const longDate = formatDate;

const purchaseMeta: Record<PurchaseStatus, { tone: BadgeTone; icon: LucideIcon }> = {
  draft: { tone: 'neutral', icon: FilePen },
  received: { tone: 'success', icon: PackageCheck },
  cancelled: { tone: 'neutral', icon: CircleX },
};
const orderMeta: Record<OrderStatus, { tone: BadgeTone; icon: LucideIcon }> = {
  draft: { tone: 'neutral', icon: FilePen },
  confirmed: { tone: 'accent', icon: CircleDashed },
  fulfilled: { tone: 'success', icon: Truck },
  cancelled: { tone: 'neutral', icon: CircleX },
};

export function DocStatusBadge(props: { kind: 'purchase'; status: PurchaseStatus } | { kind: 'order'; status: OrderStatus }) {
  const m = props.kind === 'purchase' ? purchaseMeta[props.status] : orderMeta[props.status];
  const label = props.kind === 'purchase' ? purchaseStatusLabels[props.status] : orderStatusLabels[props.status];
  return (
    <Badge tone={m.tone} icon={m.icon} dashed={props.status === 'draft'}>
      {label}
    </Badge>
  );
}

/** Payment state of a delivered order or received purchase; overdue wins. */
export function PayBadge({ state, overdue }: { state: PayState; overdue: boolean }) {
  if (state === 'not_due') return <span className="text-xs text-fg-subtle">Nothing owed yet</span>;
  if (overdue)
    return (
      <Badge tone="danger" icon={CircleAlert}>
        Overdue
      </Badge>
    );
  const meta: Record<Exclude<PayState, 'not_due'>, { tone: BadgeTone; icon: LucideIcon }> = {
    unpaid: { tone: 'neutral', icon: Hourglass },
    partial: { tone: 'warning', icon: CircleDot },
    paid: { tone: 'success', icon: CircleCheck },
  };
  const m = meta[state];
  return (
    <Badge tone={m.tone} icon={m.icon}>
      {payStateLabels[state]}
    </Badge>
  );
}

export function StockBadge({ stock, low, active }: { stock: number; low: boolean; active: boolean }) {
  if (!active) return null;
  if (stock === 0)
    return (
      <Badge tone="danger" icon={CircleAlert}>
        Out of stock
      </Badge>
    );
  if (low)
    return (
      <Badge tone="warning" icon={CircleAlert}>
        Low stock
      </Badge>
    );
  return null;
}

export function ActiveBadge({ active }: { active: boolean }) {
  return active ? (
    <Badge tone="success" icon={CircleCheck}>
      Active
    </Badge>
  ) : (
    <Badge tone="neutral" icon={CirclePause}>
      Inactive
    </Badge>
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
/** Compact row of headline numbers, joined by hairlines. */
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
      <div id={id} tabIndex={-1} className={cn('grid gap-1.5', columns === 2 ? 'grid-cols-2' : 'grid-cols-3')}>
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

/** Amount field with a ₹ prefix. */
export function AmountInput({ id, value, onChange, invalid, describedBy, label, className }: { id: string; value: string; onChange: (v: string) => void; invalid: boolean; describedBy?: string | undefined; label?: string; className?: string }) {
  return (
    <div className={cn('relative', className)}>
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
        {...(label ? { 'aria-label': label } : {})}
        {...(describedBy ? { 'aria-describedby': describedBy } : {})}
      />
    </div>
  );
}

export function SearchBox({ id, label, placeholder, value, onChange, className }: { id: string; label: string; placeholder: string; value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <div className={cn('relative', className)}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
      <input id={id} type="search" value={value} onChange={(e: { target: { value: string } }) => onChange(e.target.value)} placeholder={placeholder} className={controlClass(false, 'pl-9')} />
    </div>
  );
}

export function SelectBox({ id, label, value, onChange, children, className }: { id: string; label: string; value: string; onChange: (v: string) => void; children: ReactNode; className?: string }) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-fg-muted">
        {label}
      </label>
      <select id={id} value={value} onChange={(e: { target: { value: string } }) => onChange(e.target.value)} className={controlClass(false, cn('mt-1 min-h-9 py-1.5 text-sm', className))}>
        {children}
      </select>
    </div>
  );
}

/** Search + filters bar on top of a list, with a Clear button when anything is filtered. */
export function FilterBar({ children, filtered, onClear }: { children: ReactNode; filtered: boolean; onClear: () => void }) {
  return (
    <div className="flex flex-col gap-3 border-b border-line p-4 sm:px-5 lg:flex-row lg:items-end">
      {children}
      {filtered ? (
        <Button variant="subtle" size="sm" className="self-start lg:ml-auto lg:self-end" onClick={onClear}>
          Clear filters
        </Button>
      ) : null}
    </div>
  );
}

export function PageHeading({ title, book, onReset, action }: { title: string; book: DistributorBook; onReset: () => void; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-fg sm:text-[1.75rem]">{title}</h1>
        <p className="mt-1 text-sm text-fg-muted">Today is {formatLongDay(book.today)} · sample day</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" onClick={onReset}>
          <RotateCcw size={16} aria-hidden="true" /> Reset demo
        </Button>
        {action}
      </div>
    </div>
  );
}

/** Shows a signed stock quantity: "+20" in green, "−3" in red. */
export function Qty({ n }: { n: number }) {
  return <span className={cn('tabular font-semibold', n > 0 ? 'text-success-strong' : 'text-danger-strong')}>{n > 0 ? `+${n.toLocaleString('en-IN')}` : `−${Math.abs(n).toLocaleString('en-IN')}`}</span>;
}

/** Card wrapper for a list section. */
export function ListCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section aria-label={label} className="rounded-[var(--radius-panel)] border border-line bg-surface shadow-[var(--shadow-panel)]">
      {children}
    </section>
  );
}

export const th = 'px-3 py-2.5 font-medium';
export const thFirst = 'px-4 py-2.5 font-medium sm:px-5';
export const td = 'px-3 py-2.5';
export const tdFirst = 'px-4 py-2.5 sm:px-5';
export const theadClass = 'border-b border-line bg-subtle/60 text-xs text-fg-muted';
export const rowClass = 'align-middle transition-colors hover:bg-subtle/40';
