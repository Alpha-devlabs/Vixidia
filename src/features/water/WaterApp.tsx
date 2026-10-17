import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { CalendarClock, Droplets, IndianRupee, Info, ListChecks, Plus, RotateCcw, Search, SearchX, Truck, UserPlus, Users, Wallet, type LucideIcon } from 'lucide-react';
import type { WaterBook } from '../../types/water';
import { waterBusiness } from '../../data/waterSample';
import {
  accountOf,
  accounts,
  businessSummary,
  customerToInput,
  daySummary,
  deliveryRows,
  emptyCustomerInput,
  filterAccounts,
  filterDeliveries,
  labelOf,
  money,
  orderText,
  paymentLog,
  paymentMethods,
  recurringText,
  type CustomerFilter,
  type DeliveryFilter,
} from './waterLogic';
import { useWaterDemo } from './useWaterDemo';
import { DeliveryList } from './DeliveryList';
import { DeliveryDrawer, type DeliveryMode } from './DeliveryDrawer';
import { CustomerDrawer } from './CustomerDrawer';
import { CustomerFormDrawer } from './CustomerFormDrawer';
import { PaymentDialog } from './PaymentDialog';
import { CustomerStatusBadge, DeliveryStatusBadge, Empty, Figures, Initials, Owed, shortDay } from './WaterBits';
import { Button } from '../../components/Button';
import { Panel } from '../../components/Panel';
import { controlClass } from '../../components/forms';
import { ToastRegion, useToast } from '../../components/Toast';
import { formatLongDay, pluralize } from '../../utils/format';
import { cn } from '../../utils/cn';

type Section = 'today' | 'customers' | 'payments';
const nav: { name: Section; label: string; icon: LucideIcon }[] = [
  { name: 'today', label: 'Today', icon: Truck },
  { name: 'customers', label: 'Customers', icon: Users },
  { name: 'payments', label: 'Payments', icon: Wallet },
];

/**
 * Water Delivery Management demo with a fictional delivery round. Every view
 * reads the same in-memory book (useWaterDemo), so recording a delivery or a
 * payment updates the day's list, balances, can counts and totals together.
 */
