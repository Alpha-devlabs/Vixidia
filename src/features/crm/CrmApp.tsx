import { useEffect, useId, useState, type ReactNode } from 'react';
import { Contact, LayoutDashboard, Plus, RotateCcw, Search, SearchX, Sparkles, Clock, UserCheck, Users, type LucideIcon } from 'lucide-react';
import { crmBusiness } from '../../data/crmSample';
import {
  CATCH_UP_DAYS,
  customerToInput,
  emptyCustomerInput,
  filterCustomers,
  historyFor,
  recentActivity,
  type CrmOverview,
  type CustomerRow,
  type StatusFilter,
} from './crmLogic';
import type { CrmBook } from '../../types/crm';
import { useCrmDemo } from './useCrmDemo';
import { CustomerTable } from './CustomerTable';
import { CustomerProfile } from './CustomerProfile';
import { CustomerForm } from './CustomerForm';
import { LogInteractionDrawer } from './LogInteractionDrawer';
import { Avatar, CustomerStatusBadge, InteractionIcon, daysAgoLabel, formatWhen, interactionMeta } from './CustomerBits';
import { Button } from '../../components/Button';
import { Panel } from '../../components/Panel';
import { controlClass } from '../../components/forms';
import { ToastRegion, useToast } from '../../components/Toast';
import { pluralize } from '../../utils/format';
import { cn } from '../../utils/cn';

type ListView = 'overview' | 'customers';
type View = { name: ListView } | { name: 'new' } | { name: 'profile'; id: string; from: ListView } | { name: 'edit'; id: string; from: ListView };

const nav: { name: ListView; label: string; icon: LucideIcon }[] = [
  { name: 'overview', label: 'Overview', icon: LayoutDashboard },
  { name: 'customers', label: 'Customers', icon: Users },
];

/**
 * Simple CRM demo with fictional records. Every screen reads the same in-memory
 * book (useCrmDemo), so the directory, profile and overview always agree.
 */
export function CrmApp() {
  const { book, rows, summary, actions } = useCrmDemo();
  const [view, setView] = useState<View>({ name: 'overview' });
  const [logFor, setLogFor] = useState<string | null>(null);
  // A fresh drawer for every opening, so it never shows the previous entry.
  const [logSession, setLogSession] = useState(0);
  const { toast, notify } = useToast(5000);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  const listFrom: ListView = view.name === 'customers' || ((view.name === 'profile' || view.name === 'edit') && view.from === 'customers') ? 'customers' : 'overview';
  const open = (id: string) => setView({ name: 'profile', id, from: listFrom });
  const activeNav = view.name === 'new' ? null : 'from' in view ? view.from : view.name;
  const current = view.name === 'profile' || view.name === 'edit' ? rows.find((r) => r.customer.id === view.id) : undefined;
  const startLog = (id: string) => {
    setLogFor(id);
    setLogSession((n) => n + 1);
  };
  const reset = () => {
    actions.reset();
    setLogFor(null);
    setView({ name: view.name === 'customers' ? 'customers' : 'overview' });
    notify('Sample data restored.');
  };

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col lg:flex-row">
      <aside className="on-inverse border-b border-inverse-line bg-inverse text-on-inverse lg:w-60 lg:shrink-0 lg:border-r lg:border-b-0">
        <div className="flex flex-col gap-4 px-4 py-4 lg:sticky lg:top-14 lg:px-4 lg:py-6">
          <div className="flex items-center justify-between gap-3 lg:block lg:px-1">
            <p className="flex items-center gap-2.5 text-[0.95rem] font-semibold">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] bg-accent text-on-accent">
                <Contact size={17} aria-hidden="true" />
              </span>
              <span className="leading-tight">
                Simple CRM
                <span className="block text-xs font-normal text-on-inverse-muted">Customer management</span>
              </span>
            </p>
            <p className="text-xs text-on-inverse-muted lg:mt-4">{crmBusiness.name}</p>
          </div>
          <nav aria-label="Simple CRM" className="relative -mx-1 flex gap-1 overflow-x-auto px-1 lg:mt-2 lg:flex-col">
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
            <OverviewView
              book={book}
              rows={rows}
              summary={summary}
              onOpen={open}
              onAll={() => setView({ name: 'customers' })}
              onNew={() => setView({ name: 'new' })}
              onReset={reset}
            />
          ) : null}
          {view.name === 'customers' ? (
            <CustomersView rows={rows} today={book.today} onOpen={open} onNew={() => setView({ name: 'new' })} onReset={reset} />
          ) : null}
          {view.name === 'new' ? (
            <CustomerForm
              mode="create"
              initial={emptyCustomerInput}
              onCancel={() => setView({ name: 'customers' })}
              onSave={(input) => {
                const result = actions.createCustomer(input);
                if (result.ok) {
                  setView({ name: 'profile', id: result.customer.id, from: 'customers' });
                  notify(`${result.customer.name} added.`);
                }
                return result;
              }}
            />
          ) : null}
          {view.name === 'edit' && current ? (
            <CustomerForm
              key={current.customer.id}
              mode="edit"
              customerName={current.customer.name}
              initial={customerToInput(current.customer)}
              onCancel={() => setView({ name: 'profile', id: current.customer.id, from: view.from })}
              onSave={(input) => {
                const result = actions.updateCustomer(current.customer.id, input);
                if (result.ok) {
                  setView({ name: 'profile', id: result.customer.id, from: view.from });
                  notify(`Changes to ${result.customer.name} saved.`);
                }
                return result;
              }}
            />
          ) : null}
          {view.name === 'profile' && current ? (
            <CustomerProfile
              row={current}
              history={historyFor(book, current.customer.id)}
              today={book.today}
              backLabel={view.from === 'customers' ? 'All customers' : 'Overview'}
              onBack={() => setView({ name: view.from })}
              onEdit={() => setView({ name: 'edit', id: current.customer.id, from: view.from })}
              onLog={() => startLog(current.customer.id)}
            />
          ) : null}
        </div>
      </div>

      <LogInteractionDrawer
        key={logSession}
        customer={book.customers.find((c) => c.id === logFor)}
        open={logFor !== null}
        today={book.today}
        onClose={() => setLogFor(null)}
        onSave={(input) => {
          const result = actions.addInteraction(input);
          if (result.ok) notify(`${interactionMeta[result.interaction.type].label} added to the history.`);
          return result;
        }}
      />
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
          <Plus size={17} aria-hidden="true" /> Add customer
        </Button>
      </div>
    </div>
  );
}

