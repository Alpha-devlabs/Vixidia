import { useEffect, useId, useState } from 'react';
import { CircleCheck, Pencil, Target } from 'lucide-react';
import { Dialog } from '../../components/Dialog';
import { Button } from '../../components/Button';
import { controlClass } from '../../components/forms';
import { parseTarget, scaledTarget, validateTarget, type PeriodDays, type TargetProgress as Progress } from './pulseLogic';
import { formatCurrency } from '../../utils/format';

interface Props {
  progress: Progress;
  days: PeriodDays;
  target30: number;
  onSetTarget: (value: number) => void;
}

/** Progress toward a revenue target, with an editable target. */
export function TargetProgress({ progress, days, target30, onSetTarget }: Props) {
  const [editing, setEditing] = useState(false);
  const met = progress.ratio >= 1;
  const percent = Math.floor(progress.ratio * 100);

  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="tabular text-2xl font-bold tracking-[-0.02em]">{percent}%</p>
          <p className="tabular text-sm text-fg-muted">
            {formatCurrency(progress.revenue)} of {formatCurrency(progress.target)}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setEditing(true)} ariaLabel="Edit revenue target">
          <Pencil size={15} aria-hidden="true" /> Edit target
        </Button>
      </div>
      <div
        className="mt-3 h-2.5 rounded-full bg-subtle"
        role="progressbar"
        aria-label="Progress toward revenue target"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(100, percent)}
      >
        <div className="h-full rounded-full bg-chart" style={{ width: `${Math.min(100, progress.ratio * 100)}%` }} />
      </div>
      <p className="mt-2.5 flex items-center gap-1.5 text-sm">
        {met ? (
          <>
            <CircleCheck size={16} className="text-success-strong" aria-hidden="true" />
            <span>Target met for this period.</span>
          </>
        ) : (
          <>
            <Target size={16} className="text-accent-strong" aria-hidden="true" />
            <span className="tabular">{formatCurrency(progress.remaining)} to go.</span>
          </>
        )}
      </p>
      <p className="mt-1 text-xs text-fg-muted">
        {days === 30
          ? 'Your target is set per 30 days.'
          : `Scaled from your target of ${formatCurrency(target30)} per 30 days.`}
      </p>
      <TargetDialog open={editing} onClose={() => setEditing(false)} target30={target30} onSave={onSetTarget} />
    </div>
  );
}

interface DialogProps {
  open: boolean;
  onClose: () => void;
  target30: number;
  onSave: (value: number) => void;
}

function TargetDialog({ open, onClose, target30, onSave }: DialogProps) {
  const id = useId();
  const [value, setValue] = useState(String(target30));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValue(String(target30));
      setError(null);
    }
  }, [open, target30]);

  const parsed = parseTarget(value);
  const valid = validateTarget(value) === null;
  const formId = `${id}-form`;

  const submit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    const problem = validateTarget(value);
    setError(problem);
    if (problem) {
      document.getElementById(`${id}-input`)?.focus();
      return;
    }
    onSave(parsed);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Revenue target"
      description="Set a target for every 30 days. It is scaled for the 7- and 90-day periods."
      footer={
        <>
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId}>
            Save target
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={submit}>
        <label htmlFor={`${id}-input`} className="mb-1.5 block text-sm font-semibold">
          Target per 30 days (₹)
        </label>
        <input
          id={`${id}-input`}
          inputMode="numeric"
          autoComplete="off"
          value={value}
          onChange={(e: { target: { value: string } }) => {
            setValue(e.target.value);
            setError(null);
          }}
          className={controlClass(!!error, 'tabular')}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : `${id}-hint`}
        />
        {error ? (
          <p id={`${id}-error`} className="mt-1.5 text-sm font-medium text-danger-strong">
            {error}
          </p>
        ) : (
          <p id={`${id}-hint`} className="tabular mt-1.5 text-sm text-fg-muted">
            {valid
              ? `${formatCurrency(parsed)} per 30 days · ${formatCurrency(scaledTarget(parsed, 7))} per 7 days · ${formatCurrency(scaledTarget(parsed, 90))} per 90 days`
              : 'Whole rupees, for example 250000.'}
          </p>
        )}
      </form>
    </Dialog>
  );
}
