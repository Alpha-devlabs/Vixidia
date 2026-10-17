import { useId, useMemo, useRef, useState } from 'react';
import { Info, Search, UserPlus, UserRound } from 'lucide-react';
import type { WaterBook } from '../../types/water';
import { Dialog } from '../../components/Dialog';
import { Button } from '../../components/Button';
import { Field, controlClass, describedBy } from '../../components/forms';
import { addDays } from '../../utils/dates';
import { cn } from '../../utils/cn';
import {
  MAX_ORDER_DAYS,
  accounts,
  filterAccounts,
  money,
  orderText,
  parseQty,
  recurringText,
  suggestedQuantity,
  type CustomerInput,
  type FieldErrors,
  type OrderInput,
} from './waterLogic';
import { Choice, Initials, shortDay } from './WaterBits';

interface Props {
  book: WaterBook;
  initial: OrderInput;
  open: boolean;
  onClose: () => void;
  /** Validates and adds the order (and the new customer, if any); returns errors if rejected. */
  onSave: (input: OrderInput) => { ok: true } | { ok: false; errors: FieldErrors };
}

const MATCHES = 6;
const customerKeys = ['name', 'phone', 'locality', 'address'] as const;
type CustomerKey = (typeof customerKeys)[number];
/** Order used to move focus to the first problem. */
const order = ['customer', 'name', 'phone', 'locality', 'address', 'date', 'cans', 'cartons'] as const;

/**
 * Add an order: choose an existing customer (search by name, area or phone) or
 * add a new one in the same form, then the day and quantity. The parent
 * remounts it per opening, so it always starts fresh.
 */
