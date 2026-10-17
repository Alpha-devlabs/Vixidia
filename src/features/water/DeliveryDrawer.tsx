import { useId, useRef, useState } from 'react';
import { ArrowLeft, CalendarClock, Info, PackageCheck, UserRound, CircleX } from 'lucide-react';
import type { WaterBook } from '../../types/water';
import { Dialog } from '../../components/Dialog';
import { Button } from '../../components/Button';
import { Field, controlClass, describedBy } from '../../components/forms';
import { addDays } from '../../utils/dates';
import { cn } from '../../utils/cn';
import { paiseToInput } from '../invoices/money';
import {
  accountOf,
  deliveryRows,
  failReasons,
  labelOf,
  latestRescheduleDate,
  money,
  orderText,
  parseQty,
  paymentMethods,
  previewCompletion,
  type CompletionInput,
  type FieldErrors,
} from './waterLogic';
import { Choice, DeliveryStatusBadge, PaymentBadge, shortDay } from './WaterBits';

export type DeliveryMode = 'details' | 'complete' | 'fail' | 'reschedule';
type Outcome = { ok: true } | { ok: false; errors: FieldErrors };

interface Props {
  book: WaterBook;
  deliveryId: string;
  initialMode: DeliveryMode;
  open: boolean;
  onClose: () => void;
  onComplete: (input: CompletionInput) => Outcome;
  onFail: (reason: string) => Outcome;
  onReschedule: (date: string) => Outcome;
  onOpenCustomer: (customerId: string) => void;
}

/**
 * One delivery: its details, and the forms to record it, mark it failed or move
 * it. The parent remounts this per opening, so every form starts fresh.
 */
export function DeliveryDrawer({ book, deliveryId, initialMode, open, onClose, onComplete, onFail, onReschedule, onOpenCustomer }: Props) {
  const [mode, setMode] = useState<DeliveryMode>(initialMode);
  const [justFailed, setJustFailed] = useState(false);
  const d = book.deliveries.find((x) => x.id === deliveryId);
  const row = d ? deliveryRows(book, d.date).find((r) => r.delivery.id === d.id) : undefined;
  if (!d || !row) return null;
  const actionable = d.status === 'scheduled' && d.date === book.today;
  // A mode that no longer applies (e.g. the delivery was completed) falls back to details.
  const current: DeliveryMode =
    mode === 'complete' || mode === 'fail' ? (actionable ? mode : 'details') : mode === 'reschedule' ? (d.status === 'scheduled' || d.status === 'failed' ? mode : 'details') : 'details';
  const back = initialMode === 'details' || justFailed ? () => setMode('details') : undefined;

  const titles: Record<DeliveryMode, string> = {
    details: row.customer.name,
    complete: `Record delivery: ${row.customer.name}`,
    fail: `Mark as failed: ${row.customer.name}`,
    reschedule: `Reschedule: ${row.customer.name}`,
  };
  const descriptions: Record<DeliveryMode, string> = {
    details: `${row.customer.locality} · ${d.date === book.today ? 'Today' : shortDay(d.date)}`,
    complete: `Planned: ${orderText(d.cans, d.cartons)}. Record what actually happened at the door.`,
    fail: 'No charge is created and no cans move.',
    reschedule: 'Moves this delivery to a later day. The original stays on its day as rescheduled.',
  };

  return (
    <Dialog open={open} onClose={onClose} variant="drawer" title={titles[current]} description={descriptions[current]} footer={null}>
      {current === 'details' ? (
        <Details book={book} deliveryId={d.id} onClose={onClose} onMode={setMode} onOpenCustomer={onOpenCustomer} />
      ) : current === 'complete' ? (
        <CompleteForm book={book} deliveryId={d.id} onCancel={back ?? onClose} cancelLabel={back ? 'Back' : 'Cancel'} onSave={onComplete} onDone={onClose} />
      ) : current === 'fail' ? (
        <FailForm
          onCancel={back ?? onClose}
          cancelLabel={back ? 'Back' : 'Cancel'}
          onSave={(reason) => {
            const r = onFail(reason);
            if (r.ok) {
              setJustFailed(true);
              setMode('reschedule');
            }
            return r;
          }}
        />
      ) : (
        <RescheduleForm today={book.today} justFailed={justFailed} onCancel={justFailed ? onClose : (back ?? onClose)} cancelLabel={justFailed ? 'Not now' : back ? 'Back' : 'Cancel'} onSave={onReschedule} onDone={onClose} />
      )}
    </Dialog>
  );
}

// ---------- Details ----------

