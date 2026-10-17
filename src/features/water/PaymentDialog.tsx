import { useId, useRef, useState } from 'react';
import type { WaterBook } from '../../types/water';
import { Dialog } from '../../components/Dialog';
import { Button } from '../../components/Button';
import { Field, controlClass, describedBy } from '../../components/forms';
import { paiseToInput } from '../invoices/money';
import { accountOf, accounts, money, paymentMethods, type FieldErrors } from './waterLogic';
import { Choice } from './WaterBits';

interface Props {
  book: WaterBook;
  /** Pre-selected customer, or '' to choose one. */
  customerId: string;
  open: boolean;
  onClose: () => void;
  onSave: (input: { customerId: string; amount: string; method: string }) => { ok: true } | { ok: false; errors: FieldErrors };
}

/** Records a payment against a customer's balance. The parent remounts it per opening. */
export function PaymentDialog({ book, customerId: initialCustomer, open, onClose, onSave }: Props) {
  const id = useId();
  const formId = `${id}-form`;
  const [customerId, setCustomerId] = useState(initialCustomer);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('upi');
  const [errors, setErrors] = useState<FieldErrors>({});
  const submitting = useRef(false);
  const acc = customerId ? accountOf(book, customerId) : undefined;
  const owing = accounts(book)
    .filter((a) => a.balance > 0 || a.customer.id === initialCustomer)
    .sort((a, b) => a.customer.name.localeCompare(b.customer.name));

  const clear = (k: keyof FieldErrors) =>
    setErrors((e) => {
      const next = { ...e };
      delete next[k];
      return next;
    });

  const submit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    const r = onSave({ customerId, amount, method });
    if (r.ok) {
      onClose();
      return;
    }
    submitting.current = false;
    setErrors(r.errors);
    const first = (['customer', 'amount', 'method'] as const).find((k) => r.errors[k]);
    if (first) document.getElementById(`${id}-${first}`)?.focus();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={acc && initialCustomer ? `Record payment: ${acc.customer.name}` : 'Record payment'}
      description="Reduces the customer’s balance once. Payments can’t be more than what is owed."
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
      <form id={formId} noValidate onSubmit={submit} className="space-y-5">
        {initialCustomer ? null : (
          <Field id={`${id}-customer`} label="Customer" error={errors.customer} hint="Customers with a balance owed.">
            <select
              id={`${id}-customer`}
              value={customerId}
              onChange={(e: { target: { value: string } }) => {
                setCustomerId(e.target.value);
                clear('customer');
                clear('amount');
              }}
              className={controlClass(!!errors.customer)}
              aria-invalid={!!errors.customer}
              aria-describedby={describedBy(`${id}-customer`, errors.customer, true)}
            >
              <option value="">Choose a customer…</option>
              {owing.map((a) => (
                <option key={a.customer.id} value={a.customer.id}>
                  {a.customer.name} — owes {money(a.balance)}
                </option>
              ))}
            </select>
          </Field>
        )}
        {acc ? (
          <p className="tabular flex items-center justify-between rounded-[var(--radius-control)] bg-subtle px-3 py-2.5 text-sm">
            <span className="text-fg-muted">Owed now</span>
            <span className="font-semibold text-fg">{money(acc.balance)}</span>
          </p>
        ) : null}
        <Field id={`${id}-amount`} label="Amount received" error={errors.amount} hint={acc ? `More than ₹0 and up to ${money(acc.balance)}.` : 'Choose a customer first.'}>
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fg-subtle" aria-hidden="true">
              ₹
            </span>
            <input
              id={`${id}-amount`}
              inputMode="decimal"
              autoComplete="off"
              value={amount}
              onChange={(e: { target: { value: string } }) => {
                setAmount(e.target.value);
                clear('amount');
              }}
              className={controlClass(!!errors.amount, 'tabular pl-7')}
              aria-invalid={!!errors.amount}
              aria-describedby={describedBy(`${id}-amount`, errors.amount, true)}
            />
          </div>
        </Field>
        {acc && acc.balance > 0 ? (
          <div className="-mt-3">
            <Button
              variant="subtle"
              size="sm"
              onClick={() => {
                setAmount(paiseToInput(acc.balance));
                clear('amount');
              }}
            >
              Full balance: {money(acc.balance)}
            </Button>
          </div>
        ) : null}
        <Choice
          id={`${id}-method`}
          legend="Paid by"
          options={paymentMethods}
          value={method}
          onChange={(v) => {
            setMethod(v);
            clear('method');
          }}
          {...(errors.method ? { error: errors.method } : {})}
        />
        <p className="text-xs text-fg-muted">Demo only: no money moves and no receipt is sent.</p>
      </form>
    </Dialog>
  );
}
