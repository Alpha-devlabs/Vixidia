import { ArrowLeft, Clock, MessageSquarePlus, Pencil, Tag } from 'lucide-react';
import type { Interaction } from '../../types/crm';
import type { CustomerRow } from './crmLogic';
import { Avatar, CustomerStatusBadge, InteractionIcon, daysAgoLabel, formatWhen, interactionMeta } from './CustomerBits';
import { Button } from '../../components/Button';
import { Panel } from '../../components/Panel';
import { formatDate, pluralize } from '../../utils/format';

interface Props {
  row: CustomerRow;
  history: Interaction[];
  today: string;
  backLabel: string;
  onBack: () => void;
  onEdit: () => void;
  onLog: () => void;
}

export function CustomerProfile({ row, history, today, backLabel, onBack, onEdit, onLog }: Props) {
  const c = row.customer;
  const subtitle = [c.role, c.company].filter(Boolean).join(' · ');
  const details: [string, string | undefined][] = [
    ['Email', c.email],
    ['Phone', c.phone],
    ['Company', c.company],
    ['Role', c.role],
    ['City', c.city],
    ['Customer since', formatDate(c.addedOn)],
    ['Record updated', formatWhen(c.updatedOn, today)],
  ];

  return (
    <div className="space-y-6">
      <div>
        <button
          type="button"
          onClick={onBack}
          className="-ml-2 inline-flex min-h-9 items-center gap-1.5 rounded-[var(--radius-control)] px-2 text-sm font-medium text-fg-muted hover:bg-subtle hover:text-fg"
        >
          <ArrowLeft size={16} aria-hidden="true" /> {backLabel}
        </button>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar name={c.name} status={c.status} size="lg" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h1 className="text-2xl font-semibold tracking-[-0.02em] break-words text-fg sm:text-[1.75rem]">{c.name}</h1>
                <CustomerStatusBadge status={c.status} />
              </div>
              <p className="mt-0.5 text-sm text-fg-muted">
                {subtitle || 'No company recorded'}
                {c.city ? ` · ${c.city}` : ''}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={onEdit}>
              <Pencil size={16} aria-hidden="true" /> Edit
            </Button>
            <Button onClick={onLog}>
              <MessageSquarePlus size={17} aria-hidden="true" /> Log interaction
            </Button>
          </div>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-sm text-fg-muted">
          <Clock size={15} className={row.needsCatchUp ? 'text-warning-strong' : 'text-fg-subtle'} aria-hidden="true" />
          {row.lastContact ? (
            <span className={row.needsCatchUp ? 'text-warning-strong' : undefined}>
              Last contact {daysAgoLabel(row.daysSinceContact)}
              {row.needsCatchUp ? ' — not contacted in over 30 days' : ''}
            </span>
          ) : (
            <span className={row.needsCatchUp ? 'text-warning-strong' : undefined}>
              No interactions recorded yet{row.needsCatchUp ? ` — added ${daysAgoLabel(row.daysSinceContact)}` : ''}
            </span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="space-y-6 xl:order-2">
          <Panel title="Contact details">
            <dl className="divide-y divide-line text-sm">
              {details.map(([label, value]) => (
                <div key={label} className="grid gap-0.5 px-4 py-2.5 min-[420px]:grid-cols-[7.5rem_minmax(0,1fr)] min-[420px]:gap-3 sm:px-5">
                  <dt className="text-xs text-fg-muted min-[420px]:text-sm">{label}</dt>
                  <dd className={value ? 'break-words text-fg' : 'text-fg-subtle'}>
                    {value && label === 'Email' ? (
                      <>
                        {value.split('@')[0]}@<wbr />
                        {value.split('@').slice(1).join('@')}
                      </>
                    ) : (
                      (value ?? 'Not recorded')
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </Panel>
          <Panel title="Tags">
            <div className="p-4 sm:px-5">
              {c.tags.length ? (
                <ul className="flex flex-wrap gap-1.5" aria-label="Tags">
                  {c.tags.map((t) => (
                    <li key={t} className="inline-flex items-center gap-1 rounded-full border border-line bg-subtle px-2.5 py-0.5 text-xs font-medium text-fg-muted">
                      <Tag size={12} aria-hidden="true" />
                      {t}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-fg-subtle">No tags yet.</p>
              )}
            </div>
          </Panel>
          <Panel title="Notes">
            <p className={c.notes ? 'p-4 text-sm leading-relaxed whitespace-pre-line text-fg sm:px-5' : 'p-4 text-sm text-fg-subtle sm:px-5'}>
              {c.notes ?? 'No notes yet. Use Edit to add preferences or anything the team should know.'}
            </p>
          </Panel>
        </div>

        <Panel
          title="Interaction history"
          className="self-start xl:order-1"
          aside={<span className="tabular text-xs text-fg-muted">{pluralize(history.length, 'entry', 'entries')}</span>}
        >
          {history.length === 0 ? (
            <div className="flex flex-col items-center px-4 py-12 text-center">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-subtle text-fg-subtle">
                <MessageSquarePlus size={20} aria-hidden="true" />
              </span>
              <p className="mt-3 font-medium text-fg">No interactions yet</p>
              <p className="mt-1 max-w-[40ch] text-sm text-fg-muted">Log calls, meetings, emails, messages and notes to build up this customer’s history.</p>
              <Button variant="secondary" size="sm" className="mt-4" onClick={onLog}>
                Log the first interaction
              </Button>
            </div>
          ) : (
            <ol className="relative px-4 py-2 sm:px-5" aria-label={`Interactions with ${c.name}, newest first`}>
              {history.map((n, i) => (
                <li key={n.id} className="relative flex gap-3 py-3">
                  {i < history.length - 1 ? <span className="absolute top-12 bottom-0 left-4 w-px bg-line" aria-hidden="true" /> : null}
                  <InteractionIcon type={n.type} />
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                      <span className="font-medium text-fg">{interactionMeta[n.type].label}</span>
                      <time dateTime={n.date} className="tabular text-xs text-fg-muted">
                        {formatWhen(n.date, today)}
                      </time>
                    </p>
                    <p className="mt-0.5 text-sm leading-relaxed break-words text-fg-muted">{n.summary}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>
    </div>
  );
}
