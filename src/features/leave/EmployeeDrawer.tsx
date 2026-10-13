import { CalendarPlus } from 'lucide-react';
import type { Employee, LeaveBook } from '../../types/leave';
import { Dialog } from '../../components/Dialog';
import { Button } from '../../components/Button';
import { formatDate, formatWeekday, pluralize } from '../../utils/format';
import { daySummary, employeeLeave, formatClock, formatDuration, labelOf, leaveDays, leaveTypes, range, recentDays } from './leaveLogic';
import { DayBadges, EmployeeAvatar, LeaveStatusBadge } from './LeaveBits';

interface Props {
  book: LeaveBook;
  employee: Employee | undefined;
  open: boolean;
  onClose: () => void;
  onRequestLeave: (employeeId: string) => void;
}

const HISTORY = 10;

/** Lightweight employee profile: department, recent attendance and leave. */
export function EmployeeDrawer({ book, employee, open, onClose, onRequestLeave }: Props) {
  if (!employee) return null;
  const days = recentDays(book, employee, HISTORY);
  const sum = daySummary(days);
  const leave = employeeLeave(book, employee.id);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      variant="drawer"
      title={employee.name}
      description={`${employee.role} · ${employee.department}`}
      footer={
        <Button variant="secondary" onClick={() => onRequestLeave(employee.id)}>
          <CalendarPlus size={16} aria-hidden="true" /> Request leave
        </Button>
      }
    >
      <div className="flex items-center gap-4">
        <EmployeeAvatar name={employee.name} size="lg" />
        <dl className="grid flex-1 grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <dt className="text-fg-muted">Department</dt>
          <dd className="text-fg">{employee.department}</dd>
          <dt className="text-fg-muted">Joined</dt>
          <dd className="tabular text-fg">{formatDate(employee.joinedOn)}</dd>
        </dl>
      </div>

      <h3 className="mt-6 text-sm font-semibold text-fg">Last {pluralize(days.length, 'working day')}</h3>
      <p className="tabular mt-0.5 text-xs text-fg-muted">
        {sum.present} present{sum.late ? ` (${sum.late} late)` : ''} · {sum.onLeave} on leave · {sum.absent} absent
        {sum.incomplete ? ` · ${sum.incomplete} without check-out` : ''}
      </p>
      <ol className="mt-3 divide-y divide-line rounded-[var(--radius-control)] border border-line" aria-label={`Recent attendance for ${employee.name}`}>
        {days.map((d) => (
          <li key={d.date} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2 text-sm">
            <span className="tabular w-24 shrink-0 text-fg">
              {d.date === book.today ? 'Today' : `${formatWeekday(d.date)} ${formatDate(d.date).replace(/ \d{4}$/, '')}`}
            </span>
            <span className="min-w-0 flex-1">
              <DayBadges row={d} />
            </span>
            <span className="tabular text-xs text-fg-muted">
              {d.record ? `${formatClock(d.record.checkIn)} – ${d.record.checkOut ? formatClock(d.record.checkOut) : '—'}` : ''}
              {d.worked !== null ? ` · ${formatDuration(d.worked)}` : ''}
            </span>
          </li>
        ))}
      </ol>

      <h3 className="mt-6 text-sm font-semibold text-fg">Leave requests</h3>
      {leave.length === 0 ? (
        <p className="mt-1.5 text-sm text-fg-subtle">No leave requests.</p>
      ) : (
        <ul className="mt-3 divide-y divide-line rounded-[var(--radius-control)] border border-line">
          {leave.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm">
              <span className="min-w-0">
                <span className="block font-medium text-fg">{labelOf(leaveTypes, l.type)}</span>
                <span className="tabular block text-xs text-fg-muted">
                  {range(l)} · {pluralize(leaveDays(l), 'working day')}
                </span>
              </span>
              <LeaveStatusBadge status={l.status} />
            </li>
          ))}
        </ul>
      )}
      <p className="mt-6 text-xs text-fg-muted">Fictional employee. Working days are Monday to Friday; holidays aren’t modelled.</p>
    </Dialog>
  );
}
