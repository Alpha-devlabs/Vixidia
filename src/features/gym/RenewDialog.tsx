import { useId, useRef, useState } from 'react';
import type { GymBook } from '../../types/gym';
import { Dialog } from '../../components/Dialog';
import { Button } from '../../components/Button';
import { Field, describedBy } from '../../components/forms';
import { money, paymentMethods, previewRenewal, renewalBlock, rowOf, type FieldErrors, type RenewInput } from './gymLogic';
import { AmountInput, Choice, StatusBadge, longDate, shortDay } from './GymBits';

interface Props {
  book: GymBook;
  memberId: string;
  open: boolean;
  onClose: () => void;
  onSave: (input: RenewInput) => { ok: true } | { ok: false; errors: FieldErrors };
}

/** Renew a membership once. Shows exactly when the new period starts and why. Remounted per opening. */
export function RenewDialog({ book, memberId, open, onClose, onSave }: Props) {
  const id = useId();
  const formId = `${id}-form`;
  const row = rowOf(book, memberId);
  const [values, setValues] = useState<RenewInput>({ planId: row?.shown?.planId ?? 'monthly', amount: '', method: 'upi' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const submitting = useRef(false);
  if (!row) return null;
  const block = renewalBlock(book, memberId);
  const p = previewRenewal(book, memberId, values.planId);

  const set = (key: keyof RenewInput, value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors({});
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
    const first = (['plan', 'amount', 'method'] as const).find((k) => r.errors[k]);
    if (first) document.getElementById(`${id}-${first}`)?.focus();
  };

  const info = row.info;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Renew: ${row.member.name}`}
      description="Creates one new membership and one charge."
      footer={
        <>
          <Button variant="subtle" onClick={onClose}>
            {block ? 'Close' : 'Cancel'}
          </Button>
          {block ? null : (
            <Button type="submit" form={formId}>
              Renew membership
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-control)] border border-line px-3 py-2.5 text-sm">
        <span className="text-fg-muted">
          Now:{' '}
          {info.validUntil
            ? `valid until ${longDate(info.validUntil)}`
            : info.status === 'expired'
              ? `expired on ${longDate(info.latest!.end)}`
              : info.next
                ? `starts on ${longDate(info.next.start)}`
                : 'no membership'}
        </span>
        <StatusBadge status={info.status} />
      </div>

      {block || errors.renewal ? (
        <p className="mt-4 rounded-[var(--radius-control)] bg-warning-soft px-3 py-2.5 text-sm font-medium text-warning-strong">{errors.renewal ?? block}</p>
      ) : (
        <form id={formId} noValidate onSubmit={submit} className="mt-5 space-y-5">
          <Choice
            id={`${id}-plan`}
            legend="Plan"
            columns={4}
            options={book.plans.map((pl) => ({ value: pl.id, label: pl.name, hint: money(pl.pricePaise).replace('.00', '') }))}
            value={values.planId}
            onChange={(v) => set('planId', v)}
            {...(errors.plan ? { error: errors.plan } : {})}
          />
          {p ? (
            <div className="rounded-[var(--radius-control)] bg-subtle px-3 py-3 text-sm" aria-live="polite">
              <p className="font-semibold text-fg">
                {shortDay(p.start)} – {shortDay(p.end)}
              </p>
              <p className="mt-0.5 text-fg-muted">
                {p.from === 'expiry' ? 'Starts the day after the current membership ends, so no paid days are lost.' : 'The membership has expired, so the new one starts today.'}
              </p>
              <dl className="tabular mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1">
                <dt className="text-fg-muted">Charge</dt>
                <dd className="text-right text-fg">{money(p.charge)}</dd>
                <dt className="text-fg-muted">Owed before</dt>
                <dd className="text-right text-fg">{money(p.balanceBefore)}</dd>
                <dt className="text-fg-muted">Owed after renewal</dt>
                <dd className="text-right font-semibold text-fg">{money(p.owedAfter)}</dd>
              </dl>
            </div>
          ) : null}
          <Field id={`${id}-amount`} label="Payment received now" optional error={errors.amount} hint={p ? `Up to ${money(p.owedAfter)}. Leave blank if they’ll pay later.` : undefined}>
            <AmountInput id={`${id}-amount`} value={values.amount} onChange={(v) => set('amount', v)} invalid={!!errors.amount} {...(describedBy(`${id}-amount`, errors.amount, true) ? { describedBy: describedBy(`${id}-amount`, errors.amount, true)! } : {})} />
          </Field>
          {p ? (
            <div className="-mt-3 flex flex-wrap gap-2">
              <Button variant="subtle" size="sm" onClick={() => set('amount', String(p.charge / 100))}>
                This renewal: {money(p.charge)}
              </Button>
              {p.owedAfter > p.charge ? (
                <Button variant="subtle" size="sm" onClick={() => set('amount', (p.owedAfter / 100).toFixed(2).replace(/\.00$/, ''))}>
                  Full balance: {money(p.owedAfter)}
                </Button>
              ) : null}
            </div>
          ) : null}
          {values.amount.trim() ? <Choice id={`${id}-method`} legend="Paid by" options={paymentMethods} value={values.method} onChange={(v) => set('method', v)} {...(errors.method ? { error: errors.method } : {})} /> : null}
        </form>
      )}
    </Dialog>
  );
}
