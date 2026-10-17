import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import {
  BookOpen,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FilePlus2,
  GraduationCap,
  IndianRupee,
  Info,
  LayoutDashboard,
  ListChecks,
  Plus,
  RotateCcw,
  Search,
  SearchX,
  UserPlus,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import type { Period, TuitionBook } from '../../types/tuition';
import { centre } from '../../data/tuitionSample';
import {
  GRADES,
  SESSIONS_FROM,
  batchOf,
  batchSessions,
  batchToInput,
  collectedIn,
  currentRoster,
  emptyBatch,
  emptyStudent,
  endTime,
  feeRows,
  feeTotals,
  filterFees,
  filterStudents,
  followUps,
  formatPeriod,
  formatTime,
  gradeText,
  isIsoDay,
  labelOf,
  marks as markOptions,
  marksFor,
  money,
  nextPeriod,
  overview,
  paymentLog,
  paymentMethods,
  percent,
  periodOf,
  periodsInUse,
  rupees,
  scheduleText,
  sessionFor,
  sessionHorizon,
  sessionRoster,
  sessionSummary,
  sessionsOn,
  studentOf,
  studentRows,
  teacherOf,
  type FeeStatus,
  type StudentInput,
} from './tuitionLogic';
import { useTuitionDemo } from './useTuitionDemo';
import { StudentDrawer } from './StudentDrawer';
import { StudentFormDrawer } from './StudentFormDrawer';
import { BatchDrawer } from './BatchDrawer';
import { BatchFormDrawer } from './BatchFormDrawer';
import { EnrolDialog } from './EnrolDialog';
import { PaymentDialog } from './PaymentDialog';
import { ActiveBadge, Choice, Empty, FeeBadge, Figures, Initials, longDate, shortDay } from './TuitionBits';
import { Button } from '../../components/Button';
import { Panel } from '../../components/Panel';
import { controlClass } from '../../components/forms';
import { ToastRegion, useToast } from '../../components/Toast';
import { addDays } from '../../utils/dates';
import { formatLongDay, pluralize } from '../../utils/format';
import { cn } from '../../utils/cn';

type Section = 'dashboard' | 'students' | 'batches' | 'attendance' | 'fees';
const nav: { name: Section; label: string; icon: LucideIcon }[] = [
  { name: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { name: 'students', label: 'Students', icon: Users },
  { name: 'batches', label: 'Batches', icon: BookOpen },
  { name: 'attendance', label: 'Attendance', icon: ClipboardCheck },
  { name: 'fees', label: 'Fees', icon: Wallet },
];

/**
 * Tuition Centre Management demo with a fictional centre. Every view reads the
 * same in-memory book (useTuitionDemo), so attendance, enrolments, fees and
 * payments update the dashboard, profiles and lists together.
 */
export function TuitionApp() {
  const { book, actions } = useTuitionDemo();
  const [section, setSection] = useState<Section>('dashboard');
  const [attendanceFor, setAttendanceFor] = useState<{ batchId: string; date: string }>({ batchId: 'b1', date: book.today });
  const [studentFor, setStudentFor] = useState<string | null>(null);
  const [batchFor, setBatchFor] = useState<string | null>(null);
  const [studentForm, setStudentForm] = useState<{ mode: 'create' } | { mode: 'edit'; id: string } | null>(null);
  const [batchForm, setBatchForm] = useState<{ mode: 'create' } | { mode: 'edit'; id: string } | null>(null);
  const [enrolFor, setEnrolFor] = useState<{ batchId?: string; studentId?: string } | null>(null);
  const [payFor, setPayFor] = useState<{ feeId?: string } | null>(null);
  const [session, setSession] = useState(0);
  const { toast, notify } = useToast(5000);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [section]);

  const bump = () => setSession((n) => n + 1);
  const closeAll = () => {
    setStudentFor(null);
    setBatchFor(null);
  };
  const open = {
    student: (id: string) => {
      setBatchFor(null);
      setStudentFor(id);
    },
    batch: (id: string) => {
      setStudentFor(null);
      setBatchFor(id);
    },
    studentForm: (f: { mode: 'create' } | { mode: 'edit'; id: string }) => {
      closeAll();
      setStudentForm(f);
      bump();
    },
    batchForm: (f: { mode: 'create' } | { mode: 'edit'; id: string }) => {
      closeAll();
      setBatchForm(f);
      bump();
    },
    enrol: (f: { batchId?: string; studentId?: string }) => {
      closeAll();
      setEnrolFor(f);
      bump();
    },
    pay: (feeId?: string) => {
      closeAll();
      setPayFor(feeId ? { feeId } : {});
      bump();
    },
    attendance: (batchId: string, date = book.today) => {
      closeAll();
      setAttendanceFor({ batchId, date });
      setSection('attendance');
    },
  };
  const reset = () => {
    actions.reset();
    closeAll();
    notify('Sample data restored.');
  };
  const unenrol = (enrolmentId: string) => {
    const e = book.enrolments.find((x) => x.id === enrolmentId);
    const r = actions.unenrol(enrolmentId);
    if (r.ok && e) notify(`${studentOf(book, e.studentId)?.name} removed from ${batchOf(book, e.batchId)?.name}. Past attendance and fees are kept.`, 'info');
  };
  const heading = (title: string, action?: ReactNode) => <PageHeading title={title} book={book} onReset={reset} action={action} />;
  const editingStudent = studentForm?.mode === 'edit' ? studentOf(book, studentForm.id) : undefined;
  const editingBatch = batchForm?.mode === 'edit' ? batchOf(book, batchForm.id) : undefined;
  const addStudent = (
    <Button onClick={() => open.studentForm({ mode: 'create' })}>
      <UserPlus size={17} aria-hidden="true" /> Add student
    </Button>
  );

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col lg:flex-row">
      <aside className="on-inverse border-b border-inverse-line bg-inverse text-on-inverse lg:w-60 lg:shrink-0 lg:border-r lg:border-b-0">
        <div className="flex flex-col gap-4 px-4 py-4 lg:sticky lg:top-14 lg:px-4 lg:py-6">
          <div className="flex items-center justify-between gap-3 lg:block lg:px-1">
            <p className="flex items-center gap-2.5 text-[0.95rem] font-semibold">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-accent text-on-accent">
                <GraduationCap size={17} aria-hidden="true" />
              </span>
              <span className="leading-tight">
                Tuition Centre
                <span className="block text-xs font-normal text-on-inverse-muted">Industry-specific</span>
              </span>
            </p>
            <p className="text-right text-xs text-on-inverse-muted lg:mt-4 lg:text-left">
              {centre.name}
              <span className="block">{centre.city} · sample centre</span>
            </p>
          </div>
          <nav aria-label="Tuition Centre Management" className="relative -mx-1 flex gap-1 overflow-x-auto px-1 lg:mt-2 lg:flex-col">
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
          {section === 'dashboard' ? <DashboardView book={book} heading={heading('Dashboard', addStudent)} onAttendance={open.attendance} onPay={open.pay} onOpenStudent={open.student} onOpenBatch={open.batch} /> : null}
          {section === 'students' ? <StudentsView book={book} heading={heading('Students', addStudent)} onOpen={open.student} /> : null}
          {section === 'batches' ? (
            <BatchesView
              book={book}
              heading={heading(
                'Batches',
                <Button onClick={() => open.batchForm({ mode: 'create' })}>
                  <Plus size={17} aria-hidden="true" /> New batch
                </Button>,
              )}
              onOpen={open.batch}
            />
          ) : null}
          {section === 'attendance' ? (
            <AttendanceView
              key={`${attendanceFor.batchId}|${attendanceFor.date}`}
              book={book}
              heading={heading('Attendance')}
              batchId={attendanceFor.batchId}
              date={attendanceFor.date}
              onChange={(batchId, date) => setAttendanceFor({ batchId, date })}
              onSave={(sessionId, marks) => {
                const r = actions.saveAttendance(sessionId, marks);
                if (r.ok) {
                  const s = book.sessions.find((x) => x.id === sessionId)!;
                  notify(`Attendance saved for ${batchOf(book, s.batchId)?.name}, ${s.date === book.today ? 'today' : shortDay(s.date)}${r.updated ? ` (${pluralize(r.updated, 'change')})` : ''}.`);
                }
                return r;
              }}
            />
          ) : null}
          {section === 'fees' ? (
            <FeesView
              book={book}
              heading={heading(
                'Fees',
                <Button onClick={() => open.pay()}>
                  <IndianRupee size={17} aria-hidden="true" /> Record payment
                </Button>,
              )}
              onPay={open.pay}
              onOpenStudent={open.student}
              onGenerate={(p) => {
                const r = actions.generateFees(p);
                if (r.ok) notify(r.created.length ? `${formatPeriod(p)}: ${pluralize(r.created.length, 'fee')} added${r.skipped ? `, ${r.skipped} already existed` : ''}.` : `${formatPeriod(p)} fees already exist. Nothing was added.`, r.created.length ? 'success' : 'info');
                return r;
              }}
            />
          ) : null}
          <p className="mt-8 flex items-start gap-2 border-t border-line pt-4 text-xs text-fg-muted">
            <Info size={14} className="mt-px shrink-0" aria-hidden="true" />
            Everything here is fictional and kept in memory only, on a fixed sample day. Reloading the page or choosing Reset demo restores the sample data. No messages are sent and no money is collected.
          </p>
        </div>
      </div>

      <StudentDrawer
        book={book}
        studentId={studentFor}
        open={studentFor !== null}
        onClose={() => setStudentFor(null)}
        onEdit={(id) => open.studentForm({ mode: 'edit', id })}
        onEnrol={(id) => open.enrol({ studentId: id })}
        onUnenrol={unenrol}
        onPay={(feeId) => open.pay(feeId)}
        onSetActive={(id, active) => {
          const r = actions.setStudentActive(id, active);
          if (r.ok) notify(active ? `${r.student.name} is active again. Enrol them in batches as needed.` : `${r.student.name} marked as left${r.ended ? ` and removed from ${pluralize(r.ended, 'batch', 'batches')}` : ''}. History is kept.`, 'info');
        }}
      />
      <BatchDrawer
        book={book}
        batchId={batchFor}
        open={batchFor !== null}
        onClose={() => setBatchFor(null)}
        onEdit={(id) => open.batchForm({ mode: 'edit', id })}
        onEnrol={(id) => open.enrol({ batchId: id })}
        onUnenrol={unenrol}
        onOpenStudent={open.student}
        onAttendance={(id) => open.attendance(id)}
      />
      {studentForm ? (
        <StudentFormDrawer
          key={`sf${session}`}
          book={book}
          mode={studentForm.mode}
          initial={
            editingStudent
              ? { name: editingStudent.name, grade: String(editingStudent.grade), school: editingStudent.school, guardianName: editingStudent.guardianName, guardianPhone: editingStudent.guardianPhone, guardianEmail: editingStudent.guardianEmail, batchIds: [] }
              : emptyStudent()
          }
          open
          onClose={() => setStudentForm(null)}
          onSave={(input: StudentInput) => {
            if (studentForm.mode === 'edit') {
              const r = actions.updateStudent(studentForm.id, input);
              if (r.ok) notify(`Saved ${r.student.name}.`);
              return r;
            }
            const r = actions.createStudent(input);
            if (r.ok) notify(`Added ${r.student.name}${r.enrolled ? ` and enrolled in ${pluralize(r.enrolled, 'batch', 'batches')}` : ''}.`);
            return r;
          }}
        />
      ) : null}
      {batchForm ? (
        <BatchFormDrawer
          key={`bf${session}`}
          book={book}
          mode={batchForm.mode}
          initial={editingBatch ? batchToInput(editingBatch) : emptyBatch()}
          open
          onClose={() => setBatchForm(null)}
          onSave={(input) => {
            if (batchForm.mode === 'edit') {
              const r = actions.updateBatch(batchForm.id, input);
              if (r.ok) notify(`Saved ${r.batch.name}.`);
              return r;
            }
            const r = actions.createBatch(input);
            if (r.ok) notify(`Created ${r.batch.name} with ${pluralize(r.sessions, 'class', 'classes')} scheduled.`);
            return r;
          }}
        />
      ) : null}
      {enrolFor ? (
        <EnrolDialog
          key={`en${session}`}
          book={book}
          {...(enrolFor.batchId ? { batchId: enrolFor.batchId } : {})}
          {...(enrolFor.studentId ? { studentId: enrolFor.studentId } : {})}
          open
          onClose={() => setEnrolFor(null)}
          onSave={(input) => {
            const r = actions.enrol(input);
            if (r.ok) notify(`${studentOf(book, input.studentId)?.name} enrolled in ${batchOf(book, input.batchId)?.name}${r.fee ? `; ${formatPeriod(r.fee.period)} fee of ${rupees(r.fee.amountPaise)} added` : ''}.`);
            return r;
          }}
        />
      ) : null}
      {payFor ? (
        <PaymentDialog
          key={`pay${session}`}
          book={book}
          {...(payFor.feeId ? { feeId: payFor.feeId } : {})}
          open
          onClose={() => setPayFor(null)}
          onSave={(input) => {
            const r = actions.pay(input);
            if (r.ok) notify(`${money(r.payment.amountPaise)} received from ${r.row.student.name} by ${labelOf(paymentMethods, r.payment.method)}. ${r.row.balance > 0 ? `${money(r.row.balance)} still due.` : 'Fully paid.'}`);
            return r;
          }}
        />
      ) : null}
      <ToastRegion toast={toast} />
    </div>
  );
}

