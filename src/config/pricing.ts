/**
 * Planned pricing for industry solutions. Every number on the pricing page
 * comes from here, so prices can change in one place while they are tested
 * with real businesses. Amounts are whole rupees.
 *
 * Nothing here is on sale yet: the page labels it as planned launch pricing.
 */

export type BillingCycle = 'monthly' | 'annual';

export interface Plan {
  id: string;
  name: string;
  /** Who the plan suits, in one short line. */
  fit: string;
  /** Price per month when billed monthly. */
  monthly: number;
  /** How many customers, members or students the plan covers. */
  customerLimit: number | null;
  staffLogins: number;
  /** What the plan adds; the first plan lists its whole set. */
  features: string[];
  /** The plan most businesses should look at first. */
  recommended?: boolean;
}

/** Months charged for a year when billed annually (12 months for the price of this many). */
export const ANNUAL_MONTHS_CHARGED = 10;

export const plans: readonly Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    fit: 'For a small business run mostly by the owner.',
    monthly: 499,
    customerLimit: 100,
    staffLogins: 2,
    features: [
      'The full solution for your industry',
      'Customer balances, dues and payments',
      'Monthly bills and receipts',
      'Works on phone and laptop',
    ],
  },
  {
    id: 'growing',
    name: 'Growing',
    fit: 'For a business with a few staff and a busy day.',
    monthly: 999,
    customerLimit: 500,
    staffLogins: 5,
    recommended: true,
    features: [
      'Everything in Starter',
      'A simple phone view for staff',
      'Bills and reminders to share on WhatsApp',
      'Reports on collections and growth',
    ],
  },
  {
    id: 'unlimited',
    name: 'Unlimited',
    fit: 'For an established business with a larger team.',
    monthly: 1999,
    customerLimit: null,
    staffLogins: 15,
    features: ['Everything in Growing', 'Unlimited customers', 'More than one branch or location', 'Priority help on WhatsApp'],
  },
];

/** Optional one-time help getting started, kept separate from the monthly price. */
export const setupHelp = {
  from: 1499,
  description:
    'We move your customer list in from your notebook, spreadsheet or phone, set up your prices and routes, and walk your staff through the first day.',
} as const;

export const trial = {
  days: 14,
  note: 'No card needed to start.',
} as const;

/** What a business gets for joining early access. Shown on the pricing page. */
export const earlyAccessOffer = 'Early-access businesses get founding-customer pricing at launch and a direct say in what we build next.';

/** Effective price per month for a billing cycle (annual is shown as its monthly equivalent, rounded). */
export function pricePerMonth(plan: Pick<Plan, 'monthly'>, cycle: BillingCycle): number {
  return cycle === 'monthly' ? plan.monthly : Math.round((plan.monthly * ANNUAL_MONTHS_CHARGED) / 12);
}

/** Total charged per year when billed annually. */
export function annualTotal(plan: Pick<Plan, 'monthly'>): number {
  return plan.monthly * ANNUAL_MONTHS_CHARGED;
}

export function customerLimitLabel(plan: Pick<Plan, 'customerLimit'>): string {
  return plan.customerLimit === null ? 'Unlimited customers or members' : `Up to ${plan.customerLimit} customers or members`;
}
