import { Hourglass, LogIn, LogOut } from 'lucide-react';
import type { DayRow } from './leaveLogic';
import { formatClock, formatDuration, labelOf, leaveTypes } from './leaveLogic';
import { DayBadges, EmployeeAvatar } from './LeaveBits';
import { Button } from '../../components/Button';

interface Props {
  rows: DayRow[];
  /** Check-in and check-out are only offered for the demo's today. */
  isToday: boolean;
  onOpen: (employeeId: string) => void;
  onCheckIn: (employeeId: string) => void;
  onCheckOut: (employeeId: string) => void;
}

function Note({ row }: { row: DayRow }) {
  if (row.leave) return <span className="mt-1 block text-xs text-fg-muted">{labelOf(leaveTypes, row.leave.type)}</span>;
  if (row.pendingLeave)
    return (
      <span className="mt-1 flex items-center gap-1 text-xs text-warning-strong">
        <Hourglass size={12} aria-hidden="true" /> Leave request pending
      </span>
    );
  return null;
}

function Action({ row, isToday, onCheckIn, onCheckOut }: { row: DayRow; isToday: boolean; onCheckIn: () => void; onCheckOut: () => void }) {
  if (!isToday || row.status === 'on_leave') return null;
  if (row.status === 'not_checked_in')
    return (
      <Button variant="secondary" size="sm" onClick={onCheckIn} ariaLabel={`Check in ${row.employee.name}`}>
        <LogIn size={15} aria-hidden="true" /> Check in
      </Button>
    );
  if (row.stillIn)
    return (
      <Button variant="secondary" size="sm" onClick={onCheckOut} ariaLabel={`Check out ${row.employee.name}`}>
        <LogOut size={15} aria-hidden="true" /> Check out
      </Button>
    );
  return null;
}

const time = (t?: string) => (t ? formatClock(t) : '—');

/** The day's attendance: a table on wide containers, compact cards on narrow ones. */
export function AttendanceList({ rows, isToday, onOpen, onCheckIn, onCheckOut }: Props) {
  return (
    <div className="@container">
      <table className="hidden w-full table-fixed text-left text-sm @3xl:table">
        <caption className="sr-only">Attendance</caption>
        <colgroup>
          <col />
          <col className="w-56" />
          <col className="w-24" />
          <col className="w-24" />
          <col className="w-24" />
          <col className="w-36" />
        </colgroup>
        <thead className="border-b border-line bg-subtle/60 text-xs text-fg-muted">
          <tr>
            <th scope="col" className="px-4 py-2.5 font-medium sm:px-5">Employee</th>
            <th scope="col" className="px-3 py-2.5 font-medium">Status</th>
            <th scope="col" className="px-3 py-2.5 font-medium">Check-in</th>
            <th scope="col" className="px-3 py-2.5 font-medium">Check-out</th>
            <th scope="col" className="px-3 py-2.5 font-medium" title="Check-in to check-out. Breaks are not recorded.">Worked</th>
            <th scope="col" className="px-3 py-2.5 font-medium">
              <span className="sr-only">Action</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => (
            <tr key={r.employee.id} className="align-middle transition-colors hover:bg-subtle/40">
              <td className="px-4 py-2.5 sm:px-5">
                <button type="button" onClick={() => onOpen(r.employee.id)} className="flex max-w-full items-center gap-3 text-left" aria-label={`Open ${r.employee.name}’s profile`}>
                  <EmployeeAvatar name={r.employee.name} muted={r.status === 'absent' || r.status === 'not_checked_in'} />
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-fg hover:underline">{r.employee.name}</span>
                    <span className="block truncate text-xs text-fg-muted">
                      {r.employee.role} · {r.employee.department}
                    </span>
                  </span>
                </button>
              </td>
              <td className="px-3 py-2.5">
                <DayBadges row={r} />
                <Note row={r} />
              </td>
              <td className="tabular px-3 py-2.5 text-fg">{time(r.record?.checkIn)}</td>
              <td className="tabular px-3 py-2.5 text-fg">{time(r.record?.checkOut)}</td>
              <td className="tabular px-3 py-2.5 text-fg-muted">{r.worked !== null ? formatDuration(r.worked) : '—'}</td>
              <td className="px-3 py-2.5 text-right">
                <Action row={r} isToday={isToday} onCheckIn={() => onCheckIn(r.employee.id)} onCheckOut={() => onCheckOut(r.employee.id)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="divide-y divide-line @3xl:hidden" aria-label="Attendance">
        {rows.map((r) => (
          <li key={r.employee.id} className="px-4 py-3">
            <div className="flex items-start gap-3">
              <button type="button" onClick={() => onOpen(r.employee.id)} className="flex min-w-0 flex-1 items-start gap-3 text-left" aria-label={`Open ${r.employee.name}’s profile`}>
                <EmployeeAvatar name={r.employee.name} muted={r.status === 'absent' || r.status === 'not_checked_in'} />
                <span className="min-w-0">
                  <span className="block truncate font-medium text-fg">{r.employee.name}</span>
                  <span className="block truncate text-xs text-fg-muted">
                    {r.employee.role} · {r.employee.department}
                  </span>
                </span>
              </button>
              <Action row={r} isToday={isToday} onCheckIn={() => onCheckIn(r.employee.id)} onCheckOut={() => onCheckOut(r.employee.id)} />
            </div>
            <div className="mt-2 pl-12">
              <DayBadges row={r} />
              <Note row={r} />
              {r.record ? (
                <p className="tabular mt-1.5 text-xs text-fg-muted">
                  In {time(r.record.checkIn)} · Out {time(r.record.checkOut)}
                  {r.worked !== null ? ` · ${formatDuration(r.worked)}` : ''}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
