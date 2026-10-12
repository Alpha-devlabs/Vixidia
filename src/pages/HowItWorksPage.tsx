import { FlaskConical, ShieldCheck } from 'lucide-react';
import { usePageMeta } from '../hooks/usePageMeta';
import { brand } from '../config/brand';
import { PageIntro } from '../components/PageIntro';
import { Container } from '../components/Container';
import { ButtonLink } from '../components/Button';
import { paths } from '../config/routes';
import { products } from '../config/products';
import { demoPath, getProductById } from '../utils/products';

const steps = [
  {
    title: 'Find a real operational problem',
    body: 'We start from work people already do by hand — adding up the week’s sales, chasing payments, remembering call-backs — not from a feature list.',
  },
  {
    title: 'Focus on the smallest useful solution',
    body: 'We decide what the first version must do well, and what it can leave out until someone actually asks for it.',
  },
  {
    title: 'Build a clear, practical interface',
    body: 'Plain language, readable numbers and few steps, designed to work on the phone in your pocket as well as a laptop.',
  },
  {
    title: 'Test the workflow',
    body: 'A demo with realistic sample data lets people try the flow before anything is connected to real records.',
  },
  {
    title: 'Improve from feedback',
    body: 'What people use, ignore or ask for decides what comes next — including which planned products get built at all.',
  },
];

export function HowItWorksPage() {
  usePageMeta('How it works', `How ${brand.name} decides what to build, and how sample-data demos differ from production software.`);
  const pulse = getProductById('pulse');
  const anyLive = products.some((p) => p.status === 'live');

  return (
    <>
      <PageIntro
        title="How we work"
        lead="Every product follows the same path: find a problem worth solving, build the smallest thing that helps, put it in front of people, and listen."
      />

      <Container className="py-14 sm:py-20">
        <h2 className="sr-only">Our process</h2>
        <ol className="relative max-w-3xl">
          {steps.map((s, i) => (
            <li key={s.title} className="relative grid grid-cols-[2.75rem_1fr] gap-x-5 pb-10 last:pb-0">
              {i < steps.length - 1 ? (
                <span className="absolute top-11 bottom-0 left-[1.35rem] w-px bg-line-strong" aria-hidden="true" />
              ) : null}
              <span
                className="tabular relative flex h-11 w-11 items-center justify-center rounded-full border-2 border-fg bg-surface font-bold"
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <div className="pt-1.5">
                <h3 className="text-xl font-semibold tracking-[-0.015em]">{s.title}</h3>
                <p className="mt-2 max-w-[58ch] leading-relaxed text-fg-muted">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Container>

      <section className="border-t border-line bg-surface py-14 sm:py-20" aria-labelledby="demos-heading">
        <Container>
          <h2 id="demos-heading" className="text-3xl font-bold tracking-[-0.03em]">
            Demos and real products are different things
          </h2>
          <p className="mt-3 max-w-[62ch] text-lg text-fg-muted">
            You can explore our demos without signing up. Here is exactly what that means.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <div className="rounded-[var(--radius-panel)] border border-accent bg-accent-soft p-6">
              <h3 className="flex items-center gap-2 text-lg font-semibold">
                <FlaskConical size={20} aria-hidden="true" /> Interactive demo
              </h3>
              <ul className="mt-4 space-y-2.5 text-fg-muted">
                <li>Runs entirely in your browser, with no account</li>
                <li>Uses a fictional business and invented records</li>
                <li>Your changes vanish when you reload</li>
                <li>Not connected to payments, messaging or real data</li>
              </ul>
            </div>
            <div className="rounded-[var(--radius-panel)] border border-line p-6">
              <h3 className="flex items-center gap-2 text-lg font-semibold">
                <ShieldCheck size={20} aria-hidden="true" /> Production application
              </h3>
              <ul className="mt-4 space-y-2.5 text-fg-muted">
                <li>Your own account and your own business data</li>
                <li>Data saved securely and available across devices</li>
                <li>Connections to the services you actually use</li>
                <li>{anyLive ? 'Available for products marked “Available”' : 'None of our products are at this stage yet'}</li>
              </ul>
            </div>
          </div>
          <div className="mt-10 flex flex-wrap gap-3">
            {pulse ? <ButtonLink to={demoPath(pulse)}>Try the {pulse.name} demo</ButtonLink> : null}
            <ButtonLink to={paths.products} variant="secondary">
              Browse products
            </ButtonLink>
          </div>
        </Container>
      </section>
    </>
  );
}
