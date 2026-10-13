import { Activity, CalendarCheck, Contact, ListChecks, ReceiptText } from 'lucide-react';
import type { Product } from '../types/product';

/**
 * The product registry: the single source of truth for listings, cards,
 * detail pages, demo routes and calls to action.
 *
 * Statuses are deliberately honest. Business Analytics has a sample-data demo
 * but is still in development, so it is `in_build`, not `live`.
 *
 * Business Analytics keeps the id and slug `pulse` (its earlier name) so existing
 * links (/products/pulse), imports and tests keep working; only labels changed.
 */
export const products: readonly Product[] = [
  {
    id: 'pulse',
    slug: 'pulse',
    name: 'Business Analytics',
    kind: 'Sales & performance insights',
    question: 'How is my business performing?',
    status: 'in_build',
    icon: Activity,
    summary: 'Understand sales, revenue, orders, and business performance.',
    tagline: 'See how your business is performing — and what is changing.',
    problem:
      'Most small businesses have the numbers somewhere, but not the picture. Knowing whether this month is better than last, which products are growing, or whether you are on track for a target means rebuilding the same spreadsheet by hand.',
    description:
      'A practical business analytics solution that helps small businesses explore sales trends, track key performance indicators, compare products and categories, and monitor progress toward revenue targets.',
    audience: ['Owner-run businesses', 'Shops and online sellers', 'Small teams', 'Service businesses'],
    benefits: [
      'Understand at a glance whether the business is growing or slowing',
      'See which products and categories drive your sales',
      'Notice important changes early, so you know where to look next',
    ],
    features: [
      'A performance overview for the last 7, 30 or 90 days',
      'Revenue, orders, average order value and items sold, compared with the previous period',
      'A trend chart you can switch between revenue, orders and average order value',
      'Sales broken down by category or by product',
      'Progress toward a revenue target you set',
      'Recent activity and notable changes, such as milestones and new customers',
      'Rule-based insights that point out what has changed and what needs attention',
    ],
    futureFeatures: [
      'Connecting your own sales records, starting with spreadsheet import',
      'Weekly performance summaries',
      'Shared dashboards for team members',
    ],
    demo: { id: 'pulse-dashboard', label: 'Try the demo', kind: 'interactive' },
  },
  {
    id: 'tasks',
    slug: 'tasks-follow-ups',
    name: 'Tasks & Follow-ups',
    kind: 'Productivity',
    question: 'What needs to be done, and when?',
    status: 'in_build',
    icon: ListChecks,
    summary: 'Keep tasks organized and follow-ups on track.',
    tagline: 'Stop losing follow-ups in chat threads.',
    problem:
      'Promises made on calls — “I’ll send the quote Friday” — get buried in messages. Nobody keeps track, and customers notice.',
    description:
      'Organize daily work, track deadlines, and keep important customer follow-ups from slipping through the cracks.',
    audience: ['Freelancers', 'Small teams', 'Owner-operators'],
    benefits: [
      'Every follow-up has a due date',
      'See what is due today without opening five apps',
      'Spot overdue work before a customer has to chase you',
    ],
    features: [
      'An overview of what is due today, upcoming, overdue and completed',
      'A task list with search, filters by status, priority and category, sorting and grouping by due date',
      'Creating and editing tasks with a due date, priority, status and category',
      'Follow-ups that can link to a customer',
      'Marking tasks complete and reopening them',
    ],
    futureFeatures: ['Reminders before a task is due', 'Assigning tasks to teammates', 'Repeating tasks'],
    demo: { id: 'tasks', label: 'Try the demo', kind: 'interactive' },
  },
  {
    id: 'crm',
    slug: 'simple-crm',
    name: 'Simple CRM',
    kind: 'Customer Management',
    question: 'Who are my customers, and what is their history?',
    status: 'in_build',
    icon: Contact,
    summary: 'Keep customer relationships organized.',
    tagline: 'Remember every customer without a sales department.',
    problem:
      'Customer details live in a phone’s contact list, a spreadsheet and someone’s head. When a regular calls, there is no quick way to see their history.',
    description:
      'Manage customer details, track interactions, and keep important relationship information in one convenient place.',
    audience: ['Service businesses', 'Freelancers with repeat clients', 'Small retail'],
    benefits: [
      'Look up a customer and see their history in seconds',
      'Keep notes that the whole team can read',
      'No sales-pipeline jargon to learn',
    ],
    features: [
      'A customer directory with search and status filters',
      'Customer profiles with contact details, tags and notes',
      'An interaction history of calls, meetings, emails, messages and notes',
      'Adding and editing customers, with checks on email and phone numbers',
      'An overview of prospects, active customers and who hasn’t been contacted in 30 days',
    ],
    futureFeatures: ['Importing customers from a spreadsheet', 'Shared access for a small team'],
    demo: { id: 'crm', label: 'Try the demo', kind: 'interactive' },
  },
  {
    id: 'invoices',
    slug: 'invoice-payment-tracker',
    name: 'Invoice & Payment Tracker',
    kind: 'Invoicing & payments',
    question: 'Which invoices are unpaid, and when are they due?',
    status: 'in_build',
    icon: ReceiptText,
    summary: 'Create and track invoices, due dates and payments, and see what is overdue.',
    tagline: 'Know who owes you, and how much.',
    problem:
      'Invoices go out by message or paper, payments arrive in different ways, and matching the two takes an evening every month.',
    description:
      'Create invoices, follow each one through to payment, and record payments as they arrive. A running balance for every customer shows who owes what, and overdue invoices are easy to spot.',
    audience: ['Freelancers', 'Small agencies', 'Wholesale and supply businesses'],
    benefits: [
      'One list of every unpaid invoice',
      'Running balance for each customer',
      'Fewer evenings spent reconciling',
    ],
    features: [
      'Creating invoices with GST, sent straight away or saved as a draft',
      'Due dates and payment status for every invoice',
      'Recording full and part payments, with every payment kept',
      'Overdue invoices and unpaid balances by age',
      'Searching and filtering invoices by status',
    ],
    futureFeatures: [
      'Customer balances and a customer list',
      'Saving invoices to your own account',
      'Sending invoices to customers',
    ],
    demo: { id: 'invoice-tracker', label: 'Try the invoice demo', kind: 'interactive' },
  },
  {
    id: 'leave',
    slug: 'leave-attendance',
    name: 'Leave & Attendance',
    kind: 'Leave & attendance',
    question: 'Who is in, who is on leave, and how many days are left?',
    status: 'planned',
    icon: CalendarCheck,
    summary: 'Leave requests, approvals and daily attendance for small teams.',
    tagline: 'Leave and attendance without the HR suite.',
    problem:
      'Leave requests arrive as messages, attendance sits in a register, and month-end means reconstructing who was where.',
    description:
      'Team members request leave, the owner approves it, and attendance is recorded in one place that is easy to check at month-end.',
    audience: ['Teams of 3–30 people', 'Shops and workshops', 'Small offices'],
    benefits: ['Clear record of approved leave', 'Month-end attendance in one view', 'No spreadsheets to merge'],
    features: ['Leave requests and approvals', 'Daily attendance marking', 'Monthly summary per person'],
  },
];
