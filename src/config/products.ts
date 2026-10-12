import { Activity, CalendarCheck, Contact, ListChecks, ReceiptText } from 'lucide-react';
import type { Product } from '../types/product';

/**
 * The product registry: the single source of truth for listings, cards,
 * detail pages, demo routes and calls to action.
 *
 * Statuses are deliberately honest. Pulse has a sample-data demo but is
 * still in development, so it is `in_build`, not `live`.
 */
export const products: readonly Product[] = [
  {
    id: 'pulse',
    slug: 'pulse',
    name: 'Pulse',
    kind: 'Business insights & analytics',
    question: 'How is my business performing?',
    status: 'in_build',
    icon: Activity,
    summary: 'Sales trends, key numbers and plain-language insights that show how your business is doing.',
    tagline: 'See how your business is performing — and what is changing.',
    problem:
      'Most small businesses have the numbers somewhere, but not the picture. Knowing whether this month is better than last, which products are growing, or whether you are on track for a target means rebuilding the same spreadsheet by hand.',
    description:
      'Pulse turns your sales activity into a clear performance dashboard: trends over the period you choose, comparisons with the period before, a breakdown of what is selling, progress toward a target and a few plain observations about what has changed.',
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
    demo: { id: 'pulse-dashboard', label: 'Try the Pulse demo', kind: 'interactive' },
  },
  {
    id: 'tasks',
    slug: 'tasks-follow-ups',
    name: 'Tasks & Follow-ups',
    kind: 'Tasks & reminders',
    question: 'What work needs to be done, and by whom?',
    status: 'planned',
    icon: ListChecks,
    summary: 'Tasks, reminders and customer follow-ups, so nothing promised gets forgotten.',
    tagline: 'Stop losing follow-ups in chat threads.',
    problem:
      'Promises made on calls — “I’ll send the quote Friday” — get buried in messages. Nobody owns the reminder, and customers notice.',
    description:
      'A shared list of tasks and customer follow-ups with due dates and owners, designed for one person or a team of a few.',
    audience: ['Freelancers', 'Small teams', 'Owner-operators'],
    benefits: [
      'Every follow-up has a date and an owner',
      'See what is due today without opening five apps',
      'Hand tasks between teammates without losing context',
    ],
    features: [
      'Tasks with due dates and owners',
      'Reminders for upcoming and overdue work',
      'Follow-ups linked to a customer',
      'Today and overdue views',
    ],
  },
  {
    id: 'crm',
    slug: 'simple-crm',
    name: 'Simple CRM',
    kind: 'Customer & relationship management',
    question: 'Who are my customers, and what is their history?',
    status: 'planned',
    icon: Contact,
    summary: 'Customer details, notes and the history of every conversation in one place.',
    tagline: 'Remember every customer without a sales department.',
    problem:
      'Customer details live in a phone’s contact list, a spreadsheet and someone’s head. When a regular calls, there is no quick way to see their history.',
    description:
      'A lightweight customer list with notes and a record of each conversation — without pipelines, forecasts or setup projects.',
    audience: ['Service businesses', 'Freelancers with repeat clients', 'Small retail'],
    benefits: [
      'Look up a customer and see their history in seconds',
      'Keep notes that the whole team can read',
      'No sales-pipeline jargon to learn',
    ],
    features: ['Customer records with tags', 'Notes and contact history', 'Search across customers', 'Import from a spreadsheet'],
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
      'Invoice creation and tracking',
      'Due dates and payment status for every invoice',
      'Overdue invoice view',
      'Recording full and part payments',
      'Customer balances',
    ],
    demo: { id: 'invoice-tracker', label: 'See the design preview', kind: 'design-preview' },
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
