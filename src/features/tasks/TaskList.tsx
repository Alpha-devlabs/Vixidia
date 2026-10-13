import { useId, type ReactNode } from 'react';
import { ChevronRight, Contact } from 'lucide-react';
import type { TaskRow } from './taskLogic';
import { groupTasks } from './taskLogic';
import { CategoryLabel, CompleteToggle, DueLabel, PriorityBadge, TaskStatusBadge } from './TaskBits';
import { cn } from '../../utils/cn';

interface Props {
  rows: TaskRow[];
  /** Show Overdue / Today / Next 7 days / Later / Completed sections. */
  grouped: boolean;
  onOpen: (taskId: string) => void;
  onToggle: (taskId: string, completed: boolean) => void;
  /** Accessible name for the list when ungrouped. */
  caption: string;
}

/**
 * Task rows: a table when the container is wide enough, compact stacked cards
 * otherwise (container queries, so it also fits narrow panels).
 */
export function TaskList({ rows, grouped, onOpen, onToggle, caption }: Props) {
  if (!grouped) return <Rows rows={rows} onOpen={onOpen} onToggle={onToggle} label={caption} />;
  return (
    <div className="divide-y divide-line">
      {groupTasks(rows).map((g) => (
        <Group key={g.key} label={g.label} danger={g.key === 'overdue'} count={g.rows.length}>
          <Rows rows={g.rows} onOpen={onOpen} onToggle={onToggle} label={`${g.label} tasks`} />
        </Group>
      ))}
    </div>
  );
}

function Group({ label, count, danger, children }: { label: string; count: number; danger: boolean; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id}>
      <h3 id={id} className="flex items-center gap-2 bg-subtle/60 px-4 py-2 text-xs font-semibold tracking-[0.02em] text-fg-muted sm:px-5">
        <span className={danger ? 'text-danger-strong' : undefined}>{label}</span>
        <span className="tabular font-medium text-fg-subtle">{count}</span>
      </h3>
      {children}
    </section>
  );
}

function Rows({ rows, onOpen, onToggle, label }: { rows: TaskRow[]; onOpen: (id: string) => void; onToggle: (id: string, done: boolean) => void; label: string }) {
  return (
    <div className="@container">
      <table className="hidden w-full table-fixed text-left text-sm @3xl:table">
        <caption className="sr-only">{label}</caption>
        <colgroup>
          <col className="w-14 sm:w-15" />
          <col />
          <col className="w-36" />
          <col className="w-28" />
          <col className="w-24" />
          <col className="w-32" />
          <col className="w-10" />
        </colgroup>
        <thead className="sr-only">
          <tr>
            <th scope="col">Done</th>
            <th scope="col">Task</th>
            <th scope="col">Due</th>
            <th scope="col">Priority</th>
            <th scope="col">Category</th>
            <th scope="col">Status</th>
            <th scope="col">Open</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line border-t border-line first:border-t-0">
          {rows.map((r) => {
            const done = r.state === 'completed';
            return (
              <tr key={r.task.id} className="group relative transition-colors hover:bg-subtle/50 focus-within:bg-subtle/50">
                <td className="py-2.5 pr-1 pl-4 align-top sm:pl-5">
                  <CompleteToggle row={r} onToggle={(c) => onToggle(r.task.id, c)} />
                </td>
                <td className="py-3 pr-3 align-top">
                  <button
                    type="button"
                    onClick={() => onOpen(r.task.id)}
                    className="block max-w-full text-left after:absolute after:inset-0 after:content-['']"
                    aria-label={`Open task: ${r.task.title}`}
                  >
                    <span className={cn('block truncate font-medium', done ? 'text-fg-muted line-through decoration-fg-subtle' : 'text-fg')}>{r.task.title}</span>
                    {r.customer ? (
                      <span className="mt-0.5 flex items-center gap-1 truncate text-xs text-fg-muted">
                        <Contact size={12} className="shrink-0" aria-hidden="true" />
                        <span className="truncate">
                          {r.customer.name}
                          {r.customer.company ? ` · ${r.customer.company}` : ''}
                        </span>
                      </span>
                    ) : null}
                  </button>
                </td>
                <td className="px-3 py-3 align-top">
                  <DueLabel row={r} stacked />
                </td>
                <td className="px-3 py-3 align-top">
                  <PriorityBadge priority={r.task.priority} />
                </td>
                <td className="px-3 py-3 align-top">
                  <CategoryLabel category={r.task.category} />
                </td>
                <td className="px-3 py-3 align-top">
                  <TaskStatusBadge status={r.task.status} />
                </td>
                <td className="px-2 py-3 align-top text-fg-subtle">
                  <ChevronRight size={18} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <ul className="divide-y divide-line @3xl:hidden" aria-label={label}>
        {rows.map((r) => {
          const done = r.state === 'completed';
          return (
            <li key={r.task.id} className="relative flex items-start gap-2 px-4 py-3 transition-colors hover:bg-subtle/50">
              <span className="pt-0.5">
                <CompleteToggle row={r} onToggle={(c) => onToggle(r.task.id, c)} />
              </span>
              <button type="button" onClick={() => onOpen(r.task.id)} className="min-w-0 flex-1 pl-1 text-left" aria-label={`Open task: ${r.task.title}`}>
                <span className="flex items-start justify-between gap-2">
                  <span className={cn('min-w-0 font-medium', done ? 'text-fg-muted line-through decoration-fg-subtle' : 'text-fg')}>{r.task.title}</span>
                  <ChevronRight size={18} className="mt-0.5 shrink-0 text-fg-subtle" aria-hidden="true" />
                </span>
                {r.customer ? (
                  <span className="mt-0.5 flex items-center gap-1 text-xs text-fg-muted">
                    <Contact size={12} className="shrink-0" aria-hidden="true" />
                    <span className="truncate">{r.customer.name}</span>
                  </span>
                ) : null}
                <span className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5">
                  <DueLabel row={r} />
                  <PriorityBadge priority={r.task.priority} />
                  {r.task.status === 'in_progress' ? <TaskStatusBadge status="in_progress" /> : null}
                  <CategoryLabel category={r.task.category} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
