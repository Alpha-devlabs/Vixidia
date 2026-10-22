import { useId, useMemo, useState } from 'react';
import { AlertTriangle, Package, ShieldCheck, Users } from 'lucide-react';
import type { WaterState } from '../../types/water';
import { canBalances, canSummary, scheduleLabel } from './waterLogic';
import { sampleBusiness } from '../../data/waterSample';
import { formatCurrency, pluralize } from '../../utils/format';
import { cn } from '../../utils/cn';

type CanFilter = 'all' | 'beyond';

/**
 * Where every can is: how many each customer holds, what their deposit covers,
 * and who is holding more cans than they paid a deposit for.
 */
export function CansView({ state }: { state: WaterState }) {
  const headingId = useId();
  const [filter, setFilter] = useState<CanFilter>('all');
  const balances = useMemo(() => canBalances(state, sampleBusiness.depositPerCan), [state]);
  const totals = canSummary(balances);
  const visible = filter === 'beyond' ? balances.filter((b) => b.beyondDeposit > 0) : balances;

  const cards = [
    { label: 'Cans with customers', value: String(totals.cansOut), detail: `across ${pluralize(balances.filter((b) => b.cansHeld > 0).length, 'customer')}`, icon: Package },
    {
      label: 'Beyond deposit',
      value: String(totals.beyondDeposit),
      detail: totals.customersBeyond === 0 ? 'Every can is covered' : `${pluralize(totals.customersBeyond, 'customer')} to follow up`,
      icon: AlertTriangle,
      emphasis: totals.beyondDeposit > 0,
    },
    { label: 'Deposits held', value: formatCurrency(totals.depositHeld), detail: `${formatCurrency(sampleBusiness.depositPerCan)} per can`, icon: ShieldCheck },
    { label: 'Regular customers', value: String(state.customers.filter((c) => c.schedule).length), detail: 'with a set delivery pattern', icon: Users },
  ];

  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Can summary">
        {cards.map((c) => (
          <div
            key={c.label}
            className={cn('rounded-[var(--radius-panel)] border p-4 shadow-[var(--shadow-panel)]', c.emphasis ? 'border-warning/60 bg-warning-soft' : 'border-line bg-surface')}
          >
            <dt className="flex items-center gap-2 text-sm font-medium text-fg-muted">
              <c.icon size={16} aria-hidden="true" />
              {c.label}
            </dt>
            <dd className="mt-2">
              <span className="tabular block text-2xl font-semibold tracking-[-0.02em] text-fg sm:text-[1.75rem]">{c.value}</span>
              <span className="mt-1 block text-xs text-fg-muted sm:text-sm">{c.detail}</span>
            </dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby={headingId} className="rounded-[var(--radius-panel)] border border-line bg-surface shadow-[var(--shadow-panel)]">
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 id={headingId} className="text-base font-semibold">
            Cans by customer
          </h2>
          <div role="radiogroup" aria-label="Show" className="inline-flex rounded-[var(--radius-control)] border border-line p-1">
            {(
              [
                ['all', 'Everyone'],
                ['beyond', 'Beyond deposit'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={filter === value}
                onClick={() => setFilter(value)}
                className={cn('rounded-md px-3 py-1 text-sm font-medium', filter === value ? 'bg-accent text-on-accent' : 'text-fg-muted hover:text-fg')}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {visible.length === 0 ? (
          <p className="px-4 py-10 text-center text-fg-muted">Nobody is holding cans beyond their deposit.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-fg-muted">
                  <th scope="col" className="px-4 py-2.5 font-medium">Customer</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Regular delivery</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">Cans held</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">Deposit covers</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">Beyond deposit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visible.map((b) => (
                  <tr key={b.customer.id}>
                    <th scope="row" className="px-4 py-3 text-left font-normal">
                      <span className="block font-semibold text-fg">{b.customer.name}</span>
                      <span className="block text-xs text-fg-muted">{b.customer.area}</span>
                    </th>
                    <td className="px-4 py-3 text-fg-muted">{b.customer.schedule ? scheduleLabel(b.customer.schedule) : 'When they call'}</td>
                    <td className="tabular px-4 py-3 text-right font-semibold">{b.cansHeld}</td>
                    <td className="tabular px-4 py-3 text-right text-fg-muted">
                      {b.depositCans} <span className="text-xs">({formatCurrency(b.depositHeld)})</span>
                    </td>
                    <td className="tabular px-4 py-3 text-right">
                      {b.beyondDeposit > 0 ? (
                        <span className="font-semibold text-warning-strong">
                          {b.beyondDeposit} · {formatCurrency(b.beyondDeposit * sampleBusiness.depositPerCan)} due
                        </span>
                      ) : (
                        <span className="text-fg-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="border-t border-line px-4 py-3 text-xs text-fg-muted">
          Can balances update as empties are recorded on each delivery. Ask customers beyond their deposit to return cans or pay the extra deposit.
        </p>
      </section>
    </div>
  );
}
