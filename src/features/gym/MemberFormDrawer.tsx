import { useId, useRef, useState } from 'react';
import { Info } from 'lucide-react';
import type { GymBook } from '../../types/gym';
import { Dialog } from '../../components/Dialog';
import { Button } from '../../components/Button';
import { Field, controlClass, describedBy } from '../../components/forms';
import { addDays } from '../../utils/dates';
import { MAX_START_DAYS_AHEAD, money, paymentMethods, planOf, previewNew, type FieldErrors, type RegisterInput } from './gymLogic';
import { AmountInput, Choice, shortDay } from './GymBits';

type Outcome = { ok: true } | { ok: false; errors: FieldErrors };

interface Props {
  book: GymBook;
  mode: 'register' | 'edit';
  initial: RegisterInput;
  open: boolean;
  onClose: () => void;
  /** Validates and saves; returns field errors if rejected. */
  onSave: (input: RegisterInput) => Outcome;
}

const order = ['name', 'phone', 'email', 'plan', 'start', 'amount', 'method'] as const;

/**
 * Register a member with their first membership, or edit contact details. All
 * rules live in gymLogic; this form only shows its answers. Remounted per opening.
 */
export function MemberFormDrawer({ book, mode, initial, open, onClose, onSave }: Props) {
  const id = useId();
  const formId = `${id}-form`;
  const [values, setValues] = useState<RegisterInput>(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const submitting = useRef(false);
  const register = mode === 'register';

  const set = (key: keyof RegisterInput, value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
    const errKey = key === 'planId' ? 'plan' : key;
    setErrors((e) => {
      if (!(errKey in e) && !(key === 'planId' && 'amount' in e)) return e;
      const next = { ...e };
      delete next[errKey as keyof FieldErrors];
      if (key === 'planId') delete next.amount;
      return next;
    });
  };

  const submit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    const r = onSave(values);
    if (r.ok) {
      onClose();
      return;
    }
    submitting.current = false;
    setErrors(r.errors);
    const first = order.find((k) => r.errors[k]);
    if (first) document.getElementById(`${id}-${first}`)?.focus();
  };

  const text = (key: 'name' | 'phone' | 'email', label: string, opts: { hint?: string; optional?: boolean; type?: string; autoComplete?: string } = {}) => (
    <Field id={`${id}-${key}`} label={label} error={errors[key]} {...(opts.hint ? { hint: opts.hint } : {})} {...(opts.optional ? { optional: true } : {})}>
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

  const preview = previewNew(book, values.planId, values.start);
  const plan = planOf(book, values.planId);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      variant="drawer"
      title={register ? 'Register member' : `Edit ${initial.name}`}
      description={register ? 'Adds the member with their first membership. The plan price is charged once.' : 'Contact details only. Memberships and payments are records and aren’t edited here.'}
      footer={
        <>
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId}>
            {register ? 'Register member' : 'Save changes'}
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={submit} className="space-y-5">
        {text('name', 'Full name')}
        <div className="grid gap-5 sm:grid-cols-2">
          {text('phone', 'Phone', { type: 'tel', hint: 'Use a made-up number in this demo.' })}
          {text('email', 'Email', { type: 'email', optional: true, hint: 'For example name@example.com.' })}
        </div>

        {register ? (
          <>
            <Choice
              id={`${id}-plan`}
              legend="Membership plan"
              columns={4}
              options={book.plans.map((p) => ({ value: p.id, label: p.name, hint: money(p.pricePaise).replace('.00', '') }))}
              value={values.planId}
              onChange={(v) => set('planId', v)}
              {...(errors.plan ? { error: errors.plan } : {})}
            />
            <Field id={`${id}-start`} label="Start date" error={errors.start} hint={`Today to ${shortDay(addDays(book.today, MAX_START_DAYS_AHEAD))}.`}>
              <input
                id={`${id}-start`}
                type="date"
                value={values.start}
                min={book.today}
                max={addDays(book.today, MAX_START_DAYS_AHEAD)}
                onChange={(e: { target: { value: string } }) => set('start', e.target.value)}
                className={controlClass(!!errors.start, 'tabular sm:max-w-56')}
                aria-invalid={!!errors.start}
                aria-describedby={describedBy(`${id}-start`, errors.start, true)}
              />
            </Field>
            <p className="tabular flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-control)] bg-subtle px-3 py-2.5 text-sm" aria-live="polite">
              <span className="text-fg-muted">{preview ? `${preview.plan.name}: ${shortDay(preview.start)} – ${shortDay(preview.end)}` : 'Choose a plan and a start date'}</span>
              <span className="font-semibold text-fg">{plan ? money(plan.pricePaise) : '—'}</span>
            </p>
            <Field id={`${id}-amount`} label="Payment received now" optional error={errors.amount} hint={plan ? `Up to ${money(plan.pricePaise)}. Leave blank if they’ll pay later.` : undefined}>
              <AmountInput id={`${id}-amount`} value={values.amount} onChange={(v) => set('amount', v)} invalid={!!errors.amount} {...(describedBy(`${id}-amount`, errors.amount, !!plan) ? { describedBy: describedBy(`${id}-amount`, errors.amount, !!plan)! } : {})} />
            </Field>
            {plan ? (
              <div className="-mt-3">
                <Button variant="subtle" size="sm" onClick={() => set('amount', String(plan.pricePaise / 100))}>
                  Paid in full: {money(plan.pricePaise)}
                </Button>
              </div>
            ) : null}
            {values.amount.trim() ? <Choice id={`${id}-method`} legend="Paid by" options={paymentMethods} value={values.method} onChange={(v) => set('method', v)} {...(errors.method ? { error: errors.method } : {})} /> : null}
          </>
        ) : null}
      </form>
      <p className="mt-6 flex gap-2 rounded-[var(--radius-control)] bg-subtle px-3 py-2.5 text-sm text-fg-muted">
        <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        Demo only: no one is contacted, no money is taken, and nothing is kept after you reload.
      </p>
    </Dialog>
  );
}
