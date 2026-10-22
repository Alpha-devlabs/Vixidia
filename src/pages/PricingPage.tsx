import { useId, useState } from 'react';
import { useLocation } from 'react-router';
import { Check, CircleCheck, Info, Wrench } from 'lucide-react';
import { usePageMeta } from '../hooks/usePageMeta';
import { brand } from '../config/brand';
import { paths } from '../config/routes';
import { Container } from '../components/Container';
import { PageIntro } from '../components/PageIntro';
import { ButtonLink, buttonClass } from '../components/Button';
import { Field, controlClass } from '../components/forms';
import {
  ANNUAL_MONTHS_CHARGED,
  annualTotal,
  customerLimitLabel,
  earlyAccessOffer,
  plans,
  pricePerMonth,
  setupHelp,
  trial,
  type BillingCycle,
  type Plan,
} from '../config/pricing';
import {
  emptyEarlyAccess,
  industryOptions,
  OTHER_INDUSTRY,
  sizeOptions,
  submitEarlyAccess,
  validateEarlyAccess,
  type EarlyAccessErrors,
  type EarlyAccessInput,
} from '../features/earlyAccess/earlyAccess';
import { formatCurrency } from '../utils/format';
import { cn } from '../utils/cn';

const EARLY_ACCESS_ID = 'early-access';

const faqs = [
  {
    q: 'Can I use it today?',
    a: 'Not yet. Every solution is in development, and the prices on this page are what we plan to charge at launch. You can try any demo right now with a sample business, and join early access to be among the first to use it for real.',
  },
  {
    q: 'Do I pay separately for each part — customers, billing, reports?',
    a: 'No. One plan covers the whole solution for your kind of business. The plans differ only in how many customers and staff they cover, and a few extras.',
  },
  {
    q: 'Can I stop at any time?',
    a: 'Yes. Monthly plans can be cancelled whenever you like, and you can take your customer list and records with you.',
  },
  {
    q: 'Do my staff need a laptop?',
    a: 'No. Everything works on an ordinary smartphone, so delivery staff, trainers or teachers can use the phones they already carry.',
  },
  {
    q: 'I keep everything in a notebook. Is that a problem?',
    a: 'Not at all — most of our early businesses do. You can type your customers in yourself, or choose the one-time setup help and we’ll move them in for you.',
  },
];

