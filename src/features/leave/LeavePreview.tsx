import { useMemo } from 'react';
import { createLeaveSample } from '../../data/leaveSample';
import { dayRows, daySummary } from './leaveLogic';
import { AttendanceList } from './AttendanceList';
import { formatLongDay } from '../../utils/format';

/** Read-only glimpse of today's attendance for the product page, from the demo's sample data. */
export function LeavePreview() {
  const { rows, summary, today } = useMemo(() => {
    const book = createLeaveSample();
    const r = dayRows(book, book.today);
    return { rows: r, summary: daySummary(r), today: book.today };
  }, []);
  const figures = [
    ['Present', summary.present],
    ['Absent', summary.absent],
    ['On leave', summary.onLeave],
    ['Not checked in', summary.notCheckedIn],
  ] as const;
  const sample = [...rows.filter((r) => r.status !== 'present').slice(0, 2), ...rows.filter((r) => r.status === 'present').slice(0, 2)];
  return (
    <figure className="overflow-hidden rounded-[var(--radius-panel)] border border-line bg-surface shadow-[var(--shadow-panel)]">
      <dl className="grid grid-cols-2 gap-px border-b border-line bg-line sm:grid-cols-4">
        {figures.map(([label, value]) => (
          <div key={label} className="bg-surface px-4 py-3">
            <dt className="text-xs text-fg-muted">{label}</dt>
            <dd className="tabular mt-0.5 font-semibold text-fg">{value}</dd>
          </div>
        ))}
      </dl>
      <div inert className="pointer-events-none">
        <AttendanceList rows={sample} isToday={false} onOpen={() => undefined} onCheckIn={() => undefined} onCheckOut={() => undefined} />
      </div>
      <figcaption className="border-t border-line px-4 py-2.5 text-xs text-fg-muted">Fictional sample staff on {formatLongDay(today)}, from the demo.</figcaption>
    </figure>
  );
}
