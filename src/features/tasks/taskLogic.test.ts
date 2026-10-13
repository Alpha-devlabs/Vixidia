import { describe, expect, it } from 'vitest';
import type { Task, TaskBook } from '../../types/tasks';
import { createTasksSample, taskCustomers } from '../../data/tasksSample';
import { createCrmSample } from '../../data/crmSample';
import {
  createTask,
  dueGroup,
  dueState,
  emptyTaskInput,
  filterTasks,
  groupTasks,
  noFilters,
  setCompleted,
  sortTaskRows,
  taskRow,
  taskRows,
  taskSummary,
  taskToInput,
  updateTask,
  validateTask,
  type TaskInput,
} from './taskLogic';

const TODAY = '2026-10-14';
const sample = createTasksSample(TODAY);
const rows = taskRows(sample);

const base: Task = { id: 'x', title: 'Base task', dueDate: TODAY, priority: 'medium', status: 'todo', category: 'general', createdOn: '2026-10-01' };
const bookWith = (tasks: Task[]): TaskBook => ({ today: TODAY, tasks, customers: [{ id: 'c1', name: 'Anjali Raman', company: 'Brightline Interiors' }] });
const input = (o: Partial<TaskInput> = {}): TaskInput => ({ ...emptyTaskInput(TODAY), title: 'Call the courier', ...o });
const ok = <T,>(r: { ok: true; book: TaskBook } & T | { ok: false; errors: object }) => {
  if (!r.ok) throw new Error(JSON.stringify(r.errors));
  return r;
};

describe('date rules', () => {
  it('classifies by due date, comparing calendar days only', () => {
    expect(dueState({ ...base, dueDate: '2026-10-13' }, TODAY)).toBe('overdue');
    expect(dueState({ ...base, dueDate: TODAY }, TODAY)).toBe('today');
    expect(dueState({ ...base, dueDate: '2026-10-15' }, TODAY)).toBe('upcoming');
  });

  it('never counts a completed task as overdue, whatever its due date', () => {
    expect(dueState({ ...base, status: 'done', dueDate: '2020-01-01' }, TODAY)).toBe('completed');
    expect(dueGroup({ ...base, status: 'done', dueDate: '2020-01-01' }, TODAY)).toBe('completed');
  });

  it('treats in-progress tasks like any open task', () => {
    expect(dueState({ ...base, status: 'in_progress', dueDate: '2026-10-10' }, TODAY)).toBe('overdue');
  });

  it('groups upcoming work into the next 7 days and later', () => {
    expect(dueGroup({ ...base, dueDate: '2026-10-15' }, TODAY)).toBe('week');
    expect(dueGroup({ ...base, dueDate: '2026-10-21' }, TODAY)).toBe('week'); // exactly 7 days
    expect(dueGroup({ ...base, dueDate: '2026-10-22' }, TODAY)).toBe('later');
  });

  it('works across month and year boundaries', () => {
    expect(dueGroup({ ...base, dueDate: '2027-01-02' }, '2026-12-31')).toBe('week');
    expect(dueState({ ...base, dueDate: '2026-12-31' }, '2027-01-01')).toBe('overdue');
    expect(taskRow({ ...bookWith([]), today: '2026-12-31' }, { ...base, dueDate: '2027-01-02' }).daysToDue).toBe(2);
  });
});

describe('summary counts', () => {
  it('match the sample data and add up to the total', () => {
    const s = taskSummary(rows);
    expect(s).toEqual({ dueToday: 4, upcoming: 7, overdue: 4, completed: 5, total: 20 });
    expect(s.dueToday + s.upcoming + s.overdue + s.completed).toBe(s.total);
    expect(s.completed).toBe(sample.tasks.filter((t) => t.status === 'done').length);
  });

  it('agree with the list groups', () => {
    const groups = Object.fromEntries(groupTasks(rows).map((g) => [g.key, g.rows.length]));
    const s = taskSummary(rows);
    expect(groups.overdue).toBe(s.overdue);
    expect(groups.today).toBe(s.dueToday);
    expect((groups.week ?? 0) + (groups.later ?? 0)).toBe(s.upcoming);
    expect(groups.completed).toBe(s.completed);
  });
});

