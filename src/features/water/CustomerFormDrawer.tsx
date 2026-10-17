import { useId, useRef, useState } from 'react';
import { Info } from 'lucide-react';
import type { Weekday } from '../../types/water';
import { Dialog } from '../../components/Dialog';
import { Button } from '../../components/Button';
import { Field, controlClass, describedBy } from '../../components/forms';
import { cn } from '../../utils/cn';
import { weekdays, type CustomerInput, type FieldErrors } from './waterLogic';
import { Choice } from './WaterBits';

interface Props {
  mode: 'create' | 'edit';
  initial: CustomerInput;
  open: boolean;
  onClose: () => void;
  /** Validates and saves; returns field errors if rejected. */
  onSave: (input: CustomerInput) => { ok: true } | { ok: false; errors: FieldErrors };
}

type TextKey = 'name' | 'phone' | 'locality' | 'address';
const order = ['name', 'phone', 'locality', 'address', 'status', 'recurring'] as const;

/** Add or edit a customer. All rules live in waterLogic.validateCustomer. The parent remounts it per opening. */
export function CustomerFormDrawer({ mode, initial, open, onClose, onSave }: Props) {
  const id = useId();
  const formId = `${id}-form`;
  const [values, setValues] = useState<CustomerInput>(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const submitting = useRef(false);

  const patch = (p: Partial<CustomerInput>, clear: keyof FieldErrors) => {
    setValues((v) => ({ ...v, ...p }));
    setErrors((e) => {
      if (!(clear in e)) return e;
      const next = { ...e };
      delete next[clear];
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

  const text = (key: TextKey, label: string, opts: { hint?: string; optional?: boolean; type?: string; autoComplete?: string } = {}) => (
    <Field id={`${id}-${key}`} label={label} error={errors[key]} {...(opts.hint ? { hint: opts.hint } : {})} {...(opts.optional ? { optional: true } : {})}>
      <input
        id={`${id}-${key}`}
        type={opts.type ?? 'text'}
        autoComplete={opts.autoComplete ?? 'off'}
        value={values[key]}
        onChange={(e: { target: { value: string } }) => patch({ [key]: e.target.value }, key)}
        className={controlClass(!!errors[key])}
        aria-invalid={!!errors[key]}
        aria-describedby={describedBy(`${id}-${key}`, errors[key], !!opts.hint)}
      />
    </Field>
  );

  const toggleDay = (d: Weekday) => patch({ recurringDays: values.recurringDays.includes(d) ? values.recurringDays.filter((x) => x !== d) : [...values.recurringDays, d] }, 'recurring');

  return (
    <Dialog
      open={open}
      onClose={onClose}
      variant="drawer"
      title={mode === 'create' ? 'Add customer' : `Edit ${initial.name}`}
      description={mode === 'create' ? 'New customers start with no balance and no cans.' : 'Balances and can counts come from deliveries and payments, so they aren’t edited here.'}
      footer={
        <>
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId}>
            {mode === 'create' ? 'Add customer' : 'Save changes'}
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={submit} className="space-y-5">
        {text('name', 'Name', { hint: 'A person, household or business.' })}
        {text('phone', 'Phone', { type: 'tel', hint: 'Used to call before delivery. Use a made-up number in this demo.' })}
        <div className="grid gap-5 sm:grid-cols-2">
          {text('locality', 'Locality', { hint: 'Area used to plan the round.' })}
          {text('address', 'Address', { optional: true })}
        </div>
        <Choice
          id={`${id}-status`}
          legend="Status"
          columns={2}
          options={[
            { value: 'active', label: 'Active' },
            { value: 'paused', label: 'Paused' },
          ]}
          value={values.status}
          onChange={(v) => patch({ status: v }, 'status')}
          {...(errors.status ? { error: errors.status } : {})}
        />

        <fieldset className="rounded-[var(--radius-control)] border border-line p-4" aria-describedby={errors.recurring ? `${id}-recurring-error` : `${id}-recurring-hint`}>
          <legend className="px-1 text-sm font-medium text-fg">Regular order</legend>
          <label className="flex items-center gap-2 text-sm text-fg">
            <input id={`${id}-recurring`} type="checkbox" checked={values.recurring} onChange={(e: { target: { checked: boolean } }) => patch({ recurring: e.target.checked }, 'recurring')} className="h-4 w-4 accent-[var(--accent)]" />
            This customer has a regular order
          </label>
          {values.recurring ? (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor={`${id}-rcans`} className="mb-1.5 block text-sm font-medium text-fg">
                    Cans
                  </label>
                  <input id={`${id}-rcans`} inputMode="numeric" value={values.recurringCans} onChange={(e: { target: { value: string } }) => patch({ recurringCans: e.target.value }, 'recurring')} className={controlClass(!!errors.recurring, 'tabular')} />
                </div>
                <div>
                  <label htmlFor={`${id}-rcartons`} className="mb-1.5 block text-sm font-medium text-fg">
                    Cartons
                  </label>
                  <input id={`${id}-rcartons`} inputMode="numeric" value={values.recurringCartons} onChange={(e: { target: { value: string } }) => patch({ recurringCartons: e.target.value }, 'recurring')} className={controlClass(!!errors.recurring, 'tabular')} />
                </div>
              </div>
              <div role="group" aria-label="Delivery days" className="flex flex-wrap gap-1.5">
                {weekdays.map((w) => {
                  const on = values.recurringDays.includes(w.value);
                  return (
                    <label
                      key={w.value}
                      className={cn(
                        'inline-flex min-h-9 min-w-12 cursor-pointer items-center justify-center rounded-full border px-2.5 text-sm font-medium transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus)] has-[:focus-visible]:outline-solid',
                        on ? 'border-accent bg-accent-soft text-accent-strong' : 'border-line-strong text-fg-muted hover:text-fg',
                      )}
                    >
                      <input type="checkbox" checked={on} onChange={() => toggleDay(w.value)} className="sr-only" />
                      {w.short}
                    </label>
                  );
                })}
              </div>
            </div>
          ) : null}
          {errors.recurring ? (
            <p id={`${id}-recurring-error`} className="mt-2 text-sm font-medium text-danger-strong">
              {errors.recurring}
            </p>
          ) : (
            <p id={`${id}-recurring-hint`} className="mt-2 text-sm text-fg-muted">
              Used to plan the round. It doesn’t create deliveries automatically in this demo.
            </p>
          )}
        </fieldset>
      </form>
      <p className="mt-6 flex gap-2 rounded-[var(--radius-control)] bg-subtle px-3 py-2.5 text-sm text-fg-muted">
        <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        Demo only: the customer isn’t contacted and nothing is saved after you reload.
      </p>
    </Dialog>
  );
}
