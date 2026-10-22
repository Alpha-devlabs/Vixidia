import { ArrowRight, Layers, MessageSquareText, MousePointerClick, Target, Workflow } from 'lucide-react';
import { Link } from 'react-router';
import { usePageMeta } from '../hooks/usePageMeta';
import { Container } from '../components/Container';
import { ButtonLink } from '../components/Button';
import { ProductCard } from '../components/ProductCard';
import { StatusBadge } from '../components/StatusBadge';
import { WaterPreview } from '../features/water/WaterPreview';
import { products } from '../config/products';
import { brand } from '../config/brand';
import { paths } from '../config/routes';
import { demoPath, getProductById, hasDemo, productPath } from '../utils/products';
import { HomeSolutionSearch } from '../features/solutions/HomeSolutionSearch';

const principles = [
  {
    icon: Workflow,
    title: 'Made for your industry',
    body: 'A water supplier, a gym and a tuition centre run their day differently. Each solution uses the words, steps and numbers of its own trade.',
  },
  {
    icon: MousePointerClick,
    title: 'Ready to use',
    body: 'No setup project and no consultant. Plain words, obvious buttons and numbers you can read at a glance — on a phone as well as a laptop.',
  },
  {
    icon: Layers,
    title: 'Useful features, not every feature',
    body: 'We leave out what a small business will never use, so the screens stay quick to learn.',
  },
  {
    icon: Target,
    title: 'Built around real problems',
    body: 'Each solution starts from the jobs that eat time today — tracking money, chasing dues, keeping records.',
  },
];

/** Industry-specific solutions lead the site; general tools are their building blocks. */
const industrySolutions = products.filter((p) => p.industry);
const generalTools = products.filter((p) => !p.industry);
const industryResultsPath = `${paths.products}?category=industry`;

