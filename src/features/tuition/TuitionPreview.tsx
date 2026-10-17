import { useMemo } from 'react';
import { createTuitionSample } from '../../data/tuitionSample';
import { batchOf, endTime, formatTime, overview, percent, periodOf, rupees, sessionSummary, sessionsOn, teacherOf } from './tuitionLogic';
import { formatLongDay } from '../../utils/format';

/** Read-only glimpse of today's classes for the product page, from the demo's sample data. */
export function TuitionPreview() {
  const { o, rows, today } = useMemo(() => {
    const book = createTuitionSample();
    const rows = sessionsOn(book, book.today).map((s) => {
      const b = batchOf(book, s.batchId)!;
      return { s, b, teacher: teacherOf(book, b.teacherId)?.name ?? '', sum: sessionSummary(book, s) };
    });
    return { o: overview(book, book.today, periodOf(book.today)), rows, today: book.today };
  }, []);
  const figures = [
    ['Active students', String(o.activeStudents)],
    ['Classes today', String(o.classesToday)],
    ['Fees collected', rupees(o.collected.total)],
    ['Outstanding', rupees(o.outstanding)],
  ] as const;
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
      <ul inert className="divide-y divide-line">
        {rows.map(({ s, b, teacher, sum }) => (
          <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
            <span className="tabular w-20 shrink-0 font-semibold text-fg">{formatTime(s.start)}</span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium text-fg">{b.name}</span>
              <span className="block truncate text-xs text-fg-muted">
                {teacher} · {b.room} · until {formatTime(endTime(s.start, s.durationMin))}
              </span>
            </span>
            <span className="tabular text-xs text-fg-muted">{sum.taken ? `${sum.present + sum.late}/${sum.eligible} attended · ${percent(sum.rate)}` : `${sum.eligible} students`}</span>
          </li>
        ))}
      </ul>
      <figcaption className="border-t border-line px-4 py-2.5 text-xs text-fg-muted">Fictional batches on {formatLongDay(today)}, from the demo.</figcaption>
    </figure>
  );
}