function Details({ book, deliveryId, onClose, onMode, onOpenCustomer }: { book: WaterBook; deliveryId: string; onClose: () => void; onMode: (m: DeliveryMode) => void; onOpenCustomer: (id: string) => void }) {
  const d = book.deliveries.find((x) => x.id === deliveryId)!;
  const row = deliveryRows(book, d.date).find((r) => r.delivery.id === d.id)!;
  const acc = accountOf(book, d.customerId)!;
  const from = d.movedFrom ? book.deliveries.find((x) => x.id === d.movedFrom) : undefined;
  const c = d.completion;
  const actionable = d.status === 'scheduled' && d.date === book.today;

  const facts: [string, string][] = [
    ['Planned', orderText(d.cans, d.cartons)],
    ...(c
      ? ([
          ['Delivered', orderText(c.cans, c.cartons)],
          ['Empty cans collected', String(c.emptiesCollected)],
          ['Charge', money(row.charge)],
          ['Paid at the door', row.collected ? money(row.collected) : 'Nothing'],
        ] as [string, string][])
      : []),
    ...(d.status === 'scheduled' ? ([['Empty cans to collect', row.empties ? `About ${row.empties}` : 'None (customer holds no cans)']] as [string, string][]) : []),
    ...(d.failReason ? ([['Reason', labelOf(failReasons, d.failReason)]] as [string, string][]) : []),
    ...(from ? ([['Moved from', shortDay(from.date)]] as [string, string][]) : []),
  ];

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <DeliveryStatusBadge status={d.status} {...(row.movedToDate ? { movedTo: row.movedToDate } : {})} />
        {d.status === 'completed' ? <PaymentBadge state={row.payment} /> : null}
      </div>
      <dl className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2 text-sm">
        {facts.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-fg-muted">{k}</dt>
            <dd className="tabular text-right text-fg">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 rounded-[var(--radius-control)] border border-line bg-subtle/50 px-3 py-3">
        <p className="text-xs font-medium text-fg-muted">Customer account now</p>
        <dl className="mt-1.5 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-fg-muted">Balance owed</dt>
            <dd className={cn('tabular font-semibold', acc.balance > 0 ? 'text-danger-strong' : 'text-fg')}>{money(acc.balance)}</dd>
          </div>
          <div>
            <dt className="text-fg-muted">Cans held</dt>
            <dd className="tabular font-semibold text-fg">{acc.cansHeld}</dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-fg-muted">
          {acc.customer.phone}
          {acc.customer.address ? ` · ${acc.customer.address}` : ''}
        </p>
      </div>

      {d.status === 'completed' ? (
        <p className="mt-4 flex gap-2 text-sm text-fg-muted">
          <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          Completed deliveries are recorded once. Opening this again doesn’t change the charge or the can count.
        </p>
      ) : null}
      {d.status === 'scheduled' && d.date > book.today ? (
        <p className="mt-4 flex gap-2 text-sm text-fg-muted">
          <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          Scheduled for {shortDay(d.date)}. It can be recorded on that day.
        </p>
      ) : null}

      <div className="mt-6 flex flex-col gap-2 border-t border-line pt-5 sm:flex-row sm:flex-wrap sm:justify-end">
        <Button
          variant="subtle"
          onClick={() => {
            onClose();
            onOpenCustomer(d.customerId);
          }}
        >
          <UserRound size={16} aria-hidden="true" /> Open customer
        </Button>
        {actionable ? (
          <>
            <Button variant="secondary" onClick={() => onMode('fail')}>
              <CircleX size={16} aria-hidden="true" /> Mark failed
            </Button>
            <Button variant="secondary" onClick={() => onMode('reschedule')}>
              <CalendarClock size={16} aria-hidden="true" /> Reschedule
            </Button>
            <Button onClick={() => onMode('complete')}>
              <PackageCheck size={16} aria-hidden="true" /> Record delivery
            </Button>
          </>
        ) : d.status === 'failed' || (d.status === 'scheduled' && d.date > book.today) ? (
          <Button variant="secondary" onClick={() => onMode('reschedule')}>
            <CalendarClock size={16} aria-hidden="true" /> Reschedule
          </Button>
        ) : null}
      </div>
    </>
  );
}

// ---------- Record (complete) ----------

type QtyKey = 'cans' | 'cartons' | 'empties';

