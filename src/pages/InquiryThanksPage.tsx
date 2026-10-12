import { useLocation } from 'react-router';
import { CircleCheck, Info, Inbox } from 'lucide-react';
import { usePageMeta } from '../hooks/usePageMeta';
import { Container } from '../components/Container';
import { ButtonLink } from '../components/Button';
import { paths } from '../config/routes';
import type { InquiryThanksState } from './InquiryPage';

function isThanksState(value: unknown): value is InquiryThanksState {
  return typeof value === 'object' && value !== null && 'status' in value;
}

type Outcome = 'delivered' | 'not_connected' | 'none';

const content: Record<Outcome, { title: string; pageTitle: string; paragraphs: string[] }> = {
  delivered: {
    pageTitle: 'Inquiry received',
    title: 'Inquiry received',
    paragraphs: ['Thanks — your message has been delivered.'],
  },
  not_connected: {
    pageTitle: 'Inquiry not sent',
    title: 'Your details look good — but nothing was sent',
    paragraphs: [
      'The form checked your answers, but this website doesn’t have a submission service connected yet. Your message was not emailed, saved or passed to anyone, and it has been cleared from the page.',
      'We’re building the site in stages. Once inquiries can be delivered, this page will confirm it plainly.',
    ],
  },
  none: {
    pageTitle: 'Inquiry confirmation',
    title: 'There’s no inquiry to confirm',
    paragraphs: ['This page confirms an inquiry after you fill in the form. Start one from the inquiry page.'],
  },
};

const icons = { delivered: CircleCheck, not_connected: Info, none: Inbox } as const;

export function InquiryThanksPage() {
  const { state } = useLocation();
  const outcome: Outcome = isThanksState(state) ? state.status : 'none';
  const { title, pageTitle, paragraphs } = content[outcome];
  const Icon = icons[outcome];
  usePageMeta(pageTitle);

  return (
    <Container className="max-w-3xl py-16 sm:py-24">
      <Icon size={36} className={outcome === 'delivered' ? 'text-success-strong' : 'text-accent-strong'} aria-hidden="true" />
      <h1 className="mt-5 text-4xl font-bold tracking-[-0.03em] text-balance">{title}</h1>
      <div className="mt-5 space-y-4 text-lg leading-relaxed text-fg-muted">
        {paragraphs.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
      <div className="mt-10 flex flex-wrap gap-3">
        {outcome === 'none' ? (
          <ButtonLink to={paths.inquiry}>Go to the inquiry form</ButtonLink>
        ) : (
          <ButtonLink to={paths.products}>Explore products</ButtonLink>
        )}
        <ButtonLink to={paths.home} variant="secondary">
          Back to the homepage
        </ButtonLink>
      </div>
    </Container>
  );
}
