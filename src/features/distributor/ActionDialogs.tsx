import { useId, useRef, useState, type ReactNode } from 'react';
import type { DistributorBook } from '../../types/distributor';
import { Dialog } from '../../components/Dialog';
import { Button } from '../../components/Button';
import { Field, controlClass, describedBy, textareaClass } from '../../components/forms';
import { cn } from '../../utils/cn';
import {
  adjustReasons,
  docOf,
  dueOf,
  money,
  orderRow,
  paymentMethods,
  payableDocs,
  productOf,
  purchaseRow,
  stockOf,
  unitText,
  units,
  type Errors,
} from './distributorLogic';
import { AmountInput, Choice, PayBadge, longDate } from './DistributorBits';

let requestCounter = 0;
/** A fresh id per form opening: the rules record an action once per id, so a double submit can't repeat it. */
export const newRequestId = () => `req-${Date.now().toString(36)}-${(requestCounter += 1)}`;

/** Asks before a consequential action (receive, deliver, cancel). Shows the rule's error if it refuses. */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  destructive,
  children,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  children?: ReactNode;
  onClose: () => void;
  onConfirm: () => { ok: true } | { ok: false; errors: Errors };
}) {
  const [error, setError] = useState<string | undefined>();
  const busy = useRef(false);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="subtle" onClick={onClose}>
            {error ? 'Close' : 'Go back'}
          </Button>
          {error ? null : (
            <Button
              variant={destructive ? 'destructive' : 'primary'}
              onClick={() => {
                if (busy.current) return;
                busy.current = true;
                const r = onConfirm();
                if (r.ok) onClose();
                else {
                  busy.current = false;
                  setError(Object.values(r.errors)[0]);
                }
              }}
            >
              {confirmLabel}
            </Button>
          )}
        </>
      }
    >
      {children}
      {error ? (
        <p role="alert" className="mt-4 rounded-[var(--radius-control)] bg-danger-soft px-3 py-2.5 text-sm font-medium text-danger-strong">
          {error}
        </p>
      ) : null}
    </Dialog>
  );
}

