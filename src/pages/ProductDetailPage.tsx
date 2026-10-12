import { Link, useParams } from 'react-router';
import { ChevronRight, Check, CircleDot, Info } from 'lucide-react';
import { usePageMeta } from '../hooks/usePageMeta';
import { Container } from '../components/Container';
import { ButtonLink } from '../components/Button';
import { StatusBadge } from '../components/StatusBadge';
import { NotFoundContent } from './NotFoundPage';
import { PulsePreview } from '../features/pulse/PulsePreview';
import { InvoicePreview } from '../features/invoices/InvoicePreview';
import { paths } from '../config/routes';
import { demoPath, getProductBySlug, hasDemo, interestPath, statusInfo } from '../utils/products';
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
    caption: 'A snapshot of the design preview. Open it to see the dashboard, invoice list, invoice details, the new-invoice form and recording a payment.',
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
        message="It may have been renamed, or the link has a typo. Browse the full list of products instead."
      />
    );
  }
  return <ProductDetail product={product} />;
}

function ProductDetail({ product }: { product: Product }) {
  const Icon = product.icon;
  const Preview = product.demo ? previews[product.demo.id] : undefined;
  const planned = product.status === 'planned';
  const preview = product.demo?.kind === 'design-preview';
  const featureHeading =
    planned || preview ? 'Planned features' : product.demo ? 'What you can try in the demo' : 'What it does';
  const FeatureIcon = planned || preview ? CircleDot : Check;

  return (
    <>
      <header className="border-b border-line bg-surface">
        <Container className="py-10 sm:py-16">
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-1 text-sm text-fg-muted">
              <li>
                <Link to={paths.products} className="hover:text-fg hover:underline">
                  Products
                </Link>
              </li>
              <li aria-hidden="true">
                <ChevronRight size={14} />
              </li>
              <li aria-current="page" className="font-medium text-fg">
                {product.name}
              </li>
            </ol>
          </nav>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-[var(--radius-control)] bg-accent text-on-accent">
              <Icon size={24} aria-hidden="true" />
            </span>
            <StatusBadge status={product.status} />
          </div>
          <h1 className="mt-5 text-4xl font-bold tracking-[-0.035em] sm:text-5xl">{product.name}</h1>
          <p className="mt-1 text-lg font-medium text-fg-muted">{product.kind}</p>
          <p className="mt-3 max-w-[40ch] text-2xl font-medium tracking-[-0.015em] text-fg-muted sm:text-[1.7rem]">
            {product.tagline}
          </p>
          <p className="mt-5 max-w-[62ch] text-lg leading-relaxed text-fg-muted">{product.description}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            {hasDemo(product) ? (
              <ButtonLink to={demoPath(product)} size="lg">
                {product.demo.label}
              </ButtonLink>
            ) : null}
            {product.status === 'live' && product.appUrl ? (
              <ButtonLink to={product.appUrl} size="lg">
                Open {product.name}
              </ButtonLink>
            ) : null}
            <ButtonLink to={interestPath(product)} size="lg" variant="secondary">
              {product.status === 'planned' ? 'I’d use this — tell us why' : 'Share feedback'}
            </ButtonLink>
          </div>
        </Container>
      </header>

      <Container className="grid gap-12 py-14 sm:py-20 lg:grid-cols-[1.2fr_0.8fr] lg:gap-16">
        <div className="space-y-12">
          <section aria-labelledby="problem">
            <h2 id="problem" className="text-2xl font-bold tracking-[-0.02em]">
              The problem
            </h2>
            <p className="mt-3 max-w-[62ch] text-lg leading-relaxed text-fg-muted">{product.problem}</p>
          </section>

          <section aria-labelledby="features">
            <h2 id="features" className="text-2xl font-bold tracking-[-0.02em]">
              {featureHeading}
            </h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {product.features.map((f) => (
                <li key={f} className="flex gap-3 rounded-[var(--radius-control)] border border-line bg-surface p-4">
                  <FeatureIcon size={18} className="mt-0.5 shrink-0 text-accent-strong" aria-hidden="true" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </section>

          {product.futureFeatures?.length ? (
            <section aria-labelledby="future">
              <h2 id="future" className="text-2xl font-bold tracking-[-0.02em]">
                Ideas for later
              </h2>
              <p className="mt-2 text-fg-muted">Not built yet, and not in the demo. Your feedback decides which come first.</p>
              <ul className="mt-4 space-y-2 text-fg-muted">
                {product.futureFeatures.map((f) => (
                  <li key={f} className="flex gap-3">
                    <CircleDot size={18} className="mt-0.5 shrink-0 text-fg-subtle" aria-hidden="true" />
                    {f}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {Preview ? (
            <section aria-labelledby="preview">
              <h2 id="preview" className="text-2xl font-bold tracking-[-0.02em]">
                Interface preview
              </h2>
              <p className="mt-2 text-fg-muted">{Preview.caption}</p>
              <div className="mt-5">{Preview.render()}</div>
            </section>
          ) : null}
        </div>

        <aside className="space-y-6">
          <section aria-labelledby="availability" className="rounded-[var(--radius-panel)] border border-line bg-surface p-5">
            <h2 id="availability" className="flex items-center gap-2 font-semibold">
              <Info size={18} aria-hidden="true" /> Availability
            </h2>
            <p className="mt-2 text-fg-muted">{statusInfo[product.status].explanation}</p>
            {hasDemo(product) && product.demo.kind === 'design-preview' ? (
              <p className="mt-3 text-sm text-fg-muted">
                There is a design preview of the screens with fictional sample data. Creating invoices and recording
                payments are not built yet, so nothing you enter is saved.
              </p>
            ) : hasDemo(product) ? (
              <p className="mt-3 text-sm text-fg-muted">
                The demo runs entirely in your browser on fictional sample data. It is not a connected business account and
                does not link to any outside service.
              </p>
            ) : (
              <p className="mt-3 text-sm text-fg-muted">
                There is no demo yet. Hearing from people who would use it helps us decide what to build next.
              </p>
            )}
          </section>

          <section aria-labelledby="benefits" className="rounded-[var(--radius-panel)] border border-line bg-surface p-5">
            <h2 id="benefits" className="font-semibold">
              {product.status === 'planned' ? 'What it should help with' : 'What it helps with'}
            </h2>
            <ul className="mt-3 space-y-2.5 text-fg-muted">
              {product.benefits.map((b) => (
                <li key={b} className="flex gap-2.5">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                  {b}
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="audience" className="rounded-[var(--radius-panel)] border border-line bg-surface p-5">
            <h2 id="audience" className="font-semibold">
              Made with these businesses in mind
            </h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {product.audience.map((a) => (
                <li key={a} className="rounded-full bg-subtle px-3 py-1 text-sm">
                  {a}
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </Container>
    </>
  );
}
