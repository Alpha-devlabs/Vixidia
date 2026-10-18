import { useState } from 'react';
import { ClipboardList, Clock, Droplets, LayoutDashboard, Plus, RotateCcw, Users, Wallet, type LucideIcon } from 'lucide-react';
import { useWaterDemo } from './useWaterDemo';
import { MetricCards } from './MetricCards';
import { OrdersPanel } from './OrdersPanel';
import { DuesPanel } from './DuesPanel';
import { CustomersView } from './CustomersView';
import { OrderDetailDialog } from './OrderDetailDialog';
import { AddOrderDialog } from './AddOrderDialog';
import type { OrderFilter } from './waterLogic';
import { sampleBusiness } from '../../data/waterSample';
import { Button } from '../../components/Button';
import { ToastRegion } from '../../components/Toast';
import { formatLongDay } from '../../utils/format';
import { cn } from '../../utils/cn';
import { useResetDemo } from '../demo/useResetDemo';

type View = 'today' | 'orders' | 'customers';

const views: { id: View; label: string; icon: LucideIcon }[] = [
  { id: 'today', label: 'Today', icon: LayoutDashboard },
  { id: 'orders', label: 'All orders', icon: ClipboardList },
  { id: 'customers', label: 'Customers', icon: Users },
];

/**
 * Water Delivery Management sample-data dashboard (the original water-delivery
 * demo). All state is local to this component tree.
 */
export function WaterApp() {
  const { state, summary, actions, toast, changed } = useWaterDemo();
  const [view, setView] = useState<View>('today');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<OrderFilter>('all');
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [presetCustomer, setPresetCustomer] = useState<string | undefined>(undefined);

  const goTo = (next: View) => {
    setView(next);
    setQuery('');
    setFilter('all');
  };

  const openAdd = (customerId?: string) => {
    setPresetCustomer(customerId);
    setAddOpen(true);
  };

  const showFilter = (f: OrderFilter) => {
    setView('today');
    setQuery('');
    setFilter(f);
  };

  // Reset restores the sample data and the starting view: today's run, no search or filter, nothing open.
  const resetNow = () => {
    actions.reset();
    setView('today');
    setQuery('');
    setFilter('all');
    setOpenOrderId(null);
    setAddOpen(false);
  };
  const { reset, resetDialog } = useResetDemo(changed, resetNow);

  const quickActions: { label: string; icon: LucideIcon; onClick: () => void }[] = [
    { label: 'New order', icon: Plus, onClick: () => openAdd() },
    { label: 'Show deliveries left', icon: Clock, onClick: () => showFilter('pending') },
    { label: 'Show unpaid orders', icon: Wallet, onClick: () => showFilter('unpaid') },
    { label: 'Reset sample data', icon: RotateCcw, onClick: reset },
  ];

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col lg:flex-row">
      {/* App navigation: side rail on desktop, tab strip on smaller screens. */}
      <aside className="on-inverse border-b border-inverse-line bg-inverse text-on-inverse lg:w-60 lg:shrink-0 lg:border-r lg:border-b-0">
        <div className="px-4 py-4 lg:sticky lg:top-14 lg:px-5 lg:py-6">
          <p className="flex items-center gap-2.5">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-accent text-on-accent">
              <Droplets size={17} aria-hidden="true" />
            </span>
            <span className="leading-tight">
              <span className="block text-xs text-on-inverse-muted">Business</span>
              <span className="block font-semibold">{sampleBusiness.name}</span>
            </span>
          </p>
          <nav aria-label="Water Delivery Management" className="mt-4 flex gap-1 overflow-x-auto lg:mt-8 lg:flex-col">
            {views.map((v) => {
              const active = view === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => goTo(v.id)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative inline-flex min-h-10 shrink-0 items-center gap-2.5 rounded-[var(--radius-control)] px-3 text-sm font-medium transition-colors',
                    active ? 'bg-on-inverse/10 text-on-inverse' : 'text-on-inverse-muted hover:bg-on-inverse/5 hover:text-on-inverse',
                  )}
                >
                  {active ? <span className="absolute inset-y-2 left-0 hidden w-0.5 rounded-full bg-accent lg:block" aria-hidden="true" /> : null}
                  <v.icon size={17} aria-hidden="true" />
                  {v.label}
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      <div className="min-w-0 flex-1 bg-canvas">
        <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-[-0.02em] text-fg sm:text-[1.75rem]">{view === 'today' ? 'Today’s run' : views.find((v) => v.id === view)?.label}</h1>
              <p className="mt-1 text-sm text-fg-muted">{formatLongDay(sampleBusiness.today)} · sample day</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={reset}>
                <RotateCcw size={16} aria-hidden="true" /> Reset demo
              </Button>
              <Button size="sm" onClick={() => openAdd()}>
                <Plus size={16} aria-hidden="true" /> New order
              </Button>
            </div>
          </div>

          {view === 'today' ? (
            <>
              <MetricCards summary={summary} />
              <div className="grid grid-cols-[minmax(0,1fr)] gap-5 2xl:grid-cols-[minmax(0,1fr)_20rem]">
                <OrdersPanel
                  state={state}
                  heading="Today’s orders"
                  day={sampleBusiness.today}
                  query={query}
                  onQueryChange={setQuery}
                  filter={filter}
                  onFilterChange={setFilter}
                  onOpenOrder={setOpenOrderId}
                  actions={actions}
                />
                <div className="grid content-start gap-5 lg:grid-cols-2 2xl:grid-cols-1">
                  <section aria-labelledby="water-quick-actions" className="self-start rounded-[var(--radius-panel)] border border-line bg-surface p-4 shadow-[var(--shadow-panel)]">
                    <h2 id="water-quick-actions" className="text-base font-semibold text-fg">
                      Quick actions
                    </h2>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {quickActions.map((qa) => (
                        <button
                          key={qa.label}
                          type="button"
                          onClick={qa.onClick}
                          className="inline-flex min-h-11 items-center gap-2.5 rounded-[var(--radius-control)] border border-line px-3 text-left text-sm font-medium text-fg transition-colors hover:border-line-strong hover:bg-subtle/60"
                        >
                          <qa.icon size={17} className="shrink-0 text-accent-strong" aria-hidden="true" />
                          {qa.label}
                        </button>
                      ))}
                    </div>
                  </section>
                  <DuesPanel state={state} actions={actions} />
                </div>
              </div>
            </>
          ) : null}

          {view === 'orders' ? (
            <OrdersPanel
              state={state}
              heading="Every order"
              query={query}
              onQueryChange={setQuery}
              filter={filter}
              onFilterChange={setFilter}
              onOpenOrder={setOpenOrderId}
              actions={actions}
            />
          ) : null}

          {view === 'customers' ? <CustomersView state={state} actions={actions} onNewOrderFor={openAdd} onOpenOrder={setOpenOrderId} /> : null}
        </div>
      </div>

      <OrderDetailDialog state={state} orderId={openOrderId} onClose={() => setOpenOrderId(null)} actions={actions} />
      <AddOrderDialog open={addOpen} onClose={() => setAddOpen(false)} customers={state.customers} onAdd={actions.addOrder} presetCustomerId={presetCustomer} />
      {resetDialog}
      <ToastRegion toast={toast} />
    </div>
  );
}
