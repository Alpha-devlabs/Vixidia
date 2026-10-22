import { useMemo } from 'react';
import { ClipboardList, LayoutDashboard, Package, Truck, Users, type LucideIcon } from 'lucide-react';
import { createSampleState, sampleBusiness } from '../../data/waterSample';
import { filterOrders, indexCustomers, orderTotal, summarize } from './waterLogic';
import { MetricCards } from './MetricCards';
import { DeliveryPill, PaymentPill } from './StatusPills';
import { formatCurrency } from '../../utils/format';
import { cn } from '../../utils/cn';

const previewNav: { icon: LucideIcon; label: string }[] = [
  { icon: LayoutDashboard, label: 'Today' },
  { icon: Truck, label: 'Delivery round' },
  { icon: ClipboardList, label: 'All orders' },
  { icon: Users, label: 'Customers' },
  { icon: Package, label: 'Cans & deposits' },
];

/** Read-only snapshot of the dashboard, rendered from the same sample data and logic. */
export function WaterPreview() {
  const { summary, rows, customers } = useMemo(() => {
    const s = createSampleState();
    return {
      summary: summarize(s, sampleBusiness.today),
      rows: filterOrders(s, { query: '', filter: 'all', day: sampleBusiness.today }).slice(0, 4),
      customers: indexCustomers(s.customers),
    };
  }, []);

  return (
    <figure className="overflow-hidden rounded-[var(--radius-panel)] border border-line bg-canvas shadow-[var(--shadow-panel)]">
      <div inert className="pointer-events-none flex">
        <div className="on-inverse hidden w-44 shrink-0 flex-col gap-1 bg-inverse p-3 text-on-inverse sm:flex" aria-hidden="true">
          <p className="px-2 pb-3 text-xs font-semibold text-on-inverse-muted">{sampleBusiness.name}</p>
          {previewNav.map(({ icon: Icon, label }, i) => (
            <span key={label} className={cn('flex items-center gap-2 rounded-md px-2 py-1.5 text-xs', i === 0 ? 'bg-on-inverse/10 font-medium text-on-inverse' : 'text-on-inverse-muted')}>
              <Icon size={14} /> {label}
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1 space-y-3 p-3 sm:p-4">
          <MetricCards summary={summary} />
          <div className="rounded-[var(--radius-panel)] border border-line bg-surface">
            <p className="border-b border-line px-3 py-2 text-sm font-semibold text-fg">Today’s orders</p>
            <ul className="divide-y divide-line">
              {rows.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                  <span className="min-w-0">
                    <span className="font-medium text-fg">{customers.get(o.customerId)?.name}</span> <span className="tabular text-xs text-fg-muted">{o.number}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="tabular mr-1 text-fg-muted">{formatCurrency(orderTotal(o))}</span>
                    <DeliveryPill status={o.delivery} />
                    <PaymentPill status={o.payment} />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <figcaption className="border-t border-line px-4 py-2.5 text-xs text-fg-muted">Fictional sample business ({sampleBusiness.name}), from the demo.</figcaption>
    </figure>
  );
}
