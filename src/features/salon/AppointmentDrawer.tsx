import { useId, useRef, useState } from 'react';
import { ArrowLeft, CalendarClock, CircleCheck, IndianRupee, Info, UserRound, CircleX } from 'lucide-react';
import type { SalonBook } from '../../types/salon';
import { Dialog } from '../../components/Dialog';
import { Button } from '../../components/Button';
import { cancelReasons, formatDuration, formatTime, labelOf, money, paymentFor, paymentMethods, rowFor, servicesText, type FieldErrors } from './salonLogic';
import { Choice, PayBadge, StatusBadge, longDate, shortDay } from './SalonBits';
import { SlotFields } from './SlotFields';

export type AppointmentMode = 'details' | 'checkout' | 'reschedule' | 'cancel' | 'pay';
type Outcome = { ok: true } | { ok: false; errors: FieldErrors };

interface Props {
  book: SalonBook;
  appointmentId: string;
  initialMode: AppointmentMode;
  open: boolean;
  onClose: () => void;
  onComplete: (payNow: { method: string } | null) => Outcome;
  onPay: (method: string) => Outcome;
  onReschedule: (input: { date: string; start: string; stylistId: string }) => Outcome;
  onCancel: (reason: string) => Outcome;
  onOpenCustomer: (id: string) => void;
}

/** One appointment: details, checkout, payment, reschedule and cancel. Remounted per opening. */
export function AppointmentDrawer({ book, appointmentId, initialMode, open, onClose, onComplete, onPay, onReschedule, onCancel, onOpenCustomer }: Props) {
  const [mode, setMode] = useState<AppointmentMode>(initialMode);
  const a = book.appointments.find((x) => x.id === appointmentId);
  const row = a ? rowFor(book, a) : undefined;
  if (!a || !row) return null;
  const booked = a.status === 'booked';
  const current: AppointmentMode = mode === 'pay' ? (row.pay === 'unpaid' ? 'pay' : 'details') : mode === 'details' ? 'details' : booked ? mode : 'details';
  const back = initialMode === 'details' ? () => setMode('details') : undefined;
  const titles: Record<AppointmentMode, string> = {
    details: row.customer.name,
    checkout: `Check out: ${row.customer.name}`,
    pay: `Take payment: ${row.customer.name}`,
    reschedule: `Reschedule: ${row.customer.name}`,
    cancel: `Cancel: ${row.customer.name}`,
  };
  const when = `${a.date === book.today ? 'Today' : shortDay(a.date)}, ${formatTime(a.start)}–${formatTime(row.end)}`;

  return (
    <Dialog open={open} onClose={onClose} variant="drawer" title={titles[current]} description={`${when} · ${row.stylist.name}`}>
      {current === 'details' ? <Details book={book} appointmentId={a.id} onMode={setMode} onClose={onClose} onOpenCustomer={onOpenCustomer} /> : null}
      {current === 'checkout' || current === 'pay' ? (
        <CheckoutForm book={book} appointmentId={a.id} payOnly={current === 'pay'} onCancel={back ?? onClose} back={!!back} onSave={current === 'pay' ? (m) => onPay(m!.method) : onComplete} onDone={onClose} />
      ) : null}
      {current === 'reschedule' ? <RescheduleForm book={book} appointmentId={a.id} onCancel={back ?? onClose} back={!!back} onSave={onReschedule} onDone={onClose} /> : null}
      {current === 'cancel' ? <CancelForm book={book} appointmentId={a.id} onCancel={back ?? onClose} back={!!back} onSave={onCancel} onDone={onClose} /> : null}
    </Dialog>
  );
}

function BackButton({ back, onClick, label = 'Cancel' }: { back: boolean; onClick: () => void; label?: string }) {
  return (
    <Button variant="subtle" onClick={onClick}>
      {back ? <ArrowLeft size={16} aria-hidden="true" /> : null}
      {back ? 'Back' : label}
    </Button>
  );
}

