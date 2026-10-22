import { Link, useLocation, useParams } from 'react-router';
import { ArrowLeft, ArrowRight, Check, ChevronRight, CircleDot, FlaskConical, Info } from 'lucide-react';
import { usePageMeta } from '../hooks/usePageMeta';
import { Container } from '../components/Container';
import { ButtonLink, buttonClass } from '../components/Button';
import { cn } from '../utils/cn';
import { StatusBadge } from '../components/StatusBadge';
import { NotFoundContent } from './NotFoundPage';
import { PulsePreview } from '../features/pulse/PulsePreview';
import { InvoicePreview } from '../features/invoices/InvoicePreview';
import { CrmPreview } from '../features/crm/CrmPreview';
import { TasksPreview } from '../features/tasks/TasksPreview';
import { LeavePreview } from '../features/leave/LeavePreview';
import { WaterPreview } from '../features/water/WaterPreview';
import { GymPreview } from '../features/gym/GymPreview';
import { SalonPreview } from '../features/salon/SalonPreview';
import { TuitionPreview } from '../features/tuition/TuitionPreview';
import { DistributorPreview } from '../features/distributor/DistributorPreview';
import { paths } from '../config/routes';
import { detailState, getProductBySlug, interestPath } from '../utils/products';
import { backLink } from '../utils/origin';
import type { DemoId, Product } from '../types/product';
import type { ReactNode } from 'react';

/** Interface previews shown on detail pages, keyed by demo id. */
const previews: Record<DemoId, { render: () => ReactNode; caption: string }> = {
  'pulse-dashboard': {
    render: () => <PulsePreview />,
    caption: 'A snapshot of the demo’s overview. In the full demo you can change the period, the chart and the revenue target.',
  },
  'invoice-tracker': {
    render: () => <InvoicePreview />,
    caption: 'A snapshot of the demo. Open it to create invoices, record full or part payments and watch balances and statuses update.',
  },
  crm: {
    render: () => <CrmPreview />,
    caption: 'A snapshot of the demo’s customer directory. Open it to search customers, view profiles and their history, and add or edit records.',
  },
  tasks: {
    render: () => <TasksPreview />,
    caption: 'A snapshot of today’s and overdue tasks. Open the demo to filter, create, edit and complete tasks.',
  },
  leave: {
    render: () => <LeavePreview />,
    caption: 'A snapshot of the day’s attendance. Open the demo to check people in and out, browse past days, and approve or reject leave.',
  },
  water: {
    render: () => <WaterPreview />,
    caption: 'A snapshot of today’s orders. Open the demo to add orders, mark deliveries and payments, and look up customers and their balances.',
  },
  gym: {
    render: () => <GymPreview />,
    caption: 'A snapshot of the member list. Open the demo to register members, renew memberships, check members in and record payments.',
  },
  salon: {
    render: () => <SalonPreview />,
    caption: 'A snapshot of the day’s schedule. Open the demo to book, reschedule, cancel and check out appointments, and look up customers.',
  },
  tuition: {
    render: () => <TuitionPreview />,
    caption: 'A snapshot of today’s classes. Open the demo to take attendance, manage students and batches, generate monthly fees and record payments.',
  },
  distributor: {
    render: () => <DistributorPreview />,
    caption: 'A snapshot of this month’s figures and low stock. Open the demo to receive purchases, deliver orders, adjust stock and record payments both ways.',
  },
};

export function ProductDetailPage() {
  const { slug } = useParams<'slug'>();
  const product = getProductBySlug(slug);
  usePageMeta(product ? product.name : 'Product not found', product ? `${product.name}: ${product.summary}` : undefined);

  if (!product) {
    return (
      <NotFoundContent
        title="We don’t have a product by that name"
        message="It may have been renamed, or the link has a typo. Browse the full list of solutions instead."
      />
    );
  }
  return <ProductDetail product={product} />;
}

