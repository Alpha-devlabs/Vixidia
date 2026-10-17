import { useEffect, useId, useRef, useState } from 'react';
import type { CustomerKind, PaymentStatus, WaterCustomer } from '../../types/water';
import { Dialog } from '../../components/Dialog';
import { Button } from '../../components/Button';
import { Field, controlClass, describedBy, textareaClass } from '../../components/forms';
import { emptyNewOrder, MAX_QUANTITY, validateNewOrder, type NewOrderErrors, type NewOrderInput } from './waterLogic';
import { sampleBusiness } from '../../data/waterSample';
import { formatCurrency } from '../../utils/format';
import { cn } from '../../utils/cn';

interface Props {
  open: boolean;
  onClose: () => void;
  customers: WaterCustomer[];
  onAdd: (input: NewOrderInput) => void;
  /** Preselects a customer when opened from a customer record. */
  presetCustomerId?: string;
}

const optionClass = (checked: boolean) =>
  cn(
    'flex min-h-11 cursor-pointer items-center gap-2 rounded-[var(--radius-control)] border px-3 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus)] has-[:focus-visible]:outline-solid',
    checked ? 'border-accent bg-accent-soft font-semibold text-accent-strong' : 'border-line-strong text-fg hover:bg-subtle/60',
  );

export function AddOrderDialog({ open, onClose, customers, onAdd, presetCustomerId }: Props) {
  const uid = useId();
  const [input, setInput] = useState<NewOrderInput>(emptyNewOrder);
  const [errors, setErrors] = useState<NewOrderErrors>({});
  // Blocks a second submit (double click, repeated Enter) for the same opening.
  const submitted = useRef(false);

  useEffect(() => {
    if (open) {
      setInput({ ...emptyNewOrder(), customerId: presetCustomerId ?? '' });
      setErrors({});
      submitted.current = false;
    }
  }, [open, presetCustomerId]);

  const set = <K extends keyof NewOrderInput>(key: K, value: NewOrderInput[K]) => {
    setInput((prev) => ({ ...prev, [key]: value }));
    if (key in errors) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const ids = {
    customerId: `${uid}-customer`,
    newName: `${uid}-name`,
    newArea: `${uid}-area`,
    newKind: `${uid}-kind`,
    quantity: `${uid}-qty`,
    note: `${uid}-note`,
  };

  const submit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (submitted.current) return;
    const found = validateNewOrder(input, customers);
    setErrors(found);
    const firstInvalid = (Object.keys(ids) as (keyof typeof ids)[]).find((k) => k in found && found[k as keyof NewOrderErrors]);
    if (firstInvalid) {
      document.getElementById(ids[firstInvalid])?.focus();
      return;
    }
    submitted.current = true;
    onAdd(input);
    onClose();
  };

  const qty = Number(input.quantity);
  const preview = Number.isInteger(qty) && qty > 0 && qty <= MAX_QUANTITY ? qty * sampleBusiness.defaultUnitPrice : null;
  const sorted = [...customers].sort((a, b) => a.name.localeCompare(b.name));
  const formId = `${uid}-form`;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="New order"
      description="Adds a sample order to today’s run. Nothing leaves this browser tab."
      footer={
        <>
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId}>
            Add order
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={submit} className="space-y-5">
        <fieldset>
          <legend className="text-sm font-semibold text-fg">Customer</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(['existing', 'new'] as const).map((mode) => (
              <label key={mode} className={optionClass(input.customerMode === mode)}>
                <input type="radio" name={`${uid}-mode`} value={mode} checked={input.customerMode === mode} onChange={() => set('customerMode', mode)} className="accent-[var(--accent)]" />
                {mode === 'existing' ? 'Existing customer' : 'New customer'}
              </label>
            ))}
          </div>
        </fieldset>

        {input.customerMode === 'existing' ? (
          <Field id={ids.customerId} label="Choose customer" error={errors.customerId}>
            <select
              id={ids.customerId}
              value={input.customerId}
              onChange={(e: { target: { value: string } }) => set('customerId', e.target.value)}
              className={controlClass(!!errors.customerId, 'h-11')}
              aria-invalid={!!errors.customerId}
              aria-describedby={describedBy(ids.customerId, errors.customerId)}
            >
              <option value="">Select a customer…</option>
              {sorted.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.area}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id={ids.newName} label="Customer name" error={errors.newName} className="sm:col-span-2">
              <input
                id={ids.newName}
                value={input.newName}
                onChange={(e: { target: { value: string } }) => set('newName', e.target.value)}
                autoComplete="off"
                className={controlClass(!!errors.newName, 'h-11')}
                aria-invalid={!!errors.newName}
                aria-describedby={describedBy(ids.newName, errors.newName)}
              />
            </Field>
            <Field id={ids.newArea} label="Area or street" error={errors.newArea}>
              <input
                id={ids.newArea}
                value={input.newArea}
                onChange={(e: { target: { value: string } }) => set('newArea', e.target.value)}
                autoComplete="off"
                className={controlClass(!!errors.newArea, 'h-11')}
                aria-invalid={!!errors.newArea}
                aria-describedby={describedBy(ids.newArea, errors.newArea)}
              />
            </Field>
            <Field id={ids.newKind} label="Customer type">
              <select id={ids.newKind} value={input.newKind} onChange={(e: { target: { value: string } }) => set('newKind', e.target.value as CustomerKind)} className={controlClass(false, 'h-11')}>
                <option value="home">Household</option>
                <option value="shop">Shop</option>
                <option value="office">Office or clinic</option>
              </select>
            </Field>
          </div>
        )}

        <Field id={ids.quantity} label={`Cans (${sampleBusiness.unitLabel})`} error={errors.quantity} hint={preview !== null ? `Order total: ${formatCurrency(preview)}` : `1 to ${MAX_QUANTITY} cans`}>
          <input
            id={ids.quantity}
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_QUANTITY}
            step={1}
            value={input.quantity}
            onChange={(e: { target: { value: string } }) => set('quantity', e.target.value)}
            className={controlClass(!!errors.quantity, 'tabular h-11 sm:w-40')}
            aria-invalid={!!errors.quantity}
            aria-describedby={describedBy(ids.quantity, errors.quantity, true)}
          />
        </Field>

        <fieldset>
          <legend className="text-sm font-semibold text-fg">Payment</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {(
              [
                ['unpaid', 'Collect on delivery'],
                ['paid', 'Already paid'],
              ] as [PaymentStatus, string][]
            ).map(([value, label]) => (
              <label key={value} className={optionClass(input.payment === value)}>
                <input type="radio" name={`${uid}-payment`} value={value} checked={input.payment === value} onChange={() => set('payment', value)} className="accent-[var(--accent)]" />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <Field id={ids.note} label="Note" optional>
          <textarea id={ids.note} value={input.note} onChange={(e: { target: { value: string } }) => set('note', e.target.value)} rows={2} maxLength={140} className={textareaClass(false, 'min-h-16')} />
        </Field>
      </form>
    </Dialog>
  );
}
