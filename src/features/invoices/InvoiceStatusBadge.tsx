import { AlarmClock, CircleCheck, Clock, FilePen, Hourglass, type LucideIcon } from 'lucide-react';
import type { InvoiceStatus } from '../../types/invoice';
import { Badge, type BadgeTone } from '../../components/Badge';

export const invoiceStatusMeta: Record<InvoiceStatus, { label: string; tone: BadgeTone; icon: LucideIcon }> = {
  draft: { label: 'Draft', tone: 'neutral', icon: FilePen },
  awaiting: { label: 'Awaiting payment', tone: 'accent', icon: Clock },
  partially_paid: { label: 'Partially paid', tone: 'warning', icon: Hourglass },
  overdue: { label: 'Overdue', tone: 'danger', icon: AlarmClock },
  paid: { label: 'Paid', tone: 'success', icon: CircleCheck },
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const { label, tone, icon } = invoiceStatusMeta[status];
  return (
    <Badge tone={tone} icon={icon}>
      {label}
    </Badge>
  );
}
