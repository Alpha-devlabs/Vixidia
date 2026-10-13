import { useId, useRef, useState } from 'react';
import { ArrowLeft, Info } from 'lucide-react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Panel';
import { Field, FieldGroup, controlClass, describedBy, textareaClass } from '../../components/forms';
import { customerStatuses, parseTags, type CustomerInput, type FieldErrors } from './crmLogic';

interface Props {
  mode: 'create' | 'edit';
  initial: CustomerInput;
  /** Shown in the heading when editing. */
  customerName?: string;
  onCancel: () => void;
  /** Validates and saves; returns field errors if it was rejected. */
  onSave: (input: CustomerInput) => { ok: true } | { ok: false; errors: FieldErrors };
}

type Key = keyof CustomerInput;
/** Order used to move focus to the first problem. */
const order: Key[] = ['name', 'email', 'phone', 'company', 'role', 'city', 'status', 'tags', 'notes'];

/** Add / edit customer. All rules live in crmLogic.validateCustomer; this form only shows its answers. */
export function CustomerForm({ mode, initial, customerName, onCancel, onSave }: Props) {
  const id = useId();
  const [values, setValues] = useState<CustomerInput>(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  // Blocks a second submit (double click, repeated Enter) while the first is being handled.
  const submitting = useRef(false);
  const [saved, setSaved] = useState(false);

  const set = (key: Key, value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => {
      if (!(key in e) && !(key === 'phone' && e.email === 'Add an email address or a phone number.')) return e;
      const next = { ...e };
      delete next[key];
      if (key === 'phone' && next.email === 'Add an email address or a phone number.') delete next.email;
      return next;
    });
  };

  const submit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    const result = onSave(values);
    if (result.ok) {
      setSaved(true); // the parent navigates away; keep the buttons disabled meanwhile
      return;
    }
    submitting.current = false;
    setErrors(result.errors);
    const first = order.find((k) => result.errors[k]);
    if (first) document.getElementById(`${id}-${first}`)?.focus();
  };

  const errorCount = Object.keys(errors).length;
  const tagPreview = parseTags(values.tags);
  const input = (key: Key, props: { label: string; optional?: boolean; hint?: string; type?: string; autoComplete?: string; inputMode?: 'email' | 'tel' | 'text'; className?: string }) => (
    <Field id={`${id}-${key}`} label={props.label} optional={props.optional} hint={props.hint} error={errors[key]} className={props.className}>
      <input
        id={`${id}-${key}`}
        type={props.type ?? 'text'}
        inputMode={props.inputMode}
        autoComplete={props.autoComplete ?? 'off'}
        value={values[key]}
        onChange={(e: { target: { value: string } }) => set(key, e.target.value)}
        className={controlClass(!!errors[key], key === 'phone' ? 'tabular' : undefined)}
        aria-invalid={!!errors[key]}
        aria-describedby={describedBy(`${id}-${key}`, errors[key], !!props.hint)}
      />
    </Field>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <button
          type="button"
          onClick={onCancel}
          className="-ml-2 inline-flex min-h-9 items-center gap-1.5 rounded-[var(--radius-control)] px-2 text-sm font-medium text-fg-muted hover:bg-subtle hover:text-fg"
        >
          <ArrowLeft size={16} aria-hidden="true" /> {mode === 'edit' ? 'Back to profile' : 'Back'}
        </button>
        <h1 className="mt-3 text-2xl font-semibold tracking-[-0.02em] text-fg sm:text-[1.75rem]">
          {mode === 'edit' ? `Edit ${customerName ?? 'customer'}` : 'Add customer'}
        </h1>
        <p className="mt-1 text-sm text-fg-muted">A name and one way to reach them are all you need. Everything else is optional.</p>
      </div>

      {errorCount > 0 ? (
        <p role="alert" className="rounded-[var(--radius-control)] border border-danger/30 bg-danger-soft px-4 py-3 text-sm font-medium text-danger-strong">
          {errorCount === 1 ? 'One thing needs attention' : `${errorCount} things need attention`} before this customer can be saved.
        </p>
      ) : null}

      <form noValidate onSubmit={submit}>
        <Card className="space-y-8 p-5 sm:p-6">
          <FieldGroup title="Contact" description="Add an email address, a phone number or both.">
            <div className="grid gap-5 sm:grid-cols-2">
              {input('name', { label: 'Name', className: 'sm:col-span-2', autoComplete: 'off' })}
              {input('email', { label: 'Email', type: 'email', inputMode: 'email' })}
              {input('phone', { label: 'Phone', type: 'tel', inputMode: 'tel', hint: 'Any country. Include the country code if outside India, e.g. +44 20 7946 0321.' })}
            </div>
          </FieldGroup>

          <FieldGroup title="Company">
            <div className="grid gap-5 sm:grid-cols-2">
              {input('company', { label: 'Company', optional: true, className: 'sm:col-span-2' })}
              {input('role', { label: 'Role', optional: true })}
              {input('city', { label: 'City', optional: true })}
            </div>
          </FieldGroup>

          <FieldGroup title="Relationship">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id={`${id}-status`} label="Status" error={errors.status} hint="Prospects haven’t bought yet. Inactive customers are kept for their history.">
                <select
                  id={`${id}-status`}
                  value={values.status}
                  onChange={(e: { target: { value: string } }) => set('status', e.target.value)}
                  className={controlClass(!!errors.status)}
                  aria-invalid={!!errors.status}
                  aria-describedby={describedBy(`${id}-status`, errors.status, true)}
                >
                  {customerStatuses.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                id={`${id}-tags`}
                label="Tags"
                optional
                error={errors.tags}
                hint={tagPreview.length ? `Saved as: ${tagPreview.join(' · ')}` : 'Separate with commas, e.g. wholesale, festive.'}
              >
                <input
                  id={`${id}-tags`}
                  value={values.tags}
                  autoComplete="off"
                  onChange={(e: { target: { value: string } }) => set('tags', e.target.value)}
                  className={controlClass(!!errors.tags)}
                  aria-invalid={!!errors.tags}
                  aria-describedby={describedBy(`${id}-tags`, errors.tags, true)}
                />
              </Field>
            </div>
          </FieldGroup>

          <FieldGroup title="Notes">
            <Field id={`${id}-notes`} label="Notes" optional error={errors.notes} hint="Preferences, buying patterns or anything the team should know.">
              <textarea
                id={`${id}-notes`}
                rows={4}
                value={values.notes}
                onChange={(e: { target: { value: string } }) => set('notes', e.target.value)}
                className={textareaClass(!!errors.notes)}
                aria-invalid={!!errors.notes}
                aria-describedby={describedBy(`${id}-notes`, errors.notes, true)}
              />
            </Field>
          </FieldGroup>

          <div className="flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex gap-2 text-xs text-fg-muted">
              <Info size={14} className="mt-px shrink-0" aria-hidden="true" />
              Demo: saved in this tab only and cleared when you reload or reset.
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="subtle" onClick={onCancel} disabled={saved}>
                Cancel
              </Button>
              <Button type="submit" disabled={saved}>
                {mode === 'edit' ? 'Save changes' : 'Add customer'}
              </Button>
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
}