/** Records a payment from a customer (against a delivered order) or to a supplier (against a received purchase). */
export function PaymentDialog({
  book,
  direction: presetDirection,
  docId: presetDoc,
  open,
  onClose,
  onSave,
}: {
  book: DistributorBook;
  direction?: 'in' | 'out';
  docId?: string;
  open: boolean;
  onClose: () => void;
  onSave: (input: { direction: 'in' | 'out'; docId: string; amount: string; method: string; note: string; requestId: string }) => { ok: true } | { ok: false; errors: Errors };
}) {
  const id = useId();
  const formId = `${id}-form`;
  const [requestId] = useState(newRequestId);
  const [direction, setDirection] = useState<'in' | 'out'>(presetDirection ?? 'in');
  const docs = payableDocs(book, direction);
  const [docId, setDocId] = useState(presetDoc ?? (docs[0] ? docOf(docs[0]).id : ''));
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('upi');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const submitting = useRef(false);
  const order = direction === 'in' ? book.orders.find((o) => o.id === docId) : undefined;
  const purchase = direction === 'out' ? book.purchases.find((p) => p.id === docId) : undefined;
  const row = order ? orderRow(book, order) : purchase ? purchaseRow(book, purchase) : undefined;
  const doc = row ? docOf(row) : undefined;
  const paidSoFar = row ? ('received' in row ? row.received : row.paid) : 0;
  const fixed = !!presetDoc;

  const submit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    const r = onSave({ direction, docId, amount, method, note, requestId });
    if (r.ok) {
      onClose();
      return;
    }
    submitting.current = false;
    setErrors(r.errors);
    const first = (['doc', 'amount', 'method', 'note'] as const).find((k) => r.errors[k]);
    if (first) document.getElementById(`${id}-${first}`)?.focus();
  };

  const title = fixed && doc ? (direction === 'in' ? `Payment from ${doc.partyName}` : `Payment to ${doc.partyName}`) : 'Record payment';
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={direction === 'in' ? 'Money received from a customer against a delivered order.' : 'Money paid to a supplier against a received purchase.'}
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
        {errors.form ? <p className="rounded-[var(--radius-control)] bg-danger-soft px-3 py-2 text-sm font-medium text-danger-strong">{errors.form}</p> : null}
        {fixed ? null : (
          <>
            {presetDirection ? null : (
              <Choice
                id={`${id}-direction`}
                legend="Payment"
                columns={2}
                options={[
                  { value: 'in', label: 'From a customer' },
                  { value: 'out', label: 'To a supplier' },
                ]}
                value={direction}
                onChange={(v) => {
                  setDirection(v);
                  const first = payableDocs(book, v)[0];
                  setDocId(first ? docOf(first).id : '');
                  setErrors({});
                }}
              />
            )}
            <Field id={`${id}-doc`} label={direction === 'in' ? 'Order' : 'Purchase'} error={errors.doc} hint={docs.length ? 'Only balances still owed are listed, overdue first.' : 'Nothing is owed.'}>
              <select
                id={`${id}-doc`}
                value={docId}
                onChange={(e: { target: { value: string } }) => {
                  setDocId(e.target.value);
                  setErrors({});
                }}
                className={controlClass(!!errors.doc)}
                aria-describedby={describedBy(`${id}-doc`, errors.doc, true)}
              >
                {docs.map((r) => {
                  const d = docOf(r);
                  return (
                    <option key={d.id} value={d.id}>
                      {d.ref} · {d.partyName} · {money(r.balance)} due{r.overdue ? ' (overdue)' : ''}
                    </option>
                  );
                })}
              </select>
            </Field>
          </>
        )}
        {row && doc ? (
          <div className="rounded-[var(--radius-control)] bg-subtle px-3 py-2.5 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-fg">
                {doc.ref} · {doc.partyName}
              </span>
              <PayBadge state={row.pay} overdue={row.overdue} />
            </div>
            <dl className="tabular mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-0.5">
              <dt className="text-fg-muted">Total</dt>
              <dd className="text-right text-fg">{money(row.total)}</dd>
              <dt className="text-fg-muted">{direction === 'in' ? 'Received so far' : 'Paid so far'}</dt>
              <dd className="text-right text-fg">{money(paidSoFar)}</dd>
              <dt className="text-fg-muted">Still due{dueOf(row) ? ` (${row.overdue ? 'was due' : 'due'} ${longDate(dueOf(row)!)})` : ''}</dt>
              <dd className="text-right font-semibold text-fg">{money(row.balance)}</dd>
            </dl>
          </div>
        ) : null}
        <Field id={`${id}-amount`} label={direction === 'in' ? 'Amount received' : 'Amount paid'} error={errors.amount} hint={row ? `More than ₹0 and up to ${money(row.balance)}.` : undefined}>
          <AmountInput
            id={`${id}-amount`}
            value={amount}
            onChange={(v) => {
              setAmount(v);
              setErrors(({ amount: _a, ...rest }) => rest);
            }}
            invalid={!!errors.amount}
            describedBy={describedBy(`${id}-amount`, errors.amount, !!row)}
          />
        </Field>
        {row && row.balance > 0 ? (
          <div className="-mt-3">
            <Button variant="subtle" size="sm" onClick={() => setAmount((row.balance / 100).toFixed(2).replace(/\.00$/, ''))}>
              Full balance: {money(row.balance)}
            </Button>
          </div>
        ) : null}
        <Choice id={`${id}-method`} legend="Method" options={paymentMethods} value={method} onChange={(v) => setMethod(v)} {...(errors.method ? { error: errors.method } : {})} />
        <Field id={`${id}-note`} label="Note" optional error={errors.note} hint="For example a UPI or bank reference.">
          <input id={`${id}-note`} value={note} onChange={(e: { target: { value: string } }) => setNote(e.target.value)} className={controlClass(!!errors.note)} aria-describedby={describedBy(`${id}-note`, errors.note, true)} />
        </Field>
        <p className="text-xs text-fg-muted">Demo only: no money moves. Recorded payments can’t be edited or deleted here.</p>
      </form>
    </Dialog>
  );
}

