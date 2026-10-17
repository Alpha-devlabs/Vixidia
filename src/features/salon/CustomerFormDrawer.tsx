import { useId, useRef, useState } from 'react';
import { Dialog } from '../../components/Dialog';
import { Button } from '../../components/Button';
import { Field, controlClass, describedBy, textareaClass } from '../../components/forms';
import type { CustomerInput, FieldErrors } from './salonLogic';

interface Props {
  mode: 'create' | 'edit';
  initial: CustomerInput;
  open: boolean;
  onClose: () => void;
  onSave: (input: CustomerInput) => { ok: true } | { ok: false; errors: FieldErrors };
}

const order = ['name', 'phone', 'email', 'notes'] as const;

/** Add or edit a customer. All rules live in salonLogic.validateCustomer. Remounted per opening. */
export function CustomerFormDrawer({ mode, initial, open, onClose, onSave }: Props) {
  const id = useId();
  const formId = `${id}-form`;
  const [values, setValues] = useState<CustomerInput>(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const submitting = useRef(false);

  const set = (key: keyof CustomerInput, value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => {
      if (!(key in e)) return e;
      const next = { ...e };
      delete next[key];
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

  const text = (key: 'name' | 'phone' | 'email', label: string, opts: { hint?: string; optional?: boolean; type?: string } = {}) => (
    <Field id={`${id}-${key}`} label={label} error={errors[key]} {...(opts.hint ? { hint: opts.hint } : {})} {...(opts.optional ? { optional: true } : {})}>
      <input
        id={`${id}-${key}`}
        type={opts.type ?? 'text'}
        autoComplete="off"
        value={values[key]}
        onChange={(e: { target: { value: string } }) => set(key, e.target.value)}
        className={controlClass(!!errors[key])}
        aria-invalid={!!errors[key]}
        aria-describedby={describedBy(`${id}-${key}`, errors[key], !!opts.hint)}
      />
    </Field>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      variant="drawer"
      title={mode === 'create' ? 'Add customer' : `Edit ${initial.name}`}
      description="Phone numbers in any country’s format. A number or email already on file is flagged so you don’t add the same person twice."
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
        {text('name', 'Name')}
        <div className="grid gap-5 sm:grid-cols-2">
          {text('phone', 'Phone', { type: 'tel', hint: 'Use a made-up number in this demo.' })}
          {text('email', 'Email', { type: 'email', optional: true })}
        </div>
        <Field id={`${id}-notes`} label="Notes" optional error={errors.notes} hint="Preferences, allergies, patch tests. Up to 300 characters.">
          <textarea
            id={`${id}-notes`}
            rows={3}
            value={values.notes}
            onChange={(e: { target: { value: string } }) => set('notes', e.target.value)}
            className={textareaClass(!!errors.notes)}
            aria-invalid={!!errors.notes}
            aria-describedby={describedBy(`${id}-notes`, errors.notes, true)}
          />
        </Field>
      </form>
    </Dialog>
  );
}