describe('sorting and grouping', () => {
  it('lists open tasks by due date (then priority), completed tasks last, newest completion first', () => {
    const open = rows.filter((r) => r.state !== 'completed');
    for (let i = 1; i < open.length; i++) expect(open[i - 1]!.task.dueDate <= open[i]!.task.dueDate).toBe(true);
    expect(rows.slice(-5).every((r) => r.state === 'completed')).toBe(true);
    const done = rows.slice(-5).map((r) => r.task.completedOn!);
    expect([...done].sort().reverse()).toEqual(done);
  });

  it('can sort by priority or title, still keeping completed tasks last', () => {
    const byPriority = sortTaskRows(rows, 'priority').filter((r) => r.state !== 'completed').map((r) => r.task.priority);
    expect(byPriority.indexOf('low')).toBeGreaterThan(byPriority.lastIndexOf('high'));
    const byTitle = sortTaskRows(rows, 'title');
    expect(byTitle.at(-1)!.state).toBe('completed');
    const openTitles = byTitle.filter((r) => r.state !== 'completed').map((r) => r.task.title);
    expect([...openTitles].sort((a, b) => a.localeCompare(b))).toEqual(openTitles);
  });

  it('groups in a fixed order and skips empty groups', () => {
    expect(groupTasks(rows).map((g) => g.key)).toEqual(['overdue', 'today', 'week', 'later', 'completed']);
    expect(groupTasks(rows.filter((r) => r.state === 'today')).map((g) => g.key)).toEqual(['today']);
  });
});

describe('search and filters', () => {
  it('compose: every filter must match', () => {
    const r = filterTasks(rows, { query: 'sara', status: 'all', priority: 'high', category: 'follow_up' });
    expect(r.map((x) => x.task.id)).toEqual(['t7']);
    expect(filterTasks(rows, { ...noFilters, status: 'done', category: 'follow_up' }).every((x) => x.task.status === 'done' && x.task.category === 'follow_up')).toBe(true);
    expect(filterTasks(rows, { ...noFilters, query: 'sara', status: 'done' }).map((x) => x.task.id)).toEqual(['t15']);
  });

  it('search covers title, description and the linked customer’s name and company', () => {
    expect(filterTasks(rows, { ...noFilters, query: 'ENGRAVING' }).map((x) => x.task.id).sort()).toEqual(['t1', 't4']);
    expect(filterTasks(rows, { ...noFilters, query: 'rent receipt' }).map((x) => x.task.id)).toEqual(['t2']);
    expect(filterTasks(rows, { ...noFilters, query: 'saffron events' }).map((x) => x.task.id).sort()).toEqual(['t1', 't4']);
    expect(filterTasks(rows, { ...noFilters, query: 'zzz' })).toEqual([]);
  });

  it('with no filters returns everything', () => {
    expect(filterTasks(rows, noFilters)).toHaveLength(rows.length);
  });
});

describe('customer links', () => {
  it('reuse the CRM sample customers without copying or changing them', () => {
    const crm = createCrmSample(TODAY);
    expect(sample.customers.map((c) => c.id)).toEqual(crm.customers.map((c) => c.id));
    expect(taskCustomers(TODAY)).toEqual(sample.customers);
    for (const t of sample.tasks) if (t.customerId) expect(crm.customers.some((c) => c.id === t.customerId)).toBe(true);
  });

  it('show the customer on linked tasks and nothing on standalone tasks', () => {
    expect(rows.find((r) => r.task.id === 't7')!.customer?.name).toBe('Sara Haddad');
    expect(rows.find((r) => r.task.id === 't2')!.customer).toBeUndefined();
  });

  it('are optional, but must point at a known customer when given', () => {
    expect(validateTask(sample, input({ category: 'follow_up', customerId: '' }))).toEqual({});
    expect(validateTask(sample, input({ customerId: 'c999' })).customerId).toMatch(/Choose a customer/);
  });
});

