import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { CalendarDays, CalendarPlus, ChevronLeft, ChevronRight, CircleCheck, Clock, IndianRupee, Info, RotateCcw, Scissors, Search, SearchX, Sparkles, UserPlus, Users, type LucideIcon } from 'lucide-react';
import type { SalonBook } from '../../types/salon';
import { salonBusiness } from '../../data/salonSample';
import {
  MAX_DAYS_AHEAD,
  categories,
  customerSummaries,
  dayRows,
  daySummary,
  emptyBooking,
  emptyCustomer,
  filterRows,
  formatDuration,
  formatTime,
  isIsoDay,
  isOpenDay,
  labelOf,
  money,
  paymentMethods,
  scheduleFilters,
  searchCustomers,
  servicesText,
  upcomingAfter,
  type AppointmentRow,
  type ScheduleFilter,
} from './salonLogic';
import { useSalonDemo } from './useSalonDemo';
import { AppointmentDrawer, type AppointmentMode } from './AppointmentDrawer';
import { BookingDrawer } from './BookingDrawer';
import { CustomerDrawer } from './CustomerDrawer';
import { CustomerFormDrawer } from './CustomerFormDrawer';
import { Empty, Figures, Initials, PayBadge, StatusBadge, longDate, shortDay } from './SalonBits';
import { Button } from '../../components/Button';
import { Panel } from '../../components/Panel';
import { controlClass } from '../../components/forms';
import { ToastRegion, useToast } from '../../components/Toast';
import { addDays } from '../../utils/dates';
import { formatLongDay, pluralize } from '../../utils/format';
import { cn } from '../../utils/cn';
import { useResetDemo } from '../demo/useResetDemo';

type Section = 'schedule' | 'customers' | 'services';
const nav: { name: Section; label: string; icon: LucideIcon }[] = [
  { name: 'schedule', label: 'Schedule', icon: CalendarDays },
  { name: 'customers', label: 'Customers', icon: Users },
  { name: 'services', label: 'Services & hours', icon: Sparkles },
];

/** Earliest day shown in the schedule (history in the sample starts 12 days back). */
const HISTORY_DAYS = 14;

/**
 * Salon Management demo with a fictional salon. Every view reads the same
 * in-memory book (useSalonDemo), so booking, moving, cancelling or checking out
 * an appointment updates the schedule, customer history and day totals together.
 */