export function WaterApp() {
  const { book, actions } = useWaterDemo();
  const [section, setSection] = useState<Section>('today');
  const [delivery, setDelivery] = useState<{ id: string; mode: DeliveryMode } | null>(null);
  const [profileFor, setProfileFor] = useState<string | null>(null);
  const [form, setForm] = useState<{ mode: 'create' } | { mode: 'edit'; id: string } | null>(null);
  const [payFor, setPayFor] = useState<{ customerId: string } | null>(null);
  const [session, setSession] = useState(0);
  const { toast, notify } = useToast(5000);
  const pending = book.deliveries.filter((d) => d.date === book.today && d.status === 'scheduled').length;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [section]);

  const bump = () => setSession((n) => n + 1);
  const nameOf = (id: string) => book.customers.find((c) => c.id === id)?.name ?? 'Unknown';
  const openDelivery = (id: string, mode: DeliveryMode = 'details') => {
    setProfileFor(null);
    setDelivery({ id, mode });
    bump();
  };
  const openCustomer = (id: string) => {
    setDelivery(null);
    setProfileFor(id);
  };
  const openPay = (customerId = '') => {
    setProfileFor(null);
    setPayFor({ customerId });
    bump();
  };
  const openForm = (f: { mode: 'create' } | { mode: 'edit'; id: string }) => {
    setProfileFor(null);
    setForm(f);
    bump();
  };
  const reset = () => {
    actions.reset();
    setDelivery(null);
    setProfileFor(null);
    notify('Sample data restored.');
  };
  const editing = form?.mode === 'edit' ? book.customers.find((c) => c.id === form.id) : undefined;

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col lg:flex-row">
      <aside className="on-inverse border-b border-inverse-line bg-inverse text-on-inverse lg:w-60 lg:shrink-0 lg:border-r lg:border-b-0">
        <div className="flex flex-col gap-4 px-4 py-4 lg:sticky lg:top-14 lg:px-4 lg:py-6">
          <div className="flex items-center justify-between gap-3 lg:block lg:px-1">
            <p className="flex items-center gap-2.5 text-[0.95rem] font-semibold">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-accent text-on-accent">
                <Droplets size={17} aria-hidden="true" />
              </span>
              <span className="leading-tight">
                Water Delivery
                <span className="block text-xs font-normal text-on-inverse-muted">Industry-specific</span>
              </span>
            </p>
            <p className="text-right text-xs text-on-inverse-muted lg:mt-4 lg:text-left">
              {waterBusiness.name}
              <span className="block">{waterBusiness.city} · sample business</span>
            </p>
          </div>
          <nav aria-label="Water Delivery Management" className="relative -mx-1 flex gap-1 overflow-x-auto px-1 lg:mt-2 lg:flex-col">
            {nav.map((n) => {
              const active = section === n.name;
              return (
                <button
                  key={n.name}
                  type="button"
                  onClick={() => setSection(n.name)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative inline-flex min-h-10 shrink-0 items-center gap-2.5 rounded-[var(--radius-control)] px-3 text-sm font-medium transition-colors',
                    active ? 'bg-on-inverse/10 text-on-inverse' : 'text-on-inverse-muted hover:bg-on-inverse/5 hover:text-on-inverse',
                  )}
                >
                  {active ? <span className="absolute inset-y-2 left-0 hidden w-0.5 rounded-full bg-accent lg:block" aria-hidden="true" /> : null}
                  <n.icon size={17} aria-hidden="true" />
                  {n.label}
                  {n.name === 'today' && pending ? (
                    <span className="tabular ml-auto rounded-full bg-on-inverse/15 px-1.5 text-xs" aria-label={`${pending} pending`}>
                      {pending}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      <div className="min-w-0 flex-1 bg-canvas">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {section === 'today' ? (
            <TodayView book={book} onOpen={(id) => openDelivery(id)} onRecord={(id) => openDelivery(id, 'complete')} onReset={reset} onAddCustomer={() => openForm({ mode: 'create' })} />
          ) : section === 'customers' ? (
            <CustomersView book={book} onOpen={setProfileFor} onAdd={() => openForm({ mode: 'create' })} onReset={reset} />
          ) : (
            <PaymentsView book={book} onPay={openPay} onOpen={setProfileFor} onReset={reset} />
          )}
          <p className="mt-8 flex items-start gap-2 border-t border-line pt-4 text-xs text-fg-muted">
            <Info size={14} className="mt-px shrink-0" aria-hidden="true" />
            Everything here is fictional and kept in memory only. Refreshing the page or choosing Reset demo restores the sample data. No real deliveries, payments or messages are recorded or sent.
          </p>
        </div>
      </div>

      {delivery ? (
        <DeliveryDrawer
          key={`d${session}`}
          book={book}
          deliveryId={delivery.id}
          initialMode={delivery.mode}
          open
          onClose={() => setDelivery(null)}
          onOpenCustomer={openCustomer}
          onComplete={(input) => {
            const before = book.deliveries.find((d) => d.id === delivery.id);
            const held = before ? (accountOf(book, before.customerId)?.cansHeld ?? 0) : 0;
            const r = actions.complete(delivery.id, input);
            if (r.ok) {
              const c = r.delivery.completion!;
              const after = accountOf(r.book, r.delivery.customerId)!;
              notify(
                `Delivered to ${nameOf(r.delivery.customerId)}: ${orderText(c.cans, c.cartons)}, ${c.emptiesCollected} empties back${r.payment ? `, ${money(r.payment.amountPaise)} by ${labelOf(paymentMethods, r.payment.method)}` : ''}. Cans held ${held} → ${after.cansHeld}; owes ${money(after.balance)}.`,
              );
            }
            return r;
          }}
          onFail={(reason) => {
            const r = actions.fail(delivery.id, reason);
            if (r.ok) notify(`${nameOf(r.delivery.customerId)}’s delivery marked as failed. No charge.`, 'info');
            return r;
          }}
          onReschedule={(date) => {
            const r = actions.reschedule(delivery.id, date);
            if (r.ok) notify(`${nameOf(r.moved.customerId)}’s delivery moved to ${shortDay(r.moved.date)}.`);
            return r;
          }}
        />
      ) : null}
      <CustomerDrawer
        book={book}
        customerId={profileFor}
        open={profileFor !== null}
        onClose={() => setProfileFor(null)}
        onEdit={(id) => openForm({ mode: 'edit', id })}
        onPay={(id) => openPay(id)}
        onOpenDelivery={(id) => openDelivery(id)}
      />
      {form ? (
        <CustomerFormDrawer
          key={`f${session}`}
          mode={form.mode}
          initial={editing ? customerToInput(editing) : emptyCustomerInput()}
          open
          onClose={() => setForm(null)}
          onSave={(input) => {
            const r = form.mode === 'edit' ? actions.updateCustomer(form.id, input) : actions.createCustomer(input);
            if (r.ok) notify(form.mode === 'edit' ? `Saved ${r.customer.name}.` : `Added ${r.customer.name}.`);
            return r;
          }}
        />
      ) : null}
      {payFor ? (
        <PaymentDialog
          key={`p${session}`}
          book={book}
          customerId={payFor.customerId}
          open
          onClose={() => setPayFor(null)}
          onSave={(input) => {
            const r = actions.pay(input);
            if (r.ok) notify(`${money(r.payment.amountPaise)} received from ${nameOf(r.payment.customerId)} by ${labelOf(paymentMethods, r.payment.method)}. Owes ${money(accountOf(r.book, r.payment.customerId)!.balance)}.`);
            return r;
          }}
        />
      ) : null}
      <ToastRegion toast={toast} />
    </div>
  );
}

function PageHeading({ title, description, onReset, action }: { title: string; description: ReactNode; onReset: () => void; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-fg sm:text-[1.75rem]">{title}</h1>
        <p className="mt-1 max-w-[62ch] text-sm text-fg-muted">{description}</p>
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

function Chips<T extends string>({ label, options, value, onChange }: { label: string; options: { value: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors',
            value === o.value ? 'border-accent bg-accent-soft text-accent-strong' : 'border-line text-fg-muted hover:border-line-strong hover:text-fg',
          )}
        >
          {o.label}
          {o.count !== undefined ? <span className="tabular text-xs opacity-80">{o.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

function SearchBox({ id, label, placeholder, value, onChange }: { id: string; label: string; placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative md:w-72">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
      <input id={id} type="search" value={value} onChange={(e: { target: { value: string } }) => onChange(e.target.value)} placeholder={placeholder} className={controlClass(false, 'pl-9')} />
    </div>
  );
}

// ---------- Today ----------

function TodayView({ book, onOpen, onRecord, onReset, onAddCustomer }: { book: WaterBook; onOpen: (id: string) => void; onRecord: (id: string) => void; onReset: () => void; onAddCustomer: () => void }) {
  const id = useId();
  const [filter, setFilter] = useState<DeliveryFilter>('all');
  const [query, setQuery] = useState('');
  const rows = useMemo(() => deliveryRows(book, book.today), [book]);
  const sum = daySummary(rows);
  const biz = useMemo(() => businessSummary(book), [book]);
  const visible = filterDeliveries(rows, filter, query);
  const later = book.deliveries.filter((d) => d.status === 'scheduled' && d.date > book.today).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const plannedCans = rows.reduce((s, r) => s + (r.delivery.status === 'scheduled' ? r.delivery.cans : 0), 0);

  const figures = [
    { label: 'Deliveries today', value: sum.scheduled, note: sum.failed || sum.rescheduled ? [sum.failed ? `${sum.failed} failed` : '', sum.rescheduled ? `${sum.rescheduled} moved` : ''].filter(Boolean).join(' · ') : 'On today’s round' },
    { label: 'Completed', value: sum.completed, note: `${pluralize(sum.cansDelivered, 'can')} out · ${sum.emptiesCollected} empties back`, tone: sum.completed ? 'text-success-strong' : undefined },
    { label: 'Pending', value: sum.pending, note: sum.pending ? `${pluralize(plannedCans, 'can')} to deliver · ${sum.emptiesToCollect} empties to collect` : 'Round finished', tone: sum.pending ? 'text-warning-strong' : undefined },
    { label: 'Customers owing', value: biz.withBalance, note: `${money(biz.outstanding)} outstanding`, tone: biz.withBalance ? 'text-danger-strong' : undefined },
    { label: 'Cans with customers', value: biz.cansWithCustomers, note: 'Reusable 20 L cans to come back', wide: true },
  ];
  const filters: { value: DeliveryFilter; label: string; count: number }[] = [
    { value: 'all', label: 'All', count: sum.scheduled },
    { value: 'pending', label: 'Pending', count: sum.pending },
    { value: 'completed', label: 'Completed', count: sum.completed },
    { value: 'failed', label: 'Failed', count: sum.failed },
    { value: 'rescheduled', label: 'Rescheduled', count: sum.rescheduled },
  ];

  return (
    <div className="space-y-5">
      <PageHeading
        title="Today’s deliveries"
        description={
          <>
            {formatLongDay(book.today)} · {money(book.pricing.canPaise)} per 20 L can, {money(book.pricing.cartonPaise)} per carton of 12 × 1 L. Empty cans are never charged.
          </>
        }
        onReset={onReset}
        action={
          <Button variant="secondary" size="sm" onClick={onAddCustomer}>
            <UserPlus size={16} aria-hidden="true" /> Add customer
          </Button>
        }
      />

      <Figures figures={figures} label="Today at a glance" className="xl:grid-cols-5" />

      <section aria-label="Delivery list" className="rounded-[var(--radius-panel)] border border-line bg-surface shadow-[var(--shadow-panel)]">
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
          <Chips label="Filter deliveries" options={filters} value={filter} onChange={setFilter} />
          <SearchBox id={`${id}-q`} label="Search deliveries by customer, locality or phone" placeholder="Search customer or area" value={query} onChange={setQuery} />
        </div>
        <p className="sr-only" aria-live="polite">
          Showing {visible.length} of {rows.length} deliveries
        </p>
        {visible.length === 0 ? (
          <Empty icon={SearchX} title={rows.length ? 'No deliveries match' : 'No deliveries today'} text={filter === 'rescheduled' || filter === 'failed' ? 'Nothing has been marked this way today.' : 'Try another filter or search.'} />
        ) : (
          <DeliveryList rows={visible} today={book.today} onOpen={onOpen} onRecord={onRecord} />
        )}
      </section>

      {later.length ? (
        <Panel title="Coming up" description="Deliveries moved to a later day." aside={<span className="tabular text-xs text-fg-muted">{pluralize(later.length, 'delivery', 'deliveries')}</span>}>
          <ul className="divide-y divide-line">
            {later.map((d) => (
              <li key={d.id}>
                <button type="button" onClick={() => onOpen(d.id)} className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-subtle/50 sm:px-5">
                  <CalendarClock size={16} className="text-fg-subtle" aria-hidden="true" />
                  <span className="tabular w-28 text-sm font-medium text-fg">{shortDay(d.date)}</span>
                  <span className="min-w-0 flex-1 text-sm text-fg">{book.customers.find((c) => c.id === d.customerId)?.name}</span>
                  <span className="tabular text-sm text-fg-muted">{orderText(d.cans, d.cartons)}</span>
                  <DeliveryStatusBadge status={d.status} />
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </div>
  );
}

// ---------- Customers ----------

const customerFilters: { value: CustomerFilter; label: string }[] = [
  { value: 'all', label: 'All customers' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'balance', label: 'Owes money' },
];

function CustomersView({ book, onOpen, onAdd, onReset }: { book: WaterBook; onOpen: (id: string) => void; onAdd: () => void; onReset: () => void }) {
  const id = useId();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<CustomerFilter>('all');
  const all = useMemo(() => accounts(book), [book]);
  const biz = useMemo(() => businessSummary(book), [book]);
  const visible = filterAccounts(all, filter, query);
  const filtered = query.trim() !== '' || filter !== 'all';

  return (
    <div className="space-y-5">
      <PageHeading
        title="Customers"
        description="Contact details, regular orders, what each customer owes and how many of your cans they hold."
        onReset={onReset}
        action={
          <Button onClick={onAdd}>
            <Plus size={17} aria-hidden="true" /> Add customer
          </Button>
        }
      />
      <Figures
        label="Customer overview"
        className="md:grid-cols-4"
        figures={[
          { label: 'Customers', value: biz.customers, note: `${biz.active} active · ${biz.paused} paused` },
          { label: 'Regular orders', value: biz.recurring, note: 'Customers with a set schedule' },
          { label: 'Outstanding', value: money(biz.outstanding), note: `${pluralize(biz.withBalance, 'customer')} owing`, ...(biz.outstanding ? { tone: 'text-danger-strong' } : {}) },
          { label: 'Cans with customers', value: biz.cansWithCustomers, note: 'Reusable 20 L cans' },
        ]}
      />
      <section aria-label="Customer directory" className="rounded-[var(--radius-panel)] border border-line bg-surface shadow-[var(--shadow-panel)]">
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:px-5 md:flex-row md:items-end">
          <SearchBox id={`${id}-q`} label="Search customers by name, locality or phone" placeholder="Search name, area or phone" value={query} onChange={setQuery} />
          <div>
            <label htmlFor={`${id}-status`} className="block text-xs font-medium text-fg-muted">
              Show
            </label>
            <select id={`${id}-status`} value={filter} onChange={(e: { target: { value: string } }) => setFilter(e.target.value as CustomerFilter)} className={controlClass(false, 'mt-1 min-h-9 py-1.5 text-sm md:w-48')}>
              {customerFilters.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          {filtered ? (
            <Button
              variant="subtle"
              size="sm"
              className="self-start md:ml-auto md:self-end"
              onClick={() => {
                setQuery('');
                setFilter('all');
              }}
            >
              Clear filters
            </Button>
          ) : null}
        </div>
        <p className="sr-only" aria-live="polite">
          Showing {visible.length} of {all.length} customers
        </p>
        {visible.length === 0 ? (
          <Empty icon={SearchX} title="No customers match" text="Try another name, locality, phone number or filter." />
        ) : (
          <div className="@container">
            <table className="hidden w-full table-fixed text-left text-sm @3xl:table">
              <caption className="sr-only">Customers</caption>
              <colgroup>
                <col />
                <col className="w-36" />
                <col className="w-28" />
                <col className="w-56" />
                <col className="w-28" />
                <col className="w-20" />
              </colgroup>
              <thead className="border-b border-line bg-subtle/60 text-xs text-fg-muted">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-medium sm:px-5">Customer</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Locality</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Status</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Regular order</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">Balance</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">Cans</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visible.map((a) => (
                  <tr key={a.customer.id} className="align-middle transition-colors hover:bg-subtle/40">
                    <td className="px-4 py-2.5 sm:px-5">
                      <button type="button" onClick={() => onOpen(a.customer.id)} className="flex max-w-full items-center gap-3 text-left" aria-label={`Open ${a.customer.name}`}>
                        <Initials name={a.customer.name} muted={a.customer.status === 'paused'} />
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-fg hover:underline">{a.customer.name}</span>
                          <span className="tabular block truncate text-xs text-fg-muted">{a.customer.phone}</span>
                        </span>
                      </button>
                    </td>
                    <td className="truncate px-3 py-2.5 text-fg">{a.customer.locality}</td>
                    <td className="px-3 py-2.5">
                      <CustomerStatusBadge status={a.customer.status} />
                    </td>
                    <td className="truncate px-3 py-2.5 text-fg-muted">{recurringText(a.customer.recurring)}</td>
                    <td className="px-3 py-2.5 text-right">
                      <Owed paise={a.balance} text={money(a.balance)} />
                    </td>
                    <td className="tabular px-3 py-2.5 text-right text-fg">{a.cansHeld}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ul className="divide-y divide-line @3xl:hidden" aria-label="Customers">
              {visible.map((a) => (
                <li key={a.customer.id}>
                  <button type="button" onClick={() => onOpen(a.customer.id)} className="flex w-full items-start gap-3 px-4 py-3 text-left" aria-label={`Open ${a.customer.name}`}>
                    <Initials name={a.customer.name} muted={a.customer.status === 'paused'} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate font-medium text-fg">{a.customer.name}</span>
                        <Owed paise={a.balance} text={money(a.balance)} className="shrink-0 text-sm" />
                      </span>
                      <span className="tabular block truncate text-xs text-fg-muted">
                        {a.customer.locality} · {a.customer.phone}
                      </span>
                      <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <CustomerStatusBadge status={a.customer.status} />
                        <span className="tabular text-xs text-fg-muted">{pluralize(a.cansHeld, 'can')} held</span>
                        <span className="text-xs text-fg-muted">{recurringText(a.customer.recurring)}</span>
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}

// ---------- Payments ----------

const RECENT = 12;

function PaymentsView({ book, onPay, onOpen, onReset }: { book: WaterBook; onPay: (customerId?: string) => void; onOpen: (id: string) => void; onReset: () => void }) {
  const [showAll, setShowAll] = useState(false);
  const biz = useMemo(() => businessSummary(book), [book]);
  const owing = useMemo(
    () =>
      accounts(book)
        .filter((a) => a.balance > 0)
        .sort((a, b) => b.balance - a.balance || a.customer.name.localeCompare(b.customer.name)),
    [book],
  );
  const log = useMemo(() => paymentLog(book), [book]);
  const todays = log.filter((p) => p.date === book.today);
  const collectedToday = todays.reduce((s, p) => s + p.amountPaise, 0);
  const shown = showAll ? log : log.slice(0, RECENT);
  const nameOf = (id: string) => book.customers.find((c) => c.id === id)?.name ?? 'Unknown';

  return (
    <div className="space-y-5">
      <PageHeading
        title="Payments"
        description="Who owes what, and every payment recorded. A payment reduces a balance once and can’t be more than what is owed."
        onReset={onReset}
        action={
          <Button onClick={() => onPay()} disabled={owing.length === 0}>
            <IndianRupee size={17} aria-hidden="true" /> Record payment
          </Button>
        }
      />
      <Figures
        label="Payments overview"
        className="md:grid-cols-3"
        figures={[
          { label: 'Outstanding', value: money(biz.outstanding), note: `${pluralize(biz.withBalance, 'customer')} owing`, ...(biz.outstanding ? { tone: 'text-danger-strong' } : {}) },
          { label: 'Collected today', value: money(collectedToday), note: `${pluralize(todays.length, 'payment')} today`, tone: collectedToday ? 'text-success-strong' : undefined },
          { label: 'Payments recorded', value: log.length, note: 'In the sample ledger' },
        ]}
      />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel title="Outstanding balances" description="Largest first." aside={<span className="tabular text-xs text-fg-muted">{money(biz.outstanding)}</span>}>
          {owing.length === 0 ? (
            <Empty icon={ListChecks} title="Nothing outstanding" text="Every customer is fully paid up." />
          ) : (
            <ul className="divide-y divide-line">
              {owing.map((a) => (
                <li key={a.customer.id} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
                  <button type="button" onClick={() => onOpen(a.customer.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-label={`Open ${a.customer.name}`}>
                    <Initials name={a.customer.name} size="sm" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-fg">{a.customer.name}</span>
                      <span className="block truncate text-xs text-fg-muted">{a.customer.locality}</span>
                    </span>
                  </button>
                  <span className="tabular text-sm font-semibold text-danger-strong">{money(a.balance)}</span>
                  <Button variant="secondary" size="sm" onClick={() => onPay(a.customer.id)} ariaLabel={`Record payment from ${a.customer.name}`}>
                    Record
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Recent payments" description="Newest first." aside={<span className="tabular text-xs text-fg-muted">{pluralize(log.length, 'payment')}</span>}>
          <ul className="divide-y divide-line">
            {shown.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-fg">{nameOf(p.customerId)}</span>
                  <span className="tabular block text-xs text-fg-muted">
                    {p.date === book.today ? 'Today' : shortDay(p.date)} · {labelOf(paymentMethods, p.method)} · {p.deliveryId ? 'at delivery' : 'against balance'}
                  </span>
                </span>
                <span className="tabular text-sm font-semibold text-success-strong">{money(p.amountPaise)}</span>
              </li>
            ))}
          </ul>
          {log.length > RECENT ? (
            <div className="border-t border-line px-4 py-2.5 sm:px-5">
              <Button variant="subtle" size="sm" onClick={() => setShowAll((v) => !v)} aria-expanded={showAll}>
                {showAll ? 'Show fewer' : `Show all ${log.length}`}
              </Button>
            </div>
          ) : null}
        </Panel>
      </div>
    </div>
  );
}
