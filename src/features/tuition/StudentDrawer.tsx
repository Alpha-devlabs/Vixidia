import { IndianRupee, Pencil, Plus, UserMinus, UserPlus } from 'lucide-react';
import type { TuitionBook } from '../../types/tuition';
import { Dialog } from '../../components/Dialog';
import { Button } from '../../components/Button';
import { cn } from '../../utils/cn';
import { batchOf, feeRows, formatPeriod, formatTime, labelOf, money, openEnrolments, paymentMethods, percent, rupees, scheduleText, studentAttendance, studentRow } from './tuitionLogic';
import { ActiveBadge, FeeBadge, Initials, MarkBadge, longDate, shortDay } from './TuitionBits';

interface Props {
  book: TuitionBook;
  studentId: string | null;
  open: boolean;
  onClose: () => void;
  onEdit: (id: string) => void;
  onEnrol: (id: string) => void;
  onUnenrol: (enrolmentId: string) => void;
  onPay: (feeId: string) => void;
  onSetActive: (id: string, active: boolean) => void;
}

const RECENT = 10;

/** Student profile: guardian, batches, attendance and fees with their payments. */
export function StudentDrawer({ book, studentId, open, onClose, onEdit, onEnrol, onUnenrol, onPay, onSetActive }: Props) {
  const s = book.students.find((x) => x.id === studentId);
  if (!s) return null;
  const r = studentRow(book, s);
  const enrolments = openEnrolments(book, { studentId: s.id });
  const att = studentAttendance(book, s.id);
  const fees = feeRows(book).filter((f) => f.student.id === s.id);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      variant="drawer"
      title={s.name}
      description={`Grade ${s.grade} · ${s.school}`}
      footer={
        <>
          <Button variant="subtle" onClick={() => onEdit(s.id)}>
            <Pencil size={16} aria-hidden="true" /> Edit
          </Button>
          {r.active ? (
            <Button variant="secondary" onClick={() => onSetActive(s.id, false)}>
              <UserMinus size={16} aria-hidden="true" /> Mark as left
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => onSetActive(s.id, true)}>
              <UserPlus size={16} aria-hidden="true" /> Make active
            </Button>
          )}
          <Button onClick={() => onEnrol(s.id)} disabled={!r.active}>
            <Plus size={16} aria-hidden="true" /> Enrol in batch
          </Button>
        </>
      }
    >
      <div className="flex items-center gap-4">
        <Initials name={s.name} size="lg" muted={!r.active} />
        <dl className="grid flex-1 grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-sm">
          <dt className="text-fg-muted">Guardian</dt>
          <dd className="text-fg">{s.guardianName}</dd>
          <dt className="text-fg-muted">Phone</dt>
          <dd className="tabular text-fg">{s.guardianPhone}</dd>
          <dt className="text-fg-muted">Email</dt>
          <dd className="truncate text-fg">{s.guardianEmail || '—'}</dd>
          <dt className="text-fg-muted">Status</dt>
          <dd className="flex flex-wrap items-center gap-2">
            <ActiveBadge active={r.active} label={['Active', 'Left']} />
            <span className="text-xs text-fg-muted">{s.leftOn ? `Left ${longDate(s.leftOn)}` : `Joined ${longDate(s.joinedOn)}`}</span>
          </dd>
        </dl>
      </div>

      <dl className="mt-5 grid grid-cols-2 overflow-hidden rounded-[var(--radius-control)] border border-line bg-line [gap:1px] text-sm">
        <div className="bg-surface px-3 py-2.5">
          <dt className="text-xs text-fg-muted">Attendance</dt>
          <dd className="tabular text-lg font-semibold text-fg">{percent(att.rate)}</dd>
          <dd className="tabular text-xs text-fg-muted">
            {att.attended} of {att.total} classes
          </dd>
        </div>
        <div className="bg-surface px-3 py-2.5">
          <dt className="text-xs text-fg-muted">Fees outstanding</dt>
          <dd className={cn('tabular text-lg font-semibold', r.balance > 0 ? 'text-danger-strong' : 'text-fg')}>{money(r.balance)}</dd>
          <dd className="text-xs text-fg-muted">{r.overdue ? 'Includes overdue fees' : r.balance > 0 ? 'Not yet overdue' : 'All paid'}</dd>
        </div>
      </dl>

      <h3 className="mt-6 text-sm font-semibold text-fg">Batches</h3>
      {enrolments.length === 0 ? (
        <p className="mt-1.5 text-sm text-fg-subtle">{r.active ? 'Not enrolled in any batch.' : 'No current batches.'}</p>
      ) : (
        <ul className="mt-2 divide-y divide-line rounded-[var(--radius-control)] border border-line">
          {enrolments.map((e) => {
            const b = batchOf(book, e.batchId)!;
            const a = studentAttendance(book, s.id, b.id);
            return (
              <li key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5 text-sm">
                <span className="min-w-0 flex-1 basis-full sm:basis-0">
                  <span className="block font-medium text-fg">{b.name}</span>
                  <span className="block text-xs text-fg-muted">
                    {scheduleText(b)} · since {shortDay(e.from)}
                  </span>
                </span>
                <span className="tabular text-xs text-fg-muted">
                  {rupees(e.feePaise ?? b.monthlyFeePaise)}/month{e.feePaise !== undefined ? ' (own fee)' : ''} · {percent(a.rate)} attended
                </span>
                <Button variant="subtle" size="sm" onClick={() => onUnenrol(e.id)} ariaLabel={`Remove ${s.name} from ${b.name}`}>
                  Remove
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <h3 className="mt-6 text-sm font-semibold text-fg">Fees</h3>
      {fees.length === 0 ? (
        <p className="mt-1.5 text-sm text-fg-subtle">No fee records.</p>
      ) : (
        <ul className="mt-2 divide-y divide-line rounded-[var(--radius-control)] border border-line" aria-label={`Fees of ${s.name}`}>
          {fees.map((f) => (
            <li key={f.fee.id} className="px-3 py-2.5 text-sm">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="min-w-0 flex-1 basis-full sm:basis-0">
                  <span className="block font-medium text-fg">
                    {formatPeriod(f.fee.period)} · {f.batch.name}
                  </span>
                  <span className="tabular block text-xs text-fg-muted">
                    {money(f.fee.amountPaise)} · paid {money(f.paid)} · due {shortDay(f.fee.dueDate)}
                  </span>
                </span>
                <FeeBadge status={f.status} />
                {f.balance > 0 ? (
                  <Button variant="secondary" size="sm" onClick={() => onPay(f.fee.id)} ariaLabel={`Record payment for ${f.batch.name}, ${formatPeriod(f.fee.period)}`}>
                    <IndianRupee size={14} aria-hidden="true" /> Pay
                  </Button>
                ) : null}
              </div>
              {f.payments.length ? (
                <ul className="mt-1.5 space-y-0.5 pl-3 text-xs text-fg-muted">
                  {f.payments.map((p) => (
                    <li key={p.id} className="tabular">
                      {longDate(p.date)} · {money(p.amountPaise)} by {labelOf(paymentMethods, p.method)}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <h3 className="mt-6 text-sm font-semibold text-fg">Recent attendance</h3>
      {att.rows.length === 0 ? (
        <p className="mt-1.5 text-sm text-fg-subtle">No attendance recorded.</p>
      ) : (
        <ul className="mt-2 divide-y divide-line rounded-[var(--radius-control)] border border-line" aria-label={`Attendance of ${s.name}`}>
          {att.rows.slice(0, RECENT).map(({ session, mark }) => (
            <li key={session.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span className="min-w-0">
                <span className="tabular block text-fg">
                  {session.date === book.today ? 'Today' : shortDay(session.date)}, {formatTime(session.start)}
                </span>
                <span className="block truncate text-xs text-fg-muted">{batchOf(book, session.batchId)?.name}</span>
              </span>
              <MarkBadge mark={mark!} />
            </li>
          ))}
        </ul>
      )}
      <p className="mt-6 text-xs text-fg-muted">Fictional student. Attendance counts only classes they were enrolled in. Balances are fees minus recorded payments.</p>
    </Dialog>
  );
}
