import { useMemo } from 'react';
import { createGymSample } from '../../data/gymSample';
import { memberRows, money, summarize } from './gymLogic';
import { PayBadge, StatusBadge, longDate } from './GymBits';
import { formatLongDay } from '../../utils/format';

/** Read-only glimpse of the member list for the product page, from the demo's sample data. */
export function GymPreview() {
  const { s, rows, today } = useMemo(() => {
    const book = createGymSample();
    const all = memberRows(book);
    const pick = (st: string) => all.find((r) => r.info.status === st)!;
    return { s: summarize(book), rows: [pick('active'), pick('expiring'), pick('expired'), all.find((r) => r.ledger.balance > 0 && r.info.status === 'active')!], today: book.today };
  }, []);
  const figures = [
    ['Members', String(s.members)],
    ['Active', String(s.active)],
    ['Expiring soon', String(s.expiring)],
    ['Outstanding', money(s.outstanding).replace('.00', '')],
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
          <li key={r.member.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
            <span className="min-w-0">
              <span className="block font-medium text-fg">{r.member.name}</span>
              <span className="tabular block text-xs text-fg-muted">
                {r.plan?.name} · until {longDate(r.info.validUntil ?? r.shown!.end)}
              </span>
            </span>
            <span className="flex flex-wrap gap-1.5">
              <StatusBadge status={r.info.status} />
              <PayBadge balance={r.ledger.balance} />
            </span>
          </li>
        ))}
      </ul>
      <figcaption className="border-t border-line px-4 py-2.5 text-xs text-fg-muted">Fictional members on {formatLongDay(today)}, from the demo.</figcaption>
    </figure>
  );
}
