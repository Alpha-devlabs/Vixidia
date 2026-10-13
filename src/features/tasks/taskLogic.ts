import type { IsoDay, Task, TaskBook, TaskCategory, TaskCustomer, TaskPriority, TaskStatus } from '../../types/tasks';
import { daysBetween } from '../../utils/dates';

/*
 * Tasks & Follow-ups — rules shared by every view.
 *
 * Date rules (all dates are calendar days, YYYY-MM-DD, compared as strings, so
 * time zones can't shift them; "today" is the visitor's local date, fixed when
 * the demo starts):
 *   completed – status is Completed, whatever the due date (never overdue)
 *   overdue   – not completed and due before today
 *   due today – not completed and due today
 *   upcoming  – not completed and due after today
 *
 * Mutations are pure: they validate, then return a new book (never mutating the
 * old one) or field errors.
 */

export const taskStatuses: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: 'To do' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'done', label: 'Completed' },
];

export const taskPriorities: { value: TaskPriority; label: string }[] = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

export const taskCategories: { value: TaskCategory; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'admin', label: 'Admin' },
  { value: 'sales', label: 'Sales' },
  { value: 'follow_up', label: 'Follow-up' },
];

const priorityRank: Record<TaskPriority, number> = { high: 3, medium: 2, low: 1 };
const LIMITS = { title: 120, description: 1000 };

export function labelOf<T extends string>(list: { value: T; label: string }[], value: T): string {
  return list.find((x) => x.value === value)?.label ?? value;
}

export function isIsoDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y!, m! - 1, d!));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m! - 1 && date.getUTCDate() === d;
}

// ---------- Date state ----------

export type DueState = 'completed' | 'overdue' | 'today' | 'upcoming';

export function dueState(task: Pick<Task, 'status' | 'dueDate'>, today: IsoDay): DueState {
  if (task.status === 'done') return 'completed';
  if (task.dueDate < today) return 'overdue';
  if (task.dueDate === today) return 'today';
  return 'upcoming';
}

/** List groups, in display order. "Next 7 days" is tomorrow to a week from today. */
export type DueGroup = 'overdue' | 'today' | 'week' | 'later' | 'completed';
export const dueGroups: { key: DueGroup; label: string }[] = [
  { key: 'overdue', label: 'Overdue' },
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'Next 7 days' },
  { key: 'later', label: 'Later' },
  { key: 'completed', label: 'Completed' },
];

export function dueGroup(task: Pick<Task, 'status' | 'dueDate'>, today: IsoDay): DueGroup {
  const state = dueState(task, today);
  if (state !== 'upcoming') return state;
  return daysBetween(today, task.dueDate) <= 7 ? 'week' : 'later';
}

// ---------- Rows ----------

export interface TaskRow {
  task: Task;
  customer?: TaskCustomer;
  state: DueState;
  group: DueGroup;
  /** Days from today to the due date: negative when overdue. */
  daysToDue: number;
}

export function taskRow(book: TaskBook, task: Task): TaskRow {
  const customer = task.customerId ? book.customers.find((c) => c.id === task.customerId) : undefined;
  return {
    task,
    ...(customer ? { customer } : {}),
    state: dueState(task, book.today),
    group: dueGroup(task, book.today),
    daysToDue: daysBetween(book.today, task.dueDate),
  };
}

export type TaskSort = 'due' | 'priority' | 'title';
export const taskSorts: { value: TaskSort; label: string }[] = [
  { value: 'due', label: 'Due date' },
  { value: 'priority', label: 'Priority' },
  { value: 'title', label: 'Title' },
];

function compare(sort: TaskSort) {
  return (a: TaskRow, b: TaskRow): number => {
    // Completed tasks: most recently completed first, whichever sort is chosen.
    if (a.state === 'completed' && b.state === 'completed' && sort === 'due') {
      return (b.task.completedOn ?? '').localeCompare(a.task.completedOn ?? '') || a.task.title.localeCompare(b.task.title);
    }
    const byDue = a.task.dueDate.localeCompare(b.task.dueDate);
    const byPriority = priorityRank[b.task.priority] - priorityRank[a.task.priority];
    const byTitle = a.task.title.localeCompare(b.task.title);
    if (sort === 'priority') return byPriority || byDue || byTitle;
    if (sort === 'title') return byTitle || byDue;
    return byDue || byPriority || byTitle;
  };
}

/** Open tasks first (by the chosen sort), completed tasks last. Returns a new array. */
export function sortTaskRows(rows: TaskRow[], sort: TaskSort): TaskRow[] {
  const cmp = compare(sort);
  return [...rows].sort((a, b) => Number(a.state === 'completed') - Number(b.state === 'completed') || cmp(a, b));
}

/** Every task as a row, sorted (by due date unless another sort is given). */
export function taskRows(book: TaskBook, sort: TaskSort = 'due'): TaskRow[] {
  return sortTaskRows(book.tasks.map((t) => taskRow(book, t)), sort);
}

export interface TaskSummary {
  dueToday: number;
  upcoming: number;
  overdue: number;
  completed: number;
  total: number;
}

export function taskSummary(rows: TaskRow[]): TaskSummary {
  const count = (s: DueState) => rows.filter((r) => r.state === s).length;
  return { dueToday: count('today'), upcoming: count('upcoming'), overdue: count('overdue'), completed: count('completed'), total: rows.length };
}

// ---------- Search, filters and grouping ----------

export interface TaskFilters {
  query: string;
  status: 'all' | TaskStatus;
  priority: 'all' | TaskPriority;
  category: 'all' | TaskCategory;
}

export const noFilters: TaskFilters = { query: '', status: 'all', priority: 'all', category: 'all' };