export function SalonApp() {
  const { book, actions, changed } = useSalonDemo();
  const [section, setSection] = useState<Section>('schedule');
  const [date, setDate] = useState(book.today);
  const [openAppt, setOpenAppt] = useState<{ id: string; mode: AppointmentMode } | null>(null);
  const [bookingFor, setBookingFor] = useState<{ customerId: string; date: string } | null>(null);
  const [profileFor, setProfileFor] = useState<string | null>(null);
  const [form, setForm] = useState<{ mode: 'create' } | { mode: 'edit'; id: string } | null>(null);
  const [session, setSession] = useState(0);
  const { toast, notify } = useToast(5000);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [section]);

  const bump = () => setSession((n) => n + 1);
  const nameOf = (id: string) => book.customers.find((c) => c.id === id)?.name ?? 'Unknown';
  const open = {
    appointment: (id: string, mode: AppointmentMode = 'details') => {
      setProfileFor(null);
      setOpenAppt({ id, mode });
      bump();
    },
    booking: (customerId = '') => {
      setProfileFor(null);
      setBookingFor({ customerId, date: date >= book.today && isOpenDay(book, date) ? date : book.today });
      bump();
    },
    customer: (id: string) => {
      setOpenAppt(null);
      setProfileFor(id);
    },
    form: (f: { mode: 'create' } | { mode: 'edit'; id: string }) => {
      setProfileFor(null);
      setForm(f);
      bump();
    },
  };
  const resetNow = () => {
    actions.reset();
    setOpenAppt(null);
    setProfileFor(null);
    setDate(book.today);
    notify('Sample data restored.');
  };
  const { reset, resetDialog } = useResetDemo(changed, resetNow);
  const editing = form?.mode === 'edit' ? book.customers.find((c) => c.id === form.id) : undefined;
  const heading = (title: string, action?: ReactNode) => <PageHeading title={title} book={book} onReset={reset} action={action} />;
  const bookButton = (
    <Button onClick={() => open.booking()}>
      <CalendarPlus size={17} aria-hidden="true" /> New appointment
    </Button>
  );

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col lg:flex-row">
      <aside className="on-inverse border-b border-inverse-line bg-inverse text-on-inverse lg:w-60 lg:shrink-0 lg:border-r lg:border-b-0">
        <div className="flex flex-col gap-4 px-4 py-4 lg:sticky lg:top-14 lg:px-4 lg:py-6">
          <div className="flex items-center justify-between gap-3 lg:block lg:px-1">
            <p className="flex items-center gap-2.5 text-[0.95rem] font-semibold">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-accent text-on-accent">
                <Scissors size={17} aria-hidden="true" />
              </span>
              <span className="leading-tight">
                Salon
                <span className="block text-xs font-normal text-on-inverse-muted">Industry-specific</span>
              </span>
            </p>
            <p className="text-right text-xs text-on-inverse-muted lg:mt-4 lg:text-left">
              {salonBusiness.name}
              <span className="block">{salonBusiness.city} · sample salon</span>
            </p>
          </div>
          <nav aria-label="Salon Management" className="relative -mx-1 flex gap-1 overflow-x-auto px-1 lg:mt-2 lg:flex-col">
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
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      <div className="min-w-0 flex-1 bg-canvas">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {section === 'schedule' ? (
            <ScheduleView book={book} date={date} onDate={setDate} heading={heading('Schedule', bookButton)} onOpen={open.appointment} />
          ) : section === 'customers' ? (
            <CustomersView
              book={book}
              heading={heading(
                'Customers',
                <Button onClick={() => open.form({ mode: 'create' })}>
                  <UserPlus size={17} aria-hidden="true" /> Add customer
                </Button>,
              )}
              onOpen={setProfileFor}
            />
          ) : (
            <ServicesView book={book} heading={heading('Services & hours', bookButton)} />
          )}
          <p className="mt-8 flex items-start gap-2 border-t border-line pt-4 text-xs text-fg-muted">
            <Info size={14} className="mt-px shrink-0" aria-hidden="true" />
            Everything here is fictional and kept in memory only, on a fixed sample day. Reloading the page or choosing Reset demo restores the sample data. No bookings are confirmed, no messages are sent and no money is collected.
          </p>
        </div>
      </div>

      {openAppt ? (
        <AppointmentDrawer
          key={`a${session}`}
          book={book}
          appointmentId={openAppt.id}
          initialMode={openAppt.mode}
          open
          onClose={() => setOpenAppt(null)}
          onOpenCustomer={open.customer}
          onComplete={(payNow) => {
            const r = actions.complete(openAppt.id, payNow);
            if (r.ok) notify(`${nameOf(r.appointment.customerId)} checked out${r.payment ? `: ${money(r.payment.amountPaise)} paid by ${labelOf(paymentMethods, r.payment.method)}` : ', payment pending'}.`);
            return r;
          }}
          onPay={(method) => {
            const r = actions.pay(openAppt.id, method);
            if (r.ok) notify(`${money(r.payment.amountPaise)} paid by ${labelOf(paymentMethods, r.payment.method)}.`);
            return r;
          }}
          onReschedule={(input) => {
            const r = actions.reschedule(openAppt.id, input);
            if (r.ok) notify(`${nameOf(r.appointment.customerId)} moved to ${r.appointment.date === book.today ? 'today' : shortDay(r.appointment.date)} at ${formatTime(r.appointment.start)}.`);
            return r;
          }}
          onCancel={(reason) => {
            const r = actions.cancel(openAppt.id, reason);
            if (r.ok) notify(`${nameOf(r.appointment.customerId)}’s appointment cancelled. The time is free again.`, 'info');
            return r;
          }}
        />
      ) : null}
      {bookingFor ? (
        <BookingDrawer
          key={`b${session}`}
          book={book}
          initial={{ ...emptyBooking(bookingFor.date, bookingFor.customerId) }}
          open
          onClose={() => setBookingFor(null)}
          onSave={(input) => {
            const r = actions.book(input);
            if (r.ok) {
              notify(`${r.isNewCustomer ? `Added ${r.customer.name}. ` : ''}Booked ${r.customer.name}: ${servicesText(r.appointment.services)}, ${r.appointment.date === book.today ? 'today' : shortDay(r.appointment.date)} at ${formatTime(r.appointment.start)}.`);
              setDate(r.appointment.date);
              setSection('schedule');
            }
            return r;
          }}
        />
      ) : null}
      <CustomerDrawer
        book={book}
        customerId={profileFor}
        open={profileFor !== null}
        onClose={() => setProfileFor(null)}
        onEdit={(id) => open.form({ mode: 'edit', id })}
        onBook={(id) => open.booking(id)}
        onOpenAppointment={(id) => open.appointment(id)}
      />
      {form ? (
        <CustomerFormDrawer
          key={`f${session}`}
          mode={form.mode}
          initial={editing ? { name: editing.name, phone: editing.phone, email: editing.email, notes: editing.notes } : emptyCustomer()}
          open
          onClose={() => setForm(null)}
          onSave={(input) => {
            const r = form.mode === 'edit' ? actions.updateCustomer(form.id, input) : actions.createCustomer(input);
            if (r.ok) notify(form.mode === 'edit' ? `Saved ${r.customer.name}.` : `Added ${r.customer.name}.`);
            return r;
          }}
        />
      ) : null}
      {resetDialog}
      <ToastRegion toast={toast} />
    </div>
  );
}

