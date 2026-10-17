import { useId, useRef, useState } from 'react';
import type { GymBook } from '../../types/gym';
import { Dialog } from '../../components/Dialog';
import { Button } from '../../components/Button';
import { Field, controlClass, describedBy } from '../../components/forms';
import { ledgerOf, memberRows, money, paymentMethods, type FieldErrors } from './gymLogic';
import { AmountInput, Choice } from './GymBits';

interface Props {
  book: GymBook;
  /** Pre-selected member, or '' to choose one. */
  memberId: string;
  open: boolean;
  onClose: () => void;
  onSave: (input: { memberId: string; amount: string; method: string }) => { ok: true } | { ok: false; errors: FieldErrors };
}

/** Records a membership payment against a member's balance. Remounted per opening. */
export function PaymentDialog({ book, memberId: initial, open, onClose, onSave }: Props) {
  const id = useId();
  const formId = `${id}-form`;
  const [memberId, setMemberId] = useState(initial);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('upi');
  const [errors, setErrors] = useState<FieldErrors>({});
  const submitting = useRef(false);
  const owed = memberId ? ledgerOf(book, memberId).balance : 0;
  const preset = book.members.find((m) => m.id === initial);
  const owing = memberRows(book).filter((r) => r.ledger.balance > 0 || r.member.id === initial);

  const submit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    const r = onSave({ memberId, amount, method });
    if (r.ok) {
      onClose();
      return;
    }
    submitting.current = false;
    setErrors(r.errors);
    const first = (['member', 'amount', 'method'] as const).find((k) => r.errors[k]);
    if (first) document.getElementById(`${id}-${first}`)?.focus();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={preset ? `Record payment: ${preset.name}` : 'Record payment'}
      description="Reduces the member’s balance once. It can’t be more than what is owed."
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
        {preset ? null : (
          <Field id={`${id}-member`} label="Member" error={errors.member} hint="Members with a balance owed.">
            <select
              id={`${id}-member`}
              value={memberId}
              onChange={(e: { target: { value: string } }) => {
                setMemberId(e.target.value);
                setErrors({});
              }}
              className={controlClass(!!errors.member)}
              aria-invalid={!!errors.member}
              aria-describedby={describedBy(`${id}-member`, errors.member, true)}
            >
              <option value="">Choose a member…</option>
              {owing.map((r) => (
                <option key={r.member.id} value={r.member.id}>
                  {r.member.name} — owes {money(r.ledger.balance)}
                </option>
              ))}
            </select>
          </Field>
        )}
        {memberId ? (
          <p className="tabular flex items-center justify-between rounded-[var(--radius-control)] bg-subtle px-3 py-2.5 text-sm">
            <span className="text-fg-muted">Owed now</span>
            <span className="font-semibold text-fg">{money(owed)}</span>
          </p>
        ) : null}
        <Field id={`${id}-amount`} label="Amount received" error={errors.amount} hint={memberId ? `More than ₹0 and up to ${money(owed)}.` : 'Choose a member first.'}>
          <AmountInput
            id={`${id}-amount`}
            value={amount}
            onChange={(v) => {
              setAmount(v);
              setErrors((e) => ({ ...(e.method ? { method: e.method } : {}) }));
            }}
            invalid={!!errors.amount}
            describedBy={describedBy(`${id}-amount`, errors.amount, true)!}
          />
        </Field>
        {owed > 0 ? (
          <div className="-mt-3">
            <Button variant="subtle" size="sm" onClick={() => setAmount((owed / 100).toFixed(2).replace(/\.00$/, ''))}>
              Full balance: {money(owed)}
            </Button>
          </div>
        ) : null}
        <Choice id={`${id}-method`} legend="Paid by" options={paymentMethods} value={method} onChange={(v) => setMethod(v)} {...(errors.method ? { error: errors.method } : {})} />
        <p className="text-xs text-fg-muted">Demo only: no money moves and no receipt is sent.</p>
      </form>
    </Dialog>
  );
}
