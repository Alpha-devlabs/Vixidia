import { useEffect, useId, useState } from 'react';
import { CalendarCheck, LayoutDashboard, ListChecks, ListTodo, Plus, Reply, RotateCcw, Search, SearchX, type LucideIcon } from 'lucide-react';
import type { TaskCategory, TaskPriority, TaskStatus } from '../../types/tasks';
import { crmBusiness } from '../../data/crmSample';
import {
  emptyTaskInput,
  filterTasks,
  hasFilters,
  noFilters,
  taskCategories,
  taskPriorities,
  sortTaskRows,
  taskSorts,
  taskStatuses,
  taskToInput,
  type TaskFilters,
  type TaskRow,
  type TaskSort,
  type TaskSummary,
} from './taskLogic';
import { useTasksDemo } from './useTasksDemo';
import { TaskList } from './TaskList';
import { TaskForm } from './TaskForm';
import { TaskDetailDrawer } from './TaskDetailDrawer';
import { Button } from '../../components/Button';
import { Panel } from '../../components/Panel';
import { controlClass } from '../../components/forms';
import { ToastRegion, useToast } from '../../components/Toast';
import { formatLongDay, pluralize } from '../../utils/format';
import { cn } from '../../utils/cn';
import { useResetDemo } from '../demo/useResetDemo';

type Section = 'overview' | 'tasks' | 'follow_ups';
type View = { name: Section } | { name: 'new'; from: Section } | { name: 'edit'; id: string; from: Section };

const nav: { name: Section; label: string; icon: LucideIcon }[] = [
  { name: 'overview', label: 'Overview', icon: LayoutDashboard },
  { name: 'tasks', label: 'All tasks', icon: ListTodo },
  { name: 'follow_ups', label: 'Follow-ups', icon: Reply },
];

/**
 * Tasks & Follow-ups demo with fictional tasks. Every view reads the same
 * in-memory book (useTasksDemo), so completing a task updates the list and the
 * overview together. Follow-ups are tasks in the Follow-up category.
 */
