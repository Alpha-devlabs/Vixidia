import { useId, useRef, useState } from 'react';
import { Dialog } from '../../components/Dialog';
import { Button } from '../../components/Button';
import { Field, controlClass, describedBy } from '../../components/forms';
import type { FieldErrors } from './leaveLogic';
import { formatClock } from './leaveLogic';

interface Props {
  mode: 'in' | 'out';
  name: string;
  checkedInAt?: string;
  open: boolean;
  onClose: () => void;
  /** Validates and records; returns errors if rejected. */
  onSave: (time: string) => { ok: true } | { ok: false; errors: FieldErrors };
}

/** Current local time as "HH:MM". */
function nowClock(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * Demo check-in / check-out. Defaults to the current time and can be adjusted.
 * The parent remounts it (new key) for each opening, so it starts fresh.
 */
export function TimeDialog({ mode, name, checkedInAt, open, onClose, onSave }: Props) {
  const id = useId();
  const [time, setTime] = useState(nowClock);
  const [errors, setErrors] = useState<FieldErrors>({});
  const submitting = useRef(false);
  const formId = `${id}-form`;
  const label = mode === 'in' ? 'Check-in time' : 'Check-out time';

  const submit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    const r = onSave(time);
    if (r.ok) {
      onClose();
      return;
    }
    submitting.current = false;
    setErrors(r.errors);
    document.getElementById(`${id}-time`)?.focus();
  };
  const error = errors.time ?? errors.employee ?? errors.date;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={mode === 'in' ? `Check in ${name}` : `Check out ${name}`}
      description={mode === 'out' && checkedInAt ? `Checked in at ${formatClock(checkedInAt)} today.` : 'For today only. Recorded in this demo, not on any device.'}
      footer={
        <>
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId}>
            {mode === 'in' ? 'Check in' : 'Check out'}
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={submit}>
        <Field id={`${id}-time`} label={label} error={error} hint="Defaults to the time now. Change it if needed.">
          <input
            id={`${id}-time`}
            type="time"
            value={time}
            onChange={(e: { target: { value: string } }) => {
              setTime(e.target.value);
              setErrors({});
            }}
            className={controlClass(!!error, 'tabular sm:max-w-48')}
            aria-invalid={!!error}
            aria-describedby={describedBy(`${id}-time`, error, true)}
          />
        </Field>
      </form>
    </Dialog>
  );
}
