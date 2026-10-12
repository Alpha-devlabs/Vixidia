import { Gauge, Workflow, Wrench, Contact, PanelsTopLeft } from 'lucide-react';
import { usePageMeta } from '../hooks/usePageMeta';
import { brand } from '../config/brand';
import { PageIntro } from '../components/PageIntro';
import { Container } from '../components/Container';
import { ButtonLink } from '../components/Button';
import { paths } from '../config/routes';

const areas = [
  {
    icon: Gauge,
    title: 'Business dashboards',
    body: 'One screen that pulls together the numbers you check every day, instead of opening three apps and a notebook.',
    example: 'Daily sales, stock running low and payments due, on one page.',
  },
  {
    icon: Workflow,
    title: 'Workflow and process automation',
    body: 'Repeated steps that follow the same pattern — reminders, status updates, simple approvals — handled consistently.',
    example: 'A reminder list of customers whose payment is a week overdue.',
  },
  {
    icon: Wrench,
    title: 'Internal management tools',
    body: 'Small tools for your own team: tracking jobs, equipment, stock or shifts in a way that matches how you already work.',
    example: 'A job board for a repair workshop with who is working on what.',
  },
  {
    icon: Contact,
    title: 'Customer-management applications',
    body: 'A clear record of customers, what they ordered and what was promised, shared across the people who serve them.',
    example: 'Customer history that any staff member can look up during a call.',
  },
  {
    icon: PanelsTopLeft,
    title: 'Custom web applications',
    body: 'When the problem doesn’t fit an off-the-shelf product, a focused web app built around that one workflow.',
    example: 'An order form for regular customers that feeds straight into your daily list.',
  },
];

const steps = [
  { title: 'Understand the problem', body: 'We talk through how the work happens today, where time is lost and what a good day would look like.' },
  { title: 'Define a practical solution', body: 'We agree on the smallest version that would make a real difference, and what it leaves out on purpose.' },
  { title: 'Build and validate a first version', body: 'A focused first version goes into use with real work, so problems show up early.' },
  { title: 'Improve from feedback', body: 'We refine what gets used, and drop or change what doesn’t.' },
];

export function ServicesPage() {
  usePageMeta('Custom software services', `${brand.name} explores custom dashboards, workflow automation and internal tools for small businesses.`);

  return (
    <>
      <PageIntro
        title="Custom software for your own workflow"
        lead="Some problems are specific to one business. Separate from our product catalogue, we can explore custom software built around the way you already work."
      >
        <ButtonLink to={paths.inquiry} size="lg">
          Describe your problem
        </ButtonLink>
      </PageIntro>

      <Container className="py-14 sm:py-20">
        <h2 className="text-3xl font-bold tracking-[-0.03em]">Problems we can help with</h2>
        <ul className="mt-8 grid gap-4 md:grid-cols-2">
          {areas.map((a, i) => (
            <li
              key={a.title}
              className={
                i === areas.length - 1 && areas.length % 2 === 1
                  ? 'rounded-[var(--radius-panel)] border border-line bg-surface p-6 md:col-span-2'
                  : 'rounded-[var(--radius-panel)] border border-line bg-surface p-6'
              }
            >
              <a.icon size={24} className="text-accent-strong" aria-hidden="true" />
              <h3 className="mt-4 text-xl font-semibold tracking-[-0.015em]">{a.title}</h3>
              <p className="mt-2 leading-relaxed text-fg-muted">{a.body}</p>
              <p className="mt-4 border-l-2 border-accent pl-3 text-sm text-fg-muted">
                <span className="font-semibold text-fg">For example: </span>
                {a.example}
              </p>
            </li>
          ))}
        </ul>
      </Container>

      <section className="border-t border-line bg-surface py-14 sm:py-20" aria-labelledby="process-heading">
        <Container>
          <h2 id="process-heading" className="text-3xl font-bold tracking-[-0.03em]">
            How an engagement works
          </h2>
          <ol className="mt-10 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <li key={s.title} className="border-t-2 border-fg pt-5">
                <span className="tabular text-sm font-bold text-accent-strong">Step {i + 1}</span>
                <h3 className="mt-2 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 leading-relaxed text-fg-muted">{s.body}</p>
              </li>
            ))}
          </ol>
          <p className="mt-12 max-w-[66ch] text-fg-muted">
            We don’t publish fixed prices or timelines: they depend on the problem, and we would rather agree on them
            with you once we understand it.
          </p>
          <ButtonLink to={paths.inquiry} className="mt-6">
            Start an inquiry
          </ButtonLink>
        </Container>
      </section>
    </>
  );
}