describe('creating and editing', () => {
  it('requires a title and a real due date; other fields must be offered choices', () => {
    const e = validateTask(sample, input({ title: '  ', dueDate: '2026-02-30', priority: 'urgent', status: 'blocked', category: 'misc' }));
    expect(Object.keys(e).sort()).toEqual(['category', 'dueDate', 'priority', 'status', 'title']);
    expect(e.title).toBe('Give the task a title.');
    expect(validateTask(sample, input({ dueDate: '' })).dueDate).toBe('Choose a due date.');
    expect(validateTask(sample, input({ title: 'x'.repeat(121) })).title).toMatch(/under 120/);
  });

  it('creates a tidy task, leaving the original book unchanged', () => {
    const r = ok(createTask(sample, input({ title: '  Call   the courier ', description: '  ', customerId: 'c2', category: 'follow_up' })));
    expect(r.task).toEqual({ id: 't21', title: 'Call the courier', dueDate: TODAY, priority: 'medium', status: 'todo', category: 'follow_up', customerId: 'c2', createdOn: TODAY });
    expect(taskSummary(taskRows(r.book)).dueToday).toBe(5);
    expect(sample.tasks).toHaveLength(20);
  });

  it('dates a task completed when it is created or edited as Completed, and clears it when reopened by editing', () => {
    const created = ok(createTask(sample, input({ status: 'done' })));
    expect(created.task.completedOn).toBe(TODAY);
    const t17 = sample.tasks.find((t) => t.id === 't17')!;
    const kept = ok(updateTask(sample, 't17', { ...taskToInput(t17), title: 'Update the 2026 price list (v2)' }));
    expect(kept.task.completedOn).toBe(t17.completedOn); // editing a completed task keeps its completion date
    const reopened = ok(updateTask(sample, 't17', { ...taskToInput(t17), status: 'in_progress' }));
    expect(reopened.task.completedOn).toBeUndefined();
    expect(reopened.task.createdOn).toBe(t17.createdOn);
  });

  it('refuses to edit a task that does not exist', () => {
    expect(updateTask(sample, 'nope', input()).ok).toBe(false);
  });
});

describe('completing and reopening', () => {
  it('moves a task between overdue and completed, updating every count', () => {
    const before = taskSummary(rows);
    const done = ok(setCompleted(sample, 't2', true));
    expect(done.task).toMatchObject({ status: 'done', completedOn: TODAY });
    const after = taskSummary(taskRows(done.book));
    expect(after.overdue).toBe(before.overdue - 1);
    expect(after.completed).toBe(before.completed + 1);

    const reopened = ok(setCompleted(done.book, 't2', false));
    expect(reopened.task.status).toBe('todo');
    expect(reopened.task.completedOn).toBeUndefined();
    expect(taskSummary(taskRows(reopened.book))).toEqual(before);
  });

  it('refuses to complete a completed task or reopen an open one', () => {
    expect(setCompleted(sample, 't15', true).ok).toBe(false);
    expect(setCompleted(sample, 't2', false).ok).toBe(false);
    expect(setCompleted(sample, 'nope', true).ok).toBe(false);
  });
});

describe('sample data', () => {
  it('covers every state, priority and category', () => {
    expect(new Set(rows.map((r) => r.state))).toEqual(new Set(['overdue', 'today', 'upcoming', 'completed']));
    expect(new Set(sample.tasks.map((t) => t.priority))).toEqual(new Set(['low', 'medium', 'high']));
    expect(new Set(sample.tasks.map((t) => t.category))).toEqual(new Set(['general', 'admin', 'sales', 'follow_up']));
    expect(sample.tasks.some((t) => t.status === 'in_progress')).toBe(true);
  });

  it('is valid: unique ids, completion dates only on completed tasks, every task passes validation', () => {
    expect(new Set(sample.tasks.map((t) => t.id)).size).toBe(sample.tasks.length);
    for (const t of sample.tasks) {
      expect(Boolean(t.completedOn), t.id).toBe(t.status === 'done');
      expect(validateTask(sample, taskToInput(t)), t.id).toEqual({});
      if (t.completedOn) expect(t.completedOn <= TODAY).toBe(true);
    }
  });

  it('restores the same tasks for the same day (reset)', () => {
    expect(createTasksSample(TODAY)).toEqual(sample);
  });
});
