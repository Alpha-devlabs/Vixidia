import { useId, useMemo, useRef, useState } from 'react';
import { Info, Search } from 'lucide-react';
import type { SalonBook } from '../../types/salon';
import { Dialog } from '../../components/Dialog';
import { Button } from '../../components/Button';
import { Field, controlClass, describedBy } from '../../components/forms';
import { cn } from '../../utils/cn';
import { categories, chosenServices, customerSummaries, formatDuration, formatTime, money, searchCustomers, snapshot, totalDuration, totalPrice, type BookingInput, type CustomerInput, type FieldErrors } from './salonLogic';
import { Choice, Initials } from './SalonBits';
import { SlotFields } from './SlotFields';

interface Props {
  book: SalonBook;
  initial: BookingInput;
  open: boolean;
  onClose: () => void;
  onSave: (input: BookingInput) => { ok: true } | { ok: false; errors: FieldErrors };
}

const MATCHES = 6;
const order = ['customer', 'name', 'phone', 'email', 'services', 'stylist', 'date', 'start'] as const;

/** New appointment: customer (existing or new), services, stylist, date and time. Remounted per opening. */
export function BookingDrawer({ book, initial, open, onClose, onSave }: Props) {
  const id = useId();
  const formId = `${id}-form`;
  const [values, setValues] = useState<BookingInput>(initial);
  const [query, setQuery] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const submitting = useRef(false);
  const all = useMemo(() => customerSummaries(book), [book]);
  const matches = searchCustomers(all, query).slice(0, MATCHES);
  const selected = all.find((s) => s.customer.id === values.customerId);
  const isNew = values.customerMode === 'new';
  const services = chosenServices(book, values.serviceIds);
  const items = snapshot(services);

  const clear = (...keys: (keyof FieldErrors)[]) =>
    setErrors((e) => {
      if (!keys.some((k) => k in e)) return e;
      const next = { ...e };
      for (const k of keys) delete next[k];
      return next;
    });
  const patch = (p: Partial<BookingInput>, ...keys: (keyof FieldErrors)[]) => {
    setValues((v) => ({ ...v, ...p }));
    clear(...keys);
  };
  const toggle = (serviceId: string) => {
    const ids = values.serviceIds.includes(serviceId) ? values.serviceIds.filter((x) => x !== serviceId) : [...values.serviceIds, serviceId];
    patch({ serviceIds: ids }, 'services', 'stylist', 'start');
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
    const first = order.find((k) => r.errors[k]);
    if (first) document.getElementById(`${id}-${first}`)?.focus();
  };

  const text = (key: 'name' | 'phone' | 'email', label: string, opts: { hint?: string; optional?: boolean; type?: string } = {}) => (
    <Field id={`${id}-${key}`} label={label} error={errors[key]} {...(opts.hint ? { hint: opts.hint } : {})} {...(opts.optional ? { optional: true } : {})}>
      <input
        id={`${id}-${key}`}
        type={opts.type ?? 'text'}
        autoComplete="off"
        value={values.customer[key]}
        onChange={(e: { target: { value: string } }) => {
          setValues((v) => ({ ...v, customer: { ...v.customer, [key]: e.target.value } as CustomerInput }));
          clear(key);
        }}
        className={controlClass(!!errors[key])}
        aria-invalid={!!errors[key]}
        aria-describedby={describedBy(`${id}-${key}`, errors[key], !!opts.hint)}
      />
    </Field>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      variant="drawer"
      title="New appointment"
      description={`Open ${formatTime(book.hours.open)}–${formatTime(book.hours.close)}, closed Tuesdays. Times are on the quarter hour.`}
      footer={
        <>
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId}>
            {isNew ? 'Add customer and book' : 'Book appointment'}
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={submit} className="space-y-6">
        <section aria-labelledby={`${id}-who`} className="space-y-4">
          <h3 id={`${id}-who`} className="text-sm font-semibold text-fg">
            Customer
          </h3>
          <Choice
            id={`${id}-mode`}
            legend="Who is it for?"
            columns={2}
            options={[
              { value: 'existing', label: 'Existing customer' },
              { value: 'new', label: 'New customer' },
            ]}
            value={values.customerMode}
            onChange={(m) => patch({ customerMode: m }, 'customer', 'name', 'phone', 'email', 'start')}
          />
          {isNew ? (
            <div className="space-y-4 rounded-[var(--radius-control)] border border-line p-4">
              {text('name', 'Name')}
              <div className="grid gap-4 sm:grid-cols-2">
                {text('phone', 'Phone', { type: 'tel', hint: 'Any country’s format. Use a made-up number.' })}
                {text('email', 'Email', { type: 'email', optional: true })}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {selected ? (
                <div className="flex items-center gap-3 rounded-[var(--radius-control)] border border-accent/40 bg-accent-soft/40 px-3 py-2.5">
                  <Initials name={selected.customer.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-fg">{selected.customer.name}</p>
                    <p className="tabular truncate text-xs text-fg-muted">
                      {selected.customer.phone} · {selected.visits} {selected.visits === 1 ? 'visit' : 'visits'}
                      {selected.favourite ? ` · usually ${selected.favourite}` : ''}
                    </p>
                  </div>
                </div>
              ) : null}
              <div className="relative">
                <label htmlFor={`${id}-search`} className="mb-1.5 block text-sm font-medium text-fg">
                  {selected ? 'Change customer' : 'Find customer'}
                </label>
                <Search size={16} className="pointer-events-none absolute bottom-3 left-3 text-fg-subtle" aria-hidden="true" />
                <input id={`${id}-search`} type="search" value={query} onChange={(e: { target: { value: string } }) => setQuery(e.target.value)} placeholder="Name, phone or email" className={controlClass(!!errors.customer && !selected, 'pl-9')} />
              </div>
              <fieldset aria-describedby={errors.customer ? `${id}-customer-error` : undefined}>
                <legend className="sr-only">Choose a customer</legend>
                <div id={`${id}-customer`} tabIndex={-1} className="divide-y divide-line rounded-[var(--radius-control)] border border-line">
                  {matches.length === 0 ? (
                    <div className="px-3 py-4 text-center text-sm text-fg-muted">
                      No customer matches.{' '}
                      <button type="button" onClick={() => patch({ customerMode: 'new' })} className="font-semibold text-accent-strong underline-offset-2 hover:underline">
                        Add them as a new customer
                      </button>
                    </div>
                  ) : (
                    matches.map((s) => (
                      <label key={s.customer.id} className={cn('flex cursor-pointer items-center gap-3 px-3 py-2 has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-[var(--focus)] has-[:focus-visible]:outline-solid', values.customerId === s.customer.id ? 'bg-accent-soft' : 'hover:bg-subtle/60')}>
                        <input type="radio" name={`${id}-customer`} checked={values.customerId === s.customer.id} onChange={() => patch({ customerId: s.customer.id }, 'customer', 'start')} className="h-4 w-4 shrink-0 accent-[var(--accent)]" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-fg">{s.customer.name}</span>
                          <span className="tabular block truncate text-xs text-fg-muted">
                            {s.customer.phone}
                            {s.favourite ? ` · ${s.favourite}` : ''}
                          </span>
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </fieldset>
              {errors.customer ? (
                <p id={`${id}-customer-error`} className="text-sm font-medium text-danger-strong">
                  {errors.customer}
                </p>
              ) : null}
            </div>
          )}
        </section>

        <section aria-labelledby={`${id}-what`} className="space-y-3 border-t border-line pt-5">
          <h3 id={`${id}-what`} className="text-sm font-semibold text-fg">
            Services
          </h3>
          <fieldset aria-describedby={errors.services ? `${id}-services-error` : undefined}>
            <legend className="sr-only">Choose one or more services</legend>
            <div id={`${id}-services`} tabIndex={-1} className="space-y-3">
              {categories.map((c) => (
                <div key={c.value}>
                  <p className="mb-1 text-xs font-semibold tracking-wide text-fg-muted uppercase">{c.label}</p>
                  <div className="grid gap-1.5">
                    {book.services
                      .filter((s) => s.category === c.value)
                      .map((s) => {
                        const on = values.serviceIds.includes(s.id);
                        return (
                          <label
                            key={s.id}
                            className={cn(
                              'flex cursor-pointer items-center gap-2.5 rounded-[var(--radius-control)] border px-3 py-2 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus)] has-[:focus-visible]:outline-solid',
                              on ? 'border-accent bg-accent-soft' : errors.services ? 'border-danger' : 'border-line hover:border-line-strong',
                            )}
                          >
                            <input type="checkbox" checked={on} onChange={() => toggle(s.id)} className="h-4 w-4 shrink-0 accent-[var(--accent)]" />
                            <span className="min-w-0 flex-1 text-fg">{s.name}</span>
                            <span className="tabular shrink-0 text-xs text-fg-muted">
                              {formatDuration(s.durationMin)} · {money(s.pricePaise).replace('.00', '')}
                            </span>
                          </label>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          </fieldset>
          {errors.services ? (
            <p id={`${id}-services-error`} className="text-sm font-medium text-danger-strong">
              {errors.services}
            </p>
          ) : null}
          <p className="tabular flex items-center justify-between rounded-[var(--radius-control)] bg-subtle px-3 py-2.5 text-sm" aria-live="polite">
            <span className="text-fg-muted">{items.length ? `${items.length} ${items.length === 1 ? 'service' : 'services'} · ${formatDuration(totalDuration(items))}` : 'No services chosen'}</span>
            <span className="font-semibold text-fg">{money(totalPrice(items))}</span>
          </p>
        </section>

        <section aria-labelledby={`${id}-when`} className="space-y-4 border-t border-line pt-5">
          <h3 id={`${id}-when`} className="text-sm font-semibold text-fg">
            When and with whom
          </h3>
          <SlotFields
            id={id}
            book={book}
            date={values.date}
            start={values.start}
            stylistId={values.stylistId}
            customerId={isNew ? '' : values.customerId}
            services={items}
            errors={errors}
            onChange={(k, v) => patch({ [k]: v } as Partial<BookingInput>, k === 'stylistId' ? 'stylist' : k, 'start')}
          />
        </section>
      </form>
      <p className="mt-6 flex gap-2 rounded-[var(--radius-control)] bg-subtle px-3 py-2.5 text-sm text-fg-muted">
        <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        Demo only: no confirmation is sent and nothing is kept after you reload. Prices are copied onto the appointment when it’s booked.
      </p>
    </Dialog>
  );
}
