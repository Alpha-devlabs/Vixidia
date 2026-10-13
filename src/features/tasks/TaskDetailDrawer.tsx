import type { ReactNode } from 'react';
import { Check, Contact, Pencil, RotateCcw } from 'lucide-react';
import { Dialog } from '../../components/Dialog';
import { Button } from '../../components/Button';
import { formatDate } from '../../utils/format';
import { labelOf, taskCategories, type TaskRow } from './taskLogic';
import { DueLabel, PriorityBadge, TaskStatusBadge, dueText } from './TaskBits';

interface Props {
  row: TaskRow | undefined;
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
  onToggle: (completed: boolean) => void;
}

/** Task details in the shared drawer. Completing or reopening keeps it open so the change is visible. */
export function TaskDetailDrawer({ row, open, onClose, onEdit, onToggle }: Props) {
  if (!row) return null;
  const { task, customer } = row;
  const done = row.state === 'completed';
  // "today", "tomorrow", "in 3 days", "overdue by 2 days"; nothing extra for completed or far-off tasks.
  const relative = done || (row.state === 'upcoming' && row.daysToDue > 7) ? null : dueText(row).replace(/^Due /, '').replace(/^O/, 'o');
  const details: [string, ReactNode][] = [
    ['Due', relative ? <>{formatDate(task.dueDate)} <span className="text-fg-muted">· {relative}</span></> : formatDate(task.dueDate)],
    ['Category', labelOf(taskCategories, task.category)],
    [
      'Customer',
      customer ? (
        <span className="inline-flex items-start gap-1.5">
          <Contact size={15} className="mt-0.5 shrink-0 text-fg-subtle" aria-hidden="true" />
          <span>
            <span className="font-medium">{customer.name}</span>
            {customer.company ? <span className="block text-fg-muted">{customer.company}</span> : null}
          </span>
        </span>
      ) : (
        <span className="text-fg-subtle">None</span>
      ),
    ],
    ['Created', formatDate(task.createdOn)],
    ...(task.completedOn ? ([['Completed', formatDate(task.completedOn)]] as [string, ReactNode][]) : []),
  ];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      variant="drawer"
      title={task.title}
      description="Task details"
      footer={
        <>
          <Button variant="secondary" onClick={onEdit}>
            <Pencil size={16} aria-hidden="true" /> Edit
          </Button>
          <Button onClick={() => onToggle(!done)}>
            {done ? <RotateCcw size={16} aria-hidden="true" /> : <Check size={17} aria-hidden="true" />}
            {done ? 'Reopen task' : 'Mark complete'}
          </Button>
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <TaskStatusBadge status={task.status} />
        <PriorityBadge priority={task.priority} />
        <DueLabel row={row} />
      </div>

      <dl className="mt-5 divide-y divide-line rounded-[var(--radius-control)] border border-line text-sm">
        {details.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-3 px-3 py-2.5">
            <dt className="text-fg-muted">{label}</dt>
            <dd className="tabular break-words text-fg">{value}</dd>
          </div>
        ))}
      </dl>

      <h3 className="mt-6 text-sm font-semibold text-fg">Description</h3>
      <p className={task.description ? 'mt-1.5 text-sm leading-relaxed whitespace-pre-line text-fg-muted' : 'mt-1.5 text-sm text-fg-subtle'}>
        {task.description ?? 'No description.'}
      </p>
      {customer ? (
        <p className="mt-6 rounded-[var(--radius-control)] bg-subtle px-3 py-2.5 text-xs text-fg-muted">
          {customer.name} is one of the Simple CRM demo’s sample customers. The two demos don’t sync; this link only shows who the task is about.
        </p>
      ) : null}
    </Dialog>
  );
}
