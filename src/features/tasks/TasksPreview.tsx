import { useMemo } from 'react';
import { createTasksSample } from '../../data/tasksSample';
import { taskRows, taskSummary } from './taskLogic';
import { TaskList } from './TaskList';

/** Read-only glimpse of the tasks demo for its product page, built from the demo's sample data. */
export function TasksPreview() {
  const { rows, summary } = useMemo(() => {
    const r = taskRows(createTasksSample());
    return { rows: r, summary: taskSummary(r) };
  }, []);
  const figures = [
    ['Due today', summary.dueToday],
    ['Overdue', summary.overdue],
    ['Upcoming', summary.upcoming],
    ['Completed', summary.completed],
  ] as const;
  return (
    <figure className="overflow-hidden rounded-[var(--radius-panel)] border border-line bg-surface shadow-[var(--shadow-panel)]">
      <dl className="grid grid-cols-2 gap-px border-b border-line bg-line sm:grid-cols-4">
        {figures.map(([label, value]) => (
          <div key={label} className="bg-surface px-4 py-3">
            <dt className="text-xs text-fg-muted">{label}</dt>
            <dd className="tabular mt-0.5 font-semibold text-fg">{value}</dd>
          </div>
        ))}
      </dl>
      <div inert className="pointer-events-none">
        <TaskList rows={rows.filter((r) => r.state === 'today' || r.state === 'overdue').slice(0, 4)} grouped={false} onOpen={() => undefined} onToggle={() => undefined} caption="Sample tasks" />
      </div>
      <figcaption className="border-t border-line px-4 py-2.5 text-xs text-fg-muted">Fictional sample tasks from the demo.</figcaption>
    </figure>
  );
}
