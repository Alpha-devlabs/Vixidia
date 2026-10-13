import type { Task, TaskBook, TaskCustomer } from '../types/tasks';
import { addDays, localToday } from '../utils/dates';
import { createCrmSample } from './crmSample';

/*
 * Fictional sample tasks for the Tasks & Follow-ups demo. Dates are relative to
 * the visitor's today, so "due today" and "overdue" always look current.
 *
 * Customer links point at the Simple CRM demo's fictional customers by id. The
 * customer list is read from that sample data, never copied or changed, so no
 * duplicate customer records exist and the CRM demo is unaffected.
 */

interface TaskSeed extends Omit<Task, 'dueDate' | 'createdOn' | 'completedOn'> {
  /** Days from today: negative is in the past. */
  due: number;
  createdDaysAgo: number;
  completedDaysAgo?: number;
}

const seeds: TaskSeed[] = [
  // Overdue
  { id: 't1', title: 'Send revised hamper quote to Saffron Events', description: 'Include engraving for 40 hampers and the rush-delivery charge.', due: -2, priority: 'high', status: 'in_progress', category: 'follow_up', customerId: 'c4', createdDaysAgo: 6 },
  { id: 't2', title: 'Renew the shop’s trade licence', description: 'Renewal form is in the admin folder. Needs the latest rent receipt.', due: -1, priority: 'high', status: 'todo', category: 'admin', createdDaysAgo: 20 },
  { id: 't3', title: 'Call Meridian Dental about welcome kits', due: -6, priority: 'medium', status: 'todo', category: 'follow_up', customerId: 'c3', createdDaysAgo: 30 },
  { id: 't20', title: 'Tidy the shared product photo folder', due: -4, priority: 'low', status: 'todo', category: 'general', createdDaysAgo: 15 },
  // Due today
  { id: 't4', title: 'Confirm engraving proofs with Rahul', description: 'He wants to see the logo on the lid and on the card.', due: 0, priority: 'high', status: 'todo', category: 'follow_up', customerId: 'c4', createdDaysAgo: 2 },
  { id: 't5', title: 'Count gift-wrap stock before the festive rush', due: 0, priority: 'medium', status: 'in_progress', category: 'general', createdDaysAgo: 5 },
  { id: 't6', title: 'Pack muted-colour towel samples for Nisha’s shoot', due: 0, priority: 'medium', status: 'todo', category: 'sales', customerId: 'c12', createdDaysAgo: 2 },
  { id: 't7', title: 'Reply to Sara Haddad about minimum order quantities', due: 0, priority: 'high', status: 'todo', category: 'follow_up', customerId: 'c10', createdDaysAgo: 3 },
  // Upcoming
  { id: 't8', title: 'Prepare the Diwali catalogue page', description: 'Hampers, candles and mug sets. Use the new photos.', due: 1, priority: 'medium', status: 'in_progress', category: 'sales', createdDaysAgo: 10 },
  { id: 't10', title: 'Book courier pickup for the Ooty order', due: 2, priority: 'low', status: 'todo', category: 'general', customerId: 'c2', createdDaysAgo: 4 },
  { id: 't9', title: 'Ask Daniel for feedback on the candle samples', due: 3, priority: 'medium', status: 'todo', category: 'follow_up', customerId: 'c6', createdDaysAgo: 4 },
  { id: 't11', title: 'Order more ceramic mug blanks', due: 5, priority: 'medium', status: 'todo', category: 'general', createdDaysAgo: 3 },
  { id: 't12', title: 'Check in with Karthik about new-home gifts', due: 7, priority: 'low', status: 'todo', category: 'follow_up', customerId: 'c8', createdDaysAgo: 1 },
  { id: 't13', title: 'File the quarterly GST return', description: 'Accountant needs the sales summary two days before.', due: 12, priority: 'high', status: 'todo', category: 'admin', createdDaysAgo: 8 },
  { id: 't14', title: 'Plan the term-start order with Greenfield Academy', due: 20, priority: 'low', status: 'todo', category: 'sales', customerId: 'c7', createdDaysAgo: 2 },
  // Completed
  { id: 't15', title: 'Send the catalogue PDF to Sara Haddad', due: -10, priority: 'medium', status: 'done', category: 'follow_up', customerId: 'c10', createdDaysAgo: 25, completedDaysAgo: 10 },
  { id: 't16', title: 'Restock gift wrap', due: -3, priority: 'low', status: 'done', category: 'general', createdDaysAgo: 9, completedDaysAgo: 4 },
  { id: 't17', title: 'Update the 2026 price list', due: -8, priority: 'medium', status: 'done', category: 'admin', createdDaysAgo: 21, completedDaysAgo: 9 },
  { id: 't18', title: 'Call Anjali to confirm the jar order', due: -3, priority: 'high', status: 'done', category: 'follow_up', customerId: 'c1', createdDaysAgo: 5, completedDaysAgo: 3 },
  { id: 't19', title: 'Photograph the new candle range', due: -1, priority: 'medium', status: 'done', category: 'sales', createdDaysAgo: 12, completedDaysAgo: 2 },
];

/** The CRM demo's fictional customers, reduced to what a task needs to show. */
export function taskCustomers(today: string): TaskCustomer[] {
  return createCrmSample(today).customers.map((c) => ({ id: c.id, name: c.name, ...(c.company ? { company: c.company } : {}) }));
}

export function createTasksSample(today: string = localToday()): TaskBook {
  const tasks: Task[] = seeds.map(({ due, createdDaysAgo, completedDaysAgo, ...rest }) => ({
    ...rest,
    dueDate: addDays(today, due),
    createdOn: addDays(today, -createdDaysAgo),
    ...(completedDaysAgo !== undefined ? { completedOn: addDays(today, -completedDaysAgo) } : {}),
  }));
  return { today, tasks, customers: taskCustomers(today) };
}
