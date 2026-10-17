import { ChevronRight, PackageCheck } from 'lucide-react';
import { Button } from '../../components/Button';
import { money, orderText, type DeliveryRow } from './waterLogic';
import { DeliveryStatusBadge, Initials, PaymentBadge } from './WaterBits';

interface Props {
  rows: DeliveryRow[];
  /** Recording is offered only for today's pending deliveries. */
  today: string;
  onOpen: (deliveryId: string) => void;
  onRecord: (deliveryId: string) => void;
}

function quantity(r: DeliveryRow) {
  const c = r.delivery.completion;
  return c ? orderText(c.cans, c.cartons) : orderText(r.delivery.cans, r.delivery.cartons);
}

function empties(r: DeliveryRow) {
  const s = r.delivery.status;
  if (s === 'completed') return `${r.empties} collected`;
  if (s === 'scheduled') return r.empties ? `${r.empties} to collect` : 'None held';
  return '—';
}

/** "₹200.00" when paid, otherwise what is still due on this delivery. */
function amountText(r: DeliveryRow) {
  if (r.delivery.status !== 'completed') return '';
  const due = Math.max(0, r.charge - r.collected);
  return due === 0 ? money(r.charge) : `${money(due)} due`;
}

function Money({ r }: { r: DeliveryRow }) {
  return (
    <span className="flex flex-col items-start gap-0.5">
      <PaymentBadge state={r.payment} />
      {r.delivery.status === 'completed' ? <span className="tabular text-xs text-fg-muted">{amountText(r)}</span> : null}
    </span>
  );
}

function Action({ r, today, onRecord, onOpen }: { r: DeliveryRow; today: string; onRecord: () => void; onOpen: () => void }) {
  if (r.delivery.status === 'scheduled' && r.delivery.date === today)
    return (
      <Button variant="secondary" size="sm" onClick={onRecord} ariaLabel={`Record delivery for ${r.customer.name}`}>
        <PackageCheck size={15} aria-hidden="true" /> Record
      </Button>
    );
  return (
    <Button variant="subtle" size="sm" onClick={onOpen} ariaLabel={`Details of ${r.customer.name}’s delivery`}>
      Details <ChevronRight size={15} aria-hidden="true" />
    </Button>
  );
}

/** A day's deliveries: a table on wide containers, compact cards on narrow ones. */
export function DeliveryList({ rows, today, onOpen, onRecord }: Props) {
  return (
    <div className="@container">
      <table className="hidden w-full table-fixed text-left text-sm @3xl:table">
        <caption className="sr-only">Deliveries</caption>
        <colgroup>
          <col />
          <col className="w-36" />
          <col className="w-28" />
          <col className="w-32" />
          <col className="w-52" />
          <col className="w-28" />
        </colgroup>
        <thead className="border-b border-line bg-subtle/60 text-xs text-fg-muted">
          <tr>
            <th scope="col" className="px-4 py-2.5 font-medium sm:px-5">Customer</th>
            <th scope="col" className="px-3 py-2.5 font-medium">Quantity</th>
            <th scope="col" className="px-3 py-2.5 font-medium" title="Reusable 20-litre cans">Empty cans</th>
            <th scope="col" className="px-3 py-2.5 font-medium">Payment</th>
            <th scope="col" className="px-3 py-2.5 font-medium">Delivery</th>
            <th scope="col" className="px-3 py-2.5 font-medium">
              <span className="sr-only">Action</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => (
            <tr key={r.delivery.id} className="align-middle transition-colors hover:bg-subtle/40">
              <td className="px-4 py-2.5 sm:px-5">
                <button type="button" onClick={() => onOpen(r.delivery.id)} className="flex max-w-full items-center gap-3 text-left" aria-label={`Open ${r.customer.name}’s delivery`}>
                  <Initials name={r.customer.name} muted={r.delivery.status === 'failed' || r.delivery.status === 'rescheduled'} />
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-fg hover:underline">{r.customer.name}</span>
                    <span className="block truncate text-xs text-fg-muted">{r.customer.locality}</span>
                  </span>
                </button>
              </td>
              <td className="tabular px-3 py-2.5 text-fg">{quantity(r)}</td>
              <td className="tabular px-3 py-2.5 text-fg-muted">{empties(r)}</td>
              <td className="px-3 py-2.5">
                <Money r={r} />
              </td>
              <td className="px-3 py-2.5">
                <DeliveryStatusBadge status={r.delivery.status} {...(r.movedToDate ? { movedTo: r.movedToDate } : {})} />
              </td>
              <td className="px-3 py-2.5 text-right">
                <Action r={r} today={today} onRecord={() => onRecord(r.delivery.id)} onOpen={() => onOpen(r.delivery.id)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="divide-y divide-line @3xl:hidden" aria-label="Deliveries">
        {rows.map((r) => (
          <li key={r.delivery.id} className="px-4 py-3">
            <div className="flex items-start gap-3">
              <button type="button" onClick={() => onOpen(r.delivery.id)} className="flex min-w-0 flex-1 items-start gap-3 text-left" aria-label={`Open ${r.customer.name}’s delivery`}>
                <Initials name={r.customer.name} muted={r.delivery.status === 'failed' || r.delivery.status === 'rescheduled'} />
                <span className="min-w-0">
                  <span className="block truncate font-medium text-fg">{r.customer.name}</span>
                  <span className="tabular block truncate text-xs text-fg-muted">
                    {r.customer.locality} · {quantity(r)}
                  </span>
                </span>
              </button>
              <Action r={r} today={today} onRecord={() => onRecord(r.delivery.id)} onOpen={() => onOpen(r.delivery.id)} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 pl-12">
              <DeliveryStatusBadge status={r.delivery.status} {...(r.movedToDate ? { movedTo: r.movedToDate } : {})} />
              {r.delivery.status === 'completed' ? <PaymentBadge state={r.payment} /> : null}
              <span className="tabular text-xs text-fg-muted">Empties: {empties(r)}</span>
              {r.delivery.status === 'completed' ? <span className="tabular text-xs text-fg-muted">{amountText(r)}</span> : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
