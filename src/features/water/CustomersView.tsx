import { useId, useMemo, useState } from 'react';
import { Search, SearchX, Plus } from 'lucide-react';
import type { WaterState } from '../../types/water';
import { customerBalances, orderTotal, searchCustomers } from './waterLogic';
import { Dialog } from '../../components/Dialog';
import { Button } from '../../components/Button';
import { controlClass } from '../../components/forms';
import { DeliveryPill, PaymentPill } from './StatusPills';
import type { WaterActions } from './useWaterDemo';
import { formatCurrency, formatDay, pluralize } from '../../utils/format';

const kindLabel = { home: 'Household', shop: 'Shop', office: 'Office or clinic' } as const;

interface Props {
  state: WaterState;
  actions: WaterActions;
  onNewOrderFor: (customerId: string) => void;
  onOpenOrder: (orderId: string) => void;
}

export function CustomersView({ state, actions, onNewOrderFor, onOpenOrder }: Props) {
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const searchId = useId();
  const headingId = useId();

  const balances = useMemo(
    () => customerBalances(state).sort((a, b) => a.customer.name.localeCompare(b.customer.name)),
    [state],
  );
  const visible = searchCustomers(balances, query);
  const selected = balances.find((b) => b.customer.id === openId);
  const selectedOrders = selected
    ? state.orders.filter((o) => o.customerId === selected.customer.id).sort((a, b) => (a.date < b.date ? 1 : -1))
    : [];

  return (
    <section aria-labelledby={headingId} className="rounded-[var(--radius-panel)] border border-line bg-surface shadow-[var(--shadow-panel)]">
      <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 id={headingId} className="text-base font-semibold">
          Customers <span className="tabular font-normal text-fg-muted">({balances.length})</span>
        </h2>
        <div className="relative sm:w-64">
          <label htmlFor={searchId} className="sr-only">
            Search customers by name or area
          </label>
          <Search size={17} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(e: { target: { value: string } }) => setQuery(e.target.value)}
            placeholder="Search name or area"
            className={controlClass(false, 'h-11 pl-9')}
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center px-4 py-12 text-center">
          <SearchX size={28} className="text-fg-subtle" aria-hidden="true" />
          <p className="mt-3 font-medium">No customers match “{query.trim()}”.</p>
          <Button variant="secondary" size="sm" className="mt-4" onClick={() => setQuery('')}>
            Clear search
          </Button>
        </div>
      ) : (
        <ul className="grid divide-y divide-line">
          {visible.map((b) => (
            <li key={b.customer.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => setOpenId(b.customer.id)}
                aria-label={`Open customer ${b.customer.name}`}
              >
                <span className="block font-semibold hover:underline hover:decoration-accent hover:decoration-2 hover:underline-offset-2">
                  {b.customer.name}
                </span>
                <span className="block text-sm text-fg-muted">
                  {b.customer.area} · {kindLabel[b.customer.kind]} · {pluralize(b.orderCount, 'order')}
                </span>
              </button>
              <span className="tabular text-right text-sm">
                {b.outstanding > 0 ? (
                  <span className="font-semibold text-danger-strong">Owes {formatCurrency(b.outstanding)}</span>
                ) : (
                  <span className="text-fg-muted">No dues</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={selected !== undefined}
        onClose={() => setOpenId(null)}
        title={selected?.customer.name ?? 'Customer'}
        description={selected ? `${selected.customer.area} · ${kindLabel[selected.customer.kind]}` : undefined}
        footer={
          selected ? (
            <>
              {selected.outstanding > 0 ? (
                <Button variant="secondary" onClick={() => actions.settleCustomer(selected.customer.id, selected.customer.name)}>
                  Mark all dues paid
                </Button>
              ) : null}
              <Button
                onClick={() => {
                  setOpenId(null);
                  onNewOrderFor(selected.customer.id);
                }}
              >
                <Plus size={17} aria-hidden="true" /> New order
              </Button>
            </>
          ) : null
        }
      >
        {selected ? (
          <div className="space-y-5">
            <dl className="grid grid-cols-3 gap-2 text-center">
              {[
                ['Orders', String(selected.orderCount)],
                ['Last order', selected.lastOrderDate ? formatDay(selected.lastOrderDate) : '—'],
                ['Outstanding', formatCurrency(selected.outstanding)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[var(--radius-control)] bg-subtle/60 px-2 py-3">
                  <dt className="text-xs text-fg-muted">{label}</dt>
                  <dd className="tabular mt-1 font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
            {selected.customer.note ? <p className="text-sm text-fg-muted">Delivery note: {selected.customer.note}</p> : null}
            <div>
              <h3 className="text-sm font-semibold">Order history</h3>
              {selectedOrders.length === 0 ? (
                <p className="mt-2 text-sm text-fg-muted">No orders yet.</p>
              ) : (
                <ul className="mt-2 divide-y divide-line rounded-[var(--radius-control)] border border-line">
                  {selectedOrders.map((o) => (
                    <li key={o.id}>
                      <button
                        type="button"
                        className="flex w-full flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-left text-sm hover:bg-subtle/60"
                        onClick={() => {
                          setOpenId(null);
                          onOpenOrder(o.id);
                        }}
                        aria-label={`Open order ${o.number}`}
                      >
                        <span className="tabular">
                          <span className="font-medium">{o.number}</span>{' '}
                          <span className="text-fg-muted">
                            {formatDay(o.date)} · {formatCurrency(orderTotal(o))}
                          </span>
                        </span>
                        <span className="flex gap-1">
                          <DeliveryPill status={o.delivery} />
                          <PaymentPill status={o.payment} />
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}
      </Dialog>
    </section>
  );
}
