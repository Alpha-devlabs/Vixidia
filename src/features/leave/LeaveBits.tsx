import { AlarmClock, CircleCheck, CircleDashed, CircleX, Clock, Hourglass, TreePalm, TimerOff, type LucideIcon } from 'lucide-react';
import type { LeaveStatus } from '../../types/leave';
import { Badge, type BadgeTone } from '../../components/Badge';
import { cn } from '../../utils/cn';
import type { DayRow, DayStatus } from './leaveLogic';

export const dayStatusMeta: Record<DayStatus, { label: string; tone: BadgeTone; icon: LucideIcon }> = {
  present: { label: 'Present', tone: 'success', icon: CircleCheck },
  absent: { label: 'Absent', tone: 'danger', icon: CircleX },
  on_leave: { label: 'On leave', tone: 'accent', icon: TreePalm },
  not_checked_in: { label: 'Not checked in', tone: 'neutral', icon: CircleDashed },
};

export const leaveStatusMeta: Record<LeaveStatus, { label: string; tone: BadgeTone; icon: LucideIcon }> = {
  pending: { label: 'Pending', tone: 'warning', icon: Hourglass },
  approved: { label: 'Approved', tone: 'success', icon: CircleCheck },
  rejected: { label: 'Rejected', tone: 'neutral', icon: CircleX },
};

/** Status plus its flags (late, no check-out). Text always carries the meaning, not colour alone. */
export function DayBadges({ row }: { row: DayRow }) {
  const m = dayStatusMeta[row.status];
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <Badge tone={m.tone} icon={m.icon}>
        {m.label}
      </Badge>
      {row.late ? (
        <Badge tone="warning" icon={AlarmClock}>
          Late
        </Badge>
      ) : null}
      {row.incomplete ? (
        <Badge tone="warning" icon={TimerOff}>
          No check-out
        </Badge>
      ) : null}
      {row.stillIn ? (
        <span className="inline-flex items-center gap-1 text-xs text-fg-muted">
          <Clock size={12} aria-hidden="true" /> Still in
        </span>
      ) : null}
    </span>
  );
}

export function LeaveStatusBadge({ status }: { status: LeaveStatus }) {
  const m = leaveStatusMeta[status];
  return (
    <Badge tone={m.tone} icon={m.icon}>
      {m.label}
    </Badge>
  );
}

export function EmployeeAvatar({ name, size = 'md', muted = false }: { name: string; size?: 'sm' | 'md' | 'lg'; muted?: boolean }) {
  const parts = name.trim().split(/\s+/);
  const text = ((parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '')).toUpperCase();
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold select-none',
        muted ? 'bg-subtle text-fg-muted' : 'bg-accent-soft text-accent-strong',
        size === 'sm' && 'h-8 w-8 text-xs',
        size === 'md' && 'h-9 w-9 text-xs',
        size === 'lg' && 'h-14 w-14 text-lg',
      )}
    >
      {text}
    </span>
  );
}