function CompleteForm({ book, deliveryId, onCancel, cancelLabel, onSave, onDone }: { book: WaterBook; deliveryId: string; onCancel: () => void; cancelLabel: string; onSave: (input: CompletionInput) => Outcome; onDone: () => void }) {
  const id = useId();
  const d = book.deliveries.find((x) => x.id === deliveryId)!;
  const row = deliveryRows(book, d.date).find((r) => r.delivery.id === d.id)!;
  const [values, setValues] = useState<CompletionInput>({ cans: String(d.cans), cartons: String(d.cartons), empties: String(row.empties), amount: '', method: 'upi' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const submitting = useRef(false);
  const p = previewCompletion(book, deliveryId, values);
  const cans = parseQty(values.cans);
  const cartons = parseQty(values.cartons);

  const set = (key: keyof CompletionInput, value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => {
      const next = { ...e };
      delete next[key];
      // Quantities change what is owed and how many cans can come back.
      if (key === 'cans' || key === 'cartons') {
        delete next.amount;
        delete next.cans;
        delete next.cartons;
      }
      delete next.delivery;
      return next;
    });
  };

  const submit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    const r = onSave(values);
    if (r.ok) {
      onDone();
      return;
    }
    submitting.current = false;
    setErrors(r.errors);
    const first = (['cans', 'cartons', 'empties', 'amount', 'method'] as const).find((k) => r.errors[k]);
    if (first) document.getElementById(`${id}-${first}`)?.focus();
  };

  const qty = (key: QtyKey, label: string, hint: string) => (
    <Field id={`${id}-${key}`} label={label} error={errors[key]} hint={hint}>
      <input
        id={`${id}-${key}`}
        inputMode="numeric"
        autoComplete="off"
        value={values[key]}
        onChange={(e: { target: { value: string } }) => set(key, e.target.value)}
        className={controlClass(!!errors[key], 'tabular')}
        aria-invalid={!!errors[key]}
        aria-describedby={describedBy(`${id}-${key}`, errors[key], true)}
      />
    </Field>
  );

  const thisCharge = p.charge;
  return (
    <form noValidate onSubmit={submit} className="space-y-5">
      {errors.delivery ? <p className="rounded-[var(--radius-control)] bg-danger-soft px-3 py-2 text-sm font-medium text-danger-strong">{errors.delivery}</p> : null}
      <div className="grid gap-4 sm:grid-cols-3">
        {qty('cans', 'Full cans delivered', `${money(book.pricing.canPaise)} per 20 L can`)}
        {qty('cartons', 'Cartons delivered', `${money(book.pricing.cartonPaise)} per carton`)}
        {qty('empties', 'Empty cans collected', `Holds ${p.cansBefore} · not charged`)}
      </div>

      <div className="rounded-[var(--radius-control)] border border-line bg-subtle/50 px-3 py-3" aria-live="polite">
        <p className="text-xs font-medium text-fg-muted">This delivery</p>
        <dl className="mt-1.5 grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 text-sm">
          <dt className="text-fg-muted">Charge {cans !== null && cartons !== null ? `(${orderText(cans, cartons)})` : ''}</dt>
          <dd className="tabular text-right font-semibold text-fg">{thisCharge === null ? '—' : money(thisCharge)}</dd>
          <dt className="text-fg-muted">Owed before this delivery</dt>
          <dd className="tabular text-right text-fg">{money(p.balanceBefore)}</dd>
          <dt className="text-fg-muted">Owed after, before payment</dt>
          <dd className="tabular text-right text-fg">{p.owedAfterCharge === null ? '—' : money(p.owedAfterCharge)}</dd>
          <dt className="text-fg-muted">Cans held</dt>
          <dd className="tabular text-right text-fg">
            {p.cansBefore} → {p.cansAfter === null || p.cansAfter < 0 ? '—' : p.cansAfter}
          </dd>
        </dl>
      </div>

      <Field
        id={`${id}-amount`}
        label="Payment received now"
        optional
        error={errors.amount}
        hint={p.owedAfterCharge !== null ? `Up to ${money(p.owedAfterCharge)}. Leave blank if nothing was paid.` : 'Leave blank if nothing was paid.'}
      >
        <div className="relative">
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fg-subtle" aria-hidden="true">
            ₹
          </span>
          <input
            id={`${id}-amount`}
            inputMode="decimal"
            autoComplete="off"
            value={values.amount}
            onChange={(e: { target: { value: string } }) => set('amount', e.target.value)}
            className={controlClass(!!errors.amount, 'tabular pl-7')}
            aria-invalid={!!errors.amount}
            aria-describedby={describedBy(`${id}-amount`, errors.amount, true)}
          />
        </div>
      </Field>
      {thisCharge ? (
        <div className="-mt-3 flex flex-wrap gap-2">
          <Button variant="subtle" size="sm" onClick={() => set('amount', paiseToInput(thisCharge))}>
            This delivery: {money(thisCharge)}
          </Button>
          {p.owedAfterCharge !== null && p.owedAfterCharge > thisCharge ? (
            <Button variant="subtle" size="sm" onClick={() => set('amount', paiseToInput(p.owedAfterCharge!))}>
              Full balance: {money(p.owedAfterCharge)}
            </Button>
          ) : null}
        </div>
      ) : null}
      {values.amount.trim() ? <Choice id={`${id}-method`} legend="Paid by" options={paymentMethods} value={values.method} onChange={(v) => set('method', v)} {...(errors.method ? { error: errors.method } : {})} /> : null}

      <div className="flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:justify-end">
        <Button variant="subtle" onClick={onCancel}>
          {cancelLabel === 'Back' ? <ArrowLeft size={16} aria-hidden="true" /> : null}
          {cancelLabel}
        </Button>
        <Button type="submit">
          <PackageCheck size={16} aria-hidden="true" /> Complete delivery
        </Button>
      </div>
      <p className="flex gap-2 text-xs text-fg-muted">
        <Info size={14} className="mt-px shrink-0" aria-hidden="true" />
        Demo only: no money is collected and no receipt is sent. Completing is recorded once and can’t be repeated.
      </p>
    </form>
  );
}

