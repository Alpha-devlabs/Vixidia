import { CircleCheck, Lightbulb, Wrench, type LucideIcon } from 'lucide-react';
import type { ProductStatus } from '../types/product';
import { statusInfo } from '../utils/products';
import { Badge, type BadgeTone } from './Badge';

const styles: Record<ProductStatus, { icon: LucideIcon; tone: BadgeTone; dashed?: boolean }> = {
  planned: { icon: Lightbulb, tone: 'neutral', dashed: true },
  in_build: { icon: Wrench, tone: 'accent' },
  live: { icon: CircleCheck, tone: 'success' },
};

/** Product status shown with an icon and a word, never by colour alone. */
export function StatusBadge({ status, className }: { status: ProductStatus; className?: string }) {
  const { icon, tone, dashed } = styles[status];
  return (
    <Badge tone={tone} icon={icon} dashed={dashed} className={className}>
      {statusInfo[status].label}
    </Badge>
  );
}