export function OrderDrawer({ book, initial, open, onClose, onSave }: Props) {
  const id = useId();
  const formId = `${id}-form`;
  const [values, setValues] = useState<OrderInput>(initial);
  const [query, setQuery] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const submitting = useRef(false);
  const all = useMemo(() => accounts(book), [book]);
  const selected = all.find((a) => a.customer.id === values.customerId);
  const matches = useMemo(() => filterAccounts(all, 'active', query).slice(0, MATCHES), [all, query]);
  const isNew = values.customerMode === 'new';

  const clear = (...keys: (keyof FieldErrors)[]) =>
    setErrors((e) => {
      if (!keys.some((k) => k in e)) return e;
      const next = { ...e };
      for (const k of keys) delete next[k];
      return next;
    });

  const pick = (customerId: string) => {
    const c = book.customers.find((x) => x.id === customerId);
    setValues((v) => ({ ...v, customerId, ...suggestedQuantity(c) }));
    clear('customer', 'date', 'cans', 'cartons');
  };
  const setMode = (mode: OrderInput['customerMode']) => {
    setValues((v) => ({ ...v, customerMode: mode, ...(mode === 'new' ? suggestedQuantity(undefined) : suggestedQuantity(book.customers.find((c) => c.id === v.customerId))) }));
    setErrors({});
  };
  const setCustomer = (key: CustomerKey, value: string) => {
    setValues((v) => ({ ...v, customer: { ...v.customer, [key]: value } as CustomerInput }));
    clear(key);
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

  const cans = parseQty(values.cans);
  const cartons = parseQty(values.cartons);
  const estimate = cans !== null && cartons !== null && cans + cartons > 0 ? cans * book.pricing.canPaise + cartons * book.pricing.cartonPaise : null;
  const quickDays = [0, 1, 2].map((n) => addDays(book.today, n));

  const qty = (key: 'cans' | 'cartons', label: string, hint: string) => (
    <Field id={`${id}-${key}`} label={label} error={errors[key]} hint={hint}>
      <input
        id={`${id}-${key}`}
        inputMode="numeric"
        autoComplete="off"
        value={values[key]}
        onChange={(e: { target: { value: string } }) => {
          setValues((v) => ({ ...v, [key]: e.target.value }));
          clear('cans', 'cartons');
        }}
        className={controlClass(!!errors[key], 'tabular')}
        aria-invalid={!!errors[key]}
        aria-describedby={describedBy(`${id}-${key}`, errors[key], true)}
      />
    </Field>
  );

  const text = (key: CustomerKey, label: string, opts: { hint?: string; optional?: boolean; type?: string } = {}) => (
    <Field id={`${id}-${key}`} label={label} error={errors[key]} {...(opts.hint ? { hint: opts.hint } : {})} {...(opts.optional ? { optional: true } : {})}>
      <input
        id={`${id}-${key}`}
        type={opts.type ?? 'text'}
        autoComplete="off"
        value={values.customer[key]}
        onChange={(e: { target: { value: string } }) => setCustomer(key, e.target.value)}
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
      title="Add order"
      description="Plan a delivery for an existing customer, or add a new customer as you take the order."
      footer={
        <>
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId}>
            {isNew ? 'Add customer and order' : 'Add order'}
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
            legend="Who is the order for?"
            columns={2}
            options={[
              { value: 'existing', label: 'Existing customer', icon: UserRound },
              { value: 'new', label: 'New customer', icon: UserPlus },
            ]}
            value={values.customerMode}
            onChange={setMode}
          />

          {isNew ? (
            <div className="space-y-4 rounded-[var(--radius-control)] border border-line p-4">
              {text('name', 'Name', { hint: 'A person, household or business.' })}
              {text('phone', 'Phone', { type: 'tel', hint: 'Use a made-up number in this demo.' })}
              <div className="grid gap-4 sm:grid-cols-2">
                {text('locality', 'Locality', { hint: 'Area used to plan the round.' })}
                {text('address', 'Address', { optional: true })}
              </div>
              <p className="text-xs text-fg-muted">Starts active, with no balance and no cans. Add a regular order later from Customers.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {selected ? (
                <div className="flex items-center gap-3 rounded-[var(--radius-control)] border border-accent/40 bg-accent-soft/40 px-3 py-2.5">
                  <Initials name={selected.customer.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-fg">{selected.customer.name}</p>
                    <p className="tabular truncate text-xs text-fg-muted">
                      {selected.customer.locality} · {selected.customer.phone}
                    </p>
                    <p className="tabular text-xs text-fg-muted">
                      {recurringText(selected.customer.recurring)} · holds {selected.cansHeld} · owes {money(selected.balance)}
                    </p>
                  </div>
                </div>
              ) : null}
              <div className="relative">
                <label htmlFor={`${id}-search`} className="mb-1.5 block text-sm font-medium text-fg">
                  {selected ? 'Change customer' : 'Find customer'}
                </label>
                <Search size={16} className="pointer-events-none absolute bottom-3 left-3 text-fg-subtle" aria-hidden="true" />
                <input
                  id={`${id}-search`}
                  type="search"
                  value={query}
                  onChange={(e: { target: { value: string } }) => setQuery(e.target.value)}
                  placeholder="Name, area or phone"
                  className={controlClass(!!errors.customer && !selected, 'pl-9')}
                  aria-controls={`${id}-customer`}
                />
              </div>
              <fieldset aria-describedby={errors.customer ? `${id}-customer-error` : `${id}-customer-hint`}>
                <legend className="sr-only">Choose a customer</legend>
                <div id={`${id}-customer`} tabIndex={-1} className="divide-y divide-line rounded-[var(--radius-control)] border border-line" aria-live="polite">
                  {matches.length === 0 ? (
                    <div className="px-3 py-4 text-center text-sm text-fg-muted">
                      No active customer matches.{' '}
                      <button type="button" onClick={() => setMode('new')} className="font-semibold text-accent-strong underline-offset-2 hover:underline">
                        Add them as a new customer
                      </button>
                    </div>
                  ) : (
                    matches.map((a) => {
                      const checked = values.customerId === a.customer.id;
                      return (
                        <label
                          key={a.customer.id}
                          className={cn(
                            'flex cursor-pointer items-center gap-3 px-3 py-2 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-[var(--focus)] has-[:focus-visible]:outline-solid',
                            checked ? 'bg-accent-soft' : 'hover:bg-subtle/60',
                          )}
                        >
                          <input type="radio" name={`${id}-customer`} value={a.customer.id} checked={checked} onChange={() => pick(a.customer.id)} className="h-4 w-4 shrink-0 accent-[var(--accent)]" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-fg">{a.customer.name}</span>
                            <span className="block truncate text-xs text-fg-muted">
                              {a.customer.locality} · {a.customer.recurring ? orderText(a.customer.recurring.cans, a.customer.recurring.cartons) + ' usually' : 'No regular order'}
                            </span>
                          </span>
                          {a.balance > 0 ? <span className="tabular shrink-0 text-xs font-semibold text-danger-strong">owes {money(a.balance)}</span> : null}
                        </label>
                      );
                    })
                  )}
                </div>
              </fieldset>
              {errors.customer ? (
                <p id={`${id}-customer-error`} className="text-sm font-medium text-danger-strong">
                  {errors.customer}
                </p>
              ) : (
                <p id={`${id}-customer-hint`} className="text-xs text-fg-muted">
                  Active customers only{query.trim() ? '' : `, A–Z; type to search all ${all.filter((a) => a.customer.status === 'active').length}`}. Not listed? Choose New customer.
                </p>
              )}
            </div>
          )}
        </section>

        <section aria-labelledby={`${id}-what`} className="space-y-4 border-t border-line pt-5">
          <h3 id={`${id}-what`} className="text-sm font-semibold text-fg">
            Delivery
          </h3>
          <Field id={`${id}-date`} label="Delivery date" error={errors.date} hint={`Today to ${shortDay(addDays(book.today, MAX_ORDER_DAYS))}.`}>
            <input
              id={`${id}-date`}
              type="date"
              value={values.date}
              min={book.today}
              max={addDays(book.today, MAX_ORDER_DAYS)}
              onChange={(e: { target: { value: string } }) => {
                setValues((v) => ({ ...v, date: e.target.value }));
                clear('date');
              }}
              className={controlClass(!!errors.date, 'tabular sm:max-w-56')}
              aria-invalid={!!errors.date}
              aria-describedby={describedBy(`${id}-date`, errors.date, true)}
            />
          </Field>
          <div className="-mt-2 flex flex-wrap gap-2" role="group" aria-label="Quick dates">
            {quickDays.map((d, i) => (
              <Button
                key={d}
                variant={values.date === d ? 'secondary' : 'subtle'}
                size="sm"
                onClick={() => {
                  setValues((v) => ({ ...v, date: d }));
                  clear('date');
                }}
                aria-pressed={values.date === d}
              >
                {i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : shortDay(d)}
              </Button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {qty('cans', 'Full cans (20 L)', `${money(book.pricing.canPaise)} each`)}
            {qty('cartons', 'Cartons (12 × 1 L)', `${money(book.pricing.cartonPaise)} each`)}
          </div>
          <p className="tabular flex items-center justify-between rounded-[var(--radius-control)] bg-subtle px-3 py-2.5 text-sm" aria-live="polite">
            <span className="text-fg-muted">Charged when delivered</span>
            <span className="font-semibold text-fg">{estimate === null ? '—' : money(estimate)}</span>
          </p>
        </section>
      </form>
      <p className="mt-6 flex gap-2 rounded-[var(--radius-control)] bg-subtle px-3 py-2.5 text-sm text-fg-muted">
        <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        The order is a planned delivery. Nothing is charged until it’s recorded as delivered, and no one is contacted.
      </p>
    </Dialog>
  );
}
