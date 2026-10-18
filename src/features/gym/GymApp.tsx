import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  IndianRupee,
  Info,
  LayoutDashboard,
  ListChecks,
  LogIn,
  RefreshCw,
  RotateCcw,
  Search,
  SearchX,
  UserPlus,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import type { GymBook } from '../../types/gym';
import { gymBusiness } from '../../data/gymSample';
import {
  attendanceStart,
  checkInBlock,
  checkInsOn,
  emptyRegisterInput,
  filterMembers,
  isIsoDay,
  labelOf,
  memberFilters,
  memberRows,
  money,
  paymentLog,
  paymentMethods,
  planOf,
  recentActivity,
  renewalsDue,
  rowOf,
  summarize,
  type Activity,
  type MemberFilter,
} from './gymLogic';
import { useGymDemo } from './useGymDemo';
import { MemberDrawer } from './MemberDrawer';
import { MemberFormDrawer } from './MemberFormDrawer';
import { RenewDialog } from './RenewDialog';
import { PaymentDialog } from './PaymentDialog';
import { CheckInDialog } from './CheckInDialog';
import { Empty, Figures, Initials, PayBadge, StatusBadge, longDate, shortDay } from './GymBits';
import { Button } from '../../components/Button';
import { Panel } from '../../components/Panel';
import { controlClass } from '../../components/forms';
import { ToastRegion, useToast } from '../../components/Toast';
import { addDays } from '../../utils/dates';
import { formatLongDay, pluralize } from '../../utils/format';
import { cn } from '../../utils/cn';
import { useResetDemo } from '../demo/useResetDemo';

