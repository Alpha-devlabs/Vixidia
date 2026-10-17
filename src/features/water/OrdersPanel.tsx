import { useId, useMemo } from 'react';
import { Search, SearchX } from 'lucide-react';
import type { WaterOrder, WaterState } from '../../types/water';
import { filterOrders, indexCustomers, matchesFilter, orderFilters, orderTotal, type OrderFilter } from './waterLogic';
import { DeliveryPill, PaymentPill } from './StatusPills';
import type { WaterActions } from './useWaterDemo';
import { Button } from '../../components/Button';
import { controlClass } from '../../components/forms';
import { formatCurrency, formatDay, pluralize } from '../../utils/format';
import { cn } from '../../utils/cn';

interface OrdersPanelProps {
  state: WaterState;
  heading: string;
  /** Restrict to a single day; omit for all orders. */
  day?: string;
  query: string;
  onQueryChange: (q: string) => void;
  filter: OrderFilter;
  onFilterChange: (f: OrderFilter) => void;
  onOpenOrder: (orderId: string) => void;
  actions: WaterActions;
}

export function OrdersPanel({
  state,
  heading,
  day,
  query,
  onQueryChange,
  filter,
  onFilterChange,
  onOpenOrder,
  actions,
}: OrdersPanelProps) {
  const searchId = useId();
  const headingId = useId();
  const customers = useMemo(() => indexCustomers(state.customers), [state.customers]);
  const scoped = useMemo(() => (day ? state.orders.filter((o) => o.date === day) : state.orders), [state.orders, day]);
  const visible = useMemo(() => filterOrders(state, { query, filter, day }), [state, query, filter, day]);
  const hasCriteria = query.trim() !== '' || filter !== 'all';

  return (
    <section aria-labelledby={headingId} className="rounded-[var(--radius-panel)] border border-line bg-surface shadow-[var(--shadow-panel)]">
      <div className="flex flex-col gap-3 border-b border-line p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id={headingId} className="text-base font-semibold">
            {heading}
          </h2>
          <p className="text-sm text-fg-muted" aria-live="polite">
            Showing {visible.length} of {pluralize(scoped.length, 'order')}
          </p>
        </div>

        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="relative xl:w-64">
            <label htmlFor={searchId} className="sr-only">
              Search orders by number, customer or area
            </label>
            <Search
              size={17}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fg-subtle"
              aria-hidden="true"
            />
            <input
              id={searchId}
              type="search"
              value={query}
              onChange={(e: { target: { value: string } }) => onQueryChange(e.target.value)}
              placeholder="Search number, customer, area"
              className={controlClass(false, 'h-11 pl-9')}
            />
          </div>
          <div role="group" aria-label="Filter orders by status" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 xl:pb-0">
            {orderFilters.map((f) => {
              const count = scoped.filter((o) => matchesFilter(o, f.value)).length;
              const active = filter === f.value;
              return (
                <button
                  key={f.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onFilterChange(f.value)}
                  className={cn(
                    'inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors',
                    active ? 'border-accent bg-accent-soft text-accent-strong' : 'border-line bg-surface text-fg-muted hover:border-line-strong hover:text-fg',
                  )}
                >
                  {f.label}
                  <span className={cn('tabular text-xs', active ? 'text-accent-strong' : 'text-fg-subtle')}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center px-4 py-12 text-center">
          <SearchX size={28} className="text-fg-subtle" aria-hidden="true" />
          <p className="mt-3 font-medium">
            {hasCriteria ? 'No orders match this search and filter.' : 'No orders yet for this view.'}
          </p>
          {hasCriteria ? (
            <Button
              variant="secondary"
              size="sm"
              className="mt-4"
              onClick={() => {
                onQueryChange('');
                onFilterChange('all');
              }}
            >
              Clear search and filter
            </Button>
          ) : null}
        </div>
      ) : (
        <>
          <OrdersTable orders={visible} customers={customers} showDate={!day} onOpenOrder={onOpenOrder} actions={actions} />
          <OrdersList orders={visible} customers={customers} showDate={!day} onOpenOrder={onOpenOrder} actions={actions} />
        </>
      )}
    </section>
  );
}

interface ListProps {
  orders: WaterOrder[];
  customers: Map<string, { name: string; area: string }>;
  showDate: boolean;
  onOpenOrder: (orderId: string) => void;
  actions: WaterActions;
}

function RowActions({ order, actions }: { order: WaterOrder; actions: WaterActions }) {
  return (
    <div className="flex flex-wrap justify-end gap-1.5 md:flex-nowrap">
      {order.delivery === 'pending' ? (
        <Button variant="secondary" size="sm" onClick={() => actions.markDelivered(order.id, order.number)} ariaLabel={`Mark ${order.number} delivered`}>
          Mark delivered
        </Button>
      ) : null}
      {order.payment === 'unpaid' ? (
        <Button variant="secondary" size="sm" onClick={() => actions.markPaid(order.id, order.number)} ariaLabel={`Mark ${order.number} paid`}>
          Mark paid
        </Button>
      ) : null}
    </div>
  );
}

/** Table layout for medium screens and up. */
function OrdersTable({ orders, customers, showDate, onOpenOrder, actions }: ListProps) {
  return (
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-subtle/60 text-fg-muted">
          <tr>
            <th scope="col" className="px-4 py-2.5 font-medium">Order</th>
            {showDate ? <th scope="col" className="px-2 py-2.5 font-medium">Date</th> : null}
            <th scope="col" className="px-2 py-2.5 text-right font-medium">Cans</th>
            <th scope="col" className="px-2 py-2.5 text-right font-medium">Amount</th>
            <th scope="col" className="px-2 py-2.5 font-medium">Status</th>
            <th scope="col" className="px-4 py-2.5 text-right font-medium">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => {
            const c = customers.get(o.customerId);
            return (
              <tr key={o.id} className="border-t border-line align-middle hover:bg-subtle/40">
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => onOpenOrder(o.id)}
                    className="group text-left"
                    aria-label={`Open order ${o.number} for ${c?.name ?? 'unknown customer'}`}
                  >
                    <span className="block font-semibold group-hover:underline group-hover:decoration-accent group-hover:decoration-2 group-hover:underline-offset-2">
                      {c?.name ?? 'Unknown customer'}
                    </span>
                    <span className="tabular block text-xs text-fg-muted">
                      {o.number} · {c?.area}
                    </span>
                  </button>
                </td>
                {showDate ? <td className="tabular px-2 py-3 text-fg-muted">{formatDay(o.date)}</td> : null}
                <td className="tabular px-2 py-3 text-right">{o.quantity}</td>
                <td className="tabular px-2 py-3 text-right font-medium">{formatCurrency(orderTotal(o))}</td>
                <td className="px-2 py-3">
                  <div className="flex flex-wrap gap-1">
                    <DeliveryPill status={o.delivery} />
                    <PaymentPill status={o.payment} />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <RowActions order={o} actions={actions} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Stacked list layout for small screens. */
function OrdersList({ orders, customers, showDate, onOpenOrder, actions }: ListProps) {
  return (
    <ul className="divide-y divide-line md:hidden">
      {orders.map((o) => {
        const c = customers.get(o.customerId);
        return (
          <li key={o.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <button
                type="button"
                onClick={() => onOpenOrder(o.id)}
                className="min-w-0 text-left"
                aria-label={`Open order ${o.number} for ${c?.name ?? 'unknown customer'}`}
              >
                <span className="block truncate font-semibold">{c?.name ?? 'Unknown customer'}</span>
                <span className="tabular block text-xs text-fg-muted">
                  {o.number} · {c?.area}
                  {showDate ? ` · ${formatDay(o.date)}` : ''}
                </span>
              </button>
              <span className="tabular shrink-0 text-right">
                <span className="block font-semibold">{formatCurrency(orderTotal(o))}</span>
                <span className="block text-xs text-fg-muted">{pluralize(o.quantity, 'can')}</span>
              </span>
            </div>
            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1">
                <DeliveryPill status={o.delivery} />
                <PaymentPill status={o.payment} />
              </div>
              <RowActions order={o} actions={actions} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