function ProductDetail({ product }: { product: Product }) {
  const Icon = product.icon;
  const { state } = useLocation();
  const back = backLink(state);
  const cta = detailState(product);
  const Preview = product.demo ? previews[product.demo.id] : undefined;
  const working = cta.primary?.kind === 'demo' || cta.primary?.kind === 'app';
  const FeatureIcon = working ? Check : CircleDot;
  const category = product.industry ? `Industry-specific · ${product.industry}` : product.kind;
  const sectionTitle = 'text-2xl font-bold tracking-[-0.02em]';
  // Opening the demo keeps the visitor's origin, so "Back" in the demo returns here with the same way back to results.
  const ctaLink = (size: 'lg' | 'md', label = cta.primary?.label) =>
    cta.primary ? (
      <Link to={cta.primary.to} state={state} className={buttonClass('primary', size, 'gap-2')}>
        {label}
        <ArrowRight size={18} aria-hidden="true" />
      </Link>
    ) : null;

  return (
    <>
      {/* 1–5 at a glance: what it is, the problem, who it's for, and how to try it. */}
      <header className="border-b border-line bg-surface">
        <Container className="py-6 sm:py-10 lg:py-12">
          <nav aria-label="Breadcrumb">
            {back.query ? (
              <Link to={back.to} className="inline-flex min-h-10 items-center gap-1.5 rounded-[var(--radius-control)] text-sm font-medium text-fg-muted hover:text-fg">
                <ArrowLeft size={16} aria-hidden="true" /> {back.label}
              </Link>
            ) : (
              <ol className="flex min-h-10 flex-wrap items-center gap-1 text-sm text-fg-muted">
                <li>
                  <Link to={back.to} className="hover:text-fg hover:underline">
                    Solutions
                  </Link>
                </li>
                <li aria-hidden="true">
                  <ChevronRight size={14} />
                </li>
                <li aria-current="page" className="font-medium text-fg">
                  {product.name}
                </li>
              </ol>
            )}
          </nav>

          <div className={cn('mt-5 grid gap-8 sm:mt-6 xl:items-center xl:gap-12', Preview && 'xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]')}>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-accent text-on-accent">
                  <Icon size={20} aria-hidden="true" />
                </span>
                <p className="text-sm font-medium text-fg-muted">{category}</p>
                <StatusBadge status={product.status} />
              </div>
              <h1 className="mt-4 text-[2.25rem] leading-[1.08] font-bold tracking-[-0.035em] text-balance sm:text-5xl">{product.name}</h1>
              <p className="mt-3 max-w-[50ch] text-lg leading-relaxed text-fg-muted sm:text-xl">{product.summary}</p>
              <p className="mt-4 text-sm text-fg-muted">
                <span className="font-medium text-fg">Made for:</span> {product.audience.join(' · ')}
              </p>

              {cta.primary ? (
                <div className="mt-6 sm:mt-7">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-3">
                    {ctaLink('lg')}
                    {product.industry ? (
                      <ButtonLink to={`${paths.pricing}?solution=${product.slug}`} variant="subtle" size="lg">
                        See pricing
                      </ButtonLink>
                    ) : (
                      <ButtonLink to={paths.products} variant="subtle" size="lg">
                        Browse other solutions
                      </ButtonLink>
                    )}
                  </div>
                  <p className="mt-3 flex items-center gap-1.5 text-sm text-fg-muted">
                    <FlaskConical size={15} className="shrink-0" aria-hidden="true" />
                    {cta.note}
                  </p>
                </div>
              ) : (
                <div className="mt-6 rounded-[var(--radius-panel)] border border-dashed border-line-strong p-4 sm:mt-7">
                  <p className="flex items-center gap-2 font-semibold text-fg">
                    <Info size={18} aria-hidden="true" /> {cta.availability.title}
                  </p>
                  <p className="mt-1 max-w-[56ch] text-sm text-fg-muted">{cta.availability.text}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <ButtonLink to={paths.products}>Browse available solutions</ButtonLink>
                    <ButtonLink to={interestPath(product)} variant="secondary">
                      I’d use this — tell us why
                    </ButtonLink>
                  </div>
                </div>
              )}
            </div>

            {Preview ? (
              <figure className="min-w-0 max-w-2xl xl:max-w-none">
                {Preview.render()}
                <figcaption className="mt-2.5 text-xs text-fg-muted">{Preview.caption}</figcaption>
              </figure>
            ) : null}
          </div>
        </Container>
      </header>

      <Container className="grid gap-12 py-12 sm:py-16 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)] lg:gap-16">
        <div className="min-w-0 space-y-12">
          <section aria-labelledby="problem">
            <h2 id="problem" className={sectionTitle}>
              The problem it helps solve
            </h2>
            <p className="mt-3 max-w-[64ch] text-lg leading-relaxed text-fg-muted">{product.problem}</p>
            <ul className="mt-5 space-y-2.5" aria-label={working ? 'What it helps with' : 'What it should help with'}>
              {product.benefits.map((b) => (
                <li key={b} className="flex gap-3">
                  <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                  <span className="text-fg">{b}</span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="features">
            <h2 id="features" className={sectionTitle}>
              {working ? 'What you can manage in the demo' : 'Planned features'}
            </h2>
            <p className="mt-3 max-w-[64ch] leading-relaxed text-fg-muted">{product.description}</p>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {product.features.map((f) => (
                <li key={f} className="flex gap-3 rounded-[var(--radius-control)] border border-line bg-surface p-4">
                  <FeatureIcon size={18} className="mt-0.5 shrink-0 text-accent-strong" aria-hidden="true" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="how">
            <h2 id="how" className={sectionTitle}>
              {working ? 'How it works' : 'How it would work'}
            </h2>
            <ol className="mt-5 space-y-4">
              {product.steps.map((step, i) => (
                <li key={step} className="flex gap-4">
                  <span className="tabular inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent-strong" aria-hidden="true">
                    {i + 1}
                  </span>
                  <p className="pt-1 leading-relaxed text-fg">
                    <span className="sr-only">Step {i + 1}: </span>
                    {step}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="min-w-0 space-y-6">
          <section aria-labelledby="audience" className="rounded-[var(--radius-panel)] border border-line bg-surface p-5">
            <h2 id="audience" className="font-semibold">
              Who it’s for
            </h2>
            <p className="mt-2 text-sm text-fg-muted">
              {product.industry ? `An industry-specific solution for ${product.industry.toLowerCase()}.` : `A general business tool: ${product.kind.toLowerCase()}.`}
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {product.audience.map((a) => (
                <li key={a} className="rounded-full bg-subtle px-3 py-1 text-sm">
                  {a}
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="about-demo" className="rounded-[var(--radius-panel)] border border-line bg-surface p-5">
            <h2 id="about-demo" className="flex items-center gap-2 font-semibold">
              <Info size={18} aria-hidden="true" /> {cta.primary?.kind === 'app' ? 'Availability' : 'About the demo'}
            </h2>
            <p className="mt-2 text-sm text-fg-muted">{cta.availability.text}</p>
            {cta.primary?.kind === 'demo' || cta.primary?.kind === 'preview' ? (
              <ul className="mt-3 space-y-2 text-sm text-fg-muted">
                {demoLimits(cta.primary.kind).map((t) => (
                  <li key={t} className="flex gap-2.5">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-fg-subtle" aria-hidden="true" />
                    {t}
                  </li>
                ))}
              </ul>
            ) : null}
            {product.futureFeatures?.length ? (
              <>
                <h3 className="mt-5 text-sm font-semibold text-fg">Not in the demo yet</h3>
                <p className="mt-1 text-xs text-fg-muted">Ideas for later. Your feedback decides which come first.</p>
                <ul className="mt-2 space-y-1.5 text-sm text-fg-muted">
                  {product.futureFeatures.map((f) => (
                    <li key={f} className="flex gap-2.5">
                      <CircleDot size={15} className="mt-0.5 shrink-0 text-fg-subtle" aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            {cta.primary ? (
              <p className="mt-5 text-sm">
                <Link to={interestPath(product)} className="font-medium text-fg underline decoration-line-strong underline-offset-4 hover:decoration-fg">
                  Share feedback on {product.name}
                </Link>
              </p>
            ) : null}
          </section>
        </aside>
      </Container>

      {cta.primary ? (
        <section aria-labelledby="try-again" className="border-t border-line bg-surface">
          <Container className="flex flex-col gap-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:py-12">
            <div>
              <h2 id="try-again" className="text-xl font-semibold tracking-[-0.015em]">
                {cta.primary.kind === 'app' ? `Open ${product.name}` : `See ${product.name} working`}
              </h2>
              <p className="mt-1 max-w-[56ch] text-fg-muted">{cta.note}</p>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              {ctaLink('md')}
              <Link to={back.to} className={buttonClass('subtle', 'md')}>
                {back.query ? back.label : 'Browse other solutions'}
              </Link>
            </div>
          </Container>
        </section>
      ) : null}
    </>
  );
}

/** What visitors should know before opening a demo. Same wording on every solution page. */
function demoLimits(kind: 'demo' | 'preview'): string[] {
  return kind === 'demo'
    ? [
        'Runs on a fictional sample business: every name, number and record is invented.',
        'Changes stay in your browser tab. Reloading the page or choosing Reset demo restores the sample data.',
        'Nothing is saved or sent: no messages go out and no money moves.',
        'It isn’t connected to your accounts or to any outside service.',
      ]
    : ['Shows the planned screens with fictional sample data.', 'Forms are checked, but nothing you enter is saved or sent.'];
}
