import { useEffect, useId, useState } from 'react';
import { AlarmClock, Banknote, Files, LayoutDashboard, Plus, ReceiptText, RotateCcw, Search, SearchX, Wallet, type LucideIcon } from 'lucide-react';
import { invoiceIssuer } from '../../data/invoiceSample';
import { nextInvoiceNumber, type InvoiceOverview, type InvoiceRow } from './invoiceLogic';
import { aging, filterRows, overdueRows, statusFilters, type StatusFilter } from './invoiceView';
import { useInvoiceDemo } from './useInvoiceDemo';
import { toRupees } from './money';
import { InvoiceTable } from './InvoiceTable';
import { InvoiceDetail } from './InvoiceDetail';
import { NewInvoiceForm } from './NewInvoiceForm';
import { RecordPaymentDrawer } from './RecordPaymentDrawer';
import { Button } from '../../components/Button';
import { Panel } from '../../components/Panel';
import { controlClass } from '../../components/forms';
import { ToastRegion, useToast } from '../../components/Toast';
import { formatAmount, formatCurrency, pluralize } from '../../utils/format';
import { cn } from '../../utils/cn';
import { useResetDemo } from '../demo/useResetDemo';

type ListView = 'overview' | 'invoices';
type View = { name: ListView } | { name: 'new' } | { name: 'detail'; id: string; from: ListView };

const nav: { name: ListView; label: string; icon: LucideIcon }[] = [
  { name: 'overview', label: 'Overview', icon: LayoutDashboard },
  { name: 'invoices', label: 'Invoices', icon: Files },
];

/**
 * Invoice & Payment Tracker demo with fictional records. All screens read the same
 * in-memory book (useInvoiceDemo), so totals, balances and statuses always agree.
 */
export function InvoiceTracker() {
  const { book, rows, summary, actions, changed } = useInvoiceDemo();
  const [view, setView] = useState<View>({ name: 'overview' });
  const [paymentFor, setPaymentFor] = useState<string | null>(null);
  // A fresh drawer for every opening, so it never shows the previous entry, even for a frame.
  const [paymentSession, setPaymentSession] = useState(0);
  const startPayment = (id: string) => {
    setPaymentFor(id);
    setPaymentSession((n) => n + 1);
  };
  const { toast, notify } = useToast(5000);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  const open = (id: string) => setView({ name: 'detail', id, from: view.name === 'invoices' ? 'invoices' : 'overview' });
  const activeNav = view.name === 'detail' ? view.from : view.name === 'new' ? null : view.name;
  const detailRow = view.name === 'detail' ? rows.find((r) => r.invoice.id === view.id) : undefined;
  const nextNumber = nextInvoiceNumber(book.invoices, book.today);
  const resetNow = () => {
    actions.reset();
    setPaymentFor(null);
    setView({ name: view.name === 'invoices' ? 'invoices' : 'overview' });
    notify('Sample data restored.');
  };
  const { reset, resetDialog } = useResetDemo(changed, resetNow);

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col lg:flex-row">
      <aside className="on-inverse border-b border-inverse-line bg-inverse text-on-inverse lg:w-60 lg:shrink-0 lg:border-r lg:border-b-0">
        <div className="flex flex-col gap-4 px-4 py-4 lg:sticky lg:top-14 lg:px-4 lg:py-6">
          <div className="flex items-center justify-between gap-3 lg:block lg:px-1">
            <p className="flex items-center gap-2.5 text-[0.95rem] font-semibold">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] bg-accent text-on-accent">
                <ReceiptText size={17} aria-hidden="true" />
              </span>
              <span className="leading-tight">
                Invoices
                <span className="block text-xs font-normal text-on-inverse-muted">& Payments</span>
              </span>
            </p>
            <p className="text-xs text-on-inverse-muted lg:mt-4">{invoiceIssuer.name}</p>
          </div>
          <nav aria-label="Invoice tracker" className="relative -mx-1 flex gap-1 overflow-x-auto px-1 lg:mt-2 lg:flex-col">
            {nav.map((n) => {
              const active = activeNav === n.name;
              return (
                <button
                  key={n.name}
                  type="button"
                  onClick={() => setView({ name: n.name })}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative inline-flex min-h-10 shrink-0 items-center gap-2.5 rounded-[var(--radius-control)] px-3 text-sm font-medium transition-colors',
                    active ? 'bg-on-inverse/10 text-on-inverse' : 'text-on-inverse-muted hover:bg-on-inverse/5 hover:text-on-inverse',
                  )}
                >
                  {active ? <span className="absolute inset-y-2 left-0 hidden w-0.5 rounded-full bg-accent lg:block" aria-hidden="true" /> : null}
                  <n.icon size={17} aria-hidden="true" />
                  {n.label}
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      <div className="min-w-0 flex-1 bg-canvas">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {view.name === 'overview' ? (
            <OverviewView rows={rows} summary={summary} today={book.today} onOpen={open} onNew={() => setView({ name: 'new' })} onAll={() => setView({ name: 'invoices' })} onReset={reset} />
          ) : null}
          {view.name === 'invoices' ? <InvoicesView rows={rows} onOpen={open} onNew={() => setView({ name: 'new' })} onReset={reset} /> : null}
          {view.name === 'new' ? (
            <NewInvoiceForm
              customers={book.customers}
              nextNumber={nextNumber}
              today={book.today}
              onCancel={() => setView({ name: 'invoices' })}
              onCreate={(input) => {
                const result = actions.create(input);
                if (result.ok) {
                  setView({ name: 'detail', id: result.invoice.id, from: 'invoices' });
                  notify(`${result.invoice.number} ${result.invoice.draft ? 'saved as a draft' : 'created'}.`);
                }
                return result;
              }}
            />
          ) : null}
          {view.name === 'detail' && detailRow ? (
            <InvoiceDetail
              row={detailRow}
              onBack={() => setView({ name: view.from })}
              onRecordPayment={() => startPayment(detailRow.invoice.id)}
              onMarkSent={() => {
                const result = actions.markSent(detailRow.invoice.id);
                notify(result.ok ? `${detailRow.invoice.number} marked as sent.` : (Object.values(result.errors)[0] ?? 'Couldn’t send this invoice.'), result.ok ? 'success' : 'info');
              }}
            />
          ) : null}
        </div>
      </div>

      <RecordPaymentDrawer
        key={paymentSession}
        row={rows.find((r) => r.invoice.id === paymentFor)}
        open={paymentFor !== null}
        today={book.today}
        onClose={() => setPaymentFor(null)}
        onRecord={(input) => {
          const result = actions.recordPayment(input);
          if (result.ok) {
            const left = result.row.balance;
            notify(
              left > 0
                ? `Payment recorded. ${formatAmount(toRupees(left))} still due on ${result.row.invoice.number}.`
                : `Payment recorded. ${result.row.invoice.number} is now paid in full.`,
            );
          }
          return result;
        }}
      />
      {resetDialog}
      <ToastRegion toast={toast} />
    </div>
  );
}

