import { CheckCheck, Banknote } from 'lucide-react';
import type { WaterState } from '../../types/water';
import { Dialog } from '../../components/Dialog';
import { Button } from '../../components/Button';
import { DeliveryPill, PaymentPill } from './StatusPills';
import { customerBalances, orderTotal } from './waterLogic';
import type { WaterActions } from './useWaterDemo';
import { formatCurrency, formatLongDay } from '../../utils/format';
import { sampleBusiness } from '../../data/waterSample';

const kindLabel = { home: 'Household', shop: 'Shop', office: 'Office or clinic' } as const;

interface Props {
  state: WaterState;
  orderId: string | null;
  onClose: () => void;
  actions: WaterActions;
}

export function OrderDetailDialog({ state, orderId, onClose, actions }: Props) {
  const order = state.orders.find((o) => o.id === orderId);
  const customer = order ? state.customers.find((c) => c.id === order.customerId) : undefined;
  const balance = customer ? customerBalances({ customers: [customer], orders: state.orders })[0] : undefined;

  return (
    <Dialog
      open={order !== undefined}
      onClose={onClose}
      title={order ? `Order ${order.number}` : 'Order'}
      description={order ? formatLongDay(order.date) : undefined}
      footer={
        order ? (
          <>
            {order.delivery === 'pending' ? (
              <Button variant="primary" onClick={() => actions.markDelivered(order.id, order.number)}>
                <CheckCheck size={17} aria-hidden="true" /> Mark delivered
              </Button>
            ) : null}
            {order.payment === 'unpaid' ? (
              <Button variant="secondary" onClick={() => actions.markPaid(order.id, order.number)}>
                <Banknote size={17} aria-hidden="true" /> Mark paid
              </Button>
            ) : null}
            {order.delivery === 'delivered' && order.payment === 'paid' ? (
              <Button variant="secondary" onClick={onClose}>
                Done
              </Button>
            ) : null}
          </>
        ) : null
      }
    >
      {order ? (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-1.5">
            <DeliveryPill status={order.delivery} />
            <PaymentPill status={order.payment} />
          </div>

          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 text-sm">
            <dt className="text-fg-muted">Customer</dt>
            <dd className="font-medium">{customer?.name ?? 'Unknown customer'}</dd>
            <dt className="text-fg-muted">Area</dt>
            <dd>{customer?.area ?? '—'}</dd>
            <dt className="text-fg-muted">Type</dt>
            <dd>{customer ? kindLabel[customer.kind] : '—'}</dd>
            <dt className="text-fg-muted">Quantity</dt>
            <dd className="tabular">
              {order.quantity} × {sampleBusiness.unitLabel} at {formatCurrency(order.unitPrice)}
            </dd>
            <dt className="text-fg-muted">Total</dt>
            <dd className="tabular text-base font-semibold">{formatCurrency(orderTotal(order))}</dd>
            {order.note ? (
              <>
                <dt className="text-fg-muted">Order note</dt>
                <dd>{order.note}</dd>
              </>
            ) : null}
            {customer?.note ? (
              <>
                <dt className="text-fg-muted">Delivery note</dt>
                <dd>{customer.note}</dd>
              </>
            ) : null}
          </dl>

          {balance && balance.outstanding > 0 ? (
            <p className="rounded-[var(--radius-control)] bg-danger-soft px-3 py-2.5 text-sm text-danger-strong">
              {customer?.name} owes <strong className="tabular">{formatCurrency(balance.outstanding)}</strong> across{' '}
              {balance.unpaidCount} unpaid {balance.unpaidCount === 1 ? 'order' : 'orders'}
              {order.payment === 'unpaid' ? ', including this one.' : ' from earlier deliveries.'}
            </p>
          ) : (
            <p className="rounded-[var(--radius-control)] bg-success-soft px-3 py-2.5 text-sm text-success-strong">
              {customer?.name ?? 'This customer'} has no outstanding dues.
            </p>
          )}
        </div>
      ) : null}
    </Dialog>
  );
}
