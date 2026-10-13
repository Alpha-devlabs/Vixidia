import { CircleCheck, CircleDashed, CircleMinus, Mail, MessageSquare, Phone, StickyNote, Users, type LucideIcon } from 'lucide-react';
import type { CustomerStatus, InteractionType } from '../../types/crm';
import { Badge, type BadgeTone } from '../../components/Badge';
import { cn } from '../../utils/cn';
import { initials } from './crmLogic';
import { formatDate, formatRelativeDay } from '../../utils/format';

export const customerStatusMeta: Record<CustomerStatus, { label: string; tone: BadgeTone; icon: LucideIcon }> = {
  prospect: { label: 'Prospect', tone: 'accent', icon: CircleDashed },
  active: { label: 'Active', tone: 'success', icon: CircleCheck },
  inactive: { label: 'Inactive', tone: 'neutral', icon: CircleMinus },
};

export function CustomerStatusBadge({ status }: { status: CustomerStatus }) {
  const { label, tone, icon } = customerStatusMeta[status];
  return (
    <Badge tone={tone} icon={icon}>
      {label}
    </Badge>
  );
}

export const interactionMeta: Record<InteractionType, { label: string; icon: LucideIcon }> = {
  call: { label: 'Call', icon: Phone },
  meeting: { label: 'Meeting', icon: Users },
  email: { label: 'Email', icon: Mail },
  message: { label: 'Message', icon: MessageSquare },
  note: { label: 'Note', icon: StickyNote },
};

/** Initials in a circle. Decorative: the name is always shown next to it. */
export function Avatar({ name, status, size = 'md' }: { name: string; status: CustomerStatus; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold tracking-[0.02em] select-none',
        status === 'inactive' ? 'bg-subtle text-fg-muted' : 'bg-accent-soft text-accent-strong',
        size === 'sm' && 'h-8 w-8 text-xs',
        size === 'md' && 'h-10 w-10 text-sm',
        size === 'lg' && 'h-14 w-14 text-lg',
      )}
    >
      {initials(name)}
    </span>
  );
}

/** Interaction type icon in a small rounded square, for timelines and activity lists. */
export function InteractionIcon({ type }: { type: InteractionType }) {
  const Icon = interactionMeta[type].icon;
  return (
    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-control)] border border-line bg-surface text-fg-muted" aria-hidden="true">
      <Icon size={15} />
    </span>
  );
}

/** "Today", "Yesterday", "12 Oct" this year, or "12 Oct 2025" for older dates. */
export function formatWhen(isoDay: string, today: string, inline = false): string {
  const rel = formatRelativeDay(isoDay, today);
  if (rel === 'Today' || rel === 'Yesterday') return inline ? rel.toLowerCase() : rel;
  return isoDay.slice(0, 4) === today.slice(0, 4) ? rel : formatDate(isoDay);
}

/** "today", "yesterday" or "3 days ago", for last-contact notes. */
export function daysAgoLabel(days: number): string {
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}
