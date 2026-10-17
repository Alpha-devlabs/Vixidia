import { Banknote, CircleCheck, CircleDot, Clock } from 'lucide-react';
import type { DeliveryStatus, PaymentStatus } from '../../types/water';
import { Badge } from '../../components/Badge';

export function DeliveryPill({ status }: { status: DeliveryStatus }) {
  return status === 'delivered' ? (
    <Badge tone="neutral" icon={CircleCheck}>
      Delivered
    </Badge>
  ) : (
    <Badge tone="warning" icon={Clock}>
      To deliver
    </Badge>
  );
}

export function PaymentPill({ status }: { status: PaymentStatus }) {
  return status === 'paid' ? (
    <Badge tone="success" icon={Banknote}>
      Paid
    </Badge>
  ) : (
    <Badge tone="danger" icon={CircleDot}>
      Unpaid
    </Badge>
  );
}