function PageHeading({ title, book, onReset, action }: { title: string; book: SalonBook; onReset: () => void; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-fg sm:text-[1.75rem]">{title}</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Today is {formatLongDay(book.today)} · sample day · open {formatTime(book.hours.open)}–{formatTime(book.hours.close)}, closed Tuesdays
        </p>
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

// ---------- Schedule ----------

function RowAction({ r, today, onOpen }: { r: AppointmentRow; today: string; onOpen: (id: string, mode?: AppointmentMode) => void }) {
  const a = r.appointment;
  if (a.status === 'booked' && a.date <= today)
    return (
      <Button variant="secondary" size="sm" onClick={() => onOpen(a.id, 'checkout')} ariaLabel={`Check out ${r.customer.name}`}>
        <CircleCheck size={15} aria-hidden="true" /> Check out
      </Button>
    );
  if (r.pay === 'unpaid')
    return (
      <Button variant="secondary" size="sm" onClick={() => onOpen(a.id, 'pay')} ariaLabel={`Take payment from ${r.customer.name}`}>
        <IndianRupee size={15} aria-hidden="true" /> Take payment
      </Button>
    );
  return (
    <Button variant="subtle" size="sm" onClick={() => onOpen(a.id)} ariaLabel={`Details of ${r.customer.name}’s appointment`}>
      Details <ChevronRight size={15} aria-hidden="true" />
    </Button>
  );
}

function ScheduleView({ book, date, onDate, heading, onOpen }: { book: SalonBook; date: string; onDate: (d: string) => void; heading: ReactNode; onOpen: (id: string, mode?: AppointmentMode) => void }) {
  const id = useId();
  const [filter, setFilter] = useState<ScheduleFilter>('all');
  const [stylist, setStylist] = useState('all');
  const [query, setQuery] = useState('');
  const min = addDays(book.today, -HISTORY_DAYS);
  const max = addDays(book.today, MAX_DAYS_AHEAD);
  const rows = useMemo(() => dayRows(book, date), [book, date]);
  const s = useMemo(() => daySummary(book, date), [book, date]);
  const visible = filterRows(rows, filter, stylist, query);
  const upcoming = useMemo(() => upcomingAfter(book, date), [book, date]);
  const isToday = date === book.today;
  const closed = !isOpenDay(book, date);
  const counts: Record<ScheduleFilter, number> = { all: rows.length, upcoming: s.upcoming, completed: s.completed, unpaid: s.unpaid, cancelled: s.cancelled };
  const filtered = filter !== 'all' || stylist !== 'all' || query.trim() !== '';

  return (
    <div className="space-y-5">
      {heading}
      <div className="flex flex-col gap-3 rounded-[var(--radius-panel)] border border-line bg-surface p-3 shadow-[var(--shadow-panel)] sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <div className="flex items-center gap-2">
          <Button variant="subtle" size="sm" onClick={() => onDate(addDays(date, -1))} disabled={date <= min} ariaLabel="Previous day">
            <ChevronLeft size={18} aria-hidden="true" />
          </Button>
          <div className="min-w-0 text-center sm:text-left">
            <h2 className="text-base font-semibold text-fg" aria-live="polite">
              {formatLongDay(date)}
            </h2>
            <p className="text-xs text-fg-muted">{closed ? 'Closed on Tuesdays' : isToday ? 'Today in the demo' : date < book.today ? 'Earlier day' : 'Coming up'}</p>
          </div>
          <Button variant="subtle" size="sm" onClick={() => onDate(addDays(date, 1))} disabled={date >= max} ariaLabel="Next day">
            <ChevronRight size={18} aria-hidden="true" />
          </Button>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <label htmlFor={`${id}-date`} className="block text-xs font-medium text-fg-muted">
              Go to date
            </label>
            <input
              id={`${id}-date`}
              type="date"
              value={date}
              min={min}
              max={max}
              onChange={(e: { target: { value: string } }) => {
                const v = e.target.value;
                if (isIsoDay(v) && v >= min && v <= max) onDate(v);
              }}
              className={controlClass(false, 'mt-1 min-h-9 py-1.5 text-sm')}
            />
          </div>
          <Button variant="secondary" size="sm" onClick={() => onDate(book.today)} disabled={isToday}>
            Today
          </Button>
        </div>
      </div>

      <Figures
        label={`Summary for ${formatLongDay(date)}`}
        className="lg:grid-cols-5"
        figures={[
          { label: 'Appointments', value: s.appointments, note: closed ? 'Closed' : 'Booked or completed' },
          { label: 'Still to come', value: s.upcoming, note: 'Upcoming', ...(s.upcoming ? { tone: 'text-accent-strong' } : {}) },
          { label: 'Completed', value: s.completed, note: s.unpaid ? `${s.unpaid} unpaid · ${money(s.unpaidAmount).replace('.00', '')}` : 'All paid', ...(s.completed ? { tone: 'text-success-strong' } : {}) },
          { label: 'Cancelled', value: s.cancelled, note: 'Not counted as work' },
          { label: 'Revenue', value: money(s.revenue).replace('.00', ''), note: 'Payments recorded this day', wide: true },
        ]}
      />

      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-label="Appointments" className="rounded-[var(--radius-panel)] border border-line bg-surface shadow-[var(--shadow-panel)]">
          <div className="flex flex-col gap-3 border-b border-line p-4 sm:px-5">
            <div role="group" aria-label="Filter appointments" className="flex flex-wrap gap-1.5">
              {scheduleFilters.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  aria-pressed={filter === f.value}
                  onClick={() => setFilter(f.value)}
                  className={cn(
                    'inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors',
                    filter === f.value ? 'border-accent bg-accent-soft text-accent-strong' : 'border-line text-fg-muted hover:border-line-strong hover:text-fg',
                  )}
                >
                  {f.label}
                  <span className="tabular text-xs opacity-80">{counts[f.value]}</span>
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="relative sm:w-64">
                <label htmlFor={`${id}-q`} className="sr-only">
                  Search appointments by customer or service
                </label>
                <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
                <input id={`${id}-q`} type="search" value={query} onChange={(e: { target: { value: string } }) => setQuery(e.target.value)} placeholder="Search customer or service" className={controlClass(false, 'pl-9')} />
              </div>
              <div>
                <label htmlFor={`${id}-stylist`} className="block text-xs font-medium text-fg-muted">
                  Stylist
                </label>
                <select id={`${id}-stylist`} value={stylist} onChange={(e: { target: { value: string } }) => setStylist(e.target.value)} className={controlClass(false, 'mt-1 min-h-9 py-1.5 text-sm sm:w-44')}>
                  <option value="all">All stylists</option>
                  {book.stylists.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name}
                    </option>
                  ))}
                </select>
              </div>
              {filtered ? (
                <Button
                  variant="subtle"
                  size="sm"
                  className="self-start sm:ml-auto sm:self-end"
                  onClick={() => {
                    setFilter('all');
                    setStylist('all');
                    setQuery('');
                  }}
                >
                  Clear filters
                </Button>
              ) : null}
            </div>
          </div>
          <p className="sr-only" aria-live="polite">
            Showing {visible.length} of {rows.length} appointments
          </p>
          {visible.length === 0 ? (
            <Empty icon={closed ? CalendarDays : SearchX} title={closed ? 'Closed on Tuesdays' : rows.length ? 'No appointments match' : 'No appointments this day'} text={closed ? 'The salon doesn’t open on Tuesdays, so no bookings can be made.' : rows.length ? 'Try another filter, stylist or search.' : 'Book one with New appointment.'} />
          ) : (
            <div className="@container">
              <table className="hidden w-full table-fixed text-left text-sm @3xl:table">
                <caption className="sr-only">Appointments on {longDate(date)}</caption>
                <colgroup>
                  <col className="w-28" />
                  <col />
                  <col className="w-32" />
                  <col className="w-32" />
                  <col className="w-44" />
                </colgroup>
                <thead className="border-b border-line bg-subtle/60 text-xs text-fg-muted">
                  <tr>
                    <th scope="col" className="px-4 py-2.5 font-medium sm:px-5">Time</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Customer and services</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Stylist</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Status</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">
                      <span className="sr-only">Action</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {visible.map((r) => (
                    <tr key={r.appointment.id} className={cn('align-middle transition-colors hover:bg-subtle/40', r.appointment.status === 'cancelled' && 'text-fg-muted')}>
                      <td className="px-4 py-2.5 sm:px-5">
                        <span className={cn('tabular block font-semibold', r.appointment.status === 'cancelled' ? 'text-fg-muted line-through' : 'text-fg')}>{formatTime(r.appointment.start)}</span>
                        <span className="tabular block text-xs whitespace-nowrap text-fg-muted">to {formatTime(r.end)}</span>
                        <span className="tabular block text-xs whitespace-nowrap text-fg-subtle">{formatDuration(r.duration)}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <button type="button" onClick={() => onOpen(r.appointment.id)} className="block max-w-full truncate text-left font-medium text-fg hover:underline" aria-label={`Open ${r.customer.name}’s appointment`}>
                          {r.customer.name}
                        </button>
                        <span className="block truncate text-xs text-fg-muted">
                          {servicesText(r.appointment.services)} · {money(r.total).replace('.00', '')}
                        </span>
                      </td>
                      <td className="truncate px-3 py-2.5 text-fg">{r.stylist.name}</td>
                      <td className="px-3 py-2.5">
                        <span className="flex flex-wrap gap-1">
                          <StatusBadge status={r.appointment.status} />
                          <PayBadge state={r.pay} />
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <RowAction r={r} today={book.today} onOpen={onOpen} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <ul className="divide-y divide-line @3xl:hidden" aria-label="Appointments">
                {visible.map((r) => (
                  <li key={r.appointment.id} className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      <span className="w-20 shrink-0">
                        <span className={cn('tabular block text-sm font-semibold', r.appointment.status === 'cancelled' ? 'text-fg-muted line-through' : 'text-fg')}>{formatTime(r.appointment.start)}</span>
                        <span className="tabular block text-xs text-fg-muted">{formatDuration(r.duration)}</span>
                      </span>
                      <button type="button" onClick={() => onOpen(r.appointment.id)} className="min-w-0 flex-1 text-left" aria-label={`Open ${r.customer.name}’s appointment`}>
                        <span className="block truncate font-medium text-fg">{r.customer.name}</span>
                        <span className="block truncate text-xs text-fg-muted">
                          {servicesText(r.appointment.services)} · {r.stylist.name}
                        </span>
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 pl-23">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <StatusBadge status={r.appointment.status} />
                        <PayBadge state={r.pay} />
                        <span className="tabular text-xs text-fg-muted">{money(r.total).replace('.00', '')}</span>
                      </span>
                      <RowAction r={r} today={book.today} onOpen={onOpen} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <Panel title="Coming up" description="Booked for the next 7 days." aside={<span className="tabular text-xs text-fg-muted">{upcoming.length}</span>} className="self-start">
          {upcoming.length === 0 ? (
            <Empty icon={Clock} title="Nothing booked" text="No appointments in the next 7 days." />
          ) : (
            <ul className="divide-y divide-line">
              {upcoming.map((r) => (
                <li key={r.appointment.id}>
                  <button type="button" onClick={() => onOpen(r.appointment.id)} className="flex w-full items-start gap-3 px-4 py-2.5 text-left hover:bg-subtle/50">
                    <span className="tabular w-16 shrink-0 text-xs text-fg-muted">
                      {shortDay(r.appointment.date).replace(/ \w+$/, '')}
                      <span className="block font-semibold text-fg">{formatTime(r.appointment.start)}</span>
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-fg">{r.customer.name}</span>
                      <span className="block truncate text-xs text-fg-muted">
                        {servicesText(r.appointment.services)} · {r.stylist.name}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

// ---------- Customers ----------

function CustomersView({ book, heading, onOpen }: { book: SalonBook; heading: ReactNode; onOpen: (id: string) => void }) {
  const id = useId();
  const [query, setQuery] = useState('');
  const all = useMemo(() => customerSummaries(book), [book]);
  const visible = searchCustomers(all, query);
  return (
    <div className="space-y-5">
      {heading}
      <section aria-label="Customer directory" className="rounded-[var(--radius-panel)] border border-line bg-surface shadow-[var(--shadow-panel)]">
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="relative sm:w-72">
            <label htmlFor={`${id}-q`} className="sr-only">
              Search customers by name, phone or email
            </label>
            <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
            <input id={`${id}-q`} type="search" value={query} onChange={(e: { target: { value: string } }) => setQuery(e.target.value)} placeholder="Search name, phone or email" className={controlClass(false, 'pl-9')} />
          </div>
          <p className="text-sm text-fg-muted" aria-live="polite">
            {pluralize(visible.length, 'customer')}
          </p>
        </div>
        {visible.length === 0 ? (
          <Empty icon={SearchX} title="No customers match" text="Try another name, phone number or email." />
        ) : (
          <div className="@container">
            <table className="hidden w-full table-fixed text-left text-sm @3xl:table">
              <caption className="sr-only">Customers</caption>
              <colgroup>
                <col />
                <col className="w-20" />
                <col className="w-32" />
                <col className="w-48" />
                <col className="w-40" />
              </colgroup>
              <thead className="border-b border-line bg-subtle/60 text-xs text-fg-muted">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-medium sm:px-5">Customer</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">Visits</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Last visit</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Usually books</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Next appointment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visible.map((c) => (
                  <tr key={c.customer.id} className="align-middle transition-colors hover:bg-subtle/40">
                    <td className="px-4 py-2.5 sm:px-5">
                      <button type="button" onClick={() => onOpen(c.customer.id)} className="flex max-w-full items-center gap-3 text-left" aria-label={`Open ${c.customer.name}`}>
                        <Initials name={c.customer.name} size="sm" />
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-fg hover:underline">{c.customer.name}</span>
                          <span className="tabular block truncate text-xs text-fg-muted">
                            {c.customer.phone}
                            {c.customer.email ? ` · ${c.customer.email}` : ''}
                          </span>
                        </span>
                      </button>
                    </td>
                    <td className="tabular px-3 py-2.5 text-right text-fg">{c.visits}</td>
                    <td className="tabular px-3 py-2.5 text-fg-muted">{c.lastVisit ? (c.lastVisit === book.today ? 'Today' : shortDay(c.lastVisit)) : '—'}</td>
                    <td className="truncate px-3 py-2.5 text-fg">{c.favourite ?? '—'}</td>
                    <td className="tabular px-3 py-2.5 text-fg-muted">{c.next ? `${c.next.date === book.today ? 'Today' : shortDay(c.next.date)}, ${formatTime(c.next.start)}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ul className="divide-y divide-line @3xl:hidden" aria-label="Customers">
              {visible.map((c) => (
                <li key={c.customer.id}>
                  <button type="button" onClick={() => onOpen(c.customer.id)} className="flex w-full items-start gap-3 px-4 py-3 text-left" aria-label={`Open ${c.customer.name}`}>
                    <Initials name={c.customer.name} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-fg">{c.customer.name}</span>
                      <span className="tabular block truncate text-xs text-fg-muted">{c.customer.phone}</span>
                      <span className="mt-1 block text-xs text-fg-muted">
                        {pluralize(c.visits, 'visit')}
                        {c.lastVisit ? ` · last ${c.lastVisit === book.today ? 'today' : shortDay(c.lastVisit)}` : ''}
                        {c.favourite ? ` · ${c.favourite}` : ''}
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

// ---------- Services & hours ----------

function ServicesView({ book, heading }: { book: SalonBook; heading: ReactNode }) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return (
    <div className="space-y-5">
      {heading}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Panel title="Service menu" description="Fictional example prices. Prices are copied onto each appointment when it’s booked.">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Service menu</caption>
              <thead className="border-b border-line bg-subtle/60 text-xs text-fg-muted">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-medium sm:px-5">Service</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Category</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">Time</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium sm:px-5">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {book.services.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-2.5 font-medium text-fg sm:px-5">{s.name}</td>
                    <td className="px-3 py-2.5 text-fg-muted">{labelOf(categories, s.category)}</td>
                    <td className="tabular px-3 py-2.5 text-right text-fg-muted">{formatDuration(s.durationMin)}</td>
                    <td className="tabular px-4 py-2.5 text-right text-fg sm:px-5">{money(s.pricePaise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <div className="space-y-5">
          <Panel title="Opening hours">
            <ul className="divide-y divide-line text-sm">
              {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                <li key={d} className="flex justify-between px-4 py-2 sm:px-5">
                  <span className="text-fg">{days[d]}</span>
                  <span className={cn('tabular', d === book.hours.closedWeekday ? 'font-medium text-danger-strong' : 'text-fg-muted')}>
                    {d === book.hours.closedWeekday ? 'Closed' : `${formatTime(book.hours.open)} – ${formatTime(book.hours.close)}`}
                  </span>
                </li>
              ))}
            </ul>
            <p className="border-t border-line px-4 py-2.5 text-xs text-fg-muted sm:px-5">Appointments start on the quarter hour and must finish by closing.</p>
          </Panel>
          <Panel title="Stylists">
            <ul className="divide-y divide-line">
              {book.stylists.map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
                  <Initials name={s.name} size="sm" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-fg">{s.name}</span>
                    <span className="block text-xs text-fg-muted">
                      {s.role} · {s.categories.map((c) => labelOf(categories, c)).join(', ')}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="border-t border-line px-4 py-2.5 text-xs text-fg-muted sm:px-5">A stylist can’t be double-booked. Cancelled appointments free the time.</p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
