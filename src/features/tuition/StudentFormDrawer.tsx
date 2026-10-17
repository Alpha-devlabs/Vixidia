import { useId, useRef, useState } from 'react';
import { Info } from 'lucide-react';
import type { TuitionBook } from '../../types/tuition';
import { Dialog } from '../../components/Dialog';
import { Button } from '../../components/Button';
import { Field, controlClass, describedBy } from '../../components/forms';
import { cn } from '../../utils/cn';
import { GRADES, formatPeriod, gradeText, periodOf, rupees, scheduleText, type FieldErrors, type StudentInput } from './tuitionLogic';

interface Props {
  book: TuitionBook;
  mode: 'create' | 'edit';
  initial: StudentInput;
  open: boolean;
  onClose: () => void;
  onSave: (input: StudentInput) => { ok: true } | { ok: false; errors: FieldErrors };
}

type TextKey = 'name' | 'school' | 'guardianName' | 'guardianPhone' | 'guardianEmail';
const order = ['name', 'grade', 'school', 'guardianName', 'guardianPhone', 'guardianEmail', 'batches'] as const;

/** Add or edit a student. All rules live in tuitionLogic.validateStudent. Remounted per opening. */
export function StudentFormDrawer({ book, mode, initial, open, onClose, onSave }: Props) {
  const id = useId();
  const formId = `${id}-form`;
  const [values, setValues] = useState<StudentInput>(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const submitting = useRef(false);
  const grade = Number(values.grade);

  const set = (key: keyof StudentInput, value: string | string[]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => {
      const next = { ...e };
      delete next[key as keyof FieldErrors];
      if (key === 'grade') delete next.batches;
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

  const text = (key: TextKey, label: string, opts: { hint?: string; optional?: boolean; type?: string } = {}) => (
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

  const batches = book.batches.filter((b) => b.status === 'active');

  return (
    <Dialog
      open={open}
      onClose={onClose}
      variant="drawer"
      title={mode === 'create' ? 'Add student' : `Edit ${initial.name}`}
      description={mode === 'create' ? `Enrols from today. ${formatPeriod(periodOf(book.today))}’s fee is added for each batch.` : 'Details only. Batches are changed from the student’s profile; attendance and fees are records.'}
      footer={
        <>
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId}>
            {mode === 'create' ? 'Add student' : 'Save changes'}
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={submit} className="space-y-5">
        {text('name', 'Student’s name')}
        <div className="grid gap-5 sm:grid-cols-[8rem_minmax(0,1fr)]">
          <Field id={`${id}-grade`} label="Grade" error={errors.grade}>
            <select
              id={`${id}-grade`}
              value={values.grade}
              onChange={(e: { target: { value: string } }) => set('grade', e.target.value)}
              className={controlClass(!!errors.grade)}
              aria-invalid={!!errors.grade}
              aria-describedby={describedBy(`${id}-grade`, errors.grade)}
            >
              <option value="">Choose…</option>
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  Grade {g}
                </option>
              ))}
            </select>
          </Field>
          {text('school', 'School')}
        </div>
        <fieldset className="space-y-4 rounded-[var(--radius-control)] border border-line p-4">
          <legend className="px-1 text-sm font-medium text-fg">Parent or guardian</legend>
          {text('guardianName', 'Name')}
          <div className="grid gap-4 sm:grid-cols-2">
            {text('guardianPhone', 'Phone', { type: 'tel', hint: '10-digit Indian numbers get +91 added. Use a made-up number.' })}
            {text('guardianEmail', 'Email', { type: 'email', optional: true })}
          </div>
        </fieldset>
        {mode === 'create' ? (
          <fieldset aria-describedby={errors.batches ? `${id}-batches-error` : `${id}-batches-hint`}>
            <legend className="mb-1.5 block text-sm font-medium text-fg">
              Batches <span className="font-normal text-fg-subtle">(optional)</span>
            </legend>
            <div id={`${id}-batches`} tabIndex={-1} className="space-y-1.5">
              {batches.map((b) => {
                const fits = !grade || (grade >= b.gradeFrom && grade <= b.gradeTo);
                const on = values.batchIds.includes(b.id);
                return (
                  <label
                    key={b.id}
                    className={cn(
                      'flex items-center gap-2.5 rounded-[var(--radius-control)] border px-3 py-2 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus)] has-[:focus-visible]:outline-solid',
                      !fits ? 'cursor-not-allowed border-line opacity-60' : on ? 'cursor-pointer border-accent bg-accent-soft' : 'cursor-pointer border-line hover:border-line-strong',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={!fits}
                      onChange={() => set('batchIds', on ? values.batchIds.filter((x) => x !== b.id) : [...values.batchIds, b.id])}
                      className="h-4 w-4 shrink-0 accent-[var(--accent)]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-fg">{b.name}</span>
                      <span className="block text-xs text-fg-muted">
                        {gradeText(b.gradeFrom, b.gradeTo)} · {scheduleText(b)}
                      </span>
                    </span>
                    <span className="tabular text-xs text-fg-muted">{rupees(b.monthlyFeePaise)}/month</span>
                  </label>
                );
              })}
            </div>
            {errors.batches ? (
              <p id={`${id}-batches-error`} className="mt-1.5 text-sm font-medium text-danger-strong">
                {errors.batches}
              </p>
            ) : (
              <p id={`${id}-batches-hint`} className="mt-1.5 text-xs text-fg-muted">
                Batches outside the student’s grade are unavailable. Student-specific fees can be set when enrolling from the profile.
              </p>
            )}
          </fieldset>
        ) : null}
      </form>
      <p className="mt-6 flex gap-2 rounded-[var(--radius-control)] bg-subtle px-3 py-2.5 text-sm text-fg-muted">
        <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        Demo only: no one is contacted and nothing is kept after you reload.
      </p>
    </Dialog>
  );
}