function PageHeading({ title, book, onReset, action }: { title: string; book: TuitionBook; onReset: () => void; action?: ReactNode }) {
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

function SelectBox({ id, label, value, onChange, children, className }: { id: string; label: string; value: string; onChange: (v: string) => void; children: ReactNode; className?: string }) {
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

// ---------- Dashboard ----------

function DashboardView({ book, heading, onAttendance, onPay, onOpenStudent, onOpenBatch }: { book: TuitionBook; heading: ReactNode; onAttendance: (batchId: string, date?: string) => void; onPay: (feeId?: string) => void; onOpenStudent: (id: string) => void; onOpenBatch: (id: string) => void }) {
  const id = useId();
  const [day, setDay] = useState(book.today);
  const [month, setMonth] = useState<Period>(periodOf(book.today));
  const o = useMemo(() => overview(book, day, month), [book, day, month]);
  const classes = sessionsOn(book, day);
  const upcoming = useMemo(() => {
    const out: { date: string; list: ReturnType<typeof sessionsOn> }[] = [];
    for (let d = addDays(day, 1); out.length < 3 && d <= sessionHorizon(book); d = addDays(d, 1)) {
      const list = sessionsOn(book, d);
      if (list.length) out.push({ date: d, list });
    }
    return out;
  }, [book, day]);
  const follow = followUps(book).slice(0, 8);
  const isToday = day === book.today;
  const months = periodsInUse(book);

  return (
    <div className="space-y-5">
      {heading}
      <div className="flex flex-col gap-3 rounded-[var(--radius-panel)] border border-line bg-surface p-3 shadow-[var(--shadow-panel)] sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <div className="flex items-center gap-2">
          <Button variant="subtle" size="sm" onClick={() => setDay(addDays(day, -1))} disabled={day <= SESSIONS_FROM} ariaLabel="Previous day">
            <ChevronLeft size={18} aria-hidden="true" />
          </Button>
          <div className="min-w-0 text-center sm:text-left">
            <h2 className="text-base font-semibold text-fg" aria-live="polite">
              {formatLongDay(day)}
            </h2>
            <p className="text-xs text-fg-muted">{isToday ? 'Today in the demo' : day < book.today ? 'Earlier day' : 'Coming up'}</p>
          </div>
          <Button variant="subtle" size="sm" onClick={() => setDay(addDays(day, 1))} disabled={day >= sessionHorizon(book)} ariaLabel="Next day">
            <ChevronRight size={18} aria-hidden="true" />
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setDay(book.today)} disabled={isToday}>
            Today
          </Button>
        </div>
        <SelectBox id={`${id}-month`} label="Fees collected in" value={month} onChange={setMonth} className="sm:w-48">
          {months.map((p) => (
            <option key={p} value={p}>
              {formatPeriod(p)}
            </option>
          ))}
        </SelectBox>
      </div>

      <Figures
        label="Centre at a glance"
        className="sm:grid-cols-3 xl:grid-cols-6"
        figures={[
          { label: 'Active students', value: o.activeStudents, note: 'Left students not counted' },
          { label: 'Active batches', value: o.activeBatches, note: 'Running now' },
          { label: isToday ? 'Classes today' : 'Classes that day', value: o.classesToday, note: shortDay(day) },
          {
            label: isToday ? 'Attendance today' : 'Attendance that day',
            value: percent(o.attendance.rate),
            note: o.attendance.taken ? `${o.attendance.attended} of ${o.attendance.eligible} · ${o.attendance.taken} of ${o.attendance.sessions} classes taken` : o.attendance.sessions ? 'Not taken yet' : 'No classes',
          },
          { label: 'Fees collected', value: rupees(o.collected.total), note: `${formatPeriod(month)} · ${pluralize(o.collected.count, 'payment')}`, tone: 'text-success-strong' },
          { label: 'Fees outstanding', value: rupees(o.outstanding), note: o.overdue ? `${rupees(o.overdue)} overdue · ${pluralize(o.owing, 'student')}` : `${pluralize(o.owing, 'student')} · none overdue`, ...(o.overdue ? { tone: 'text-danger-strong' } : {}) },
        ]}
      />

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title={isToday ? 'Today’s classes' : `Classes on ${shortDay(day)}`} aside={<span className="tabular text-xs text-fg-muted">{pluralize(classes.length, 'class', 'classes')}</span>}>
          {classes.length === 0 ? (
            <Empty icon={CalendarCheck} title="No classes" text="No batch meets on this day." />
          ) : (
            <ul className="divide-y divide-line">
              {classes.map((s) => {
                const b = batchOf(book, s.batchId)!;
                const sum = sessionSummary(book, s);
                return (
                  <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
                    <span className="tabular w-20 shrink-0 text-sm font-semibold text-fg">
                      {formatTime(s.start)}
                      <span className="block text-xs font-normal text-fg-muted">to {formatTime(endTime(s.start, s.durationMin))}</span>
                    </span>
                    <button type="button" onClick={() => onOpenBatch(b.id)} className="min-w-0 flex-1 text-left" aria-label={`Open ${b.name}`}>
                      <span className="block truncate text-sm font-medium text-fg hover:underline">{b.name}</span>
                      <span className="block truncate text-xs text-fg-muted">
                        {teacherOf(book, b.teacherId)?.name} · {b.room} · {pluralize(sum.eligible, 'student')}
                      </span>
                    </button>
                    {sum.taken ? (
                      <span className="tabular text-xs font-medium text-success-strong">
                        {sum.present + sum.late}/{sum.eligible} · {percent(sum.rate)}
                      </span>
                    ) : s.date <= book.today ? (
                      <Button variant="secondary" size="sm" onClick={() => onAttendance(b.id, s.date)} ariaLabel={`Take attendance for ${b.name}`}>
                        <ClipboardCheck size={15} aria-hidden="true" /> Take attendance
                      </Button>
                    ) : (
                      <span className="text-xs text-fg-muted">Scheduled</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {upcoming.length ? (
            <div className="border-t border-line px-4 py-3 sm:px-5">
              <h3 className="text-xs font-semibold tracking-wide text-fg-muted uppercase">Coming up</h3>
              <ul className="mt-2 space-y-1.5">
                {upcoming.map((u) => (
                  <li key={u.date} className="text-sm">
                    <span className="tabular font-medium text-fg">{shortDay(u.date)}:</span>{' '}
                    <span className="text-fg-muted">{u.list.map((s) => `${batchOf(book, s.batchId)?.name} ${formatTime(s.start)}`).join(' · ')}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Panel>

        <Panel title="Fee follow-ups" description="Overdue first, then part paid and due." aside={<span className="tabular text-xs text-fg-muted">{rupees(o.outstanding)} due</span>}>
          {follow.length === 0 ? (
            <Empty icon={ListChecks} title="Nothing to follow up" text="Every fee is paid." />
          ) : (
            <ul className="divide-y divide-line">
              {follow.map((r) => (
                <li key={r.fee.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2.5 sm:px-5">
                  <button type="button" onClick={() => onOpenStudent(r.student.id)} className="min-w-0 flex-1 basis-full text-left sm:basis-0" aria-label={`Open ${r.student.name}`}>
                    <span className="block truncate text-sm font-medium text-fg hover:underline">{r.student.name}</span>
                    <span className="tabular block truncate text-xs text-fg-muted">
                      {r.batch.name} · {formatPeriod(r.fee.period)} · {r.student.guardianPhone}
                    </span>
                  </button>
                  <span className="tabular text-sm font-semibold text-fg max-sm:mr-auto">{money(r.balance)}</span>
                  <FeeBadge status={r.status} />
                  <Button variant="secondary" size="sm" onClick={() => onPay(r.fee.id)} ariaLabel={`Record payment from ${r.student.name} for ${r.batch.name}, ${formatPeriod(r.fee.period)}`}>
                    Pay
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

// ---------- Students ----------

function StudentsView({ book, heading, onOpen }: { book: TuitionBook; heading: ReactNode; onOpen: (id: string) => void }) {
  const id = useId();
  const [query, setQuery] = useState('');
  const [grade, setGrade] = useState('all');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('active');
  const rows = useMemo(() => studentRows(book), [book]);
  const visible = filterStudents(rows, { query, grade, status });
  const filtered = query.trim() !== '' || grade !== 'all' || status !== 'active';

  return (
    <div className="space-y-5">
      {heading}
      <section aria-label="Student directory" className="rounded-[var(--radius-panel)] border border-line bg-surface shadow-[var(--shadow-panel)]">
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:px-5 md:flex-row md:items-end">
          <SearchBox id={`${id}-q`} label="Search students by name, grade, school or guardian" placeholder="Name, grade, school, guardian" value={query} onChange={setQuery} className="md:w-72" />
          <div className="grid grid-cols-2 gap-3 md:flex">
            <SelectBox id={`${id}-grade`} label="Grade" value={grade} onChange={setGrade} className="md:w-32">
              <option value="all">All grades</option>
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  Grade {g}
                </option>
              ))}
            </SelectBox>
            <SelectBox id={`${id}-status`} label="Status" value={status} onChange={(v) => setStatus(v as typeof status)} className="md:w-36">
              <option value="active">Active</option>
              <option value="inactive">Left</option>
              <option value="all">All students</option>
            </SelectBox>
          </div>
          {filtered ? (
            <Button
              variant="subtle"
              size="sm"
              className="self-start md:ml-auto md:self-end"
              onClick={() => {
                setQuery('');
                setGrade('all');
                setStatus('active');
              }}
            >
              Clear filters
            </Button>
          ) : null}
        </div>
        <p className="sr-only" aria-live="polite">
          Showing {visible.length} students
        </p>
        {visible.length === 0 ? (
          <Empty icon={SearchX} title="No students match" text="Try another name, grade, school or guardian, or change the filters." />
        ) : (
          <div className="@container">
            <table className="hidden w-full table-fixed text-left text-sm @4xl:table">
              <caption className="sr-only">Students</caption>
              <colgroup>
                <col />
                <col className="w-20" />
                <col className="w-48" />
                <col className="w-56" />
                <col className="w-24" />
                <col className="w-36" />
              </colgroup>
              <thead className="border-b border-line bg-subtle/60 text-xs text-fg-muted">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-medium sm:px-5">Student</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Grade</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Guardian</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Batches</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Status</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Fees</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visible.map((r) => (
                  <tr key={r.student.id} className="align-middle transition-colors hover:bg-subtle/40">
                    <td className="px-4 py-2.5 sm:px-5">
                      <button type="button" onClick={() => onOpen(r.student.id)} className="flex max-w-full items-center gap-3 text-left" aria-label={`Open ${r.student.name}`}>
                        <Initials name={r.student.name} size="sm" muted={!r.active} />
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-fg hover:underline">{r.student.name}</span>
                          <span className="block truncate text-xs text-fg-muted">{r.student.school}</span>
                        </span>
                      </button>
                    </td>
                    <td className="tabular px-3 py-2.5 text-fg">{r.student.grade}</td>
                    <td className="px-3 py-2.5">
                      <span className="block truncate text-fg">{r.student.guardianName}</span>
                      <span className="tabular block truncate text-xs text-fg-muted">{r.student.guardianPhone}</span>
                    </td>
                    <td className="truncate px-3 py-2.5 text-fg-muted">{r.batches.length ? r.batches.map((b) => b.name).join(', ') : '—'}</td>
                    <td className="px-3 py-2.5">
                      <ActiveBadge active={r.active} label={['Active', 'Left']} />
                    </td>
                    <td className="px-3 py-2.5">
                      <BalanceCell balance={r.balance} overdue={r.overdue} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ul className="divide-y divide-line @4xl:hidden" aria-label="Students">
              {visible.map((r) => (
                <li key={r.student.id}>
                  <button type="button" onClick={() => onOpen(r.student.id)} className="flex w-full items-start gap-3 px-4 py-3 text-left" aria-label={`Open ${r.student.name}`}>
                    <Initials name={r.student.name} size="sm" muted={!r.active} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-fg">{r.student.name}</span>
                      <span className="block truncate text-xs text-fg-muted">
                        Grade {r.student.grade} · {r.student.school}
                      </span>
                      <span className="tabular block truncate text-xs text-fg-muted">
                        {r.student.guardianName} · {r.student.guardianPhone}
                      </span>
                      <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <ActiveBadge active={r.active} label={['Active', 'Left']} />
                        <BalanceCell balance={r.balance} overdue={r.overdue} />
                        <span className="text-xs text-fg-muted">{r.batches.map((b) => b.name).join(', ')}</span>
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

function BalanceCell({ balance, overdue }: { balance: number; overdue: boolean }) {
  if (balance <= 0) return <span className="text-xs font-medium text-success-strong">All paid</span>;
  return (
    <span className={cn('tabular text-xs font-semibold', overdue ? 'text-danger-strong' : 'text-warning-strong')}>
      {rupees(balance)} {overdue ? 'overdue' : 'due'}
    </span>
  );
}

// ---------- Batches ----------

function BatchesView({ book, heading, onOpen }: { book: TuitionBook; heading: ReactNode; onOpen: (id: string) => void }) {
  const batches = [...book.batches].sort((a, b) => (a.status === b.status ? a.name.localeCompare(b.name) : a.status === 'active' ? -1 : 1));
  return (
    <div className="space-y-5">
      {heading}
      <section aria-label="Batch list" className="rounded-[var(--radius-panel)] border border-line bg-surface shadow-[var(--shadow-panel)]">
        <div className="@container">
          <table className="hidden w-full table-fixed text-left text-sm @3xl:table">
            <caption className="sr-only">Batches</caption>
            <colgroup>
              <col />
              <col className="w-40" />
              <col className="w-56" />
              <col className="w-20" />
              <col className="w-24" />
              <col className="w-32" />
            </colgroup>
            <thead className="border-b border-line bg-subtle/60 text-xs text-fg-muted">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-medium sm:px-5">Batch</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Teacher</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Schedule and room</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">Students</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">Fee</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {batches.map((b) => (
                <tr key={b.id} className={cn('align-middle transition-colors hover:bg-subtle/40', b.status !== 'active' && 'text-fg-muted')}>
                  <td className="px-4 py-2.5 sm:px-5">
                    <button type="button" onClick={() => onOpen(b.id)} className="block max-w-full truncate text-left font-medium text-fg hover:underline" aria-label={`Open ${b.name}`}>
                      {b.name}
                    </button>
                    <span className="block truncate text-xs text-fg-muted">
                      {b.subject} · {gradeText(b.gradeFrom, b.gradeTo)}
                    </span>
                  </td>
                  <td className="truncate px-3 py-2.5 text-fg">{teacherOf(book, b.teacherId)?.name}</td>
                  <td className="px-3 py-2.5">
                    <span className="tabular block text-fg">{scheduleText(b)}</span>
                    <span className="block text-xs text-fg-muted">{b.room}</span>
                  </td>
                  <td className="tabular px-3 py-2.5 text-right text-fg">{currentRoster(book, b.id).length}</td>
                  <td className="tabular px-3 py-2.5 text-right text-fg">{rupees(b.monthlyFeePaise)}</td>
                  <td className="px-3 py-2.5">
                    <ActiveBadge active={b.status === 'active'} label={['Running', 'Not running']} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="divide-y divide-line @3xl:hidden" aria-label="Batches">
            {batches.map((b) => (
              <li key={b.id}>
                <button type="button" onClick={() => onOpen(b.id)} className="block w-full px-4 py-3 text-left" aria-label={`Open ${b.name}`}>
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium text-fg">{b.name}</span>
                    <ActiveBadge active={b.status === 'active'} label={['Running', 'Not running']} />
                  </span>
                  <span className="block text-xs text-fg-muted">
                    {b.subject} · {gradeText(b.gradeFrom, b.gradeTo)} · {teacherOf(book, b.teacherId)?.name}
                  </span>
                  <span className="tabular block text-xs text-fg-muted">
                    {scheduleText(b)} · {b.room} · {pluralize(currentRoster(book, b.id).length, 'student')} · {rupees(b.monthlyFeePaise)}/month
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

// ---------- Attendance ----------

function AttendanceView({
  book,
  heading,
  batchId,
  date,
  onChange,
  onSave,
}: {
  book: TuitionBook;
  heading: ReactNode;
  batchId: string;
  date: string;
  onChange: (batchId: string, date: string) => void;
  onSave: (sessionId: string, marks: Record<string, string>) => { ok: true } | { ok: false; errors: { marks?: string; session?: string } };
}) {
  const id = useId();
  const batch = batchOf(book, batchId);
  const session = sessionFor(book, batchId, date);
  const roster = session ? sessionRoster(book, session) : [];
  const saved = session ? marksFor(book, session.id) : new Map();
  const [marks, setMarks] = useState<Record<string, string>>(() => Object.fromEntries(roster.map((s) => [s.id, saved.get(s.id)?.mark ?? ''])));
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const sessions = batchSessions(book, batchId);
  const prev = [...sessions].reverse().find((s) => s.date < date);
  const next = sessions.find((s) => s.date > date && s.date <= book.today);
  const summary = session ? sessionSummary(book, session) : undefined;
  const dirty = roster.some((s) => (saved.get(s.id)?.mark ?? '') !== marks[s.id]);
  const future = session && session.date > book.today;
  const counts = { present: 0, late: 0, absent: 0, unmarked: 0 };
  for (const s of roster) {
    const m = marks[s.id];
    if (m === 'present' || m === 'late' || m === 'absent') counts[m] += 1;
    else counts.unmarked += 1;
  }

  const save = () => {
    if (!session || submitting) return;
    setSubmitting(true);
    const r = onSave(session.id, marks);
    setSubmitting(false);
    if (!r.ok) setError(r.errors.marks ?? r.errors.session);
    else setError(undefined);
  };

  return (
    <div className="space-y-5">
      {heading}
      <div className="flex flex-col gap-3 rounded-[var(--radius-panel)] border border-line bg-surface p-4 shadow-[var(--shadow-panel)] md:flex-row md:items-end">
        <SelectBox id={`${id}-batch`} label="Batch" value={batchId} onChange={(v) => onChange(v, date)} className="md:w-60">
          {book.batches
            .filter((b) => b.status === 'active')
            .map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
        </SelectBox>
        <div>
          <label htmlFor={`${id}-date`} className="block text-xs font-medium text-fg-muted">
            Class date
          </label>
          <input
            id={`${id}-date`}
            type="date"
            value={date}
            min={SESSIONS_FROM}
            max={sessionHorizon(book)}
            onChange={(e: { target: { value: string } }) => {
              if (isIsoDay(e.target.value)) onChange(batchId, e.target.value);
            }}
            className={controlClass(false, 'mt-1 min-h-9 py-1.5 text-sm')}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => prev && onChange(batchId, prev.date)} disabled={!prev}>
            <ChevronLeft size={16} aria-hidden="true" /> Previous class
          </Button>
          <Button variant="secondary" size="sm" onClick={() => next && onChange(batchId, next.date)} disabled={!next}>
            Next class <ChevronRight size={16} aria-hidden="true" />
          </Button>
          <Button variant="subtle" size="sm" onClick={() => onChange(batchId, book.today)} disabled={date === book.today}>
            Today
          </Button>
        </div>
      </div>

      {!batch ? null : !session ? (
        <div className="rounded-[var(--radius-panel)] border border-line bg-surface shadow-[var(--shadow-panel)]">
          <Empty icon={CalendarCheck} title={`No ${batch.name} class on ${shortDay(date)}`} text={`${batch.name} meets ${scheduleText(batch)}. Pick one of those days, or use Previous class.`} />
        </div>
      ) : (
        <section aria-label="Attendance sheet" className="rounded-[var(--radius-panel)] border border-line bg-surface shadow-[var(--shadow-panel)]">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
            <div>
              <h2 className="text-[0.95rem] font-semibold text-fg">
                {batch.name} · {session.date === book.today ? 'Today' : shortDay(session.date)}, {formatTime(session.start)}
              </h2>
              <p className="text-xs text-fg-muted">
                {teacherOf(book, batch.teacherId)?.name} · {batch.room} · {pluralize(roster.length, 'student')} enrolled on this day
              </p>
            </div>
            <p className="tabular text-sm text-fg-muted" aria-live="polite">
              {summary?.taken ? `Saved: ${summary.present + summary.late} of ${summary.eligible} attended (${percent(summary.rate)})` : 'Not taken yet'}
            </p>
          </div>
          {future ? (
            <Empty icon={CalendarCheck} title="This class hasn’t happened yet" text={`Attendance can be taken on ${longDate(session.date)}.`} />
          ) : roster.length === 0 ? (
            <Empty icon={Users} title="No students were enrolled" text="Nobody was in this batch on that day." />
          ) : (
            <>
              <ul className="divide-y divide-line" aria-label="Students">
                {roster.map((s) => {
                  const left = s.leftOn && s.leftOn <= book.today;
                  return (
                    <li key={s.id} className="flex flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:px-5">
                      <span className="flex min-w-0 flex-1 items-center gap-3">
                        <Initials name={s.name} size="sm" muted={!!left} />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-fg">{s.name}</span>
                          <span className="block text-xs text-fg-muted">
                            Grade {s.grade}
                            {left ? ` · left ${shortDay(s.leftOn!)}` : ''}
                          </span>
                        </span>
                      </span>
                      <div className="sm:w-72">
                        <Choice
                          id={`${id}-m-${s.id}`}
                          legend={`Attendance for ${s.name}`}
                          legendHidden
                          size="sm"
                          options={markOptions}
                          value={marks[s.id] ?? ''}
                          onChange={(v) => {
                            setMarks((m) => ({ ...m, [s.id]: v }));
                            setError(undefined);
                          }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div className="flex flex-col gap-3 border-t border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <p className="tabular text-sm text-fg-muted">
                  {counts.present} present · {counts.late} late · {counts.absent} absent{counts.unmarked ? ` · ${counts.unmarked} not marked` : ''}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="subtle"
                    size="sm"
                    onClick={() => {
                      setMarks((m) => Object.fromEntries(roster.map((s) => [s.id, m[s.id] || 'present'])));
                      setError(undefined);
                    }}
                    disabled={counts.unmarked === 0}
                  >
                    Mark the rest present
                  </Button>
                  <Button size="sm" onClick={save} disabled={!dirty && !!summary?.taken}>
                    <ClipboardCheck size={15} aria-hidden="true" /> {summary?.taken ? 'Update attendance' : 'Save attendance'}
                  </Button>
                </div>
              </div>
              {error ? <p className="border-t border-line bg-danger-soft px-4 py-2.5 text-sm font-medium text-danger-strong sm:px-5">{error}</p> : null}
            </>
          )}
        </section>
      )}
      <p className="flex items-start gap-2 text-xs text-fg-muted">
        <Info size={14} className="mt-px shrink-0" aria-hidden="true" />
        Only students enrolled in the batch on the class date appear. Students who have since left still show on their past classes. Attendance % = (present + late) ÷ students on the sheet.
      </p>
    </div>
  );
}

// ---------- Fees ----------

function FeesView({ book, heading, onPay, onOpenStudent, onGenerate }: { book: TuitionBook; heading: ReactNode; onPay: (feeId?: string) => void; onOpenStudent: (id: string) => void; onGenerate: (p: Period) => { ok: boolean } }) {
  const id = useId();
  const current = periodOf(book.today);
  const [query, setQuery] = useState('');
  const [batchId, setBatchId] = useState('all');
  const [period, setPeriod] = useState<string>(current);
  const [status, setStatus] = useState<'all' | FeeStatus | 'unpaid'>('all');
  const [generating, setGenerating] = useState(false);
  const rows = useMemo(() => feeRows(book), [book]);
  const visible = filterFees(rows, { query, batchId, period, status });
  const periodRows = filterFees(rows, { period: period === 'all' ? undefined : period });
  const t = feeTotals(periodRows);
  const collected = period === 'all' ? { total: book.payments.reduce((s, p) => s + p.amountPaise, 0), count: book.payments.length } : collectedIn(book, period);
  const log = paymentLog(book).slice(0, 8);
  const next = nextPeriod(current);
  const nextExists = rows.some((r) => r.fee.period === next);
  const periods = [...new Set([next, ...periodsInUse(book)])].sort().reverse();
  const filtered = query.trim() !== '' || batchId !== 'all' || period !== current || status !== 'all';

  return (
    <div className="space-y-5">
      {heading}
      <Figures
        label="Fee summary"
        className="sm:grid-cols-4"
        figures={[
          { label: 'Fees charged', value: rupees(t.assessed), note: period === 'all' ? 'All months' : `For ${formatPeriod(period)}` },
          { label: 'Collected', value: rupees(collected.total), note: `${pluralize(collected.count, 'payment')} dated ${period === 'all' ? 'in any month' : `in ${formatPeriod(period)}`}`, tone: 'text-success-strong' },
          { label: 'Still due', value: rupees(t.outstanding), note: period === 'all' ? 'All months' : `On ${formatPeriod(period)} fees`, ...(t.outstanding ? { tone: 'text-warning-strong' } : {}) },
          { label: 'Overdue', value: rupees(t.overdue), note: `Past the due date`, ...(t.overdue ? { tone: 'text-danger-strong' } : {}) },
        ]}
      />
      <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-panel)] border border-line bg-surface px-4 py-3 shadow-[var(--shadow-panel)]">
        <FilePlus2 size={18} className="text-fg-muted" aria-hidden="true" />
        <p className="min-w-0 flex-1 text-sm text-fg-muted">
          {nextExists ? `${formatPeriod(next)} fees have been generated.` : `${formatPeriod(next)} fees haven’t been generated yet.`} Generating creates one fee per student per batch; existing ones are never duplicated.
        </p>
        <Button
          variant="secondary"
          size="sm"
          disabled={generating}
          onClick={() => {
            setGenerating(true);
            onGenerate(next);
            setGenerating(false);
            setPeriod(next);
          }}
        >
          Generate {formatPeriod(next)} fees
        </Button>
      </div>

      <section aria-label="Fee records" className="rounded-[var(--radius-panel)] border border-line bg-surface shadow-[var(--shadow-panel)]">
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:px-5 lg:flex-row lg:items-end">
          <SearchBox id={`${id}-q`} label="Search fees by student or guardian" placeholder="Student or guardian" value={query} onChange={setQuery} className="lg:w-60" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:flex">
            <SelectBox id={`${id}-period`} label="Month" value={period} onChange={setPeriod} className="lg:w-40">
              <option value="all">All months</option>
              {periods.map((p) => (
                <option key={p} value={p}>
                  {formatPeriod(p)}
                </option>
              ))}
            </SelectBox>
            <SelectBox id={`${id}-batch`} label="Batch" value={batchId} onChange={setBatchId} className="lg:w-44">
              <option value="all">All batches</option>
              {book.batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </SelectBox>
            <SelectBox id={`${id}-status`} label="Status" value={status} onChange={(v) => setStatus(v as typeof status)} className="lg:w-36">
              <option value="all">Any status</option>
              <option value="unpaid">Not fully paid</option>
              <option value="overdue">Overdue</option>
              <option value="partial">Part paid</option>
              <option value="due">Due</option>
              <option value="paid">Paid</option>
            </SelectBox>
          </div>
          {filtered ? (
            <Button
              variant="subtle"
              size="sm"
              className="self-start lg:ml-auto lg:self-end"
              onClick={() => {
                setQuery('');
                setBatchId('all');
                setPeriod(current);
                setStatus('all');
              }}
            >
              Clear filters
            </Button>
          ) : null}
        </div>
        <p className="sr-only" aria-live="polite">
          Showing {visible.length} fee records
        </p>
        {visible.length === 0 ? (
          <Empty icon={SearchX} title="No fee records match" text={period === next && !nextExists ? `Generate ${formatPeriod(next)} fees to create them.` : 'Try another student, batch, month or status.'} />
        ) : (
          <div className="@container">
            <table className="hidden w-full table-fixed text-left text-sm @4xl:table">
              <caption className="sr-only">Fee records</caption>
              <colgroup>
                <col />
                <col className="w-44" />
                <col className="w-28" />
                <col className="w-28" />
                <col className="w-28" />
                <col className="w-28" />
                <col className="w-24" />
              </colgroup>
              <thead className="border-b border-line bg-subtle/60 text-xs text-fg-muted">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-medium sm:px-5">Student</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Batch and month</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">Fee</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">Paid</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">Balance</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Status</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">
                    <span className="sr-only">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visible.map((r) => (
                  <tr key={r.fee.id} className="align-middle transition-colors hover:bg-subtle/40">
                    <td className="px-4 py-2.5 sm:px-5">
                      <button type="button" onClick={() => onOpenStudent(r.student.id)} className="block max-w-full truncate text-left font-medium text-fg hover:underline" aria-label={`Open ${r.student.name}`}>
                        {r.student.name}
                      </button>
                      <span className="tabular block truncate text-xs text-fg-muted">
                        {r.student.guardianName} · {r.student.guardianPhone}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="block truncate text-fg">{r.batch.name}</span>
                      <span className="tabular block text-xs text-fg-muted">{formatPeriod(r.fee.period)}</span>
                    </td>
                    <td className="tabular px-3 py-2.5 text-right text-fg">{rupees(r.fee.amountPaise)}</td>
                    <td className="tabular px-3 py-2.5 text-right text-fg-muted">{rupees(r.paid)}</td>
                    <td className={cn('tabular px-3 py-2.5 text-right font-semibold', r.balance > 0 ? 'text-fg' : 'text-fg-subtle')}>{rupees(r.balance)}</td>
                    <td className="px-3 py-2.5">
                      <FeeBadge status={r.status} />
                      <span className="tabular mt-0.5 block text-xs text-fg-muted">Due {shortDay(r.fee.dueDate).replace(/^\w+ /, '')}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {r.balance > 0 ? (
                        <Button variant="secondary" size="sm" onClick={() => onPay(r.fee.id)} ariaLabel={`Record payment from ${r.student.name} for ${r.batch.name}, ${formatPeriod(r.fee.period)}`}>
                          Pay
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ul className="divide-y divide-line @4xl:hidden" aria-label="Fee records">
              {visible.map((r) => (
                <li key={r.fee.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <button type="button" onClick={() => onOpenStudent(r.student.id)} className="min-w-0 text-left" aria-label={`Open ${r.student.name}`}>
                      <span className="block truncate font-medium text-fg">{r.student.name}</span>
                      <span className="block truncate text-xs text-fg-muted">
                        {r.batch.name} · {formatPeriod(r.fee.period)}
                      </span>
                    </button>
                    <span className="tabular shrink-0 text-right">
                      <span className="block font-semibold text-fg">{rupees(r.balance)}</span>
                      <span className="block text-xs text-fg-muted">of {rupees(r.fee.amountPaise)}</span>
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <FeeBadge status={r.status} />
                      <span className="tabular text-xs text-fg-muted">due {shortDay(r.fee.dueDate)}</span>
                    </span>
                    {r.balance > 0 ? (
                      <Button variant="secondary" size="sm" onClick={() => onPay(r.fee.id)} ariaLabel={`Record payment from ${r.student.name} for ${r.batch.name}, ${formatPeriod(r.fee.period)}`}>
                        Pay
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <Panel title="Recent payments" description="Collected amounts come only from these records.">
        <ul className="divide-y divide-line">
          {log.map(({ payment, row }) => (
            <li key={payment.id} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-fg">{row.student.name}</span>
                <span className="tabular block truncate text-xs text-fg-muted">
                  {payment.date === book.today ? 'Today' : shortDay(payment.date)} · {labelOf(paymentMethods, payment.method)} · {row.batch.name}, {formatPeriod(row.fee.period)}
                </span>
              </span>
              <span className="tabular text-sm font-semibold text-success-strong">{money(payment.amountPaise)}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
