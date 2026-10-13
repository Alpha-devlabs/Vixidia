import { useId, useRef, useState } from 'react';
import { Info } from 'lucide-react';
import type { Employee } from '../../types/leave';
import { Dialog } from '../../components/Dialog';
import { Button } from '../../components/Button';
import { Field, controlClass, describedBy, textareaClass } from '../../components/forms';
import { isIsoDay, leaveTypes, workingDaysIn, type FieldErrors, type LeaveInput } from './leaveLogic';
import { pluralize } from '../../utils/format';

interface Props {
  employees: Employee[];
  initial: LeaveInput;
  open: boolean;
  onClose: () => void;
  /** Validates and submits as pending; returns errors if rejected. */
  onSave: (input: LeaveInput) => { ok: true } | { ok: false; errors: FieldErrors };
}

type Key = 'employeeId' | 'type' | 'start' | 'end' | 'reason';
const errorKey: Record<Key, keyof FieldErrors> = { employeeId: 'employee', type: 'type', start: 'start', end: 'end', reason: 'reason' };

/** Leave request form in the shared drawer. Requests start as pending. The parent remounts it per opening. */
export function LeaveRequestDrawer({ employees, initial, open, onClose, onSave }: Props) {
  const id = useId();
  const formId = `${id}-form`;
  const [values, setValues] = useState<LeaveInput>(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const submitting = useRef(false);

  const set = (key: Key, value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => {
      const next = { ...e };
      delete next[errorKey[key]];
      // Changing either date can resolve a range problem reported on the other.
      if (key === 'start' || key === 'end') {
        delete next.start;
        delete next.end;
      }
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
    const first = (['employeeId', 'type', 'start', 'end', 'reason'] as Key[]).find((k) => r.errors[errorKey[k]]);
    if (first) document.getElementById(`${id}-${first}`)?.focus();
  };

  const days = isIsoDay(values.start) && isIsoDay(values.end) && values.end >= values.start ? workingDaysIn(values.start, values.end).length : null;
  const sorted = [...employees].sort((a, b) => a.name.localeCompare(b.name));
  const control = (key: Key) => ({
    id: `${id}-${key}`,
    'aria-invalid': !!errors[errorKey[key]],
    'aria-describedby': describedBy(`${id}-${key}`, errors[errorKey[key]], key === 'end' || key === 'reason'),
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      variant="drawer"
      title="Request leave"
      description="Requests start as pending and don’t affect attendance until approved."
      footer={
        <>
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId}>
            Submit request
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={submit} className="space-y-5">
        <Field id={`${id}-employeeId`} label="Employee" error={errors.employee}>
          <select {...control('employeeId')} value={values.employeeId} onChange={(e: { target: { value: string } }) => set('employeeId', e.target.value)} className={controlClass(!!errors.employee)}>
            <option value="">Choose an employee…</option>
            {sorted.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} — {e.department}
              </option>
            ))}
          </select>
        </Field>
        <Field id={`${id}-type`} label="Leave type" error={errors.type}>
          <select {...control('type')} value={values.type} onChange={(e: { target: { value: string } }) => set('type', e.target.value)} className={controlClass(!!errors.type)}>
            {leaveTypes.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id={`${id}-start`} label="From" error={errors.start}>
            <input type="date" {...control('start')} value={values.start} onChange={(e: { target: { value: string } }) => set('start', e.target.value)} className={controlClass(!!errors.start)} />
          </Field>
          <Field
            id={`${id}-end`}
            label="To (inclusive)"
            error={errors.end}
            hint={days === null ? 'The last day of leave.' : days === 0 ? 'No working days in this range.' : `${pluralize(days, 'working day')} (Mon–Fri).`}
          >
            <input type="date" {...control('end')} value={values.end} onChange={(e: { target: { value: string } }) => set('end', e.target.value)} className={controlClass(!!errors.end)} />
          </Field>
        </div>
        <Field id={`${id}-reason`} label="Reason" optional error={errors.reason} hint="Visible to whoever reviews the request.">
          <textarea {...control('reason')} rows={3} value={values.reason} onChange={(e: { target: { value: string } }) => set('reason', e.target.value)} className={textareaClass(!!errors.reason)} />
        </Field>
      </form>
      <p className="mt-6 flex gap-2 rounded-[var(--radius-control)] bg-subtle px-3 py-2.5 text-sm text-fg-muted">
        <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        Demo only: nothing is sent to anyone, and approving it later is a demonstration, not real HR approval.
      </p>
    </Dialog>
  );
}
