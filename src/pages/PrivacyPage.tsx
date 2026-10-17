import { usePageMeta } from '../hooks/usePageMeta';
import { Container } from '../components/Container';
import { brand } from '../config/brand';

const sections = [
  {
    title: 'What this website collects',
    body: [
      'The site does not use accounts, analytics, advertising trackers or cookies of its own.',
      'It does not load fonts, scripts or images from third-party services while you browse.',
      'If you switch between the light and dark theme, your choice (the word “light” or “dark”) is saved in your browser’s local storage so it is remembered next time. It never leaves your device, and clearing your browser’s site data removes it.',
    ],
  },
  {
    title: 'The inquiry form',
    body: [
      'The inquiry form checks what you type inside your browser. It is not yet connected to any server or service, so submitting it does not send, email or store your name, email address or message.',
      'After you submit, the form contents are cleared. They are not placed in the page address (URL).',
    ],
  },
  {
    title: 'Product demos and previews',
    body: [
      'Demos such as Business Analytics, the Invoice & Payment Tracker, Simple CRM, Tasks & Follow-ups, Leave & Attendance and Water Delivery Management use a fictional business and invented records. Changes you make, including invoices, payments, customers, interactions, tasks, check-ins, leave requests and deliveries you add or record, are held in the page’s memory only and are discarded when you reload or close the tab.',
      'Demos do not use local storage, cookies or any network requests to save your changes. Recording a payment in a demo does not move any money, logging a customer interaction does not send any email or message, tasks never send reminders or notifications, leave approvals in the demo notify no one, and recording a water delivery or payment contacts no customer and collects no money.',
    ],
  },
  {
    title: 'Hosting',
    body: [
      'Whoever hosts this website may keep standard server logs (such as IP address, time and page requested) as part of operating the service. This section will name the host and its practices before public launch.',
    ],
  },
  {
    title: 'Changes to this policy',
    body: [
      'If we add analytics, a connected inquiry service or any other data processing, this page will be updated to describe exactly what is collected, why, and for how long, before that change goes live.',
    ],
  },
];

export function PrivacyPage() {
  usePageMeta('Privacy policy', `How the ${brand.name} website handles information. Draft policy.`);
  return (
    <Container className="max-w-3xl py-14 sm:py-20">
      <p className="inline-flex rounded-full border border-accent bg-accent-soft px-3 py-1 text-sm font-semibold text-accent-strong">
        Draft — requires review before public launch
      </p>
      <h1 className="mt-5 text-4xl font-bold tracking-[-0.03em] sm:text-5xl">Privacy policy</h1>
      <p className="mt-5 text-lg leading-relaxed text-fg-muted">
        This page describes how the {brand.name} website behaves today. It is a plain-language draft and has not yet
        been reviewed for legal completeness.
      </p>
      <div className="mt-12 space-y-10">
        {sections.map((s) => (
          <section key={s.title}>
            <h2 className="text-xl font-semibold tracking-[-0.015em]">{s.title}</h2>
            <div className="mt-3 space-y-3 leading-relaxed text-fg-muted">
              {s.body.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </Container>
  );
}