export function TasksApp() {
  const { book, rows, summary, actions, changed } = useTasksDemo();
  const [view, setView] = useState<View>({ name: 'overview' });
  const [filters, setFilters] = useState<TaskFilters>(noFilters);
  const [sort, setSort] = useState<TaskSort>('due');
  const [grouped, setGrouped] = useState(true);
  const [detailFor, setDetailFor] = useState<string | null>(null);
  const { toast, notify } = useToast(4500);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  const section: Section = 'from' in view ? view.from : view.name;
  const go = (s: Section) => {
    if (s === 'tasks') setFilters(noFilters);
    if (s === 'follow_ups') setFilters({ ...noFilters, category: 'follow_up' });
    setView({ name: s });
  };
  const toggle = (id: string, completed: boolean) => {
    const result = actions.setCompleted(id, completed);
    if (result.ok) notify(completed ? `Completed: ${result.task.title}` : `Reopened: ${result.task.title}`);
  };
  const resetNow = () => {
    actions.reset();
    setDetailFor(null);
    setView({ name: section });
    notify('Sample data restored.');
  };
  const { reset, resetDialog } = useResetDemo(changed, resetNow);
  const detailRow = rows.find((r) => r.task.id === detailFor);
  const editing = view.name === 'edit' ? book.tasks.find((t) => t.id === view.id) : undefined;
  const backTo = (s: Section) => setView({ name: s });

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col lg:flex-row">
      <aside className="on-inverse border-b border-inverse-line bg-inverse text-on-inverse lg:w-60 lg:shrink-0 lg:border-r lg:border-b-0">
        <div className="flex flex-col gap-4 px-4 py-4 lg:sticky lg:top-14 lg:px-4 lg:py-6">
          <div className="flex items-center justify-between gap-3 lg:block lg:px-1">
            <p className="flex items-center gap-2.5 text-[0.95rem] font-semibold">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-accent text-on-accent">
                <ListChecks size={17} aria-hidden="true" />
              </span>
              <span className="leading-tight">
                Tasks & Follow-ups
                <span className="block text-xs font-normal text-on-inverse-muted">Productivity</span>
              </span>
            </p>
            <p className="text-right text-xs text-on-inverse-muted lg:mt-4 lg:text-left">{crmBusiness.name}</p>
          </div>
          <nav aria-label="Tasks & Follow-ups" className="relative -mx-1 flex gap-1 overflow-x-auto px-1 lg:mt-2 lg:flex-col">
            {nav.map((n) => {
              const active = section === n.name;
              return (
                <button
                  key={n.name}
                  type="button"
                  onClick={() => go(n.name)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative inline-flex min-h-10 shrink-0 items-center gap-2.5 rounded-[var(--radius-control)] px-3 text-sm font-medium transition-colors',
                    active ? 'bg-on-inverse/10 text-on-inverse' : 'text-on-inverse-muted hover:bg-on-inverse/5 hover:text-on-inverse',
                  )}
                >
                  {active ? <span className="absolute inset-y-2 left-0 hidden w-0.5 rounded-full bg-accent lg:block" aria-hidden="true" /> : null}
                  <n.icon size={17} aria-hidden="true" />
                  {n.label}
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      <div className="min-w-0 flex-1 bg-canvas">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {view.name === 'overview' ? (
            <OverviewView
              rows={rows}
              summary={summary}
              today={book.today}
              onOpen={setDetailFor}
              onToggle={toggle}
              onAll={() => go('tasks')}
              onNew={() => setView({ name: 'new', from: 'overview' })}
              onReset={reset}
            />
          ) : null}
          {view.name === 'tasks' || view.name === 'follow_ups' ? (
            <TasksView
              followUps={view.name === 'follow_ups'}
              rows={rows}
              filters={filters}
              onFilters={setFilters}
              sort={sort}
              onSort={setSort}
              grouped={grouped}
              onGrouped={setGrouped}
              onOpen={setDetailFor}
              onToggle={toggle}
              onNew={() => setView({ name: 'new', from: view.name })}
              onReset={reset}
            />
          ) : null}
          {view.name === 'new' ? (
            <TaskForm
              mode="create"
              initial={view.from === 'follow_ups' ? { ...emptyTaskInput(book.today), category: 'follow_up' } : emptyTaskInput(book.today)}
              customers={book.customers}
              onCancel={() => backTo(view.from)}
              onSave={(input) => {
                const result = actions.create(input);
                if (result.ok) {
                  backTo(view.from === 'overview' ? 'tasks' : view.from);
                  if (view.from === 'overview') setFilters(noFilters);
                  setDetailFor(result.task.id);
                  notify(`Task created: ${result.task.title}`);
                }
                return result;
              }}
            />
          ) : null}
          {view.name === 'edit' && editing ? (
            <TaskForm
              key={editing.id}
              mode="edit"
              initial={taskToInput(editing)}
              customers={book.customers}
              onCancel={() => {
                backTo(view.from);
                setDetailFor(editing.id);
              }}
              onSave={(input) => {
                const result = actions.update(editing.id, input);
                if (result.ok) {
                  backTo(view.from);
                  setDetailFor(result.task.id);
                  notify('Changes saved.');
                }
                return result;
              }}
            />
          ) : null}
        </div>
      </div>

      <TaskDetailDrawer
        row={detailRow}
        open={detailFor !== null && detailRow !== undefined}
        onClose={() => setDetailFor(null)}
        onEdit={() => {
          if (!detailRow) return;
          setDetailFor(null);
          setView({ name: 'edit', id: detailRow.task.id, from: section });
        }}
        onToggle={(completed) => detailRow && toggle(detailRow.task.id, completed)}
      />
      {resetDialog}
      <ToastRegion toast={toast} />
    </div>
  );
}

function PageHeading({ title, description, onNew, onReset }: { title: string; description: string; onNew: () => void; onReset: () => void }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-fg sm:text-[1.75rem]">{title}</h1>
        <p className="mt-1 max-w-[60ch] text-sm text-fg-muted">{description}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" onClick={onReset}>
          <RotateCcw size={16} aria-hidden="true" /> Reset demo
        </Button>
        <Button onClick={onNew}>
          <Plus size={17} aria-hidden="true" /> New task
        </Button>
      </div>
    </div>
  );
}

// ---------- Overview ----------

interface OverviewProps {
  rows: TaskRow[];
  summary: TaskSummary;
  today: string;
  onOpen: (id: string) => void;
  onToggle: (id: string, completed: boolean) => void;
  onAll: () => void;
  onNew: () => void;
  onReset: () => void;
}

function OverviewView({ rows, summary, today, onOpen, onToggle, onAll, onNew, onReset }: OverviewProps) {
  const figures: { label: string; value: number; note: string; tone?: string }[] = [
    { label: 'Due today', value: summary.dueToday, note: 'Not yet completed', tone: summary.dueToday ? 'text-accent-strong' : undefined },
    { label: 'Overdue', value: summary.overdue, note: 'Past the due date', tone: summary.overdue ? 'text-danger-strong' : undefined },
    { label: 'Upcoming', value: summary.upcoming, note: 'Due after today' },
    { label: 'Completed', value: summary.completed, note: 'Done, any date' },
  ];
  const dueToday = rows.filter((r) => r.state === 'today');
  const overdue = rows.filter((r) => r.state === 'overdue');

  return (
    <div className="space-y-6">
      <PageHeading title="Overview" description={`What needs doing today, ${formatLongDay(today)}, and what has slipped.`} onNew={onNew} onReset={onReset} />

      <dl className="grid grid-cols-2 overflow-hidden rounded-[var(--radius-panel)] border border-line bg-line shadow-[var(--shadow-panel)] [gap:1px] md:grid-cols-4">
        {figures.map((f) => (
          <div key={f.label} className="bg-surface px-4 py-3.5 sm:px-5">
            <dt className="text-sm font-medium text-fg-muted">{f.label}</dt>
            <dd className={cn('tabular mt-1 text-2xl leading-tight font-semibold tracking-[-0.02em]', f.tone ?? 'text-fg')}>{f.value}</dd>
            <dd className="text-xs text-fg-subtle">{f.note}</dd>
          </div>
        ))}
      </dl>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2">
        <Panel title="Due today" aside={<span className="tabular text-xs text-fg-muted">{pluralize(dueToday.length, 'task')}</span>}>
          {dueToday.length ? (
            <TaskList rows={dueToday} grouped={false} onOpen={onOpen} onToggle={onToggle} caption="Tasks due today" />
          ) : (
            <Empty icon={CalendarCheck} title="Nothing due today" text="Tasks due today appear here until they’re completed." />
          )}
        </Panel>
        <Panel title="Overdue" aside={<span className="tabular text-xs text-fg-muted">{pluralize(overdue.length, 'task')}</span>}>
          {overdue.length ? (
            <TaskList rows={overdue} grouped={false} onOpen={onOpen} onToggle={onToggle} caption="Overdue tasks" />
          ) : (
            <Empty icon={CalendarCheck} title="Nothing overdue" text="Everything open is due today or later." />
          )}
        </Panel>
      </div>
      <p className="text-center text-sm text-fg-muted">
        <Button variant="subtle" size="sm" onClick={onAll}>
          See all {pluralize(summary.total, 'task')}
        </Button>
      </p>
    </div>
  );
}

function Empty({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="flex flex-col items-center px-4 py-10 text-center">
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-subtle text-fg-subtle">
        <Icon size={20} aria-hidden="true" />
      </span>
      <p className="mt-3 font-medium text-fg">{title}</p>
      <p className="mt-1 max-w-[40ch] text-sm text-fg-muted">{text}</p>
    </div>
  );
}

// ---------- Task list ----------

interface TasksViewProps {
  followUps: boolean;
  rows: TaskRow[];
  filters: TaskFilters;
  onFilters: (f: TaskFilters) => void;
  sort: TaskSort;
  onSort: (s: TaskSort) => void;
  grouped: boolean;
  onGrouped: (g: boolean) => void;
  onOpen: (id: string) => void;
  onToggle: (id: string, completed: boolean) => void;
  onNew: () => void;
  onReset: () => void;
}

function TasksView({ followUps, rows, filters, onFilters, sort, onSort, grouped, onGrouped, onOpen, onToggle, onNew, onReset }: TasksViewProps) {
  const id = useId();
  const sorted = sortTaskRows(rows, sort);
  const visible = filterTasks(sorted, filters);
  const active = hasFilters(followUps ? { ...filters, category: 'all' } : filters);
  const set = (patch: Partial<TaskFilters>) => onFilters({ ...filters, ...patch });
  const statusCount = (s: 'all' | TaskStatus) => filterTasks(rows, { ...filters, status: s, query: '' }).length;
  const selectClass = controlClass(false, 'min-h-9 py-1.5 text-sm');

  return (
    <div className="space-y-6">
      <PageHeading
        title={followUps ? 'Follow-ups' : 'All tasks'}
        description={followUps ? 'Tasks about getting back to someone, often linked to a customer.' : 'Open tasks by due date, then completed work.'}
        onNew={onNew}
        onReset={onReset}
      />
      <section aria-label="Task list" className="rounded-[var(--radius-panel)] border border-line bg-surface shadow-[var(--shadow-panel)]">
        <div className="space-y-3 border-b border-line p-4 sm:px-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative xl:w-80">
              <label htmlFor={`${id}-q`} className="sr-only">
                Search tasks by title, description or customer
              </label>
              <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
              <input
                id={`${id}-q`}
                type="search"
                value={filters.query}
                onChange={(e: { target: { value: string } }) => set({ query: e.target.value })}
                placeholder="Search tasks"
                className={controlClass(false, 'pl-9')}
              />
            </div>
            <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-1">
              {([{ value: 'all', label: 'All' }, ...taskStatuses] as { value: 'all' | TaskStatus; label: string }[]).map((s) => {
                const pressed = filters.status === s.value;
                return (
                  <button
                    key={s.value}
                    type="button"
                    aria-pressed={pressed}
                    onClick={() => set({ status: s.value })}
                    className={cn(
                      'inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors',
                      pressed ? 'border-accent bg-accent-soft text-accent-strong' : 'border-line text-fg-muted hover:border-line-strong hover:text-fg',
                    )}
                  >
                    {s.label}
                    <span className="tabular text-xs opacity-80">{statusCount(s.value)}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-end">
            <div>
              <label htmlFor={`${id}-priority`} className="block text-xs font-medium text-fg-muted">
                Priority
              </label>
              <select id={`${id}-priority`} value={filters.priority} onChange={(e: { target: { value: string } }) => set({ priority: e.target.value as 'all' | TaskPriority })} className={cn(selectClass, 'mt-1 w-full sm:w-36')}>
                <option value="all">Any priority</option>
                {taskPriorities.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            {followUps ? null : (
              <div>
                <label htmlFor={`${id}-category`} className="block text-xs font-medium text-fg-muted">
                  Category
                </label>
                <select id={`${id}-category`} value={filters.category} onChange={(e: { target: { value: string } }) => set({ category: e.target.value as 'all' | TaskCategory })} className={cn(selectClass, 'mt-1 w-full sm:w-36')}>
                  <option value="all">Any category</option>
                  {taskCategories.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label htmlFor={`${id}-sort`} className="block text-xs font-medium text-fg-muted">
                Sort by
              </label>
              <select id={`${id}-sort`} value={sort} onChange={(e: { target: { value: string } }) => onSort(e.target.value as TaskSort)} className={cn(selectClass, 'mt-1 w-full sm:w-36')}>
                {taskSorts.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex min-h-9 items-center gap-2 self-end text-sm text-fg">
              <input type="checkbox" checked={grouped} onChange={(e: { target: { checked: boolean } }) => onGrouped(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
              Group by due date
            </label>
            {active ? (
              <Button
                variant="subtle"
                size="sm"
                className="self-end sm:ml-auto"
                onClick={() => onFilters(followUps ? { ...noFilters, category: 'follow_up' } : noFilters)}
              >
                Clear filters
              </Button>
            ) : null}
          </div>
        </div>
        <p className="sr-only" aria-live="polite">
          Showing {pluralize(visible.length, 'task')}
        </p>
        {visible.length === 0 ? (
          <div className="flex flex-col items-center px-4 py-14 text-center">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-subtle text-fg-subtle">
              <SearchX size={20} aria-hidden="true" />
            </span>
            <p className="mt-3 font-medium text-fg">{active ? 'No tasks match these filters' : 'No tasks yet'}</p>
            <p className="mt-1 text-sm text-fg-muted">{active ? 'Try another search, or clear the filters.' : 'Create a task to see it here.'}</p>
            {active ? (
              <Button variant="secondary" size="sm" className="mt-4" onClick={() => onFilters(followUps ? { ...noFilters, category: 'follow_up' } : noFilters)}>
                Clear filters
              </Button>
            ) : null}
          </div>
        ) : (
          <TaskList rows={visible} grouped={grouped} onOpen={onOpen} onToggle={onToggle} caption={followUps ? 'Follow-ups' : 'Tasks'} />
        )}
      </section>
    </div>
  );
}