export function hasFilters(f: TaskFilters): boolean {
  return f.query.trim() !== '' || f.status !== 'all' || f.priority !== 'all' || f.category !== 'all';
}

/** All filters apply together (AND). Search covers title, description and the linked customer. */
export function filterTasks(rows: TaskRow[], f: TaskFilters): TaskRow[] {
  const q = f.query.trim().toLowerCase();
  return rows.filter(({ task, customer }) => {
    if (f.status !== 'all' && task.status !== f.status) return false;
    if (f.priority !== 'all' && task.priority !== f.priority) return false;
    if (f.category !== 'all' && task.category !== f.category) return false;
    if (!q) return true;
    return [task.title, task.description, customer?.name, customer?.company].filter(Boolean).join(' ').toLowerCase().includes(q);
  });
}

/** Groups rows by due date, keeping their order and skipping empty groups. */
export function groupTasks(rows: TaskRow[]): { key: DueGroup; label: string; rows: TaskRow[] }[] {
  return dueGroups.map((g) => ({ ...g, rows: rows.filter((r) => r.group === g.key) })).filter((g) => g.rows.length > 0);
}

// ---------- Creating and editing ----------

/** The task form's fields, as entered. `customerId` is '' for no customer. */
export interface TaskInput {
  title: string;
  description: string;
  dueDate: string;
  priority: string;
  status: string;
  category: string;
  customerId: string;
}

export function emptyTaskInput(today: IsoDay): TaskInput {
  return { title: '', description: '', dueDate: today, priority: 'medium', status: 'todo', category: 'general', customerId: '' };
}

export function taskToInput(t: Task): TaskInput {
  return {
    title: t.title,
    description: t.description ?? '',
    dueDate: t.dueDate,
    priority: t.priority,
    status: t.status,
    category: t.category,
    customerId: t.customerId ?? '',
  };
}

export type FieldErrors = Partial<Record<keyof TaskInput | 'task', string>>;
export type Result<T> = ({ ok: true; book: TaskBook } & T) | { ok: false; errors: FieldErrors };

/** Title and due date are required; everything else must be one of the offered choices. */
export function validateTask(book: TaskBook, input: TaskInput): FieldErrors {
  const errors: FieldErrors = {};
  const title = input.title.trim();
  if (!title) errors.title = 'Give the task a title.';
  else if (title.length > LIMITS.title) errors.title = `Keep the title under ${LIMITS.title} characters.`;
  if (input.description.trim().length > LIMITS.description) errors.description = `Keep the description under ${LIMITS.description} characters.`;
  if (!input.dueDate) errors.dueDate = 'Choose a due date.';
  else if (!isIsoDay(input.dueDate)) errors.dueDate = 'Enter a real date.';
  if (!taskPriorities.some((p) => p.value === input.priority)) errors.priority = 'Choose a priority.';
  if (!taskStatuses.some((s) => s.value === input.status)) errors.status = 'Choose a status.';
  if (!taskCategories.some((c) => c.value === input.category)) errors.category = 'Choose a category.';
  if (input.customerId && !book.customers.some((c) => c.id === input.customerId)) errors.customerId = 'Choose a customer from the list, or none.';
  return errors;
}

function fields(input: TaskInput) {
  const description = input.description.trim();
  return {
    title: input.title.trim().replace(/\s+/g, ' '),
    ...(description ? { description } : {}),
    dueDate: input.dueDate,
    priority: input.priority as TaskPriority,
    status: input.status as TaskStatus,
    category: input.category as TaskCategory,
    ...(input.customerId ? { customerId: input.customerId } : {}),
  };
}

function nextId(taken: { id: string }[]): string {
  const ids = new Set(taken.map((t) => t.id));
  let n = taken.length + 1;
  while (ids.has(`t${n}`)) n += 1;
  return `t${n}`;
}

export function createTask(book: TaskBook, input: TaskInput): Result<{ task: Task }> {
  const errors = validateTask(book, input);
  if (Object.keys(errors).length) return { ok: false, errors };
  const f = fields(input);
  const task: Task = { id: nextId(book.tasks), ...f, createdOn: book.today, ...(f.status === 'done' ? { completedOn: book.today } : {}) };
  return { ok: true, task, book: { ...book, tasks: [...book.tasks, task] } };
}

export function updateTask(book: TaskBook, id: string, input: TaskInput): Result<{ task: Task }> {
  const existing = book.tasks.find((t) => t.id === id);
  if (!existing) return { ok: false, errors: { task: 'This task no longer exists.' } };
  const errors = validateTask(book, input);
  if (Object.keys(errors).length) return { ok: false, errors };
  const f = fields(input);
  const completedOn = f.status === 'done' ? (existing.completedOn ?? book.today) : undefined;
  const task: Task = { id, ...f, createdOn: existing.createdOn, ...(completedOn ? { completedOn } : {}) };
  return { ok: true, task, book: { ...book, tasks: book.tasks.map((t) => (t.id === id ? task : t)) } };
}

/** Marks a task complete (dated today) or reopens it as To do. */
export function setCompleted(book: TaskBook, id: string, completed: boolean): Result<{ task: Task }> {
  const existing = book.tasks.find((t) => t.id === id);
  if (!existing) return { ok: false, errors: { task: 'This task no longer exists.' } };
  if (completed === (existing.status === 'done')) {
    return { ok: false, errors: { task: completed ? 'This task is already completed.' : 'This task is already open.' } };
  }
  const task: Task = { ...existing, status: completed ? 'done' : 'todo' };
  if (completed) task.completedOn = book.today;
  else delete task.completedOn;
  return { ok: true, task, book: { ...book, tasks: book.tasks.map((t) => (t.id === id ? task : t)) } };
}
