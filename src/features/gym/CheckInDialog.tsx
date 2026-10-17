import { useId, useRef, useState } from 'react';
import { Dialog } from '../../components/Dialog';
import { Button } from '../../components/Button';
import { Field, controlClass, describedBy } from '../../components/forms';
import type { FieldErrors } from './gymLogic';

interface Props {
  name: string;
  open: boolean;
  onClose: () => void;
  onSave: (time: string) => { ok: true } | { ok: false; errors: FieldErrors };
}

/** Current local time as "HH:MM". */
function nowClock(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Check a member in for the demo's today. Defaults to the time now. Remounted per opening. */
export function CheckInDialog({ name, open, onClose, onSave }: Props) {
  const id = useId();
  const formId = `${id}-form`;
  const [time, setTime] = useState(nowClock);
  const [errors, setErrors] = useState<FieldErrors>({});
  const submitting = useRef(false);
  const error = errors.time ?? errors.member;

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

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Check in ${name}`}
      description="For today only. Recorded in this demo, not on any device."
      footer={
        <>
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId}>
            Check in
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={submit}>
        <Field id={`${id}-time`} label="Check-in time" error={error} hint="Defaults to the time now. Change it if needed.">
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