function PageHeading({ title, description, onNew, onReset }: { title: string; description: string; onNew: () => void; onReset: () => void }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-fg sm:text-[1.75rem]">{title}</h1>
        <p className="mt-1 max-w-[60ch] text-sm text-fg-muted">{description}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" onClick={onReset}>
          <RotateCcw size={16} aria-hidden="true" /> Reset demo
        </Button>
        <Button onClick={onNew}>
          <Plus size={17} aria-hidden="true" /> New invoice
        </Button>
      </div>
    </div>
  );
}

// ---------- Overview ----------

interface OverviewProps {
  rows: InvoiceRow[];
  summary: InvoiceOverview;
  today: string;
  onOpen: (id: string) => void;
  onNew: () => void;
  onAll: () => void;
  onReset: () => void;
}

function OverviewView({ rows, summary, today, onOpen, onNew, onAll, onReset }: OverviewProps) {
  const metrics: { label: string; value: number; caption: string; icon: LucideIcon; tone?: 'danger' }[] = [
    { label: 'Total invoiced', value: summary.invoiced, caption: `${pluralize(summary.invoicedCount, 'invoice')} sent`, icon: ReceiptText },
    { label: 'Payments collected', value: summary.collected, caption: `${pluralize(summary.paymentCount, 'payment')} received`, icon: Banknote },
    { label: 'Outstanding balance', value: summary.outstanding, caption: `${pluralize(summary.outstandingCount, 'invoice')} awaiting payment`, icon: Wallet },
    { label: 'Overdue balance', value: summary.overdue, caption: `${pluralize(summary.overdueCount, 'invoice')} past the due date`, icon: AlarmClock, tone: 'danger' },
  ];
  const buckets = aging(rows, today);
  const largest = Math.max(1, ...buckets.map((b) => b.amount));
  const overdue = overdueRows(rows);

  return (
    <div className="space-y-6">
      <PageHeading title="Overview" description="What you have invoiced, what has been paid and what is still owed." onNew={onNew} onReset={onReset} />

      <dl className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 xl:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-[var(--radius-panel)] border border-line bg-surface p-5 shadow-[var(--shadow-panel)]">
            <dt className="flex items-center justify-between gap-2 text-sm font-medium text-fg-muted">
              {m.label}
              <span
                className={cn(
                  'inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)]',
                  m.tone === 'danger' ? 'bg-danger-soft text-danger-strong' : 'bg-accent-soft text-accent-strong',
                )}
              >
                <m.icon size={16} aria-hidden="true" />
              </span>
            </dt>
            <dd className="tabular mt-3 text-[1.65rem] leading-tight font-semibold tracking-[-0.02em] text-fg">{formatCurrency(toRupees(m.value))}</dd>
            <dd className={cn('mt-1 text-sm', m.tone === 'danger' && m.value > 0 ? 'text-danger-strong' : 'text-fg-muted')}>{m.caption}</dd>
          </div>
        ))}
      </dl>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Panel title="Recent invoices" aside={<Button variant="subtle" size="sm" onClick={onAll}>View all</Button>}>
          <InvoiceTable rows={rows.slice(0, 6)} onOpen={onOpen} caption="Six most recent invoices" />
        </Panel>

        <div className="grid content-start gap-6">
          <Panel title="Outstanding by age" description="Unpaid balances, by how late they are">
            <ul className="space-y-4 p-4 sm:p-5">
              {buckets.map((b, i) => (
                <li key={b.label}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="text-fg">{b.label}</span>
                    <span className="tabular text-fg-muted">
                      <span className="font-semibold text-fg">{formatCurrency(toRupees(b.amount))}</span> · {pluralize(b.count, 'invoice')}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 rounded-full bg-chart-track" aria-hidden="true">
                    <div
                      className={cn('h-full rounded-full', i === 0 ? 'bg-chart' : 'bg-danger')}
                      style={{ width: `${(b.amount / largest) * 100}%`, minWidth: b.amount ? 4 : 0 }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Overdue" aside={<span className="tabular text-xs text-fg-muted">{pluralize(overdue.length, 'invoice')}</span>}>
            {overdue.length === 0 ? (
              <p className="px-4 py-6 text-sm text-fg-muted sm:px-5">Nothing is overdue.</p>
            ) : (
              <ul className="divide-y divide-line">
                {overdue.map((r) => (
                  <li key={r.invoice.id}>
                    <button
                      type="button"
                      onClick={() => onOpen(r.invoice.id)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-subtle/50 sm:px-5"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-fg">{r.customer}</span>
                        <span className="tabular block text-xs text-danger-strong">
                          {r.invoice.number} · {pluralize(r.daysOverdue, 'day')} late
                        </span>
                      </span>
                      <span className="tabular shrink-0 text-sm font-semibold text-fg">{formatAmount(toRupees(r.balance))}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

// ---------- Invoice list ----------

function InvoicesView({ rows, onOpen, onNew, onReset }: { rows: InvoiceRow[]; onOpen: (id: string) => void; onNew: () => void; onReset: () => void }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const searchId = useId();
  const visible = filterRows(rows, query, status);
  const hasCriteria = query.trim() !== '' || status !== 'all';

  return (
    <div className="space-y-6">
      <PageHeading title="Invoices" description="Every invoice, newest first. Search by number or customer." onNew={onNew} onReset={onReset} />
      <section aria-label="Invoice list" className="rounded-[var(--radius-panel)] border border-line bg-surface shadow-[var(--shadow-panel)]">
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative lg:w-72">
            <label htmlFor={searchId} className="sr-only">
              Search invoices by number or customer
            </label>
            <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
            <input
              id={searchId}
              type="search"
              value={query}
              onChange={(e: { target: { value: string } }) => setQuery(e.target.value)}
              placeholder="Search invoices"
              className={controlClass(false, 'pl-9')}
            />
          </div>
          <div role="group" aria-label="Filter by status" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:pb-0">
            {statusFilters.map((f) => {
              const count = f.value === 'all' ? rows.length : rows.filter((r) => r.status === f.value).length;
              const active = status === f.value;
              return (
                <button
                  key={f.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setStatus(f.value)}
                  className={cn(
                    'inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors',
                    active ? 'border-accent bg-accent-soft text-accent-strong' : 'border-line text-fg-muted hover:border-line-strong hover:text-fg',
                  )}
                >
                  {f.label}
                  <span className="tabular text-xs opacity-80">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
        <p className="sr-only" aria-live="polite">
          Showing {visible.length} of {rows.length} invoices
        </p>
        {visible.length === 0 ? (
          <div className="flex flex-col items-center px-4 py-14 text-center">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-subtle text-fg-subtle">
              <SearchX size={20} aria-hidden="true" />
            </span>
            <p className="mt-3 font-medium text-fg">{hasCriteria ? 'No invoices match this search' : 'No invoices yet'}</p>
            <p className="mt-1 text-sm text-fg-muted">
              {hasCriteria ? 'Try another number or customer, or clear the filters.' : 'Create your first invoice to see it here.'}
            </p>
            {hasCriteria ? (
              <Button
                variant="secondary"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setQuery('');
                  setStatus('all');
                }}
              >
                Clear search and filters
              </Button>
            ) : null}
          </div>
        ) : (
          <InvoiceTable rows={visible} onOpen={onOpen} caption="Invoices" />
        )}
      </section>
    </div>
  );
}
