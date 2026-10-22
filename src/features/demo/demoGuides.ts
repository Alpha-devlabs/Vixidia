import type { DemoId } from '../../types/product';

/**
 * First-run guidance for each demo: one sentence on what the visitor can do,
 * and one suggested first action that points at a real, working control on the
 * demo's first screen. "Show me" only scrolls to and focuses that control; it
 * never clicks it or changes the sample data.
 */
export interface DemoGuide {
  /** What you can do here, in one sentence. */
  intro: string;
  /** The suggested first action, as an instruction. */
  tryFirst: string;
  /** Finds the control the suggestion points at, on the demo's first screen. */
  target: (root: ParentNode) => HTMLElement | null;
}

/** True when the element is rendered (not inside a hidden mobile or desktop layout). */
export function isVisible(el: Element): boolean {
  return el instanceof HTMLElement && el.getClientRects().length > 0 && !el.closest('[hidden], [inert]');
}

/** The first visible element matching `selector`, optionally inside the panel whose heading is `panel`. */
export function findTarget(root: ParentNode, selector: string, panel?: string): HTMLElement | null {
  const scopes: ParentNode[] = panel
    ? [...root.querySelectorAll('section')].filter((s) => {
        const h = s.querySelector('h2, h3');
        return h?.textContent?.trim() === panel;
      })
    : [root];
  for (const scope of scopes) {
    for (const el of scope.querySelectorAll(selector)) {
      if (isVisible(el) && !(el as HTMLButtonElement).disabled) return el as HTMLElement;
    }
  }
  return null;
}

export const demoGuides: Record<DemoId, DemoGuide> = {
  'pulse-dashboard': {
    intro: 'See how a sample shop is performing: revenue, orders and trends.',
    tryFirst: 'Switch the reporting period to the last 7 days and watch every figure update.',
    target: (r) => findTarget(r, '[role="group"][aria-label="Reporting period"] button[aria-pressed="false"]'),
  },
  'invoice-tracker': {
    intro: 'Create invoices, record payments and see what is still owed and what is overdue.',
    tryFirst: 'Open an overdue invoice and record a full or part payment.',
    target: (r) => findTarget(r, 'button', 'Overdue'),
  },
  crm: {
    intro: 'Keep customer details and every call, meeting and message in one place.',
    tryFirst: 'Open a recent interaction to see that customer’s profile and full history.',
    target: (r) => findTarget(r, 'button', 'Recent interactions'),
  },
  tasks: {
    intro: 'See what is due today and overdue, and keep follow-ups with customers on track.',
    tryFirst: 'Open one of today’s tasks and mark it complete.',
    target: (r) => findTarget(r, 'button[aria-label^="Open task:"]', 'Due today'),
  },
  leave: {
    intro: 'See who is in, late or on leave today, and approve or reject leave requests.',
    tryFirst: 'Check in someone who hasn’t arrived yet.',
    target: (r) => findTarget(r, 'button[aria-label^="Check in "]'),
  },
  water: {
    intro: 'Run today’s water-can deliveries: regular customers, the delivery round, cans and deposits, and who still owes money.',
    tryFirst: 'Mark the next order delivered, then mark it paid.',
    target: (r) => findTarget(r, 'button[aria-label$=" delivered"][aria-label^="Mark "]'),
  },
  gym: {
    intro: 'Manage members, renewals, daily check-ins and membership payments.',
    tryFirst: 'Renew a membership that is about to expire.',
    target: (r) => findTarget(r, 'button[aria-label^="Renew "]', 'Renewals due'),
  },
  salon: {
    intro: 'Book appointments, see each stylist’s day and check out what has been done.',
    tryFirst: 'Take payment for a completed appointment that hasn’t been paid.',
    target: (r) => findTarget(r, 'button[aria-label^="Take payment from "]'),
  },
  tuition: {
    intro: 'Run batches, take attendance and keep track of monthly fees.',
    tryFirst: 'Take attendance for one of today’s classes.',
    target: (r) => findTarget(r, 'button[aria-label^="Take attendance for "]'),
  },
  distributor: {
    intro: 'Track stock, purchases, customer orders and what is owed both ways.',
    tryFirst: 'Open a low-stock product to see every stock movement behind its figure.',
    target: (r) => findTarget(r, 'button[aria-label^="Open "]', 'Low stock'),
  },
};