/** Corrects stock up or down with a required reason; writes one movement. */
export function AdjustStockDialog({
  book,
  productId,
  open,
  onClose,
  onSave,
}: {
  book: DistributorBook;
  productId: string;
  open: boolean;
  onClose: () => void;
  onSave: (input: { productId: string; direction: 'in' | 'out' | ''; qty: string; reason: string; note: string; requestId: string }) => { ok: true } | { ok: false; errors: Errors };
}) {
  const id = useId();
  const formId = `${id}-form`;
  const [requestId] = useState(newRequestId);
  const [direction, setDirection] = useState<'in' | 'out' | ''>('');
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const submitting = useRef(false);
  const p = productOf(book, productId);
  if (!p) return null;
  const stock = stockOf(book, p.id);
  const n = /^\d+$/.test(qty.trim()) ? Number(qty.trim()) : null;
  const after = n !== null && direction ? stock + (direction === 'in' ? n : -n) : null;
  const reasons = adjustReasons.filter((r) => !direction || r.directions.includes(direction));

  const submit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    const r = onSave({ productId, direction, qty, reason, note, requestId });
    if (r.ok) {
      onClose();
      return;
    }
    submitting.current = false;
    setErrors(r.errors);
    const first = (['direction', 'qty', 'reason', 'note'] as const).find((k) => r.errors[k]);
    if (first) document.getElementById(`${id}-${first}`)?.focus();
  };
  const clear = (k: string) => setErrors(({ [k]: _x, ...rest }) => rest);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Adjust stock: ${p.name}`}
      description={`${p.sku} · ${unitText(p.unit, stock)} in stock now. Use this for counts, damage and other corrections, not for purchases or deliveries.`}
      footer={
        <>
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId}>
            Save adjustment
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={submit} className="space-y-5">
        {errors.form ? <p className="rounded-[var(--radius-control)] bg-danger-soft px-3 py-2 text-sm font-medium text-danger-strong">{errors.form}</p> : null}
        <Choice
          id={`${id}-direction`}
          legend="Stock goes"
          columns={2}
          options={[
            { value: 'in', label: 'Up (add)' },
            { value: 'out', label: 'Down (remove)' },
          ]}
          value={direction}
          onChange={(v) => {
            setDirection(v);
            clear('direction');
            if (reason && !adjustReasons.find((r) => r.value === reason)?.directions.includes(v)) setReason('');
          }}
          {...(errors.direction ? { error: errors.direction } : {})}
        />
        <Field id={`${id}-qty`} label={`Quantity (${units.find((u) => u.value === p.unit)!.plural})`} error={errors.qty} hint={after !== null ? `Stock after: ${unitText(p.unit, after)}${after < 0 ? ' — not allowed' : ''}` : 'Whole units only.'}>
          <input
            id={`${id}-qty`}
            inputMode="numeric"
            value={qty}
            onChange={(e: { target: { value: string } }) => {
              setQty(e.target.value);
              clear('qty');
            }}
            className={controlClass(!!errors.qty, 'tabular')}
            aria-invalid={!!errors.qty}
            aria-describedby={describedBy(`${id}-qty`, errors.qty, true)}
          />
        </Field>
        <Field id={`${id}-reason`} label="Reason" error={errors.reason}>
          <select
            id={`${id}-reason`}
            value={reason}
            onChange={(e: { target: { value: string } }) => {
              setReason(e.target.value);
              clear('reason');
            }}
            className={controlClass(!!errors.reason)}
            aria-invalid={!!errors.reason}
            aria-describedby={describedBy(`${id}-reason`, errors.reason)}
          >
            <option value="">Choose a reason…</option>
            {reasons.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </Field>
        <Field id={`${id}-note`} label="Note" optional={reason !== 'other'} error={errors.note}>
          <textarea
            id={`${id}-note`}
            rows={2}
            value={note}
            onChange={(e: { target: { value: string } }) => {
              setNote(e.target.value);
              clear('note');
            }}
            className={textareaClass(!!errors.note, 'min-h-16')}
            aria-invalid={!!errors.note}
            aria-describedby={describedBy(`${id}-note`, errors.note)}
          />
        </Field>
        <p className={cn('text-xs text-fg-muted')}>The adjustment is added to the stock movements with today’s date. It can’t be edited later; record another adjustment to correct it.</p>
      </form>
    </Dialog>
  );
}
