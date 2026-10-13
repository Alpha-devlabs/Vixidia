import { useEffect, useId, useMemo, useState } from 'react';
import { CalendarCheck, CalendarDays, CalendarPlus, ChevronLeft, ChevronRight, ClipboardList, Hourglass, Info, RotateCcw, Search, SearchX, Users, type LucideIcon } from 'lucide-react';
import type { LeaveBook, LeaveStatus } from '../../types/leave';
import { leaveBusiness } from '../../data/leaveSample';
import {
  LATE_AFTER,
  WORK_START,
  dayFilters,
  dayRows,
  daySummary,
  departments,
  filterDayRows,
  formatClock,
  historyStart,
  isIsoDay,
  isWorkingDay,
  labelOf,
  leaveDays,
  leaveTypes,
  nextWorkingDay,
  previousWorkingDay,
  range,
  sortLeave,
  type DayFilter,
  type LeaveInput,
} from './leaveLogic';
import { useLeaveDemo } from './useLeaveDemo';
import { AttendanceList } from './AttendanceList';
import { TimeDialog } from './TimeDialog';
import { LeaveRequestDrawer } from './LeaveRequestDrawer';
import { EmployeeDrawer } from './EmployeeDrawer';
import { EmployeeAvatar, LeaveStatusBadge } from './LeaveBits';
import { Button } from '../../components/Button';
import { Panel } from '../../components/Panel';
import { controlClass } from '../../components/forms';
import { ToastRegion, useToast } from '../../components/Toast';
import { formatDate, formatLongDay, pluralize } from '../../utils/format';
import { cn } from '../../utils/cn';

type Section = 'attendance' | 'leave';
const nav: { name: Section; label: string; icon: LucideIcon }[] = [
  { name: 'attendance', label: 'Attendance', icon: ClipboardList },
  { name: 'leave', label: 'Leave requests', icon: CalendarDays },
];

/**
 * Leave & Attendance demo with fictional staff. Every view reads the same
 * in-memory book (useLeaveDemo), so a check-in or an approval updates the day's
 * counts, the list and employee profiles together.
 */
export function LeaveApp() {
  const { book, actions } = useLeaveDemo();
  const [section, setSection] = useState<Section>('attendance');
  const [date, setDate] = useState(book.today);
  const [profileFor, setProfileFor] = useState<string | null>(null);
  const [timeFor, setTimeFor] = useState<{ id: string; mode: 'in' | 'out' } | null>(null);
  const [requestFor, setRequestFor] = useState<{ employeeId: string } | null>(null);
  const [session, setSession] = useState(0);
  const { toast, notify } = useToast(4500);
  const pending = book.leave.filter((l) => l.status === 'pending').length;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [section]);

  const nameOf = (id: string) => book.employees.find((e) => e.id === id)?.name ?? 'Unknown';
  const openRequest = (employeeId = '') => {
    setProfileFor(null);
    setRequestFor({ employeeId });
    setSession((n) => n + 1);
  };
  const reset = () => {
    actions.reset();
    setDate(book.today);
    setProfileFor(null);
    notify('Sample data restored.');
  };
  const decide = (id: string, decision: 'approved' | 'rejected') => {
    const r = actions.decideLeave(id, decision);
    notify(r.ok ? `${decision === 'approved' ? 'Approved' : 'Rejected'}: ${nameOf(r.request.employeeId)}, ${range(r.request)}` : (Object.values(r.errors)[0] ?? 'Couldn’t update this request.'), r.ok ? 'success' : 'info');
  };
  const timeRow = timeFor ? dayRows(book, book.today).find((r) => r.employee.id === timeFor.id) : undefined;
  const requestInitial: LeaveInput = { employeeId: requestFor?.employeeId ?? '', type: 'annual', start: nextWorkingDay(book.today), end: nextWorkingDay(book.today), reason: '' };

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col lg:flex-row">
      <aside className="on-inverse border-b border-inverse-line bg-inverse text-on-inverse lg:w-60 lg:shrink-0 lg:border-r lg:border-b-0">
        <div className="flex flex-col gap-4 px-4 py-4 lg:sticky lg:top-14 lg:px-4 lg:py-6">
          <div className="flex items-center justify-between gap-3 lg:block lg:px-1">
            <p className="flex items-center gap-2.5 text-[0.95rem] font-semibold">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-accent text-on-accent">
                <CalendarCheck size={17} aria-hidden="true" />
              </span>
              <span className="leading-tight">
                Leave & Attendance
                <span className="block text-xs font-normal text-on-inverse-muted">HR & Workforce</span>
              </span>
            </p>
            <p className="text-right text-xs text-on-inverse-muted lg:mt-4 lg:text-left">{leaveBusiness.name}</p>
          </div>
          <nav aria-label="Leave & Attendance" className="relative -mx-1 flex gap-1 overflow-x-auto px-1 lg:mt-2 lg:flex-col">
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
                  {n.name === 'leave' && pending ? (
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
          {section === 'attendance' ? (
            <AttendanceView
              book={book}
              date={date}
              onDate={setDate}
              onOpen={setProfileFor}
              onCheckIn={(id) => {
                setTimeFor({ id, mode: 'in' });
                setSession((n) => n + 1);
              }}
              onCheckOut={(id) => {
                setTimeFor({ id, mode: 'out' });
                setSession((n) => n + 1);
              }}
              onRequest={() => openRequest()}
              onReset={reset}
            />
          ) : (
            <LeaveView book={book} onDecide={decide} onOpen={setProfileFor} onRequest={() => openRequest()} onReset={reset} />
          )}
        </div>
      </div>

      {timeFor && timeRow ? (
        <TimeDialog
          key={`t${session}`}
          mode={timeFor.mode}
          name={timeRow.employee.name}
          checkedInAt={timeRow.record?.checkIn}
          open
          onClose={() => setTimeFor(null)}
          onSave={(time) => {
            const r = timeFor.mode === 'in' ? actions.checkIn(timeFor.id, time) : actions.checkOut(timeFor.id, time);
            if (r.ok) notify(`${timeRow.employee.name} checked ${timeFor.mode} at ${formatClock(time)}.`);
            return r;
          }}
        />
      ) : null}
      <LeaveRequestDrawer
        key={`r${session}`}
        employees={book.employees}
        initial={requestInitial}
        open={requestFor !== null}
        onClose={() => setRequestFor(null)}
        onSave={(input) => {
          const r = actions.submitLeave(input);
          if (r.ok) notify(`Leave requested for ${nameOf(r.request.employeeId)} (pending approval).`);
          return r;
        }}
      />
      <EmployeeDrawer
        book={book}
        employee={book.employees.find((e) => e.id === profileFor)}
        open={profileFor !== null}
        onClose={() => setProfileFor(null)}
        onRequestLeave={openRequest}
      />
      <ToastRegion toast={toast} />
    </div>
  );
}