/** Planned launch pricing for the industry solutions, with an early access sign-up. */
export function PricingPage() {
  usePageMeta('Pricing', `Planned pricing for ${brand.name}’s industry solutions: one simple monthly plan per business, with a free trial. Join early access.`);
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const preset = new URLSearchParams(useLocation().search).get('solution') ?? '';

  return (
    <>
      <PageIntro
        title="Simple pricing for small businesses"
        lead={
          <>
            One plan covers the whole solution for your kind of business. These are our <strong className="font-semibold text-fg">planned launch prices</strong> — nothing is on sale yet, but you can try every demo today.
          </>
        }
      >
        <a href={`#${EARLY_ACCESS_ID}`} className={buttonClass('primary', 'md')}>
          Join early access
        </a>
        <ButtonLink to={`${paths.products}?category=industry`} variant="secondary">
          Try a demo
        </ButtonLink>
      </PageIntro>

      <section className="py-14 sm:py-20" aria-labelledby="plans-heading">
        <Container>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="plans-heading" className="text-2xl font-bold tracking-[-0.025em] sm:text-3xl">
                Plans
              </h2>
              <p className="mt-2 text-fg-muted">
                Start with a {trial.days}-day free trial. {trial.note}
              </p>
            </div>
            <CycleToggle value={cycle} onChange={setCycle} />
          </div>

          <ul className="mt-8 grid gap-4 lg:grid-cols-3">
            {plans.map((plan) => (
              <li key={plan.id}>
                <PlanCard plan={plan} cycle={cycle} />
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-col gap-4 rounded-[var(--radius-panel)] border border-line bg-surface p-5 sm:flex-row sm:items-center sm:p-6">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-subtle text-fg-muted">
              <Wrench size={22} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold">Setup help, if you want it — one time, from {formatCurrency(setupHelp.from)}</h3>
              <p className="mt-1 text-fg-muted">{setupHelp.description}</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-fg-muted">Prices are in Indian rupees, per business, and may change before launch.</p>
        </Container>
      </section>

      <section className="border-y border-line bg-surface py-14 sm:py-20" aria-labelledby="faq-heading">
        <Container className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <h2 id="faq-heading" className="text-2xl font-bold tracking-[-0.025em] sm:text-3xl">
            Common questions
          </h2>
          <div className="divide-y divide-line border-y border-line">
            {faqs.map((f) => (
              <details key={f.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-fg [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span aria-hidden="true" className="text-xl leading-none text-fg-muted transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-2 max-w-[62ch] leading-relaxed text-fg-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </Container>
      </section>

      <section id={EARLY_ACCESS_ID} className="scroll-mt-20 py-14 sm:py-20" aria-labelledby="early-heading">
        <Container className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <h2 id="early-heading" className="text-2xl font-bold tracking-[-0.025em] sm:text-3xl">
              Join early access
            </h2>
            <p className="mt-3 max-w-[46ch] text-lg text-fg-muted">{earlyAccessOffer}</p>
            <ul className="mt-6 space-y-2 text-fg-muted">
              {['We’ll call or message you once — no spam', 'A short chat about how you run your day today', 'First access when your solution is ready'].map((t) => (
                <li key={t} className="flex gap-2">
                  <Check size={18} className="mt-0.5 shrink-0 text-accent-strong" aria-hidden="true" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <EarlyAccessForm key={preset} preset={preset} />
        </Container>
      </section>
    </>
  );
}

function CycleToggle({ value, onChange }: { value: BillingCycle; onChange: (c: BillingCycle) => void }) {
  const options: { value: BillingCycle; label: string }[] = [
    { value: 'monthly', label: 'Monthly' },
    { value: 'annual', label: `Yearly · ${12 - ANNUAL_MONTHS_CHARGED} months free` },
  ];
  return (
    <div role="radiogroup" aria-label="Billing" className="inline-flex rounded-[var(--radius-control)] border border-line bg-surface p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-[calc(var(--radius-control)-2px)] px-3 py-1.5 text-sm font-medium transition-colors',
            value === o.value ? 'bg-accent text-on-accent' : 'text-fg-muted hover:text-fg',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function PlanCard({ plan, cycle }: { plan: Plan; cycle: BillingCycle }) {
  return (
    <article
      className={cn(
        'relative flex h-full flex-col rounded-[var(--radius-panel)] border bg-surface p-6',
        plan.recommended ? 'border-accent shadow-[var(--shadow-panel)]' : 'border-line',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xl font-semibold tracking-[-0.015em]">{plan.name}</h3>
        {plan.recommended ? <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent-strong">Most businesses</span> : null}
      </div>
      <p className="mt-1 text-sm text-fg-muted">{plan.fit}</p>

      <p className="mt-6 flex items-baseline gap-1">
        <span className="tabular text-4xl font-bold tracking-[-0.03em]">{formatCurrency(pricePerMonth(plan, cycle))}</span>
        <span className="text-fg-muted">/ month</span>
      </p>
      <p className="mt-1 h-5 text-sm text-fg-muted">{cycle === 'annual' ? `${formatCurrency(annualTotal(plan))} billed yearly` : 'Billed monthly'}</p>

      <p className="mt-5 text-sm font-semibold text-fg">
        {customerLimitLabel(plan)} · {plan.staffLogins} staff logins
      </p>
      <ul className="mt-4 flex-1 space-y-2.5">
        {plan.features.map((f) => (
          <li key={f} className="flex gap-2 text-fg-muted">
            <Check size={18} className="mt-0.5 shrink-0 text-accent-strong" aria-hidden="true" />
            {f}
          </li>
        ))}
      </ul>

      <a href={`#${EARLY_ACCESS_ID}`} className={buttonClass(plan.recommended ? 'primary' : 'secondary', 'md', 'mt-6 w-full')}>
        Join early access
      </a>
    </article>
  );
}

const fieldOrder: (keyof EarlyAccessInput)[] = ['name', 'phone', 'business', 'industry', 'otherIndustry', 'customers', 'city'];

function EarlyAccessForm({ preset }: { preset: string }) {
  const uid = useId();
  const [input, setInput] = useState<EarlyAccessInput>(() => emptyEarlyAccess(preset));
  const [errors, setErrors] = useState<EarlyAccessErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [outcome, setOutcome] = useState<'delivered' | 'not_connected' | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const id = (k: keyof EarlyAccessInput) => `${uid}-${k}`;
  const set = (k: keyof EarlyAccessInput, v: string) => {
    setInput((prev) => ({ ...prev, [k]: v }));
    if (errors[k]) setErrors((prev) => ({ ...prev, [k]: undefined }));
  };
  const a11y = (k: keyof EarlyAccessInput, required = false) => ({
    id: id(k),
    'aria-invalid': !!errors[k],
    'aria-describedby': errors[k] ? `${id(k)}-error` : undefined,
    ...(required ? { 'aria-required': true } : {}),
  });

  const onSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setFailure(null);
    const found = validateEarlyAccess(input);
    setErrors(found);
    const first = fieldOrder.find((k) => found[k]);
    if (first) {
      document.getElementById(id(first))?.focus();
      return;
    }
    setSubmitting(true);
    const result = await submitEarlyAccess(input);
    setSubmitting(false);
    if (result.status === 'failed') {
      setFailure(result.message);
      return;
    }
    // Personal details are cleared from the page whatever the outcome.
    setInput(emptyEarlyAccess());
    setOutcome(result.status);
  };

  if (outcome) {
    const delivered = outcome === 'delivered';
    const Icon = delivered ? CircleCheck : Info;
    return (
      <div role="status" className="rounded-[var(--radius-panel)] border border-line bg-surface p-6 sm:p-8">
        <Icon size={28} className="text-accent-strong" aria-hidden="true" />
        <h3 className="mt-4 text-xl font-semibold">{delivered ? 'You’re on the early access list' : 'Your details look good — but nothing was sent'}</h3>
        <p className="mt-2 leading-relaxed text-fg-muted">
          {delivered
            ? 'Thank you. We’ll be in touch on the number you gave us.'
            : 'This website doesn’t have a sign-up service connected yet, so your details were not saved or passed to anyone, and they have been cleared from the page.'}
        </p>
        <button type="button" onClick={() => setOutcome(null)} className={cn(buttonClass('secondary', 'sm'), 'mt-6')}>
          {delivered ? 'Sign up another business' : 'Back to the form'}
        </button>
      </div>
    );
  }

  const errorCount = Object.values(errors).filter(Boolean).length;

  return (
    <form noValidate onSubmit={onSubmit} className="space-y-5 rounded-[var(--radius-panel)] border border-line bg-surface p-5 sm:p-8">
      <p className="flex gap-2 rounded-[var(--radius-control)] bg-accent-soft p-3 text-sm text-fg">
        <Info size={16} className="mt-0.5 shrink-0 text-accent-strong" aria-hidden="true" />
        Sign-ups aren’t connected to a service yet: the form checks your details, but nothing is sent or stored.
      </p>

      {errorCount > 0 || failure ? (
        <p role="alert" className="rounded-[var(--radius-control)] bg-danger-soft px-4 py-3 text-sm font-medium text-danger-strong">
          {failure ?? (errorCount === 1 ? 'One field needs attention.' : `${errorCount} fields need attention.`)}
        </p>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id={id('name')} label="Your name" error={errors.name}>
          <input {...a11y('name', true)} autoComplete="name" value={input.name} onChange={(e) => set('name', e.target.value)} className={controlClass(!!errors.name)} />
        </Field>
        <Field id={id('phone')} label="Mobile number" error={errors.phone}>
          <input
            {...a11y('phone', true)}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="98765 43210"
            value={input.phone}
            onChange={(e) => set('phone', e.target.value)}
            className={controlClass(!!errors.phone)}
          />
        </Field>
      </div>

      <Field id={id('industry')} label="Kind of business" error={errors.industry}>
        <select {...a11y('industry', true)} value={input.industry} onChange={(e) => set('industry', e.target.value)} className={controlClass(!!errors.industry)}>
          <option value="">Choose…</option>
          {industryOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>

      {input.industry === OTHER_INDUSTRY ? (
        <Field id={id('otherIndustry')} label="What kind of business is it?" error={errors.otherIndustry}>
          <input
            {...a11y('otherIndustry', true)}
            placeholder="For example: laundry, catering, coaching"
            value={input.otherIndustry}
            onChange={(e) => set('otherIndustry', e.target.value)}
            className={controlClass(!!errors.otherIndustry)}
          />
        </Field>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id={id('business')} label="Business name" optional error={errors.business}>
          <input {...a11y('business')} autoComplete="organization" value={input.business} onChange={(e) => set('business', e.target.value)} className={controlClass(!!errors.business)} />
        </Field>
        <Field id={id('city')} label="Town or city" optional error={errors.city}>
          <input {...a11y('city')} autoComplete="address-level2" value={input.city} onChange={(e) => set('city', e.target.value)} className={controlClass(!!errors.city)} />
        </Field>
      </div>

      <Field id={id('customers')} label="Roughly how many customers or members?" optional>
        <select {...a11y('customers')} value={input.customers} onChange={(e) => set('customers', e.target.value)} className={controlClass(false)}>
          <option value="">Choose…</option>
          {sizeOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>

      <button type="submit" disabled={submitting} className={cn(buttonClass('primary', 'md'), 'w-full sm:w-auto')}>
        {submitting ? 'Checking…' : 'Join early access'}
      </button>
    </form>
  );
}
