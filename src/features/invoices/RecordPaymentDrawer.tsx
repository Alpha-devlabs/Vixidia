import { useEffect, useId, useState } from 'react';
import { Info } from 'lucide-react';
import { Dialog } from '../../components/Dialog';
import { Button } from '../../components/Button';
import { Field, controlClass, describedBy, textareaClass } from '../../components/forms';
import { paymentMethods } from '../../data/invoiceSample';
import type { InvoiceRow } from './invoiceView';
import { formatAmount, formatDate } from '../../utils/format';

interface Props {
  row: InvoiceRow | undefined;
  open: boolean;
  today: string;
  onClose: () => void;
  /** Design preview: called after validation; nothing is stored yet. */
  onSubmitted: (summary: string) => void;
}

/**
 * Record-payment drawer. In this design phase it validates the entry and reports
 * honestly that payments are not saved yet; the next phase connects it to the
 * payment records.
 */
export function RecordPaymentDrawer({ row, open, today, onClose, onSubmitted }: Props) {
  const id = useId();
  const formId = `${id}-form`;
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today);
  const [method, setMethod] = useState<string>('UPI');
  const [reference, setReference] = useState('');
  const [errors, setErrors] = useState<{ amount?: string; date?: string }>({});

  useEffect(() => {
    if (open && row) {
      setAmount(row.balance.toFixed(2));
      setDate(today);
      setMethod('UPI');
      setReference('');
      setErrors({});
    }
  }, [open, row, today]);

  if (!row) return null;

  const submit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    const next: typeof errors = {};
    const value = Number(amount.replace(/[,\s₹]/g, ''));
    if (!amount.trim()) next.amount = 'Enter the amount received.';
    else if (!Number.isFinite(value) || value <= 0) next.amount = 'Enter an amount greater than zero.';
    else if (!/^\d+(\.\d{1,2})?$/.test(amount.replace(/[,\s₹]/g, ''))) next.amount = 'Use rupees and paise only, like 12500.50.';
    else if (value > row.balance + 0.001) next.amount = `This is more than the ${formatAmount(row.balance)} still due.`;
    if (!date) next.date = 'Choose the date the payment arrived.';
    else if (date > today) next.date = 'The payment date can’t be in the future.';
    else if (date < row.invoice.issueDate) next.date = 'The payment can’t be earlier than the invoice date.';
    setErrors(next);
    const first = next.amount ? 'amount' : next.date ? 'date' : null;
    if (first) {
      document.getElementById(`${id}-${first}`)?.focus();
      return;
    }
    onSubmitted(`${formatAmount(value)} by ${method} for ${row.invoice.number}`);
    onClose();
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
          ['Invoice total', formatAmount(row.totals.total)],
          ['Paid so far', formatAmount(row.paid)],
          ['Balance due', formatAmount(row.balance)],
        ].map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-3 bg-surface px-3 py-2.5 sm:block">
            <dt className="text-xs text-fg-muted">{label}</dt>
            <dd className="tabular font-semibold text-fg sm:mt-0.5">{value}</dd>
          </div>
        ))}
      </dl>

      <form id={formId} noValidate onSubmit={submit} className="mt-6 space-y-5">
        <Field id={`${id}-amount`} label="Amount received (₹)" error={errors.amount} hint="Defaults to the full balance due.">
          <input
            id={`${id}-amount`}
            inputMode="decimal"
            autoComplete="off"
            value={amount}
            onChange={(e: { target: { value: string } }) => {
              setAmount(e.target.value);
              setErrors((p) => ({ ...p, amount: undefined }));
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
                setErrors((p) => ({ ...p, date: undefined }));
              }}
              className={controlClass(!!errors.date)}
              aria-invalid={!!errors.date}
              aria-describedby={describedBy(`${id}-date`, errors.date)}
            />
          </Field>
          <Field id={`${id}-method`} label="Method">
            <select
              id={`${id}-method`}
              value={method}
              onChange={(e: { target: { value: string } }) => setMethod(e.target.value)}
              className={controlClass()}
            >
              {paymentMethods.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field id={`${id}-ref`} label="Reference" optional hint="UPI reference, cheque number or bank transaction ID.">
          <textarea
            id={`${id}-ref`}
            rows={2}
            value={reference}
            onChange={(e: { target: { value: string } }) => setReference(e.target.value)}
            className={textareaClass(false, 'min-h-16')}
            aria-describedby={`${id}-ref-hint`}
          />
        </Field>
      </form>

      <p className="mt-6 flex gap-2 rounded-[var(--radius-control)] bg-subtle px-3 py-2.5 text-sm text-fg-muted">
        <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        Design preview: the entry is checked, but payments are not saved yet. Invoice issued {formatDate(row.invoice.issueDate)}.
      </p>
    </Dialog>
  );
}
