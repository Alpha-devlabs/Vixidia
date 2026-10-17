import { useId, useRef, useState } from 'react';
import { Copy, Info } from 'lucide-react';
import { Dialog } from '../../components/Dialog';
import { Button } from '../../components/Button';
import { Field, controlClass, describedBy, textareaClass } from '../../components/forms';
import {
  emptySolutionRequest,
  requestSummary,
  submitSolutionRequest,
  validateSolutionRequest,
  type SolutionRequestErrors,
  type SolutionRequestInput,
} from './solutionRequest';

interface Props {
  open: boolean;
  /** Set when opened from a planned idea's card. */
  ideaName?: string;
  businessType?: string;
  onClose: () => void;
}

type Key = Exclude<keyof SolutionRequestInput, 'ideaName'>;
const order: Key[] = ['name', 'businessName', 'email', 'phone', 'businessType', 'needs'];

/**
 * "Request a solution". There is no enquiry backend, so after validation the
 * dialog says plainly that nothing was sent or stored and offers a copy of the
 * request instead. The parent remounts it for each opening.
 */
export function RequestSolutionDialog({ open, ideaName, businessType, onClose }: Props) {
  const id = useId();
  const formId = `${id}-form`;
  const [values, setValues] = useState<SolutionRequestInput>(() => emptySolutionRequest(ideaName, businessType));
  const [errors, setErrors] = useState<SolutionRequestErrors>({});
  const [result, setResult] = useState<'not_sent' | 'failed' | null>(null);
  const [copied, setCopied] = useState<'yes' | 'no' | null>(null);
  const busy = useRef(false);

  const set = (key: Key, value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => {
      const next = { ...e };
      delete next[key];
      if (key === 'phone' && next.email?.startsWith('Add an email')) delete next.email;
      return next;
    });
  };

  const submit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (busy.current) return;
    const problems = validateSolutionRequest(values);
    setErrors(problems);
    const first = order.find((k) => problems[k]);
    if (first) {
      document.getElementById(`${id}-${first}`)?.focus();
      return;
    }
    busy.current = true;
    const r = await submitSolutionRequest(values);
    busy.current = false;
    // Only a real delivery could ever be reported as sent; today there is none.
    setResult(r.status === 'delivered' ? null : r.status === 'failed' ? 'failed' : 'not_sent');
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(requestSummary(values));
      setCopied('yes');
    } catch {
      setCopied('no');
    }
  };

  const input = (key: Key, label: string, opts: { optional?: boolean; type?: string; hint?: string; autoComplete?: string } = {}) => (
    <Field id={`${id}-${key}`} label={label} optional={opts.optional} hint={opts.hint} error={errors[key]}>
      <input
        id={`${id}-${key}`}
        type={opts.type ?? 'text'}
        autoComplete={opts.autoComplete ?? 'off'}
        value={values[key]}
        onChange={(e: { target: { value: string } }) => set(key, e.target.value)}
        className={controlClass(!!errors[key])}
        aria-invalid={!!errors[key]}
        aria-describedby={describedBy(`${id}-${key}`, errors[key], !!opts.hint)}
      />
    </Field>
  );

  const title = ideaName ? `Request: ${ideaName}` : 'Request a solution';

  if (result) {
    return (
      <Dialog
        open={open}
        onClose={onClose}
        size="lg"
        title="Your request has not been sent"
        description="This website can’t receive requests yet, so nothing was sent, saved or emailed."
        footer={
          <>
            <Button variant="subtle" onClick={() => setResult(null)}>
              Edit request
            </Button>
            <Button onClick={onClose}>Done</Button>
          </>
        }
      >
        <p className="text-sm text-fg-muted">
          Here is a copy of what you entered. Keep it, and share it with us once requests can be received, or use it to describe your needs to anyone
          you are talking to about software.
        </p>
        <label htmlFor={`${id}-summary`} className="mt-4 block text-sm font-medium text-fg">
          Your request
        </label>
        <textarea id={`${id}-summary`} readOnly rows={7} value={requestSummary(values)} className={textareaClass(false, 'mt-1.5 font-mono text-[0.8rem]')} />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button variant="secondary" size="sm" onClick={copy}>
            <Copy size={15} aria-hidden="true" /> Copy to clipboard
          </Button>
          <span role="status" className="text-sm text-fg-muted">
            {copied === 'yes' ? 'Copied.' : copied === 'no' ? 'Couldn’t copy automatically — select the text and copy it.' : ''}
          </span>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={title}
      description={ideaName ? 'Tell us about your business and what this would need to do.' : 'Tell us what kind of business you run and what you want to manage.'}
      footer={
        <>
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId}>
            Check and continue
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={submit} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          {input('name', 'Your name', { autoComplete: 'name' })}
          {input('businessName', 'Business name', { optional: true, autoComplete: 'organization' })}
          {input('email', 'Email', { type: 'email', autoComplete: 'email' })}
          {input('phone', 'Phone', { type: 'tel', autoComplete: 'tel', hint: 'Email, phone or both.' })}
        </div>
        {input('businessType', 'Type of business', { hint: 'For example: gym, water delivery, salon, tuition centre.' })}
        <Field id={`${id}-needs`} label="What do you want to manage or improve?" error={errors.needs} hint="A sentence or two is enough.">
          <textarea
            id={`${id}-needs`}
            rows={4}
            value={values.needs}
            onChange={(e: { target: { value: string } }) => set('needs', e.target.value)}
            className={textareaClass(!!errors.needs)}
            aria-invalid={!!errors.needs}
            aria-describedby={describedBy(`${id}-needs`, errors.needs, true)}
          />
        </Field>
      </form>
      <p className="mt-6 flex gap-2 rounded-[var(--radius-control)] bg-subtle px-3 py-2.5 text-sm text-fg-muted">
        <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        This website can’t receive requests yet. After checking your details we’ll show you a copy to keep — nothing is sent or stored.
      </p>
    </Dialog>
  );
}
