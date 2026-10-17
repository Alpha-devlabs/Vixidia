import { useId, useRef, useState } from 'react';
import type { TuitionBook } from '../../types/tuition';
import { Dialog } from '../../components/Dialog';
import { Button } from '../../components/Button';
import { Field, controlClass, describedBy } from '../../components/forms';
import { feeRows, formatPeriod, money, paymentMethods, type FieldErrors } from './tuitionLogic';
import { AmountInput, Choice, FeeBadge, longDate } from './TuitionBits';

interface Props {
  book: TuitionBook;
  /** A specific fee record, or a student whose unpaid fees can be chosen from. */
  feeId?: string;
  studentId?: string;
  open: boolean;
  onClose: () => void;
  onSave: (input: { feeId: string; amount: string; method: string }) => { ok: true } | { ok: false; errors: FieldErrors };
}

/** Records a fee payment against one fee record. Remounted per opening. */
export function PaymentDialog({ book, feeId: presetFee, studentId, open, onClose, onSave }: Props) {
  const id = useId();
  const formId = `${id}-form`;
  const unpaid = feeRows(book).filter((r) => r.balance > 0 && (!studentId || r.student.id === studentId));
  const [feeId, setFeeId] = useState(presetFee ?? unpaid[0]?.fee.id ?? '');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('upi');
  const [errors, setErrors] = useState<FieldErrors>({});
  const submitting = useRef(false);
  const row = feeRows(book).find((r) => r.fee.id === feeId);

  const submit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    const r = onSave({ feeId, amount, method });
    if (r.ok) {
      onClose();
      return;
    }
    submitting.current = false;
    setErrors(r.errors);
    const first = (['amount', 'method'] as const).find((k) => r.errors[k]);
    if (first) document.getElementById(`${id}-${first}`)?.focus();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={row && presetFee ? `Record payment: ${row.student.name}` : 'Record fee payment'}
      description="Reduces this fee’s balance once. It can’t be more than what is still due."
      footer={
        <>
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={!row}>
            Record payment
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={submit} className="space-y-5">
        {presetFee ? null : (
          <Field id={`${id}-fee`} label="Fee" hint={unpaid.length ? 'Unpaid fees, overdue first.' : 'Nothing is unpaid.'}>
            <select
              id={`${id}-fee`}
              value={feeId}
              onChange={(e: { target: { value: string } }) => {
                setFeeId(e.target.value);
                setErrors({});
              }}
              className={controlClass(false)}
              aria-describedby={`${id}-fee-hint`}
            >
              {unpaid.map((r) => (
                <option key={r.fee.id} value={r.fee.id}>
                  {studentId ? '' : `${r.student.name} — `}
                  {r.batch.name}, {formatPeriod(r.fee.period)} — {money(r.balance)} due
                </option>
              ))}
            </select>
          </Field>
        )}
        {row ? (
          <div className="rounded-[var(--radius-control)] bg-subtle px-3 py-2.5 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-fg">
                {row.batch.name} · {formatPeriod(row.fee.period)}
              </span>
              <FeeBadge status={row.status} />
            </div>
            <dl className="tabular mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-0.5">
              <dt className="text-fg-muted">Fee</dt>
              <dd className="text-right text-fg">{money(row.fee.amountPaise)}</dd>
              <dt className="text-fg-muted">Paid so far</dt>
              <dd className="text-right text-fg">{money(row.paid)}</dd>
              <dt className="text-fg-muted">Still due (by {longDate(row.fee.dueDate)})</dt>
              <dd className="text-right font-semibold text-fg">{money(row.balance)}</dd>
            </dl>
          </div>
        ) : null}
        <Field id={`${id}-amount`} label="Amount received" error={errors.amount} hint={row ? `More than ₹0 and up to ${money(row.balance)}.` : undefined}>
          <AmountInput
            id={`${id}-amount`}
            value={amount}
            onChange={(v) => {
              setAmount(v);
              setErrors((e) => ({ ...(e.method ? { method: e.method } : {}) }));
            }}
            invalid={!!errors.amount}
            {...(describedBy(`${id}-amount`, errors.amount, !!row) ? { describedBy: describedBy(`${id}-amount`, errors.amount, !!row)! } : {})}
          />
        </Field>
        {row && row.balance > 0 ? (
          <div className="-mt-3">
            <Button variant="subtle" size="sm" onClick={() => setAmount((row.balance / 100).toFixed(2).replace(/\.00$/, ''))}>
              Full balance: {money(row.balance)}
            </Button>
          </div>
        ) : null}
        <Choice id={`${id}-method`} legend="Paid by" options={paymentMethods} value={method} onChange={(v) => setMethod(v)} {...(errors.method ? { error: errors.method } : {})} />
        <p className="text-xs text-fg-muted">Demo only: no money moves and no receipt is sent.</p>
      </form>
    </Dialog>
  );
}