export function HomePage() {
  usePageMeta(undefined, `${brand.shortDescription} Find the solution for your kind of business and try a working demo, no sign-up needed.`);
  const water = getProductById('water');

  return (
    <>
      {/* A. Search-first hero: finding the solution for your kind of business is the main job of this page. */}
      <section className="border-b border-line bg-surface">
        <Container className="py-12 text-center sm:py-16 lg:py-20">
          <p className="text-sm font-semibold text-accent-strong">{brand.tagline}</p>
          <h1 className="mx-auto mt-3 max-w-3xl text-[2.25rem] leading-[1.06] font-bold tracking-[-0.04em] text-balance sm:text-5xl lg:text-[3.5rem]">
            Software made for the way your business runs
          </h1>
          <p className="mx-auto mt-4 max-w-[56ch] text-lg leading-relaxed text-fg-muted">
            Ready-made solutions for water suppliers, gyms, salons, tuition centres and distributors. Try any demo right now — no sign-up.
          </p>
          <div className="mt-8 text-left">
            <HomeSolutionSearch />
          </div>
        </Container>
      </section>

      {/* B. Industry solutions: the core of what Vixidia offers. */}
      <section className="py-16 sm:py-24" aria-labelledby="industries-heading">
        <Container>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="industries-heading" className="text-3xl font-bold tracking-[-0.03em] sm:text-4xl">
                Built for your industry
              </h2>
              <p className="mt-3 max-w-[60ch] text-lg text-fg-muted">
                Each solution brings customers, billing, daily work and reports together in the way your trade already works.
                {industrySolutions.every((p) => p.demo) ? ' All are in development, each with a working demo on sample data.' : ''}
              </p>
            </div>
            <ButtonLink to={industryResultsPath} variant="secondary">
              All industry solutions
            </ButtonLink>
          </div>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {industrySolutions.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} />
              </li>
            ))}
            <li>
              <MissingIndustryCard />
            </li>
          </ul>

          {/* Spotlight on the first industry solution, rendered from its own demo data. */}
          {water ? (
            <div className="mt-6 grid items-center gap-6 rounded-[var(--radius-panel)] border border-line bg-canvas p-5 sm:p-6 lg:grid-cols-[1fr_1.1fr] lg:gap-10">
              <div>
                <p className="text-sm font-semibold text-accent-strong">Spotlight</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-semibold tracking-[-0.015em]">{water.name}</h3>
                  <StatusBadge status={water.status} />
                </div>
                <p className="mt-2 max-w-[52ch] text-fg-muted">{water.problem}</p>
                <ul className="mt-4 space-y-1.5 text-fg-muted">
                  {water.benefits.map((b) => (
                    <li key={b} className="flex gap-2">
                      <span aria-hidden="true" className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                      {b}
                    </li>
                  ))}
                </ul>
                <div className="mt-5 flex flex-wrap gap-2">
                  {hasDemo(water) ? (
                    <ButtonLink to={demoPath(water)} size="sm">
                      Try the demo
                    </ButtonLink>
                  ) : null}
                  <ButtonLink to={productPath(water)} variant="subtle" size="sm">
                    About {water.name}
                  </ButtonLink>
                </div>
              </div>
              <WaterPreview />
            </div>
          ) : null}
        </Container>
      </section>

      {/* C. Why Vixidia */}
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

      {/* D. General tools: the building blocks inside every industry solution, also available on their own. */}
      {generalTools.length > 0 ? (
        <section className="py-16 sm:py-24" aria-labelledby="tools-heading">
          <Container>
            <h2 id="tools-heading" className="text-2xl font-bold tracking-[-0.025em] sm:text-3xl">
              Everyday business tools
            </h2>
            <p className="mt-3 max-w-[62ch] text-fg-muted">
              The same building blocks that power every industry solution, available on their own for businesses that don’t fit one.
            </p>
            <ul className="mt-8 grid gap-x-8 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
              {generalTools.map((p) => (
                <li key={p.id}>
                  <Link
                    to={hasDemo(p) ? demoPath(p) : productPath(p)}
                    className="group flex items-start gap-3 rounded-[var(--radius-control)] px-3 py-3 hover:bg-surface"
                  >
                    <p.icon size={20} className="mt-0.5 shrink-0 text-fg-muted group-hover:text-accent-strong" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 font-semibold text-fg">
                        {p.name}
                        <ArrowRight size={14} className="opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
                      </span>
                      <span className="mt-0.5 block text-sm text-fg-muted">{p.summary}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Container>
        </section>
      ) : null}

      {/* E. Closing CTA, with custom work as a quiet secondary option. */}
      <section className="pb-16 sm:pb-24" aria-labelledby="closing-heading">
        <Container>
          <div className="rounded-[var(--radius-panel)] border border-line bg-surface p-8 sm:p-12">
            <h2 id="closing-heading" className="max-w-2xl text-3xl font-bold tracking-[-0.03em] text-balance sm:text-4xl">
              See how your day would look in Vixidia
            </h2>
            <p className="mt-4 max-w-[58ch] text-lg text-fg-muted">
              Every demo opens with a sample business already set up, so you can click around without entering anything.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink to={industryResultsPath}>Find your industry</ButtonLink>
              {water && hasDemo(water) ? (
                <ButtonLink to={demoPath(water)} variant="secondary">
                  Try the water delivery demo
                </ButtonLink>
              ) : null}
            </div>
            <p className="mt-8 border-t border-line pt-6 text-sm text-fg-muted">
              Need something specific to your own workflow?{' '}
              <Link to={paths.services} className="font-medium text-fg underline decoration-line underline-offset-4 hover:decoration-accent">
                We also take on custom software work
              </Link>
              .
            </p>
          </div>
        </Container>
      </section>
    </>
  );
}

/** Invites visitors whose industry isn't listed yet to say so, instead of leaving them at a dead end. */
function MissingIndustryCard() {
  return (
    <article className="flex h-full flex-col rounded-[var(--radius-panel)] border border-dashed border-line p-5 sm:p-6">
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-control)] bg-subtle text-fg-muted">
        <MessageSquareText size={22} aria-hidden="true" />
      </span>
      <h3 className="mt-5 text-xl font-semibold tracking-[-0.015em]">Don’t see your business?</h3>
      <p className="mt-2 flex-1 leading-relaxed text-fg-muted">
        Tell us what you run and what slows your day down. The most requested industries are the next ones we build.
      </p>
      <div className="mt-6">
        <ButtonLink to={paths.inquiry} variant="secondary" size="sm">
          Request your industry
        </ButtonLink>
      </div>
    </article>
  );
}
