import { Gauge, Layers, LayoutDashboard, MousePointerClick, Target, Users, Workflow, Wrench } from 'lucide-react';
import { usePageMeta } from '../hooks/usePageMeta';
import { Container } from '../components/Container';
import { ButtonLink } from '../components/Button';
import { ProductCard } from '../components/ProductCard';
import { StatusBadge } from '../components/StatusBadge';
import { PulseSnapshot } from '../features/pulse/PulsePreview';
import { products } from '../config/products';
import { brand } from '../config/brand';
import { paths } from '../config/routes';
import { demoPath, getProductById, productPath } from '../utils/products';
import { HomeSolutionSearch } from '../features/solutions/HomeSolutionSearch';

const principles = [
  {
    icon: Workflow,
    title: 'Practical workflows',
    body: 'The steps follow how small teams already work, so nobody has to redesign their day before the software helps.',
  },
  {
    icon: MousePointerClick,
    title: 'Clear interfaces',
    body: 'Plain words, obvious buttons and numbers you can read at a glance — on a phone as well as a laptop.',
  },
  {
    icon: Layers,
    title: 'Useful features, not every feature',
    body: 'We leave out what a small business will never use, so the screens stay quick to learn.',
  },
  {
    icon: Target,
    title: 'Built around real problems',
    body: 'Each product starts from one job that eats time today — tracking money, chasing follow-ups, keeping records.',
  },
];

const services = [
  { icon: Gauge, label: 'Business dashboards' },
  { icon: Wrench, label: 'Internal tools' },
  { icon: Workflow, label: 'Workflow automation' },
  { icon: LayoutDashboard, label: 'Web applications' },
  { icon: Users, label: 'Customer and operations tools' },
];

export function HomePage() {
  usePageMeta(undefined, `${brand.shortDescription} Search for a solution to your business problem and try a demo, or ask about custom software.`);
  const pulse = getProductById('pulse');

  return (
    <>
      {/* A. Search-first hero: finding a solution is the main job of this page. */}
      <section className="border-b border-line bg-surface">
        <Container className="py-12 text-center sm:py-16 lg:py-20">
          <p className="text-sm font-semibold text-accent-strong">{brand.tagline}</p>
          <h1 className="mx-auto mt-3 max-w-3xl text-[2.25rem] leading-[1.06] font-bold tracking-[-0.04em] text-balance sm:text-5xl lg:text-[3.5rem]">
            Find the right solution for your business
          </h1>
          <p className="mx-auto mt-4 max-w-[52ch] text-lg leading-relaxed text-fg-muted">Discover practical tools built around the way your business works.</p>
          <div className="mt-8 text-left">
            <HomeSolutionSearch />
          </div>
        </Container>
      </section>

      {/* C. Product portfolio */}
      <section className="py-16 sm:py-24" aria-labelledby="products-heading">
        <Container>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="products-heading" className="text-3xl font-bold tracking-[-0.03em] sm:text-4xl">
                Products we’re developing
              </h2>
              <p className="mt-3 max-w-[60ch] text-lg text-fg-muted">
                Each product focuses on one part of running a business. Every card says honestly where it stands — in
                development with a demo, or still a planned concept.
              </p>
            </div>
            <ButtonLink to={paths.products} variant="secondary">
              All products
            </ButtonLink>
          </div>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} />
              </li>
            ))}
          </ul>

          {/* A small, clearly labelled glimpse of the first demo. */}
          {pulse ? (
            <div className="mt-6 grid items-center gap-6 rounded-[var(--radius-panel)] border border-line bg-canvas p-5 sm:p-6 lg:grid-cols-[1fr_1.1fr] lg:gap-10">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-semibold tracking-[-0.015em]">
                    {pulse.name} · {pulse.kind}
                  </h3>
                  <StatusBadge status={pulse.status} />
                </div>
                <p className="mt-2 max-w-[52ch] text-fg-muted">{pulse.summary} Interactive demo with sample data.</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <ButtonLink to={demoPath(pulse)} size="sm">
                    Try the demo
                  </ButtonLink>
                  <ButtonLink to={productPath(pulse)} variant="subtle" size="sm">
                    About {pulse.name}
                  </ButtonLink>
                </div>
              </div>
              <PulseSnapshot />
            </div>
          ) : null}
        </Container>
      </section>

      {/* D. Why Vixidia */}
      <section className="border-y border-line bg-surface py-16 sm:py-24" aria-labelledby="why-heading">
        <Container className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <h2 id="why-heading" className="text-3xl font-bold tracking-[-0.03em] sm:text-4xl">
              How we build
            </h2>
            <p className="mt-4 max-w-[46ch] text-lg text-fg-muted">{brand.positioning}</p>
          </div>
          <ul className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
            {principles.map((p) => (
              <li key={p.title}>
                <p.icon size={22} className="text-accent-strong" aria-hidden="true" />
                <h3 className="mt-3 text-lg font-semibold tracking-[-0.01em]">{p.title}</h3>
                <p className="mt-2 leading-relaxed text-fg-muted">{p.body}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* E. Custom software services */}
      <section className="on-inverse bg-inverse py-16 text-on-inverse sm:py-24" aria-labelledby="services-heading">
        <Container className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 id="services-heading" className="text-3xl font-bold tracking-[-0.03em] sm:text-4xl">
              Need software built around your own workflow?
            </h2>
            <p className="mt-4 max-w-[52ch] text-lg leading-relaxed text-on-inverse-muted">
              Separate from our products, we can explore custom software for problems that are specific to your business —
              starting small and building only what proves useful.
            </p>
            <ButtonLink to={paths.services} className="mt-8">
              See custom software services
            </ButtonLink>
          </div>
          <ul className="grid content-center gap-3 sm:grid-cols-2">
            {services.map((s) => (
              <li key={s.label} className="flex min-h-16 items-center gap-3 rounded-[var(--radius-panel)] border border-inverse-line px-4 py-3">
                <s.icon size={22} className="shrink-0 text-on-inverse-muted" aria-hidden="true" />
                <span className="font-medium">{s.label}</span>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* F. Closing CTA */}
      <section className="py-16 sm:py-24" aria-labelledby="closing-heading">
        <Container>
          <div className="rounded-[var(--radius-panel)] border border-line bg-surface p-8 sm:p-12">
            <h2 id="closing-heading" className="max-w-2xl text-3xl font-bold tracking-[-0.03em] text-balance sm:text-4xl">
              What would you like software to take off your plate?
            </h2>
            <p className="mt-4 max-w-[58ch] text-lg text-fg-muted">
              Look through the products, or describe the problem in a few sentences. Rough ideas are welcome.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink to={paths.products}>Explore products</ButtonLink>
              <ButtonLink to={paths.inquiry} variant="secondary">
                Describe a problem
              </ButtonLink>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