function Items({ book, appointmentId }: { book: SalonBook; appointmentId: string }) {
  const a = book.appointments.find((x) => x.id === appointmentId)!;
  const row = rowFor(book, a)!;
  return (
    <div className="overflow-hidden rounded-[var(--radius-control)] border border-line">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Booked services</caption>
        <thead className="bg-subtle/60 text-xs text-fg-muted">
          <tr>
            <th scope="col" className="px-3 py-2 font-medium">Service</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">Time</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">Price</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {a.services.map((s, i) => (
            <tr key={`${s.serviceId}${i}`}>
              <td className="px-3 py-2 text-fg">{s.name}</td>
              <td className="tabular px-3 py-2 text-right text-fg-muted">{formatDuration(s.durationMin)}</td>
              <td className="tabular px-3 py-2 text-right text-fg">{money(s.pricePaise)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t border-line bg-subtle/40">
          <tr>
            <th scope="row" className="px-3 py-2 font-semibold text-fg">
              Total
            </th>
            <td className="tabular px-3 py-2 text-right text-fg-muted">{formatDuration(row.duration)}</td>
            <td className="tabular px-3 py-2 text-right font-semibold text-fg">{money(row.total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function Details({ book, appointmentId, onMode, onClose, onOpenCustomer }: { book: SalonBook; appointmentId: string; onMode: (m: AppointmentMode) => void; onClose: () => void; onOpenCustomer: (id: string) => void }) {
  const a = book.appointments.find((x) => x.id === appointmentId)!;
  const row = rowFor(book, a)!;
  const payment = paymentFor(book, a.id);
  const future = a.date > book.today;
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={a.status} />
        <PayBadge state={row.pay} />
        {a.cancelReason ? <span className="text-xs text-fg-muted">{labelOf(cancelReasons, a.cancelReason)}</span> : null}
      </div>
      <div className="mt-4">
        <Items book={book} appointmentId={a.id} />
      </div>
      <dl className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-sm">
        <dt className="text-fg-muted">Customer</dt>
        <dd className="text-fg">
          {row.customer.name} · <span className="tabular">{row.customer.phone}</span>
        </dd>
        <dt className="text-fg-muted">Stylist</dt>
        <dd className="text-fg">
          {row.stylist.name}, {row.stylist.role.toLowerCase()}
        </dd>
        {a.movedFrom ? (
          <>
            <dt className="text-fg-muted">Moved from</dt>
            <dd className="text-fg">
              {shortDay(a.movedFrom.date)}, {formatTime(a.movedFrom.start)}
            </dd>
          </>
        ) : null}
        {payment ? (
          <>
            <dt className="text-fg-muted">Payment</dt>
            <dd className="tabular text-fg">
              {money(payment.amountPaise)} by {labelOf(paymentMethods, payment.method)} on {longDate(payment.date)}
            </dd>
          </>
        ) : null}
        {row.customer.notes ? (
          <>
            <dt className="text-fg-muted">Notes</dt>
            <dd className="text-fg">{row.customer.notes}</dd>
          </>
        ) : null}
      </dl>
      {a.status !== 'booked' ? (
        <p className="mt-4 flex gap-2 text-sm text-fg-muted">
          <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          {a.status === 'completed' ? 'Completed appointments are final: they can’t be moved or cancelled here.' : 'Cancelled appointments don’t count as work or revenue.'}
        </p>
      ) : future ? (
        <p className="mt-4 flex gap-2 text-sm text-fg-muted">
          <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          Check out becomes available on {longDate(a.date)}.
        </p>
      ) : null}
      <div className="mt-6 flex flex-col gap-2 border-t border-line pt-5 sm:flex-row sm:flex-wrap sm:justify-end">
        <Button
          variant="subtle"
          onClick={() => {
            onClose();
            onOpenCustomer(a.customerId);
          }}
        >
          <UserRound size={16} aria-hidden="true" /> Open customer
        </Button>
        {a.status === 'booked' ? (
          <>
            <Button variant="secondary" onClick={() => onMode('cancel')}>
              <CircleX size={16} aria-hidden="true" /> Cancel appointment
            </Button>
            <Button variant="secondary" onClick={() => onMode('reschedule')}>
              <CalendarClock size={16} aria-hidden="true" /> Reschedule
            </Button>
            {!future ? (
              <Button onClick={() => onMode('checkout')}>
                <CircleCheck size={16} aria-hidden="true" /> Check out
              </Button>
            ) : null}
          </>
        ) : row.pay === 'unpaid' ? (
          <Button onClick={() => onMode('pay')}>
            <IndianRupee size={16} aria-hidden="true" /> Take payment
          </Button>
        ) : null}
      </div>
    </>
  );
}

function CheckoutForm({ book, appointmentId, payOnly, onCancel, back, onSave, onDone }: { book: SalonBook; appointmentId: string; payOnly: boolean; onCancel: () => void; back: boolean; onSave: (payNow: { method: string } | null) => Outcome; onDone: () => void }) {
  const id = useId();
  const [when, setWhen] = useState<'now' | 'later'>('now');
  const [method, setMethod] = useState('upi');
  const [errors, setErrors] = useState<FieldErrors>({});
  const submitting = useRef(false);
  const row = rowFor(book, book.appointments.find((x) => x.id === appointmentId)!)!;
  const submit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    const r = onSave(payOnly || when === 'now' ? { method } : null);
    if (r.ok) {
      onDone();
      return;
    }
    submitting.current = false;
    setErrors(r.errors);
  };
  return (
    <form noValidate onSubmit={submit} className="space-y-5">
      {errors.appointment ? <p className="rounded-[var(--radius-control)] bg-danger-soft px-3 py-2 text-sm font-medium text-danger-strong">{errors.appointment}</p> : null}
      <Items book={book} appointmentId={appointmentId} />
      {payOnly ? null : (
        <Choice
          id={`${id}-when`}
          legend="Payment"
          columns={2}
          options={[
            { value: 'now', label: `Paid now: ${money(row.total)}` },
            { value: 'later', label: 'Pay later' },
          ]}
          value={when}
          onChange={(v) => setWhen(v)}
        />
      )}
      {payOnly || when === 'now' ? <Choice id={`${id}-method`} legend="Paid by" options={paymentMethods} value={method} onChange={(v) => setMethod(v)} {...(errors.method ? { error: errors.method } : {})} /> : null}
      <p className="text-sm text-fg-muted">{payOnly ? `Records full payment of ${money(row.total)}, once.` : when === 'now' ? `Marks the appointment completed and records full payment of ${money(row.total)}.` : 'Marks the appointment completed and leaves it unpaid. You can take payment later.'}</p>
      <div className="flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:justify-end">
        <BackButton back={back} onClick={onCancel} />
        <Button type="submit">
          <CircleCheck size={16} aria-hidden="true" /> {payOnly ? 'Record payment' : 'Complete appointment'}
        </Button>
      </div>
      <p className="flex gap-2 text-xs text-fg-muted">
        <Info size={14} className="mt-px shrink-0" aria-hidden="true" />
        Demo only: no money is collected and no receipt is sent.
      </p>
    </form>
  );
}

function RescheduleForm({ book, appointmentId, onCancel, back, onSave, onDone }: { book: SalonBook; appointmentId: string; onCancel: () => void; back: boolean; onSave: (input: { date: string; start: string; stylistId: string }) => Outcome; onDone: () => void }) {
  const id = useId();
  const a = book.appointments.find((x) => x.id === appointmentId)!;
  const [values, setValues] = useState({ date: a.date, start: a.start, stylistId: a.stylistId });
  const [errors, setErrors] = useState<FieldErrors>({});
  const submitting = useRef(false);
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
    const first = (['stylist', 'date', 'start'] as const).find((k) => r.errors[k]);
    if (first) document.getElementById(`${id}-${first}`)?.focus();
  };
  return (
    <form noValidate onSubmit={submit} className="space-y-5">
      {errors.appointment ? <p className="rounded-[var(--radius-control)] bg-danger-soft px-3 py-2 text-sm font-medium text-danger-strong">{errors.appointment}</p> : null}
      <p className="text-sm text-fg-muted">
        {servicesText(a.services)} · {formatDuration(a.services.reduce((s, x) => s + x.durationMin, 0))}. Services and prices stay as booked.
      </p>
      <SlotFields
        id={id}
        book={book}
        date={values.date}
        start={values.start}
        stylistId={values.stylistId}
        customerId={a.customerId}
        services={a.services}
        ignoreId={a.id}
        errors={errors}
        onChange={(k, v) => {
          setValues((x) => ({ ...x, [k]: v }));
          setErrors({});
        }}
      />
      <div className="flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:justify-end">
        <BackButton back={back} onClick={onCancel} />
        <Button type="submit">
          <CalendarClock size={16} aria-hidden="true" /> Reschedule
        </Button>
      </div>
    </form>
  );
}

function CancelForm({ book, appointmentId, onCancel, back, onSave, onDone }: { book: SalonBook; appointmentId: string; onCancel: () => void; back: boolean; onSave: (reason: string) => Outcome; onDone: () => void }) {
  const id = useId();
  const a = book.appointments.find((x) => x.id === appointmentId)!;
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | undefined>();
  const submitting = useRef(false);
  const options = cancelReasons.filter((r) => r.value !== 'no_show' || a.date <= book.today);
  const submit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    const r = onSave(reason);
    if (r.ok) {
      onDone();
      return;
    }
    submitting.current = false;
    setError(r.errors.reason ?? r.errors.appointment);
    document.getElementById(`${id}-reason`)?.focus();
  };
  return (
    <form noValidate onSubmit={submit} className="space-y-5">
      <Choice
        id={`${id}-reason`}
        legend="Why is it cancelled?"
        columns={options.length === 3 ? 3 : 2}
        options={options}
        value={reason}
        onChange={(v) => {
          setReason(v);
          setError(undefined);
        }}
        {...(error ? { error } : {})}
      />
      <p className="text-sm text-fg-muted">The time becomes free again. Cancelled appointments aren’t charged and can’t be reopened in this demo.</p>
      <div className="flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:justify-end">
        <BackButton back={back} onClick={onCancel} label="Keep appointment" />
        <Button type="submit" variant="destructive">
          <CircleX size={16} aria-hidden="true" /> Cancel appointment
        </Button>
      </div>
    </form>
  );
}
