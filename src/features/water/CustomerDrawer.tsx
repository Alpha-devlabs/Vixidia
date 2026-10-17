import { ClipboardPlus, IndianRupee, Pencil } from 'lucide-react';
import type { WaterBook } from '../../types/water';
import { Dialog } from '../../components/Dialog';
import { Button } from '../../components/Button';
import { cn } from '../../utils/cn';
import { canMovement, deliveryCharge, labelOf, money, orderText, paymentMethods, recurringText, accountOf } from './waterLogic';
import { CustomerStatusBadge, DeliveryStatusBadge, Initials, shortDay } from './WaterBits';

interface Props {
  book: WaterBook;
  customerId: string | null;
  open: boolean;
  onClose: () => void;
  onEdit: (id: string) => void;
  onPay: (id: string) => void;
  onOrder: (id: string) => void;
  onOpenDelivery: (deliveryId: string) => void;
}

const HISTORY = 8;

/** Customer account: contact, regular order, balance, cans held, deliveries and payments. */
export function CustomerDrawer({ book, customerId, open, onClose, onEdit, onPay, onOrder, onOpenDelivery }: Props) {
  const acc = customerId ? accountOf(book, customerId) : undefined;
  if (!acc) return null;
  const c = acc.customer;
  const failedOrMoved = book.deliveries.filter((d) => d.customerId === c.id && (d.status === 'failed' || d.status === 'rescheduled')).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      variant="drawer"
      title={c.name}
      description={`${c.locality}${c.address ? ` · ${c.address}` : ''}`}
      footer={
        <>
          <Button variant="subtle" onClick={() => onEdit(c.id)}>
            <Pencil size={16} aria-hidden="true" /> Edit
          </Button>
          <Button variant="secondary" onClick={() => onPay(c.id)} disabled={acc.balance <= 0}>
            <IndianRupee size={16} aria-hidden="true" /> Record payment
          </Button>
          <Button onClick={() => onOrder(c.id)} disabled={c.status === 'paused'} {...(c.status === 'paused' ? { title: 'Paused customers can’t take orders. Make them active first.' } : {})}>
            <ClipboardPlus size={16} aria-hidden="true" /> New order
          </Button>
        </>
      }
    >
      <div className="flex items-center gap-4">
        <Initials name={c.name} size="lg" muted={c.status === 'paused'} />
        <dl className="grid flex-1 grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-sm">
          <dt className="text-fg-muted">Phone</dt>
          <dd className="tabular text-fg">{c.phone}</dd>
          <dt className="text-fg-muted">Status</dt>
          <dd>
            <CustomerStatusBadge status={c.status} />
          </dd>
          <dt className="text-fg-muted">Regular order</dt>
          <dd className="text-fg">{recurringText(c.recurring)}</dd>
        </dl>
      </div>

      <dl className="mt-5 grid grid-cols-2 overflow-hidden rounded-[var(--radius-control)] border border-line bg-line [gap:1px]">
        <div className="bg-surface px-3 py-2.5">
          <dt className="text-xs text-fg-muted">Balance owed</dt>
          <dd className={cn('tabular text-xl font-semibold', acc.balance > 0 ? 'text-danger-strong' : 'text-fg')}>{money(acc.balance)}</dd>
        </div>
        <div className="bg-surface px-3 py-2.5">
          <dt className="text-xs text-fg-muted">Reusable cans held</dt>
          <dd className="tabular text-xl font-semibold text-fg">{acc.cansHeld}</dd>
        </div>
      </dl>
      <p className="tabular mt-2 text-xs text-fg-muted">
        Since {shortDay(c.openedOn)}: carried forward {money(c.openingBalancePaise)} and {c.openingCans} {c.openingCans === 1 ? 'can' : 'cans'}, + {money(acc.charges)} delivered − {money(acc.paid)} paid.
      </p>

      {acc.upcoming.length ? (
        <>
          <h3 className="mt-6 text-sm font-semibold text-fg">Planned deliveries</h3>
          <ul className="mt-2 divide-y divide-line rounded-[var(--radius-control)] border border-line">
            {acc.upcoming.map((d) => (
              <li key={d.id}>
                <button type="button" onClick={() => onOpenDelivery(d.id)} className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-subtle/50">
                  <span className="tabular text-fg">{d.date === book.today ? 'Today' : shortDay(d.date)}</span>
                  <span className="tabular text-fg-muted">{orderText(d.cans, d.cartons)}</span>
                  <DeliveryStatusBadge status={d.status} />
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <h3 className="mt-6 text-sm font-semibold text-fg">Recent deliveries</h3>
      {acc.history.length === 0 ? (
        <p className="mt-1.5 text-sm text-fg-subtle">No completed deliveries yet.</p>
      ) : (
        <div className="mt-2 overflow-x-auto rounded-[var(--radius-control)] border border-line">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Recent deliveries for {c.name}</caption>
            <thead className="bg-subtle/60 text-xs text-fg-muted">
              <tr>
                <th scope="col" className="px-2 py-2 font-medium">Date</th>
                <th scope="col" className="px-2 py-2 font-medium">Delivered</th>
                <th scope="col" className="px-2 py-2 text-right font-medium">Empties</th>
                <th scope="col" className="px-2 py-2 text-right font-medium" title="Cans held change: full cans in minus empties back">Net cans</th>
                <th scope="col" className="px-2 py-2 text-right font-medium">Charge</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {acc.history.slice(0, HISTORY).map((d) => {
                const m = canMovement(d);
                return (
                  <tr key={d.id}>
                    <td className="tabular px-2 py-2 whitespace-nowrap text-fg">{d.date === book.today ? 'Today' : shortDay(d.date)}</td>
                    <td className="tabular px-2 py-2 text-fg">{orderText(d.completion!.cans, d.completion!.cartons)}</td>
                    <td className="tabular px-2 py-2 text-right text-fg-muted">{d.completion!.emptiesCollected}</td>
                    <td className="tabular px-2 py-2 text-right text-fg-muted">{m > 0 ? `+${m}` : m < 0 ? `−${-m}` : '0'}</td>
                    <td className="tabular px-2 py-2 text-right text-fg">{money(deliveryCharge(book, d))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {acc.history.length > HISTORY ? <p className="mt-1 text-xs text-fg-subtle">Showing the latest {HISTORY} of {acc.history.length}.</p> : null}

      {failedOrMoved.length ? (
        <>
          <h3 className="mt-6 text-sm font-semibold text-fg">Failed or moved</h3>
          <ul className="mt-2 divide-y divide-line rounded-[var(--radius-control)] border border-line">
            {failedOrMoved.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                <span className="tabular text-fg">{d.date === book.today ? 'Today' : shortDay(d.date)}</span>
                <DeliveryStatusBadge status={d.status} {...(d.movedTo ? { movedTo: book.deliveries.find((x) => x.id === d.movedTo)?.date ?? '' } : {})} />
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <h3 className="mt-6 text-sm font-semibold text-fg">Payments</h3>
      {acc.payments.length === 0 ? (
        <p className="mt-1.5 text-sm text-fg-subtle">No payments recorded.</p>
      ) : (
        <ul className="mt-2 divide-y divide-line rounded-[var(--radius-control)] border border-line">
          {acc.payments.slice(0, HISTORY).map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span className="min-w-0">
                <span className="tabular block text-fg">{p.date === book.today ? 'Today' : shortDay(p.date)}</span>
                <span className="block text-xs text-fg-muted">
                  {labelOf(paymentMethods, p.method)}
                  {p.deliveryId ? ' · at delivery' : ' · against balance'}
                </span>
              </span>
              <span className="tabular font-medium text-success-strong">{money(p.amountPaise)}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-6 text-xs text-fg-muted">Fictional customer. Balances and can counts are worked out from the deliveries and payments above, so they can’t be edited directly.</p>
    </Dialog>
  );
}