type Section = 'dashboard' | 'members' | 'attendance' | 'payments';
const nav: { name: Section; label: string; icon: LucideIcon }[] = [
  { name: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { name: 'members', label: 'Members', icon: Users },
  { name: 'attendance', label: 'Attendance', icon: CalendarCheck },
  { name: 'payments', label: 'Payments', icon: Wallet },
];

/**
 * Gym Membership Management demo with a fictional gym. Every view reads the
 * same in-memory book (useGymDemo), so registering, renewing, checking in or
 * recording a payment updates statuses, balances and the dashboard together.
 */
export function GymApp() {
  const { book, actions, changed } = useGymDemo();
  const [section, setSection] = useState<Section>('dashboard');
  const [profileFor, setProfileFor] = useState<string | null>(null);
  const [form, setForm] = useState<{ mode: 'register' } | { mode: 'edit'; id: string } | null>(null);
  const [renewFor, setRenewFor] = useState<string | null>(null);
  const [payFor, setPayFor] = useState<{ memberId: string } | null>(null);
  const [checkInFor, setCheckInFor] = useState<string | null>(null);
  const [session, setSession] = useState(0);
  const { toast, notify } = useToast(5000);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [section]);

  const bump = () => setSession((n) => n + 1);
  const nameOf = (id: string) => book.members.find((m) => m.id === id)?.name ?? 'Unknown';
  const open = {
    register: () => {
      setProfileFor(null);
      setForm({ mode: 'register' });
      bump();
    },
    edit: (id: string) => {
      setProfileFor(null);
      setForm({ mode: 'edit', id });
      bump();
    },
    renew: (id: string) => {
      setProfileFor(null);
      setRenewFor(id);
      bump();
    },
    pay: (memberId = '') => {
      setProfileFor(null);
      setPayFor({ memberId });
      bump();
    },
    checkIn: (id: string) => {
      setProfileFor(null);
      setCheckInFor(id);
      bump();
    },
  };
  const resetNow = () => {
    actions.reset();
    setProfileFor(null);
    notify('Sample data restored.');
  };
  const { reset, resetDialog } = useResetDemo(changed, resetNow);
  const editing = form?.mode === 'edit' ? book.members.find((m) => m.id === form.id) : undefined;
  const views: Record<Section, ReactNode> = {
    dashboard: <DashboardView book={book} onOpen={setProfileFor} onRegister={open.register} onRenew={open.renew} onPay={() => open.pay()} onAttendance={() => setSection('attendance')} onReset={reset} />,
    members: <MembersView book={book} onOpen={setProfileFor} onRegister={open.register} onReset={reset} />,
    attendance: <AttendanceView book={book} onOpen={setProfileFor} onCheckIn={open.checkIn} onRegister={open.register} onReset={reset} />,
    payments: <PaymentsView book={book} onOpen={setProfileFor} onPay={open.pay} onReset={reset} />,
  };

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col lg:flex-row">
      <aside className="on-inverse border-b border-inverse-line bg-inverse text-on-inverse lg:w-60 lg:shrink-0 lg:border-r lg:border-b-0">
        <div className="flex flex-col gap-4 px-4 py-4 lg:sticky lg:top-14 lg:px-4 lg:py-6">
          <div className="flex items-center justify-between gap-3 lg:block lg:px-1">
            <p className="flex items-center gap-2.5 text-[0.95rem] font-semibold">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-accent text-on-accent">
                <Dumbbell size={17} aria-hidden="true" />
              </span>
              <span className="leading-tight">
                Gym Membership
                <span className="block text-xs font-normal text-on-inverse-muted">Industry-specific</span>
              </span>
            </p>
            <p className="text-right text-xs text-on-inverse-muted lg:mt-4 lg:text-left">
              {gymBusiness.name}
              <span className="block">{gymBusiness.city} · sample gym</span>
            </p>
          </div>
          <nav aria-label="Gym Membership Management" className="relative -mx-1 flex gap-1 overflow-x-auto px-1 lg:mt-2 lg:flex-col">
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
          {views[section]}
          <p className="mt-8 flex items-start gap-2 border-t border-line pt-4 text-xs text-fg-muted">
            <Info size={14} className="mt-px shrink-0" aria-hidden="true" />
            Everything here is fictional and kept in memory only, on a fixed sample day. Reloading the page or choosing Reset demo restores the sample data. No real gym records, payments or messages are processed.
          </p>
        </div>
      </div>

      <MemberDrawer
        book={book}
        memberId={profileFor}
        open={profileFor !== null}
        onClose={() => setProfileFor(null)}
        onEdit={open.edit}
        onRenew={open.renew}
        onPay={(id) => open.pay(id)}
        onCheckIn={open.checkIn}
      />
      {form ? (
        <MemberFormDrawer
          key={`f${session}`}
          book={book}
          mode={form.mode}
          initial={editing ? { ...emptyRegisterInput(book.today), name: editing.name, phone: editing.phone, email: editing.email } : emptyRegisterInput(book.today)}
          open
          onClose={() => setForm(null)}
          onSave={(input) => {
            if (form.mode === 'edit') {
              const r = actions.update(form.id, input);
              if (r.ok) notify(`Saved ${r.member.name}.`);
              return r;
            }
            const r = actions.register(input);
            if (r.ok) {
              const plan = planOf(book, r.membership.planId)!;
              notify(`Registered ${r.member.name}: ${plan.name}, ${shortDay(r.membership.start)} – ${shortDay(r.membership.end)}${r.payment ? `, ${money(r.payment.amountPaise)} received` : ''}.`);
            }
            return r;
          }}
        />
      ) : null}
      {renewFor ? (
        <RenewDialog
          key={`r${session}`}
          book={book}
          memberId={renewFor}
          open
          onClose={() => setRenewFor(null)}
          onSave={(input) => {
            const r = actions.renew(renewFor, input);
            if (r.ok) notify(`Renewed ${nameOf(renewFor)}: ${planOf(book, r.membership.planId)!.name}, ${shortDay(r.membership.start)} – ${shortDay(r.membership.end)}${r.payment ? `, ${money(r.payment.amountPaise)} received` : ''}.`);
            return r;
          }}
        />
      ) : null}
      {payFor ? (
        <PaymentDialog
          key={`p${session}`}
          book={book}
          memberId={payFor.memberId}
          open
          onClose={() => setPayFor(null)}
          onSave={(input) => {
            const r = actions.pay(input);
            if (r.ok) notify(`${money(r.payment.amountPaise)} received from ${nameOf(r.payment.memberId)} by ${labelOf(paymentMethods, r.payment.method)}. Owes ${money(rowOf(r.book, r.payment.memberId)!.ledger.balance)}.`);
            return r;
          }}
        />
      ) : null}
      {checkInFor ? (
        <CheckInDialog
          key={`c${session}`}
          name={nameOf(checkInFor)}
          open
          onClose={() => setCheckInFor(null)}
          onSave={(time) => {
            const r = actions.checkIn(checkInFor, time);
            if (r.ok) notify(`${nameOf(checkInFor)} checked in at ${time}.`);
            return r;
          }}
        />
      ) : null}
      {resetDialog}
      <ToastRegion toast={toast} />
    </div>
  );
}