// ---------- Fail ----------

function FailForm({ onCancel, cancelLabel, onSave }: { onCancel: () => void; cancelLabel: string; onSave: (reason: string) => Outcome }) {
  const id = useId();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | undefined>();
  const submitting = useRef(false);
  const submit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    const r = onSave(reason);
    submitting.current = false;
    if (!r.ok) {
      setError(r.errors.reason ?? r.errors.delivery);
      document.getElementById(`${id}-reason`)?.focus();
    }
  };
  return (
    <form noValidate onSubmit={submit} className="space-y-5">
      <Choice
        id={`${id}-reason`}
        legend="What went wrong?"
        columns={2}
        options={failReasons}
        value={reason}
        onChange={(v) => {
          setReason(v);
          setError(undefined);
        }}
        {...(error ? { error } : {})}
      />
      <p className="text-sm text-fg-muted">You can reschedule it straight after.</p>
      <div className="flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:justify-end">
        <Button variant="subtle" onClick={onCancel}>
          {cancelLabel === 'Back' ? <ArrowLeft size={16} aria-hidden="true" /> : null}
          {cancelLabel}
        </Button>
        <Button type="submit" variant="destructive">
          <CircleX size={16} aria-hidden="true" /> Mark as failed
        </Button>
      </div>
    </form>
  );
}

// ---------- Reschedule ----------

function RescheduleForm({ today, justFailed, onCancel, cancelLabel, onSave, onDone }: { today: string; justFailed: boolean; onCancel: () => void; cancelLabel: string; onSave: (date: string) => Outcome; onDone: () => void }) {
  const id = useId();
  const [date, setDate] = useState(addDays(today, 1));
  const [error, setError] = useState<string | undefined>();
  const submitting = useRef(false);
  const submit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    const r = onSave(date);
    if (r.ok) {
      onDone();
      return;
    }
    submitting.current = false;
    setError(r.errors.date ?? r.errors.delivery);
    document.getElementById(`${id}-date`)?.focus();
  };
  const quick = [1, 2, 7].map((n) => addDays(today, n));
  return (
    <form noValidate onSubmit={submit} className="space-y-5">
      {justFailed ? (
        <p className="flex gap-2 rounded-[var(--radius-control)] bg-subtle px-3 py-2.5 text-sm text-fg">
          <Info size={16} className="mt-0.5 shrink-0 text-fg-muted" aria-hidden="true" />
          Marked as failed. Choose a new date, or reschedule later from the delivery list.
        </p>
      ) : null}
      <Field id={`${id}-date`} label="New delivery date" error={error} hint={`Tomorrow to ${shortDay(latestRescheduleDate(today))}.`}>
        <input
          id={`${id}-date`}
          type="date"
          value={date}
          min={addDays(today, 1)}
          max={latestRescheduleDate(today)}
          onChange={(e: { target: { value: string } }) => {
            setDate(e.target.value);
            setError(undefined);
          }}
          className={controlClass(!!error, 'tabular sm:max-w-56')}
          aria-invalid={!!error}
          aria-describedby={describedBy(`${id}-date`, error, true)}
        />
      </Field>
      <div className="-mt-2 flex flex-wrap gap-2" role="group" aria-label="Quick dates">
        {quick.map((q, i) => (
          <Button
            key={q}
            variant="subtle"
            size="sm"
            onClick={() => {
              setDate(q);
              setError(undefined);
            }}
          >
            {i === 0 ? 'Tomorrow' : i === 1 ? shortDay(q) : `In a week (${shortDay(q)})`}
          </Button>
        ))}
      </div>
      <div className="flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:justify-end">
        <Button variant="subtle" onClick={onCancel}>
          {cancelLabel === 'Back' ? <ArrowLeft size={16} aria-hidden="true" /> : null}
          {cancelLabel}
        </Button>
        <Button type="submit">
          <CalendarClock size={16} aria-hidden="true" /> Reschedule
        </Button>
      </div>
    </form>
  );
}