function PageHeading({ title, description, onRequest, onReset }: { title: string; description: string; onRequest: () => void; onReset: () => void }) {
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
        <Button onClick={onRequest}>
          <CalendarPlus size={17} aria-hidden="true" /> Request leave
        </Button>
      </div>
    </div>
  );
}

// ---------- Attendance ----------

interface AttendanceProps {
  book: LeaveBook;
  date: string;
  onDate: (d: string) => void;
  onOpen: (id: string) => void;
  onCheckIn: (id: string) => void;
  onCheckOut: (id: string) => void;
  onRequest: () => void;
  onReset: () => void;
}

function AttendanceView({ book, date, onDate, onOpen, onCheckIn, onCheckOut, onRequest, onReset }: AttendanceProps) {
  const id = useId();
  const [query, setQuery] = useState('');
  const [department, setDepartment] = useState('all');
  const [status, setStatus] = useState<DayFilter>('all');
  const min = historyStart(book);
  const isToday = date === book.today;
  const working = isWorkingDay(date);
  const rows = useMemo(() => dayRows(book, date), [book, date]);
  const sum = daySummary(rows);
  const visible = filterDayRows(rows, query, department, status);
  const filtered = query.trim() !== '' || department !== 'all' || status !== 'all';
  const prev = previousWorkingDay(date);
  const next = nextWorkingDay(date);

  const figures: { label: string; value: number; note: string; tone?: string }[] = [
    { label: 'Present', value: sum.present, note: sum.late || sum.incomplete ? [sum.late ? `${sum.late} late` : '', sum.incomplete ? `${sum.incomplete} without check-out` : ''].filter(Boolean).join(' · ') : 'Checked in', tone: 'text-success-strong' },
    { label: 'Absent', value: sum.absent, note: isToday ? 'Counted once the day is over' : 'No check-in, no approved leave', tone: sum.absent ? 'text-danger-strong' : undefined },
    { label: 'On leave', value: sum.onLeave, note: 'Approved leave only' },
    { label: 'Not checked in', value: sum.notCheckedIn, note: isToday ? 'Yet to arrive' : 'Applies to today only' },
  ];

  return (
    <div className="space-y-5">
      <PageHeading title="Attendance" description="Who is in, who is on leave, and who hasn’t arrived — for any working day." onRequest={onRequest} onReset={onReset} />

      {/* Date navigation: one control above everything it scopes. */}
      <div className="flex flex-col gap-3 rounded-[var(--radius-panel)] border border-line bg-surface p-3 shadow-[var(--shadow-panel)] sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <div className="flex items-center gap-2">
          <Button variant="subtle" size="sm" onClick={() => onDate(prev)} disabled={prev < min} ariaLabel="Previous working day">
            <ChevronLeft size={18} aria-hidden="true" />
          </Button>
          <div className="min-w-0 text-center sm:text-left">
            <h2 className="text-base font-semibold text-fg" aria-live="polite">
              {formatLongDay(date)}
              <span className="sr-only">, {date.slice(0, 4)}</span>
            </h2>
            <p className="text-xs text-fg-muted">{isToday ? 'Today in the demo · check-ins open' : working ? 'History · read only' : 'Not a working day'}</p>
          </div>
          <Button variant="subtle" size="sm" onClick={() => onDate(next)} disabled={next > book.today} ariaLabel="Next working day">
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
                if (isIsoDay(v) && v >= min && v <= book.today) onDate(v);
              }}
              className={controlClass(false, 'mt-1 min-h-9 py-1.5 text-sm')}
            />
          </div>
          <Button variant="secondary" size="sm" onClick={() => onDate(book.today)} disabled={isToday}>
            Today
          </Button>
        </div>
      </div>

      <p className="flex items-start gap-2 text-xs text-fg-muted">
        <Info size={14} className="mt-px shrink-0" aria-hidden="true" />
        Working days are Monday to Friday (holidays aren’t modelled). The day starts at {formatClock(WORK_START)}; arriving after {formatClock(LATE_AFTER)} counts as late. History covers {formatDate(min)} onwards.
      </p>

      {working ? (
        <>
          <dl className="grid grid-cols-2 overflow-hidden rounded-[var(--radius-panel)] border border-line bg-line shadow-[var(--shadow-panel)] [gap:1px] md:grid-cols-4" aria-label={`Summary for ${formatLongDay(date)}`}>
            {figures.map((f) => (
              <div key={f.label} className="bg-surface px-4 py-3.5 sm:px-5">
                <dt className="text-sm font-medium text-fg-muted">{f.label}</dt>
                <dd className={cn('tabular mt-1 text-2xl leading-tight font-semibold tracking-[-0.02em]', f.value ? (f.tone ?? 'text-fg') : 'text-fg')}>{f.value}</dd>
                <dd className="text-xs text-fg-subtle">{f.note}</dd>
              </div>
            ))}
          </dl>

          <section aria-label="Daily attendance" className="rounded-[var(--radius-panel)] border border-line bg-surface shadow-[var(--shadow-panel)]">
            <div className="flex flex-col gap-3 border-b border-line p-4 sm:px-5 md:flex-row md:items-end">
              <div className="relative md:w-72">
                <label htmlFor={`${id}-q`} className="sr-only">
                  Search employees by name or role
                </label>
                <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
                <input id={`${id}-q`} type="search" value={query} onChange={(e: { target: { value: string } }) => setQuery(e.target.value)} placeholder="Search employees" className={controlClass(false, 'pl-9')} />
              </div>
              <div className="grid grid-cols-2 gap-3 md:flex">
                <div>
                  <label htmlFor={`${id}-dept`} className="block text-xs font-medium text-fg-muted">
                    Department
                  </label>
                  <select id={`${id}-dept`} value={department} onChange={(e: { target: { value: string } }) => setDepartment(e.target.value)} className={controlClass(false, 'mt-1 min-h-9 py-1.5 text-sm md:w-40')}>
                    <option value="all">All departments</option>
                    {departments(book).map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor={`${id}-status`} className="block text-xs font-medium text-fg-muted">
                    Status
                  </label>
                  <select id={`${id}-status`} value={status} onChange={(e: { target: { value: string } }) => setStatus(e.target.value as DayFilter)} className={controlClass(false, 'mt-1 min-h-9 py-1.5 text-sm md:w-48')}>
                    {dayFilters.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {filtered ? (
                <Button
                  variant="subtle"
                  size="sm"
                  className="self-start md:ml-auto md:self-end"
                  onClick={() => {
                    setQuery('');
                    setDepartment('all');
                    setStatus('all');
                  }}
                >
                  Clear filters
                </Button>
              ) : null}
            </div>
            <p className="sr-only" aria-live="polite">
              Showing {visible.length} of {rows.length} employees
            </p>
            {visible.length === 0 ? (
              <Empty icon={SearchX} title="No one matches these filters" text="Try another name, department or status." />
            ) : (
              <AttendanceList rows={visible} isToday={isToday} onOpen={onOpen} onCheckIn={onCheckIn} onCheckOut={onCheckOut} />
            )}
          </section>
        </>
      ) : (
        <div className="rounded-[var(--radius-panel)] border border-line bg-surface shadow-[var(--shadow-panel)]">
          <Empty icon={CalendarDays} title="Not a working day" text="Weekends aren’t working days, so no attendance is expected and no one is marked absent." />
        </div>
      )}
    </div>
  );
}