function PageHeading({ title, book, onReset, action }: { title: string; book: GymBook; onReset: () => void; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-fg sm:text-[1.75rem]">{title}</h1>
        <p className="mt-1 text-sm text-fg-muted">{formatLongDay(book.today)} · sample day</p>
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

/** "1 Sept – 30 Nov 2026", or "1 Nov 2025 – 31 Oct 2026" across years. */
function periodText(start: string, end: string): string {
  const s = longDate(start);
  return `${start.slice(0, 4) === end.slice(0, 4) ? s.replace(/ \d{4}$/, '') : s} – ${longDate(end)}`;
}

function RegisterButton({ onClick }: { onClick: () => void }) {
  return (
    <Button onClick={onClick}>
      <UserPlus size={17} aria-hidden="true" /> Register member
    </Button>
  );
}

function SearchBox({ id, label, placeholder, value, onChange, className }: { id: string; label: string; placeholder: string; value: string; onChange: (v: string) => void; className?: string }) {
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

function MemberButton({ name, sub, onOpen, muted }: { name: string; sub: ReactNode; onOpen: () => void; muted?: boolean }) {
  return (
    <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-label={`Open ${name}`}>
      <Initials name={name} size="sm" muted={!!muted} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-fg hover:underline">{name}</span>
        <span className="tabular block truncate text-xs text-fg-muted">{sub}</span>
      </span>
    </button>
  );
}

// ---------- Dashboard ----------

interface DashboardProps {
  book: GymBook;
  onOpen: (id: string) => void;
  onRegister: () => void;
  onRenew: (id: string) => void;
  onPay: () => void;
  onAttendance: () => void;
  onReset: () => void;
}

function activityText(book: GymBook, a: Activity): { title: string; detail: string; icon: LucideIcon } {
  if (a.kind === 'checkin') return { title: 'Checked in', detail: a.time, icon: LogIn };
  if (a.kind === 'payment') return { title: `Paid ${money(a.payment.amountPaise)}`, detail: labelOf(paymentMethods, a.payment.method), icon: IndianRupee };
  const plan = planOf(book, a.membership.planId)?.name ?? '';
  return a.kind === 'joined'
    ? { title: `Joined · ${plan}`, detail: `from ${shortDay(a.membership.start)}`, icon: UserPlus }
    : { title: `Renewed · ${plan}`, detail: `${shortDay(a.membership.start)} – ${shortDay(a.membership.end)}`, icon: RefreshCw };
}

function DashboardView({ book, onOpen, onRegister, onRenew, onPay, onAttendance, onReset }: DashboardProps) {
  const s = useMemo(() => summarize(book), [book]);
  const due = useMemo(() => renewalsDue(book), [book]);
  const activity = useMemo(() => recentActivity(book, 10), [book]);
  const nameOf = (id: string) => book.members.find((m) => m.id === id)?.name ?? 'Unknown';

  return (
    <div className="space-y-5">
      <PageHeading title="Dashboard" book={book} onReset={onReset} action={<RegisterButton onClick={onRegister} />} />
      <Figures
        label="Gym at a glance"
        className="md:grid-cols-3 xl:grid-cols-6"
        figures={[
          { label: 'Total members', value: s.members, note: s.upcoming ? `${s.upcoming} starting later` : 'All members on record' },
          { label: 'Active memberships', value: s.active, note: 'Valid today, incl. expiring', tone: 'text-success-strong' },
          { label: 'Expiring soon', value: s.expiring, note: 'Within 7 days', ...(s.expiring ? { tone: 'text-warning-strong' } : {}) },
          { label: 'Expired', value: s.expired, note: 'Need renewing', ...(s.expired ? { tone: 'text-danger-strong' } : {}) },
          { label: 'Today’s check-ins', value: s.checkInsToday, note: 'So far today' },
          { label: 'Outstanding', value: money(s.outstanding).replace('.00', ''), note: `${pluralize(s.owing, 'member')} owing`, ...(s.outstanding ? { tone: 'text-danger-strong' } : {}) },
        ]}
      />
      <div className="flex flex-wrap gap-2" role="group" aria-label="Quick actions">
        <Button variant="secondary" onClick={onAttendance}>
          <LogIn size={16} aria-hidden="true" /> Check in a member
        </Button>
        <Button variant="secondary" onClick={onPay} disabled={s.owing === 0}>
          <IndianRupee size={16} aria-hidden="true" /> Record payment
        </Button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Panel title="Renewals due" description="Expiring within 7 days, then expired." aside={<span className="tabular text-xs text-fg-muted">{pluralize(due.length, 'member')}</span>}>
          {due.length === 0 ? (
            <Empty icon={ListChecks} title="Nothing to renew" text="No membership is expiring this week or has expired." />
          ) : (
            <ul className="divide-y divide-line">
              {due.map((r) => (
                <li key={r.member.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 sm:px-5">
                  <MemberButton
                    name={r.member.name}
                    sub={r.info.status === 'expiring' ? `${r.plan?.name} · ${r.info.daysLeft === 0 ? 'last day today' : `ends ${shortDay(r.info.validUntil!)}`}` : `${r.plan?.name} · ended ${shortDay(r.info.latest!.end)}`}
                    onOpen={() => onOpen(r.member.id)}
                    muted={r.info.status === 'expired'}
                  />
                  <StatusBadge status={r.info.status} />
                  <Button variant="secondary" size="sm" onClick={() => onRenew(r.member.id)} ariaLabel={`Renew ${r.member.name}`}>
                    Renew
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Recent activity" description="Joins, renewals, check-ins and payments.">
          <ol className="divide-y divide-line">
            {activity.map((a, i) => {
              const t = activityText(book, a);
              return (
                <li key={`${a.kind}${i}`} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-subtle text-fg-muted">
                    <t.icon size={15} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <button type="button" onClick={() => onOpen(a.memberId)} className="block truncate text-left text-sm font-medium text-fg hover:underline">
                      {nameOf(a.memberId)}
                    </button>
                    <span className="block truncate text-xs text-fg-muted">
                      {t.title} · {t.detail}
                    </span>
                  </span>
                  <span className="tabular shrink-0 text-xs text-fg-muted">{a.date === book.today ? 'Today' : shortDay(a.date)}</span>
                </li>
              );
            })}
          </ol>
        </Panel>
      </div>
    </div>
  );
}

// ---------- Members ----------

function MembersView({ book, onOpen, onRegister, onReset }: { book: GymBook; onOpen: (id: string) => void; onRegister: () => void; onReset: () => void }) {
  const id = useId();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<MemberFilter>('all');
  const rows = useMemo(() => memberRows(book), [book]);
  const visible = filterMembers(rows, filter, query);
  const filtered = query.trim() !== '' || filter !== 'all';

  return (
    <div className="space-y-5">
      <PageHeading title="Members" book={book} onReset={onReset} action={<RegisterButton onClick={onRegister} />} />
      <section aria-label="Member directory" className="rounded-[var(--radius-panel)] border border-line bg-surface shadow-[var(--shadow-panel)]">
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:px-5 md:flex-row md:items-end">
          <SearchBox id={`${id}-q`} label="Search members by name, email or phone" placeholder="Search name, email or phone" value={query} onChange={setQuery} className="md:w-72" />
          <div>
            <label htmlFor={`${id}-status`} className="block text-xs font-medium text-fg-muted">
              Show
            </label>
            <select id={`${id}-status`} value={filter} onChange={(e: { target: { value: string } }) => setFilter(e.target.value as MemberFilter)} className={controlClass(false, 'mt-1 min-h-9 py-1.5 text-sm md:w-48')}>
              {memberFilters.map((f) => (
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
          Showing {visible.length} of {rows.length} members
        </p>
        {visible.length === 0 ? (
          <Empty icon={SearchX} title="No members match" text="Try another name, email, phone number or filter." />
        ) : (
          <div className="@container">
            <table className="hidden w-full table-fixed text-left text-sm @3xl:table">
              <caption className="sr-only">Members</caption>
              <colgroup>
                <col />
                <col className="w-28" />
                <col className="w-60" />
                <col className="w-36" />
                <col className="w-40" />
              </colgroup>
              <thead className="border-b border-line bg-subtle/60 text-xs text-fg-muted">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-medium sm:px-5">Member</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Plan</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Membership</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Status</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visible.map((r) => (
                  <tr key={r.member.id} className="align-middle transition-colors hover:bg-subtle/40">
                    <td className="px-4 py-2.5 sm:px-5">
                      <MemberButton name={r.member.name} sub={`${r.member.phone} · joined ${longDate(r.member.joinedOn)}`} onOpen={() => onOpen(r.member.id)} muted={r.info.status === 'expired'} />
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-fg">{r.plan?.name ?? '—'}</td>
                    <td className="tabular px-3 py-2.5 text-fg">{r.shown ? periodText(r.shown.start, r.info.validUntil ?? r.shown.end) : '—'}</td>
                    <td className="px-3 py-2.5">
                      <StatusBadge status={r.info.status} />
                    </td>
                    <td className="px-3 py-2.5">
                      <PayBadge balance={r.ledger.balance} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ul className="divide-y divide-line @3xl:hidden" aria-label="Members">
              {visible.map((r) => (
                <li key={r.member.id} className="px-4 py-3">
                  <MemberButton name={r.member.name} sub={`${r.member.phone} · joined ${longDate(r.member.joinedOn)}`} onOpen={() => onOpen(r.member.id)} muted={r.info.status === 'expired'} />
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 pl-11">
                    <StatusBadge status={r.info.status} />
                    <PayBadge balance={r.ledger.balance} />
                    <span className="tabular text-xs text-fg-muted">
                      {r.plan?.name}
                      {r.shown ? ` · until ${longDate(r.info.validUntil ?? r.shown.end)}` : ''}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}

// ---------- Attendance ----------

function AttendanceView({ book, onOpen, onCheckIn, onRegister, onReset }: { book: GymBook; onOpen: (id: string) => void; onCheckIn: (id: string) => void; onRegister: () => void; onReset: () => void }) {
  const id = useId();
  const [date, setDate] = useState(book.today);
  const [query, setQuery] = useState('');
  const min = attendanceStart(book);
  const isToday = date === book.today;
  const list = useMemo(() => checkInsOn(book, date), [book, date]);
  const rows = useMemo(() => memberRows(book), [book]);
  const matches = query.trim() ? filterMembers(rows, 'all', query).slice(0, 8) : [];

  return (
    <div className="space-y-5">
      <PageHeading title="Attendance" book={book} onReset={onReset} action={<RegisterButton onClick={onRegister} />} />

      <div className="flex flex-col gap-3 rounded-[var(--radius-panel)] border border-line bg-surface p-3 shadow-[var(--shadow-panel)] sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <div className="flex items-center gap-2">
          <Button variant="subtle" size="sm" onClick={() => setDate(addDays(date, -1))} disabled={date <= min} ariaLabel="Previous day">
            <ChevronLeft size={18} aria-hidden="true" />
          </Button>
          <div className="min-w-0 text-center sm:text-left">
            <h2 className="text-base font-semibold text-fg" aria-live="polite">
              {formatLongDay(date)}
            </h2>
            <p className="text-xs text-fg-muted">{isToday ? 'Today in the demo · check-ins open' : 'History · read only'}</p>
          </div>
          <Button variant="subtle" size="sm" onClick={() => setDate(addDays(date, 1))} disabled={isToday} ariaLabel="Next day">
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
              max={book.today}
              onChange={(e: { target: { value: string } }) => {
                const v = e.target.value;
                if (isIsoDay(v) && v >= min && v <= book.today) setDate(v);
              }}
              className={controlClass(false, 'mt-1 min-h-9 py-1.5 text-sm')}
            />
          </div>
          <Button variant="secondary" size="sm" onClick={() => setDate(book.today)} disabled={isToday}>
            Today
          </Button>
        </div>
      </div>

      <div className={cn('grid gap-5', isToday && 'xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]')}>
        {isToday ? (
          <Panel title="Check in a member" description="Only members with a membership valid today can check in, once a day.">
            <div className="p-4 sm:px-5">
              <SearchBox id={`${id}-find`} label="Find a member to check in" placeholder="Search name, email or phone" value={query} onChange={setQuery} />
            </div>
            {query.trim() === '' ? (
              <p className="border-t border-line px-4 py-4 text-sm text-fg-muted sm:px-5">Search for a member to check them in.</p>
            ) : matches.length === 0 ? (
              <Empty icon={SearchX} title="No members match" text="Try another name, or register them as a new member." />
            ) : (
              <ul className="divide-y divide-line border-t border-line" aria-label="Matching members">
                {matches.map((r) => {
                  const block = checkInBlock(book, r.member.id);
                  const done = book.checkIns.find((c) => c.memberId === r.member.id && c.date === book.today);
                  return (
                    <li key={r.member.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 sm:px-5">
                      <MemberButton name={r.member.name} sub={r.plan?.name ?? ''} onOpen={() => onOpen(r.member.id)} muted={!!block && !done} />
                      <StatusBadge status={r.info.status} />
                      {done ? (
                        <span className="tabular text-xs font-medium text-success-strong">Checked in {done.time}</span>
                      ) : block ? (
                        <span className="w-full pl-11 text-xs text-danger-strong sm:w-auto sm:pl-0">{block}</span>
                      ) : (
                        <Button variant="secondary" size="sm" onClick={() => onCheckIn(r.member.id)} ariaLabel={`Check in ${r.member.name}`}>
                          <LogIn size={15} aria-hidden="true" /> Check in
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        ) : null}
        <Panel title={isToday ? 'Today’s check-ins' : `Check-ins on ${shortDay(date)}`} aside={<span className="tabular text-xs text-fg-muted">{pluralize(list.length, 'check-in')}</span>}>
          {list.length === 0 ? (
            <Empty icon={CalendarCheck} title="No check-ins" text={isToday ? 'Check-ins recorded today appear here.' : 'No one checked in on this day.'} />
          ) : (
            <ol className="divide-y divide-line" aria-label={`Check-ins on ${longDate(date)}`}>
              {list.map(({ checkIn, member }) => (
                <li key={checkIn.id} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
                  <span className="tabular w-12 shrink-0 text-sm font-semibold text-fg">{checkIn.time}</span>
                  <MemberButton name={member.name} sub={rowOf(book, member.id)?.plan?.name ?? ''} onOpen={() => onOpen(member.id)} />
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>
      <p className="flex items-start gap-2 text-xs text-fg-muted">
        <Info size={14} className="mt-px shrink-0" aria-hidden="true" />
        History covers the last 14 days, from {longDate(min)}. Expired members can’t check in until they renew; check-in never renews a membership.
      </p>
    </div>
  );
}

// ---------- Payments ----------

const RECENT = 12;

function PaymentsView({ book, onOpen, onPay, onReset }: { book: GymBook; onOpen: (id: string) => void; onPay: (memberId?: string) => void; onReset: () => void }) {
  const [showAll, setShowAll] = useState(false);
  const s = useMemo(() => summarize(book), [book]);
  const owing = useMemo(() => memberRows(book).filter((r) => r.ledger.balance > 0).sort((a, b) => b.ledger.balance - a.ledger.balance || a.member.name.localeCompare(b.member.name)), [book]);
  const log = useMemo(() => paymentLog(book), [book]);
  const todays = log.filter((p) => p.date === book.today);
  const shown = showAll ? log : log.slice(0, RECENT);
  const nameOf = (id: string) => book.members.find((m) => m.id === id)?.name ?? 'Unknown';

  return (
    <div className="space-y-5">
      <PageHeading
        title="Payments"
        book={book}
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
          { label: 'Outstanding', value: money(s.outstanding), note: `${pluralize(s.owing, 'member')} owing`, ...(s.outstanding ? { tone: 'text-danger-strong' } : {}) },
          { label: 'Collected today', value: money(todays.reduce((a, p) => a + p.amountPaise, 0)), note: pluralize(todays.length, 'payment') + ' today' },
          { label: 'Payments recorded', value: log.length, note: 'Membership payments only' },
        ]}
      />
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Outstanding balances" description="Each membership is charged once at its plan price." aside={<span className="tabular text-xs text-fg-muted">{money(s.outstanding)}</span>}>
          {owing.length === 0 ? (
            <Empty icon={ListChecks} title="Nothing outstanding" text="Every member is paid up." />
          ) : (
            <ul className="divide-y divide-line">
              {owing.map((r) => (
                <li key={r.member.id} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
                  <MemberButton name={r.member.name} sub={r.plan?.name ?? ''} onOpen={() => onOpen(r.member.id)} />
                  <span className="tabular text-sm font-semibold text-danger-strong">{money(r.ledger.balance)}</span>
                  <Button variant="secondary" size="sm" onClick={() => onPay(r.member.id)} ariaLabel={`Record payment from ${r.member.name}`}>
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
                  <button type="button" onClick={() => onOpen(p.memberId)} className="block truncate text-left text-sm font-medium text-fg hover:underline">
                    {nameOf(p.memberId)}
                  </button>
                  <span className="tabular block text-xs text-fg-muted">
                    {p.date === book.today ? 'Today' : shortDay(p.date)} · {labelOf(paymentMethods, p.method)}
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
