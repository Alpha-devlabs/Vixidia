import { useId, useRef, useState } from 'react';
import { ArrowLeft, Info } from 'lucide-react';
import type { TaskCustomer } from '../../types/tasks';
import { Button } from '../../components/Button';
import { Card } from '../../components/Panel';
import { Field, controlClass, describedBy, textareaClass } from '../../components/forms';
import { taskCategories, taskPriorities, taskStatuses, type FieldErrors, type TaskInput } from './taskLogic';
import { priorityMeta } from './TaskBits';
import { cn } from '../../utils/cn';

interface Props {
  mode: 'create' | 'edit';
  initial: TaskInput;
  customers: TaskCustomer[];
  onCancel: () => void;
  /** Validates and saves; returns field errors if it was rejected. */
  onSave: (input: TaskInput) => { ok: true } | { ok: false; errors: FieldErrors };
}

type Key = keyof TaskInput;
const order: Key[] = ['title', 'description', 'dueDate', 'priority', 'status', 'category', 'customerId'];

/** Create / edit a task. All rules live in taskLogic.validateTask; this form only shows its answers. */
export function TaskForm({ mode, initial, customers, onCancel, onSave }: Props) {
  const id = useId();
  const [values, setValues] = useState<TaskInput>(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  // Blocks a second submit (double click, repeated Enter) while the first is handled.
  const submitting = useRef(false);
  const [saved, setSaved] = useState(false);

  const set = (key: Key, value: string) => {
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
    const result = onSave(values);
    if (result.ok) {
      setSaved(true);
      return;
    }
    submitting.current = false;
    setErrors(result.errors);
    const first = order.find((k) => result.errors[k]);
    if (first) document.getElementById(`${id}-${first}`)?.focus();
  };

  const errorCount = Object.keys(errors).length;
  const sortedCustomers = [...customers].sort((a, b) => a.name.localeCompare(b.name));
  const select = (key: Key, label: string, options: { value: string; label: string }[], hint?: string, optional?: boolean) => (
    <Field id={`${id}-${key}`} label={label} hint={hint} optional={optional} error={errors[key]}>
      <select
        id={`${id}-${key}`}
        value={values[key]}
        onChange={(e: { target: { value: string } }) => set(key, e.target.value)}
        className={controlClass(!!errors[key])}
        aria-invalid={!!errors[key]}
        aria-describedby={describedBy(`${id}-${key}`, errors[key], !!hint)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
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
          <ArrowLeft size={16} aria-hidden="true" /> Back
        </button>
        <h1 className="mt-3 text-2xl font-semibold tracking-[-0.02em] text-fg sm:text-[1.75rem]">{mode === 'edit' ? 'Edit task' : 'New task'}</h1>
        <p className="mt-1 text-sm text-fg-muted">A title and a due date are all a task needs.</p>
      </div>

      {errorCount > 0 ? (
        <p role="alert" className="rounded-[var(--radius-control)] border border-danger/30 bg-danger-soft px-4 py-3 text-sm font-medium text-danger-strong">
          {errorCount === 1 ? 'One thing needs attention' : `${errorCount} things need attention`} before this task can be saved.
        </p>
      ) : null}

      <form noValidate onSubmit={submit}>
        <Card className="space-y-6 p-5 sm:p-6">
          <Field id={`${id}-title`} label="Title" error={errors.title}>
            <input
              id={`${id}-title`}
              value={values.title}
              autoComplete="off"
              placeholder="e.g. Send the revised quote to Saffron Events"
              onChange={(e: { target: { value: string } }) => set('title', e.target.value)}
              className={controlClass(!!errors.title)}
              aria-invalid={!!errors.title}
              aria-describedby={describedBy(`${id}-title`, errors.title)}
            />
          </Field>

          <Field id={`${id}-description`} label="Description" optional error={errors.description} hint="Details, links or anything needed to finish it.">
            <textarea
              id={`${id}-description`}
              rows={3}
              value={values.description}
              onChange={(e: { target: { value: string } }) => set('description', e.target.value)}
              className={textareaClass(!!errors.description)}
              aria-invalid={!!errors.description}
              aria-describedby={describedBy(`${id}-description`, errors.description, true)}
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field id={`${id}-dueDate`} label="Due date" error={errors.dueDate}>
              <input
                id={`${id}-dueDate`}
                type="date"
                value={values.dueDate}
                onChange={(e: { target: { value: string } }) => set('dueDate', e.target.value)}
                className={controlClass(!!errors.dueDate)}
                aria-invalid={!!errors.dueDate}
                aria-describedby={describedBy(`${id}-dueDate`, errors.dueDate)}
              />
            </Field>

            <fieldset>
              <legend className="mb-1.5 block text-sm font-medium text-fg">Priority</legend>
              <div id={`${id}-priority`} tabIndex={-1} className="grid grid-cols-3 gap-2">
                {taskPriorities.map((p) => {
                  const Icon = priorityMeta[p.value].icon;
                  const checked = values.priority === p.value;
                  return (
                    <label
                      key={p.value}
                      className={cn(
                        'flex min-h-10 cursor-pointer items-center justify-center gap-1.5 rounded-[var(--radius-control)] border px-2 text-sm font-medium transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus)] has-[:focus-visible]:outline-solid',
                        checked ? 'border-accent bg-accent-soft text-accent-strong' : 'border-line-strong text-fg-muted hover:text-fg',
                      )}
                    >
                      <input type="radio" name={`${id}-priority`} value={p.value} checked={checked} onChange={() => set('priority', p.value)} className="sr-only" />
                      <Icon size={15} aria-hidden="true" />
                      {p.label}
                    </label>
                  );
                })}
              </div>
              {errors.priority ? <p className="mt-1.5 text-sm font-medium text-danger-strong">{errors.priority}</p> : null}
            </fieldset>

            {select('status', 'Status', taskStatuses)}
            {select('category', 'Category', taskCategories, 'Follow-ups are tasks about getting back to someone.')}
          </div>

          {select(
            'customerId',
            'Linked customer',
            [{ value: '', label: 'No customer' }, ...sortedCustomers.map((c) => ({ value: c.id, label: c.company ? `${c.name} — ${c.company}` : c.name }))],
            'From the Simple CRM sample customers. Useful for follow-ups; not needed for other tasks.',
            true,
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex gap-2 text-xs text-fg-muted">
              <Info size={14} className="mt-px shrink-0" aria-hidden="true" />
              Demo: saved in this tab only. No reminders or notifications are sent.
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="subtle" onClick={onCancel} disabled={saved}>
                Cancel
              </Button>
              <Button type="submit" disabled={saved}>
                {mode === 'edit' ? 'Save changes' : 'Create task'}
              </Button>
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
}
