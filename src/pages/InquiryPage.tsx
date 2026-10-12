import { useId, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Info } from 'lucide-react';
import { usePageMeta } from '../hooks/usePageMeta';
import { brand } from '../config/brand';
import { PageIntro } from '../components/PageIntro';
import { Container } from '../components/Container';
import {
  emptyInquiry,
  inquiryTopics,
  isInquiryTopic,
  MESSAGE_MAX,
  submitInquiry,
  validateInquiry,
  type InquiryErrors,
  type InquiryInput,
  type InquiryTopic,
} from '../features/inquiry/inquiry';
import { getProductBySlug } from '../utils/products';
import { paths } from '../config/routes';
import { buttonClass } from '../components/Button';
import { controlClass, textareaClass } from '../components/forms';

export interface InquiryThanksState {
  status: 'not_connected' | 'delivered';
  topic: InquiryTopic;
}

const fieldOrder: (keyof InquiryInput)[] = ['name', 'email', 'organization', 'topic', 'message'];

export function InquiryPage() {
  usePageMeta('Start an inquiry', `Tell ${brand.name} about a business problem, a custom software idea or a product you would use.`);
  const { search } = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(search);
  const presetTopic = params.get('topic');
  const product = getProductBySlug(params.get('product') ?? undefined);

  const uid = useId();
  const [input, setInput] = useState<InquiryInput>(() => emptyInquiry(isInquiryTopic(presetTopic) ? presetTopic : ''));
  const [errors, setErrors] = useState<InquiryErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const id = (k: keyof InquiryInput) => `${uid}-${k}`;
  const set = (k: keyof InquiryInput, v: string) => {
    setInput((prev) => ({ ...prev, [k]: v }));
    if (errors[k]) setErrors((prev) => ({ ...prev, [k]: undefined }));
  };

  const onSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setFailure(null);
    const found = validateInquiry(input);
    setErrors(found);
    const first = fieldOrder.find((k) => found[k]);
    if (first) {
      document.getElementById(id(first))?.focus();
      return;
    }
    setSubmitting(true);
    const result = await submitInquiry(input);
    setSubmitting(false);
    if (result.status === 'failed') {
      setFailure(result.message);
      return;
    }
    // Only non-personal information is passed on; nothing goes in the URL.
    const state: InquiryThanksState = { status: result.status, topic: input.topic as InquiryTopic };
    navigate(paths.inquiryThanks, { state });
  };

  const errorCount = Object.values(errors).filter(Boolean).length;

  return (
    <>
      <PageIntro
        title="Tell us about the problem"
        lead="Describe a custom software need, a product you would use, or feedback on a demo. A few plain sentences are enough."
      />
      <Container className="grid gap-10 py-12 sm:py-16 lg:grid-cols-[1fr_20rem] lg:gap-16">
        <form noValidate onSubmit={onSubmit} className="max-w-2xl space-y-6" aria-describedby={`${uid}-notice`}>
          <div
            id={`${uid}-notice`}
            className="flex gap-3 rounded-[var(--radius-panel)] border border-accent bg-accent-soft p-4 text-sm leading-relaxed text-fg"
          >
            <Info size={18} className="mt-0.5 shrink-0 text-accent-strong" aria-hidden="true" />
            <p>
              <strong>This form isn’t connected to a submission service yet.</strong> It checks your details, but
              nothing is sent, emailed or stored when you submit.
            </p>
          </div>

          {errorCount > 0 ? (
            <p role="alert" className="rounded-[var(--radius-control)] bg-danger-soft px-4 py-3 text-sm font-medium text-danger-strong">
              {errorCount === 1 ? 'One field needs attention.' : `${errorCount} fields need attention.`} Check the
              messages below.
            </p>
          ) : null}
          {failure ? (
            <p role="alert" className="rounded-[var(--radius-control)] bg-danger-soft px-4 py-3 text-sm font-medium text-danger-strong">
              {failure}
            </p>
          ) : null}

          {product ? (
            <p className="text-sm text-fg-muted">
              Regarding: <span className="font-semibold text-fg">{product.name}</span>
            </p>
          ) : null}

          <div className="grid gap-6 sm:grid-cols-2">
            <Field id={id('name')} label="Name" error={errors.name}>
              <input
                id={id('name')}
                autoComplete="name"
                value={input.name}
                onChange={(e: { target: { value: string } }) => set('name', e.target.value)}
                className={controlClass(!!errors.name)}
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? `${id('name')}-error` : undefined}
                aria-required="true"
              />
            </Field>
            <Field id={id('email')} label="Email" error={errors.email}>
              <input
                id={id('email')}
                type="email"
                autoComplete="email"
                inputMode="email"
                value={input.email}
                onChange={(e: { target: { value: string } }) => set('email', e.target.value)}
                className={controlClass(!!errors.email)}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? `${id('email')}-error` : undefined}
                aria-required="true"
              />
            </Field>
          </div>

          <Field id={id('organization')} label="Business or organisation" optional error={errors.organization}>
            <input
              id={id('organization')}
              autoComplete="organization"
              value={input.organization}
              onChange={(e: { target: { value: string } }) => set('organization', e.target.value)}
              className={controlClass(!!errors.organization)}
              aria-invalid={!!errors.organization}
              aria-describedby={errors.organization ? `${id('organization')}-error` : undefined}
            />
          </Field>

          <Field id={id('topic')} label="What is this about?" error={errors.topic}>
            <select
              id={id('topic')}
              value={input.topic}
              onChange={(e: { target: { value: string } }) => set('topic', e.target.value)}
              className={controlClass(!!errors.topic)}
              aria-invalid={!!errors.topic}
              aria-describedby={errors.topic ? `${id('topic')}-error` : undefined}
              aria-required="true"
            >
              <option value="">Choose a topic…</option>
              {inquiryTopics.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>

          <Field
            id={id('message')}
            label="Describe the problem or idea"
            error={errors.message}
            hint={`What happens today, and what would you like to be easier? ${input.message.length}/${MESSAGE_MAX}`}
          >
            <textarea
              id={id('message')}
              rows={6}
              value={input.message}
              onChange={(e: { target: { value: string } }) => set('message', e.target.value)}
              className={textareaClass(!!errors.message)}
              aria-invalid={!!errors.message}
              aria-describedby={errors.message ? `${id('message')}-error` : `${id('message')}-hint`}
              aria-required="true"
            />
          </Field>

          <button
            type="submit"
            disabled={submitting}
            className={buttonClass('primary', 'md')}
          >
            {submitting ? 'Checking…' : 'Check and continue'}
          </button>
        </form>

        <aside className="space-y-4 text-fg-muted lg:pt-2">
          <h2 className="font-semibold text-fg">Useful things to mention</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>What kind of business you run and roughly how many people work in it</li>
            <li>The task that takes too long or goes wrong</li>
            <li>The tools you use today — paper, spreadsheets, chat apps</li>
          </ul>
          <p className="text-sm">Please don’t include customer details, passwords or payment information.</p>
        </aside>
      </Container>
    </>
  );
}

interface FieldProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  children: ReactNode;
}

function Field({ id, label, error, hint, optional, children }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block font-semibold">
        {label} {optional ? <span className="font-normal text-fg-muted">(optional)</span> : null}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-sm font-medium text-danger-strong">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-sm text-fg-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
