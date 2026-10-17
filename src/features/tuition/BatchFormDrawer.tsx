import { useId, useRef, useState } from 'react';
import type { TuitionBook, Weekday } from '../../types/tuition';
import { Dialog } from '../../components/Dialog';
import { Button } from '../../components/Button';
import { Field, controlClass, describedBy } from '../../components/forms';
import { cn } from '../../utils/cn';
import { CLOSE, GRADES, OPEN, formatTime, weekdays, type BatchInput, type FieldErrors } from './tuitionLogic';
import { AmountInput, Choice } from './TuitionBits';

interface Props {
  book: TuitionBook;
  mode: 'create' | 'edit';
  initial: BatchInput;
  open: boolean;
  onClose: () => void;
  onSave: (input: BatchInput) => { ok: true } | { ok: false; errors: FieldErrors };
}

const order = ['name', 'subject', 'grades', 'teacher', 'days', 'start', 'duration', 'room', 'fee'] as const;

/** Add or edit a batch. All rules live in tuitionLogic.validateBatch. Remounted per opening. */
export function BatchFormDrawer({ book, mode, initial, open, onClose, onSave }: Props) {
  const id = useId();
  const formId = `${id}-form`;
  const [values, setValues] = useState<BatchInput>(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const submitting = useRef(false);

  const set = <K extends keyof BatchInput>(key: K, value: BatchInput[K], ...clear: (keyof FieldErrors)[]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => {
      const next = { ...e };
      for (const k of clear) delete next[k];
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
    if (first) document.getElementById(`${id}-${first === 'grades' ? 'gradeFrom' : first}`)?.focus();
  };

  const text = (key: 'name' | 'subject' | 'room', label: string, hint?: string) => (
    <Field id={`${id}-${key}`} label={label} error={errors[key]} {...(hint ? { hint } : {})}>
      <input
        id={`${id}-${key}`}
        autoComplete="off"
        value={values[key]}
        onChange={(e: { target: { value: string } }) => set(key, e.target.value, key, ...(key === 'room' ? (['start'] as const) : []))}
        className={controlClass(!!errors[key])}
        aria-invalid={!!errors[key]}
        aria-describedby={describedBy(`${id}-${key}`, errors[key], !!hint)}
      />
    </Field>
  );
  const gradeSelect = (key: 'gradeFrom' | 'gradeTo', label: string) => (
    <div>
      <label htmlFor={`${id}-${key}`} className="mb-1.5 block text-sm font-medium text-fg">
        {label}
      </label>
      <select
        id={`${id}-${key}`}
        value={values[key]}
        onChange={(e: { target: { value: string } }) => set(key, e.target.value, 'grades')}
        className={controlClass(!!errors.grades)}
        aria-invalid={!!errors.grades}
        aria-describedby={errors.grades ? `${id}-grades-error` : undefined}
      >
        <option value="">Choose…</option>
        {GRADES.map((g) => (
          <option key={g} value={g}>
            Grade {g}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      variant="drawer"
      title={mode === 'create' ? 'New batch' : `Edit ${initial.name}`}
      description={mode === 'create' ? 'Classes are created from the weekly schedule for the next 4 weeks.' : 'A new fee applies to fees generated from now on. A new schedule replaces future classes that have no attendance.'}
      footer={
        <>
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId}>
            {mode === 'create' ? 'Create batch' : 'Save changes'}
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={submit} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          {text('name', 'Batch name', 'For example: Maths 8–9.')}
          {text('subject', 'Subject')}
        </div>
        <div>
          <div className="grid grid-cols-2 gap-4">
            {gradeSelect('gradeFrom', 'From grade')}
            {gradeSelect('gradeTo', 'To grade')}
          </div>
          {errors.grades ? (
            <p id={`${id}-grades-error`} className="mt-1.5 text-sm font-medium text-danger-strong">
              {errors.grades}
            </p>
          ) : null}
        </div>
        <Field id={`${id}-teacher`} label="Teacher" error={errors.teacher}>
          <select id={`${id}-teacher`} value={values.teacherId} onChange={(e: { target: { value: string } }) => set('teacherId', e.target.value, 'teacher')} className={controlClass(!!errors.teacher)} aria-invalid={!!errors.teacher} aria-describedby={describedBy(`${id}-teacher`, errors.teacher)}>
            <option value="">Choose a teacher…</option>
            {book.teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </Field>
        <fieldset aria-describedby={errors.days ? `${id}-days-error` : undefined}>
          <legend className="mb-1.5 block text-sm font-medium text-fg">Days</legend>
          <div id={`${id}-days`} tabIndex={-1} className="flex flex-wrap gap-1.5">
            {weekdays.map((w) => {
              const on = values.days.includes(w.value);
              return (
                <label
                  key={w.value}
                  className={cn(
                    'inline-flex min-h-9 min-w-12 cursor-pointer items-center justify-center rounded-full border px-2.5 text-sm font-medium transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus)] has-[:focus-visible]:outline-solid',
                    on ? 'border-accent bg-accent-soft text-accent-strong' : errors.days ? 'border-danger text-fg-muted' : 'border-line-strong text-fg-muted hover:text-fg',
                  )}
                >
                  <input type="checkbox" checked={on} onChange={() => set('days', (on ? values.days.filter((d) => d !== w.value) : [...values.days, w.value]) as Weekday[], 'days', 'start')} className="sr-only" aria-label={w.long} />
                  {w.short}
                </label>
              );
            })}
          </div>
          {errors.days ? (
            <p id={`${id}-days-error`} className="mt-1.5 text-sm font-medium text-danger-strong">
              {errors.days}
            </p>
          ) : null}
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field id={`${id}-start`} label="Starts at" error={errors.start} hint={`${formatTime(OPEN)}–${formatTime(CLOSE)}`}>
            <input
              id={`${id}-start`}
              type="time"
              step={900}
              value={values.start}
              onChange={(e: { target: { value: string } }) => set('start', e.target.value, 'start')}
              className={controlClass(!!errors.start, 'tabular')}
              aria-invalid={!!errors.start}
              aria-describedby={describedBy(`${id}-start`, errors.start, true)}
            />
          </Field>
          <Field id={`${id}-duration`} label="Minutes" error={errors.duration} hint="30–180">
            <input id={`${id}-duration`} inputMode="numeric" value={values.duration} onChange={(e: { target: { value: string } }) => set('duration', e.target.value, 'duration', 'start')} className={controlClass(!!errors.duration, 'tabular')} aria-invalid={!!errors.duration} aria-describedby={describedBy(`${id}-duration`, errors.duration, true)} />
          </Field>
          {text('room', 'Classroom')}
        </div>
        <Field id={`${id}-fee`} label="Monthly fee" error={errors.fee} hint="Per student. Can be changed for one student when enrolling.">
          <AmountInput id={`${id}-fee`} value={values.fee} onChange={(v) => set('fee', v, 'fee')} invalid={!!errors.fee} {...(describedBy(`${id}-fee`, errors.fee, true) ? { describedBy: describedBy(`${id}-fee`, errors.fee, true)! } : {})} />
        </Field>
        {mode === 'edit' ? (
          <Choice
            id={`${id}-status`}
            legend="Status"
            columns={2}
            options={[
              { value: 'active', label: 'Running' },
              { value: 'inactive', label: 'Not running' },
            ]}
            value={values.status}
            onChange={(v) => set('status', v, 'start')}
          />
        ) : null}
      </form>
    </Dialog>
  );
}