function Empty({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
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

// ---------- Leave requests ----------

interface LeaveViewProps {
  book: LeaveBook;
  onDecide: (id: string, d: 'approved' | 'rejected') => void;
  onOpen: (employeeId: string) => void;
  onRequest: () => void;
  onReset: () => void;
}

function LeaveView({ book, onDecide, onOpen, onRequest, onReset }: LeaveViewProps) {
  const [filter, setFilter] = useState<'all' | LeaveStatus>('all');
  const all = sortLeave(book.leave);
  const pending = all.filter((l) => l.status === 'pending');
  const decided = all.filter((l) => l.status !== 'pending' && (filter === 'all' || l.status === filter));
  const emp = (id: string) => book.employees.find((e) => e.id === id);

  return (
    <div className="space-y-6">
      <PageHeading title="Leave requests" description="Review pending requests. Only approved leave counts in attendance." onRequest={onRequest} onReset={onReset} />

      <Panel title="Waiting for a decision" aside={<span className="tabular text-xs text-fg-muted">{pluralize(pending.length, 'request')}</span>}>
        {pending.length === 0 ? (
          <Empty icon={Hourglass} title="Nothing to review" text="New requests appear here until they are approved or rejected." />
        ) : (
          <ul className="divide-y divide-line">
            {pending.map((l) => {
              const e = emp(l.employeeId);
              return (
                <li key={l.id} className="flex flex-col gap-3 px-4 py-4 sm:px-5 md:flex-row md:items-center">
                  <button type="button" onClick={() => onOpen(l.employeeId)} className="flex min-w-0 flex-1 items-start gap-3 text-left" aria-label={`Open ${e?.name ?? 'employee'}’s profile`}>
                    <EmployeeAvatar name={e?.name ?? '?'} />
                    <span className="min-w-0">
                      <span className="block font-medium text-fg">{e?.name}</span>
                      <span className="tabular block text-sm text-fg-muted">
                        {labelOf(leaveTypes, l.type)} · {range(l)} · {pluralize(leaveDays(l), 'working day')}
                      </span>
                      {l.reason ? <span className="mt-0.5 block text-sm text-fg-subtle">“{l.reason}”</span> : null}
                      <span className="mt-0.5 block text-xs text-fg-subtle">Requested {formatDate(l.requestedOn)}</span>
                    </span>
                  </button>
                  <div className="flex gap-2 pl-12 md:pl-0">
                    <Button variant="secondary" size="sm" onClick={() => onDecide(l.id, 'rejected')} ariaLabel={`Reject ${e?.name}’s request for ${range(l)}`}>
                      Reject
                    </Button>
                    <Button size="sm" onClick={() => onDecide(l.id, 'approved')} ariaLabel={`Approve ${e?.name}’s request for ${range(l)}`}>
                      Approve
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <p className="border-t border-line px-4 py-2.5 text-xs text-fg-muted sm:px-5">Approving here is a demonstration, not real HR authorisation. No one is notified.</p>
      </Panel>

      <Panel
        title="Decided requests"
        aside={
          <div role="group" aria-label="Filter decided requests" className="flex gap-1">
            {(['all', 'approved', 'rejected'] as const).map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
                className={cn(
                  'inline-flex min-h-8 items-center rounded-full border px-2.5 text-xs font-medium transition-colors',
                  filter === f ? 'border-accent bg-accent-soft text-accent-strong' : 'border-line text-fg-muted hover:border-line-strong hover:text-fg',
                )}
              >
                {f === 'all' ? 'All' : f === 'approved' ? 'Approved' : 'Rejected'}
              </button>
            ))}
          </div>
        }
      >
        {decided.length === 0 ? (
          <Empty icon={Users} title="No requests here" text="Try another filter." />
        ) : (
          <ul className="divide-y divide-line">
            {decided.map((l) => {
              const e = emp(l.employeeId);
              return (
                <li key={l.id}>
                  <button type="button" onClick={() => onOpen(l.employeeId)} className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-subtle/50 sm:px-5" aria-label={`Open ${e?.name ?? 'employee'}’s profile`}>
                    <EmployeeAvatar name={e?.name ?? '?'} size="sm" muted={l.status === 'rejected'} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-fg">{e?.name}</span>
                      <span className="tabular block text-xs text-fg-muted">
                        {labelOf(leaveTypes, l.type)} · {range(l)} · {pluralize(leaveDays(l), 'working day')}
                      </span>
                    </span>
                    <LeaveStatusBadge status={l.status} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
