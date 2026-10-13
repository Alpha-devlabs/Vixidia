import { useId, useRef, useState } from 'react';
import { Info } from 'lucide-react';
import type { Customer, InteractionType } from '../../types/crm';
import { Dialog } from '../../components/Dialog';
import { Button } from '../../components/Button';
import { Field, controlClass, describedBy, textareaClass } from '../../components/forms';
import { interactionTypes, type FieldErrors, type InteractionInput } from './crmLogic';
import { interactionMeta } from './CustomerBits';
import { cn } from '../../utils/cn';

interface Props {
  customer: Customer | undefined;
  open: boolean;
  today: string;
  onClose: () => void;
  onSave: (input: InteractionInput) => { ok: true } | { ok: false; errors: FieldErrors };
}

/**
 * Records a past interaction (a log entry). Nothing is sent: no email, message or call is made.
 * The parent gives it a new key each time it opens, so it always starts empty.
 */
export function LogInteractionDrawer({ customer, open, today, onClose, onSave }: Props) {
  const id = useId();
  const formId = `${id}-form`;
  const [type, setType] = useState<InteractionType>('call');
  const [date, setDate] = useState(today);
  const [summary, setSummary] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const submitting = useRef(false);

  if (!customer) return null;

  const submit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    const result = onSave({ customerId: customer.id, type, date, summary });
    if (result.ok) {
      onClose();
      return;
    }
    submitting.current = false;
    setErrors(result.errors);
    const first = (['type', 'date', 'summary'] as const).find((k) => result.errors[k]);
    if (first) document.getElementById(`${id}-${first}`)?.focus();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      variant="drawer"
      title="Log interaction"
      description={customer.company ? `${customer.name} · ${customer.company}` : customer.name}
      footer={
        <>
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId}>
            Save to history
          </Button>
        </>
      }
    >
      {errors.customer ? (
        <p role="alert" className="mb-4 rounded-[var(--radius-control)] border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm font-medium text-danger-strong">
          {errors.customer}
        </p>
      ) : null}
      <form id={formId} noValidate onSubmit={submit} className="space-y-5">
        <fieldset>
          <legend className="mb-1.5 block text-sm font-medium text-fg">Type</legend>
          <div id={`${id}-type`} tabIndex={-1} className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {interactionTypes.map((t) => {
              const Icon = interactionMeta[t.value].icon;
              const checked = type === t.value;
              return (
                <label
                  key={t.value}
                  className={cn(
                    'flex cursor-pointer flex-col items-center gap-1 rounded-[var(--radius-control)] border px-2 py-2.5 text-xs font-medium transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus)] has-[:focus-visible]:outline-solid',
                    checked ? 'border-accent bg-accent-soft text-accent-strong' : 'border-line text-fg-muted hover:border-line-strong hover:text-fg',
                  )}
                >
                  <input
                    type="radio"
                    name={`${id}-type`}
                    value={t.value}
                    checked={checked}
                    onChange={() => setType(t.value)}
                    className="sr-only"
                  />
                  <Icon size={17} aria-hidden="true" />
                  {t.label}
                </label>
              );
            })}
          </div>
          {errors.type ? <p className="mt-1.5 text-sm font-medium text-danger-strong">{errors.type}</p> : null}
        </fieldset>

        <Field id={`${id}-date`} label="Date" error={errors.date}>
          <input
            id={`${id}-date`}
            type="date"
            value={date}
            max={today}
            onChange={(e: { target: { value: string } }) => {
              setDate(e.target.value);
              setErrors((p) => ({ ...p, date: undefined }));
            }}
            className={controlClass(!!errors.date)}
            aria-invalid={!!errors.date}
            aria-describedby={describedBy(`${id}-date`, errors.date)}
          />
        </Field>

        <Field id={`${id}-summary`} label="What happened" error={errors.summary} hint="A sentence or two the team can read later.">
          <textarea
            id={`${id}-summary`}
            rows={4}
            value={summary}
            onChange={(e: { target: { value: string } }) => {
              setSummary(e.target.value);
              setErrors((p) => ({ ...p, summary: undefined }));
            }}
            className={textareaClass(!!errors.summary)}
            aria-invalid={!!errors.summary}
            aria-describedby={describedBy(`${id}-summary`, errors.summary, true)}
          />
        </Field>
      </form>

      <p className="mt-6 flex gap-2 rounded-[var(--radius-control)] bg-subtle px-3 py-2.5 text-sm text-fg-muted">
        <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        This only adds an entry to the history. No email, message or call is made, and the demo forgets it when you reload.
      </p>
    </Dialog>
  );
}
