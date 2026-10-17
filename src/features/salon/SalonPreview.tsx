import { useMemo } from 'react';
import { createSalonSample } from '../../data/salonSample';
import { dayRows, daySummary, formatTime, money, servicesText } from './salonLogic';
import { PayBadge, StatusBadge } from './SalonBits';
import { formatLongDay } from '../../utils/format';

/** Read-only glimpse of the day's schedule for the product page, from the demo's sample data. */
export function SalonPreview() {
  const { s, rows, today } = useMemo(() => {
    const book = createSalonSample();
    const all = dayRows(book, book.today);
    return { s: daySummary(book, book.today), rows: [...all.filter((r) => r.appointment.status === 'completed').slice(0, 2), ...all.filter((r) => r.appointment.status === 'booked').slice(0, 2)], today: book.today };
  }, []);
  const figures = [
    ['Appointments', String(s.appointments)],
    ['Still to come', String(s.upcoming)],
    ['Completed', String(s.completed)],
    ['Revenue', money(s.revenue).replace('.00', '')],
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
        {rows.map((r) => (
          <li key={r.appointment.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
            <span className="tabular w-16 shrink-0 font-semibold text-fg">{formatTime(r.appointment.start)}</span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium text-fg">{r.customer.name}</span>
              <span className="block truncate text-xs text-fg-muted">
                {servicesText(r.appointment.services)} · {r.stylist.name}
              </span>
            </span>
            <span className="flex gap-1.5">
              <StatusBadge status={r.appointment.status} />
              <PayBadge state={r.pay} />
            </span>
          </li>
        ))}
      </ul>
      <figcaption className="border-t border-line px-4 py-2.5 text-xs text-fg-muted">Fictional customers on {formatLongDay(today)}, from the demo.</figcaption>
    </figure>
  );
}
