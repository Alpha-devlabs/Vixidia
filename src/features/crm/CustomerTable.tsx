import { ChevronRight } from 'lucide-react';
import type { CustomerRow } from './crmLogic';
import { Avatar, CustomerStatusBadge, formatWhen } from './CustomerBits';

interface Props {
  rows: CustomerRow[];
  today: string;
  onOpen: (customerId: string) => void;
  /** Accessible name for the table / list. */
  caption: string;
}

/**
 * The customer directory: a table when its container is wide enough, otherwise
 * stacked rows. Each customer is opened through one real, clearly named button.
 */
export function CustomerTable({ rows, today, onOpen, caption }: Props) {
  return (
    <div className="@container">
      <div className="hidden @3xl:block">
        <table className="w-full table-fixed text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="border-b border-line bg-subtle/60 text-xs text-fg-muted">
            <tr>
              <th scope="col" className="w-[34%] px-4 py-2.5 font-medium sm:px-5">Customer</th>
              <th scope="col" className="w-[30%] px-3 py-2.5 font-medium">Contact</th>
              <th scope="col" className="w-[14%] px-3 py-2.5 font-medium">Status</th>
              <th scope="col" className="w-[16%] px-3 py-2.5 font-medium whitespace-nowrap">Last updated</th>
              <th scope="col" className="w-10 px-2 py-2.5">
                <span className="sr-only">Open</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => {
              const c = r.customer;
              return (
                <tr key={c.id} className="group relative transition-colors hover:bg-subtle/50 focus-within:bg-subtle/50">
                  <td className="px-4 py-3 sm:px-5">
                    <button
                      type="button"
                      onClick={() => onOpen(c.id)}
                      className="flex max-w-full items-center gap-3 text-left after:absolute after:inset-0 after:content-['']"
                      aria-label={`Open ${c.name}${c.company ? `, ${c.company}` : ''}`}
                    >
                      <Avatar name={c.name} status={c.status} />
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-fg">{c.name}</span>
                        <span className="block truncate text-xs text-fg-muted">{c.company ?? c.role ?? c.city ?? '—'}</span>
                      </span>
                    </button>
                  </td>
                  <td className="px-3 py-3 text-fg-muted">
                    <span className="block truncate">{c.email ?? <span className="text-fg-subtle">No email</span>}</span>
                    <span className="tabular block truncate text-xs">{c.phone ?? <span className="text-fg-subtle">No phone</span>}</span>
                  </td>
                  <td className="px-3 py-3">
                    <CustomerStatusBadge status={c.status} />
                  </td>
                  <td className="tabular px-3 py-3 whitespace-nowrap text-fg-muted">
                    {formatWhen(r.lastActivity, today)}
                    {r.needsCatchUp ? <span className="block text-xs text-warning-strong">No contact in {r.daysSinceContact} days</span> : null}
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

      <ul className="divide-y divide-line @3xl:hidden" aria-label={caption}>
        {rows.map((r) => {
          const c = r.customer;
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onOpen(c.id)}
                className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-subtle/50"
                aria-label={`Open ${c.name}${c.company ? `, ${c.company}` : ''}`}
              >
                <Avatar name={c.name} status={c.status} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-fg">{c.name}</span>
                      <span className="block truncate text-xs text-fg-muted">{c.company ?? c.role ?? c.city ?? '—'}</span>
                    </span>
                    <ChevronRight size={18} className="mt-0.5 shrink-0 text-fg-subtle" aria-hidden="true" />
                  </span>
                  <span className="mt-1 block truncate text-xs text-fg-muted">{c.email ?? c.phone ?? ''}</span>
                  <span className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <CustomerStatusBadge status={c.status} />
                    <span className="tabular text-xs text-fg-subtle">Updated {formatWhen(r.lastActivity, today, true)}</span>
                    {r.needsCatchUp ? <span className="text-xs text-warning-strong">No contact in {r.daysSinceContact} days</span> : null}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