// ---------- Overview ----------

interface OverviewProps {
  book: CrmBook;
  rows: CustomerRow[];
  summary: CrmOverview;
  onOpen: (id: string) => void;
  onAll: () => void;
  onNew: () => void;
  onReset: () => void;
}

function OverviewView({ book, rows, summary, onOpen, onAll, onNew, onReset }: OverviewProps) {
  const metrics: { label: string; value: number; caption: string; icon: LucideIcon; tone?: 'warning' }[] = [
    { label: 'Total customers', value: summary.total, caption: `Including ${pluralize(summary.inactive, 'inactive record')}`, icon: Users },
    { label: 'Prospects', value: summary.prospects, caption: 'Not buying yet', icon: Sparkles },
    { label: 'Active customers', value: summary.active, caption: 'Buying from you now', icon: UserCheck },
    { label: 'No recent contact', value: summary.needsCatchUp, caption: `Not contacted in ${CATCH_UP_DAYS}+ days`, icon: Clock, tone: 'warning' },
  ];
  const activity = recentActivity(book, 7);
  const catchUp = rows.filter((r) => r.needsCatchUp).sort((a, b) => b.daysSinceContact - a.daysSinceContact);
  const recent = rows.slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeading title="Overview" description="Who you work with, and your latest conversations with them." onNew={onNew} onReset={onReset} />

      <dl className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-[var(--radius-panel)] border border-line bg-surface p-4 shadow-[var(--shadow-panel)] sm:p-5">
            <dt className="flex items-start justify-between gap-2 text-sm font-medium text-fg-muted">
              {m.label}
              <span
                className={cn(
                  'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-control)] max-sm:hidden',
                  m.tone === 'warning' ? 'bg-warning-soft text-warning-strong' : 'bg-accent-soft text-accent-strong',
                )}
              >
                <m.icon size={16} aria-hidden="true" />
              </span>
            </dt>
            <dd className="tabular mt-3 text-[1.65rem] leading-tight font-semibold tracking-[-0.02em] text-fg">{m.value}</dd>
            <dd className="mt-1 text-sm text-fg-muted">{m.caption}</dd>
          </div>
        ))}
      </dl>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Panel title="Recent interactions" description="Latest calls, meetings, emails, messages and notes">
          {activity.length === 0 ? (
            <p className="px-4 py-6 text-sm text-fg-muted sm:px-5">No interactions recorded yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {activity.map(({ interaction: n, customer }) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => onOpen(customer.id)}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-subtle/50 sm:px-5"
                    aria-label={`${interactionMeta[n.type].label} with ${customer.name}, ${formatWhen(n.date, book.today, true)}: open profile`}
                  >
                    <InteractionIcon type={n.type} />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                        <span className="truncate text-sm font-medium text-fg">{customer.name}</span>
                        <span className="tabular shrink-0 text-xs text-fg-muted">{formatWhen(n.date, book.today)}</span>
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-sm text-fg-muted">
                        <span className="text-fg-subtle">{interactionMeta[n.type].label} · </span>
                        {n.summary}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="grid content-start gap-6">
          <Panel
            title={`No contact in ${CATCH_UP_DAYS}+ days`}
            description={catchUp.length ? `${pluralize(catchUp.length, 'customer')} · longest gap first` : undefined}
          >
            {catchUp.length === 0 ? (
              <p className="px-4 py-6 text-sm text-fg-muted sm:px-5">Everyone has been contacted in the last {CATCH_UP_DAYS} days.</p>
            ) : (
              <ul className="divide-y divide-line">
                {catchUp.map((r) => (
                  <CompactCustomer key={r.customer.id} row={r} onOpen={onOpen}>
                    <span className="text-warning-strong">
                      {r.lastContact ? `Last contact ${daysAgoLabel(r.daysSinceContact)}` : `Never contacted · added ${daysAgoLabel(r.daysSinceContact)}`}
                    </span>
                  </CompactCustomer>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Recently updated" aside={<Button variant="subtle" size="sm" onClick={onAll}>View all</Button>}>
            <ul className="divide-y divide-line">
              {recent.map((r) => (
                <CompactCustomer key={r.customer.id} row={r} onOpen={onOpen}>
                  Updated {formatWhen(r.lastActivity, book.today, true)}
                </CompactCustomer>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function CompactCustomer({ row, onOpen, children }: { row: CustomerRow; onOpen: (id: string) => void; children: ReactNode }) {
  const c = row.customer;
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(c.id)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-subtle/50 sm:px-5"
        aria-label={`Open ${c.name}${c.company ? `, ${c.company}` : ''}`}
      >
        <Avatar name={c.name} status={c.status} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-fg">{c.name}</span>
          <span className="tabular block text-xs text-fg-muted">{children}</span>
        </span>
        <CustomerStatusBadge status={c.status} />
      </button>
    </li>
  );
}

// ---------- Customer directory ----------

const filters: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'prospect', label: 'Prospects' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

function CustomersView({ rows, today, onOpen, onNew, onReset }: { rows: CustomerRow[]; today: string; onOpen: (id: string) => void; onNew: () => void; onReset: () => void }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const searchId = useId();
  const visible = filterCustomers(rows, query, status);
  const hasCriteria = query.trim() !== '' || status !== 'all';

  return (
    <div className="space-y-6">
      <PageHeading title="Customers" description="Everyone you work with, most recently updated first." onNew={onNew} onReset={onReset} />
      <section aria-label="Customer directory" className="rounded-[var(--radius-panel)] border border-line bg-surface shadow-[var(--shadow-panel)]">
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative lg:w-80">
            <label htmlFor={searchId} className="sr-only">
              Search customers by name, company, email, phone, city or tag
            </label>
            <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
            <input
              id={searchId}
              type="search"
              value={query}
              onChange={(e: { target: { value: string } }) => setQuery(e.target.value)}
              placeholder="Search customers"
              className={controlClass(false, 'pl-9')}
            />
          </div>
          <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-1">
            {filters.map((f) => {
              const count = f.value === 'all' ? rows.length : rows.filter((r) => r.customer.status === f.value).length;
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
          Showing {visible.length} of {rows.length} customers
        </p>
        {visible.length === 0 ? (
          <div className="flex flex-col items-center px-4 py-14 text-center">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-subtle text-fg-subtle">
              <SearchX size={20} aria-hidden="true" />
            </span>
            <p className="mt-3 font-medium text-fg">{hasCriteria ? 'No customers match this search' : 'No customers yet'}</p>
            <p className="mt-1 text-sm text-fg-muted">
              {hasCriteria ? 'Try another name, company or tag, or clear the filters.' : 'Add your first customer to see them here.'}
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
          <CustomerTable rows={visible} today={today} onOpen={onOpen} caption="Customers" />
        )}
      </section>
    </div>
  );
}
