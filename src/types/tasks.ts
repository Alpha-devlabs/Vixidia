/**
 * Tasks & Follow-ups domain types.
 *
 * Only what a person enters is stored. Whether a task is due today, upcoming or
 * overdue is derived from its due date and status in `features/tasks/taskLogic.ts`,
 * so every view agrees.
 */
import type { IsoDay } from './invoice';

export type { IsoDay };

export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';
/** A follow-up is a task in the follow-up category, not a separate kind of record. */
export type TaskCategory = 'general' | 'admin' | 'sales' | 'follow_up';

export interface Task {
  id: string;
  title: string;
  description?: string;
  /** Calendar date (YYYY-MM-DD), no time or timezone. */
  dueDate: IsoDay;
  priority: TaskPriority;
  status: TaskStatus;
  category: TaskCategory;
  /** Optional link to a customer in the Simple CRM sample data (by id). */
  customerId?: string;
  createdOn: IsoDay;
  /** Set when the task is completed; cleared when it is reopened. */
  completedOn?: IsoDay;
}

/** A customer a task can point to: just enough to show who it is. */
export interface TaskCustomer {
  id: string;
  name: string;
  company?: string;
}

/** Everything the tasks demo knows. One instance is the single source of truth for every view. */
export interface TaskBook {
  today: IsoDay;
  tasks: Task[];
  customers: TaskCustomer[];
}
