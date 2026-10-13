import { Check, ChevronDown, ChevronsUp, Circle, CircleCheck, CircleDot, Minus, type LucideIcon } from 'lucide-react';
import type { TaskPriority, TaskStatus } from '../../types/tasks';
import { Badge, type BadgeTone } from '../../components/Badge';
import { cn } from '../../utils/cn';
import { formatDate, formatDay, pluralize } from '../../utils/format';
import { taskCategories, labelOf, type TaskRow } from './taskLogic';

export const statusMeta: Record<TaskStatus, { label: string; tone: BadgeTone; icon: LucideIcon }> = {
  todo: { label: 'To do', tone: 'neutral', icon: Circle },
  in_progress: { label: 'In progress', tone: 'accent', icon: CircleDot },
  done: { label: 'Completed', tone: 'success', icon: CircleCheck },
};

export const priorityMeta: Record<TaskPriority, { label: string; tone: BadgeTone; icon: LucideIcon }> = {
  high: { label: 'High', tone: 'warning', icon: ChevronsUp },
  medium: { label: 'Medium', tone: 'neutral', icon: Minus },
  low: { label: 'Low', tone: 'neutral', icon: ChevronDown },
};

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const m = statusMeta[status];
  return (
    <Badge tone={m.tone} icon={m.icon}>
      {m.label}
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const m = priorityMeta[priority];
  return (
    <Badge tone={m.tone} icon={m.icon}>
      <span className="sr-only">Priority: </span>
      {m.label}
    </Badge>
  );
}

export function CategoryLabel({ category }: { category: TaskRow['task']['category'] }) {
  return <span className="text-xs font-medium text-fg-muted">{labelOf(taskCategories, category)}</span>;
}

/** "Overdue by 2 days", "Due today", "Due tomorrow", "Due in 5 days", "Completed 12 Oct". */
export function dueText(row: TaskRow): string {
  const { state, daysToDue, task } = row;
  if (state === 'completed') return task.completedOn ? `Completed ${formatDay(task.completedOn)}` : 'Completed';
  if (state === 'overdue') return `Overdue by ${pluralize(-daysToDue, 'day')}`;
  if (state === 'today') return 'Due today';
  if (daysToDue === 1) return 'Due tomorrow';
  if (daysToDue <= 7) return `Due in ${daysToDue} days`;
  return `Due ${formatDay(task.dueDate)}`;
}

/** Due date with a coloured relative note. Colour is never the only signal: the words say it. */
export function DueLabel({ row, stacked = false }: { row: TaskRow; stacked?: boolean }) {
  const tone =
    row.state === 'overdue' ? 'text-danger-strong' : row.state === 'today' ? 'font-medium text-accent-strong' : row.state === 'completed' ? 'text-fg-subtle' : 'text-fg-muted';
  return (
    <span className={cn('tabular text-xs', stacked ? 'block' : 'inline', tone)}>
      {dueText(row)}
      {stacked && row.state !== 'completed' && !(row.state === 'upcoming' && row.daysToDue > 7) ? (
        <span className="block text-fg-subtle">{formatDate(row.task.dueDate)}</span>
      ) : null}
    </span>
  );
}

/** Round completion toggle. A real checkbox for assistive technology, larger target than it looks. */
export function CompleteToggle({ row, onToggle }: { row: TaskRow; onToggle: (completed: boolean) => void }) {
  const done = row.state === 'completed';
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-label={done ? `Reopen “${row.task.title}”` : `Mark “${row.task.title}” complete`}
      onClick={() => onToggle(!done)}
      className="group/toggle relative z-10 -m-2 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
    >
      <span
        className={cn(
          'inline-flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors',
          done ? 'border-success bg-success text-surface' : 'border-line-strong text-transparent group-hover/toggle:border-accent group-hover/toggle:text-accent',
        )}
        aria-hidden="true"
      >
        <Check size={12} strokeWidth={3.2} />
      </span>
    </button>
  );
}
