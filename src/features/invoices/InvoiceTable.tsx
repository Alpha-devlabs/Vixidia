import { ChevronRight } from 'lucide-react';
import type { InvoiceRow } from './invoiceView';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';
import { formatAmount, formatDate, pluralize } from '../../utils/format';

interface Props {
  rows: InvoiceRow[];
  onOpen: (invoiceId: string) => void;
  /** Accessible name for the table. */
  caption: string;
}

function dueNote(r: InvoiceRow): string | null {
  if (r.status === 'overdue') return `${pluralize(r.daysOverdue, 'day')} late`;
  if (r.status === 'partially_paid') return `${formatAmount(r.balance)} left`;
  return null;
}

/**
 * Invoices as a table when its container is wide enough, otherwise as stacked cards.
 * Uses container queries, so the same component fits a narrow dashboard panel and a full-width list.
 * Each row opens the invoice through one real button, so keyboard and screen-reader
 * users get a single, clearly named target per invoice.
 */
export function InvoiceTable({ rows, onOpen, caption }: Props) {
  return (
    <div className="@container">
      <div className="hidden @2xl:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="border-b border-line bg-subtle/60 text-xs font-medium text-fg-muted">
            <tr>
              <th scope="col" className="w-full px-4 py-2.5 font-medium sm:px-5">Invoice</th>
              <th scope="col" className="px-3 py-2.5 font-medium whitespace-nowrap">Due</th>
              <th scope="col" className="hidden px-3 py-2.5 font-medium whitespace-nowrap @3xl:table-cell">Issued</th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium whitespace-nowrap">Amount</th>
              <th scope="col" className="px-3 py-2.5 font-medium whitespace-nowrap">Status</th>
              <th scope="col" className="px-2 py-2.5">
                <span className="sr-only">Open</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => {
              const note = dueNote(r);
              return (
                <tr key={r.invoice.id} className="group relative transition-colors hover:bg-subtle/50 focus-within:bg-subtle/50">
                  <td className="max-w-0 px-4 py-3 sm:px-5">
                    <button
                      type="button"
                      onClick={() => onOpen(r.invoice.id)}
                      className="block max-w-full text-left after:absolute after:inset-0 after:content-['']"
                      aria-label={`Open ${r.invoice.number}, ${r.customer}`}
                    >
                      <span className="block truncate font-medium text-fg">{r.customer}</span>
                      <span className="tabular block text-xs whitespace-nowrap text-fg-muted">{r.invoice.number}</span>
                    </button>
                  </td>
                  <td className="tabular px-3 py-3 whitespace-nowrap text-fg-muted">
                    <span className="block">{formatDate(r.invoice.dueDate)}</span>
                    {note ? (
                      <span className={r.status === 'overdue' ? 'block text-xs text-danger-strong' : 'block text-xs text-fg-subtle'}>{note}</span>
                    ) : null}
                  </td>
                  <td className="tabular hidden px-3 py-3 whitespace-nowrap text-fg-muted @3xl:table-cell">{formatDate(r.invoice.issueDate)}</td>
                  <td className="tabular px-3 py-3 text-right font-medium whitespace-nowrap text-fg">{formatAmount(r.totals.total)}</td>
                  <td className="px-3 py-3">
                    <InvoiceStatusBadge status={r.status} />
                  </td>
                  <td className="px-2 py-3 text-fg-subtle">
                    <ChevronRight size={18} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-line @2xl:hidden" aria-label={caption}>
        {rows.map((r) => {
          const note = dueNote(r);
          return (
            <li key={r.invoice.id}>
              <button
                type="button"
                onClick={() => onOpen(r.invoice.id)}
                className="flex w-full items-start justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-subtle/50"
                aria-label={`Open ${r.invoice.number}, ${r.customer}`}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-fg">{r.customer}</span>
                  <span className="tabular block text-xs text-fg-muted">
                    {r.invoice.number} · Due {formatDate(r.invoice.dueDate)}
                  </span>
                  <span className="mt-2 flex flex-wrap items-center gap-2">
                    <InvoiceStatusBadge status={r.status} />
                    {note ? <span className={r.status === 'overdue' ? 'text-xs text-danger-strong' : 'text-xs text-fg-subtle'}>{note}</span> : null}
                  </span>
                </span>
                <span className="tabular shrink-0 pt-0.5 text-right font-semibold text-fg">{formatAmount(r.totals.total)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
