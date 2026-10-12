import { useId, useState } from 'react';
import { Info } from 'lucide-react';
import { Dialog } from '../../components/Dialog';
import { Button } from '../../components/Button';
import { Field, controlClass, describedBy, textareaClass } from '../../components/forms';
import { paymentMethods, type FieldErrors, type InvoiceRow, type PaymentInput } from './invoiceLogic';
import { paiseToInput, toRupees } from './money';
import { formatAmount, formatDate } from '../../utils/format';

interface Props {
  row: InvoiceRow | undefined;
  open: boolean;
  today: string;
  onClose: () => void;
  /** Validates and records the payment; returns field errors if it was rejected. */
  onRecord: (input: PaymentInput) => { ok: true } | { ok: false; errors: FieldErrors };
}

/**
 * Record-payment drawer. All rules (amount within the balance, date range, method)
 * live in invoiceLogic.recordPayment; this form only shows its answers.
 * A demo operation: the payment is recorded in memory and no money moves.
 */
export function RecordPaymentDrawer({ row, open, today, onClose, onRecord }: Props) {
  const id = useId();
  const formId = `${id}-form`;
  // The parent remounts the drawer (new key) each time it opens, so these start fresh.
  const [amount, setAmount] = useState(() => (row ? paiseToInput(row.balance) : ''));
  const [date, setDate] = useState(today);
  const [method, setMethod] = useState<string>('UPI');
  const [reference, setReference] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});

  if (!row) return null;

  const submit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    const result = onRecord({ invoiceId: row.invoice.id, amount, date, method, reference });
    if (result.ok) {
      setErrors({});
      onClose();
      return;
    }
    setErrors(result.errors);
    const first = (['amount', 'date', 'method', 'ref'] as const).find((k) => result.errors[k === 'ref' ? 'reference' : k]);
    if (first) document.getElementById(`${id}-${first}`)?.focus();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      variant="drawer"
      title="Record payment"
      description={`${row.invoice.number} · ${row.customer}`}
      footer={
        <>
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId}>
            Record payment
          </Button>
        </>
      }
    >
      <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-[var(--radius-control)] border border-line bg-line text-sm sm:grid-cols-3">
        {[
          ['Invoice total', formatAmount(toRupees(row.totals.total))],
          ['Paid so far', formatAmount(toRupees(row.paid))],
          ['Balance due', formatAmount(toRupees(row.balance))],
        ].map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-3 bg-surface px-3 py-2.5 sm:block">
            <dt className="text-xs text-fg-muted">{label}</dt>
            <dd className="tabular font-semibold text-fg sm:mt-0.5">{value}</dd>
          </div>
        ))}
      </dl>

      {errors.invoice ? (
        <p role="alert" className="mt-4 rounded-[var(--radius-control)] border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm font-medium text-danger-strong">
          {errors.invoice}
        </p>
      ) : null}

      <form id={formId} noValidate onSubmit={submit} className="mt-6 space-y-5">
        <Field id={`${id}-amount`} label="Amount received (₹)" error={errors.amount} hint="Defaults to the full balance due.">
          <input
            id={`${id}-amount`}
            inputMode="decimal"
            autoComplete="off"
            value={amount}
            onChange={(e: { target: { value: string } }) => {
              setAmount(e.target.value);
              setErrors((p) => without(p, 'amount'));
            }}
            className={controlClass(!!errors.amount, 'tabular')}
            aria-invalid={!!errors.amount}
            aria-describedby={describedBy(`${id}-amount`, errors.amount, true)}
          />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id={`${id}-date`} label="Payment date" error={errors.date}>
            <input
              id={`${id}-date`}
              type="date"
              value={date}
              max={today}
              min={row.invoice.issueDate}
              onChange={(e: { target: { value: string } }) => {
                setDate(e.target.value);
                setErrors((p) => without(p, 'date'));
              }}
              className={controlClass(!!errors.date)}
              aria-invalid={!!errors.date}
              aria-describedby={describedBy(`${id}-date`, errors.date)}
            />
          </Field>
          <Field id={`${id}-method`} label="Method" error={errors.method}>
            <select
              id={`${id}-method`}
              value={method}
              onChange={(e: { target: { value: string } }) => {
                setMethod(e.target.value);
                setErrors((p) => without(p, 'method'));
              }}
              className={controlClass(!!errors.method)}
              aria-invalid={!!errors.method}
              aria-describedby={describedBy(`${id}-method`, errors.method)}
            >
              {paymentMethods.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field id={`${id}-ref`} label="Reference" optional error={errors.reference} hint="UPI reference, cheque number or bank transaction ID.">
          <textarea
            id={`${id}-ref`}
            rows={2}
            value={reference}
            onChange={(e: { target: { value: string } }) => {
              setReference(e.target.value);
              setErrors((p) => without(p, 'reference'));
            }}
            className={textareaClass(!!errors.reference, 'min-h-16')}
            aria-invalid={!!errors.reference}
            aria-describedby={describedBy(`${id}-ref`, errors.reference, true)}
          />
        </Field>
      </form>

      <p className="mt-6 flex gap-2 rounded-[var(--radius-control)] bg-subtle px-3 py-2.5 text-sm text-fg-muted">
        <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        Demo: the payment is recorded in this tab only and no money moves. Invoice issued {formatDate(row.invoice.issueDate)}.
      </p>
    </Dialog>
  );
}

function without(errors: FieldErrors, key: string): FieldErrors {
  if (!(key in errors)) return errors;
  const next = { ...errors };
  delete next[key];
  return next;
}
