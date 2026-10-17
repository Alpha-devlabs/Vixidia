import { useId, useRef, useState } from 'react';
import { Info, Plus, Trash2 } from 'lucide-react';
import type { DistributorBook } from '../../types/distributor';
import { Dialog } from '../../components/Dialog';
import { Button } from '../../components/Button';
import { Field, controlClass, describedBy, textareaClass } from '../../components/forms';
import { cn } from '../../utils/cn';
import { parseMoney } from '../invoices/money';
import {
  MAX_LINES,
  categoriesOf,
  committedOf,
  money,
  productOf,
  stockOf,
  unitText,
  units,
  type Errors,
  type LineInput,
  type OrderInput,
  type PartyInput,
  type PartyKind,
  type ProductInput,
  type PurchaseInput,
} from './distributorLogic';
import { AmountInput, Choice } from './DistributorBits';

type Save<T> = (input: T) => { ok: true } | { ok: false; errors: Errors };

/** Shared submit handling: one submission at a time, focus the first field with an error. */
function useSubmit<T>(id: string, values: T, onSave: Save<T>, onClose: () => void, order: string[], setErrors: (e: Errors) => void) {
  const submitting = useRef(false);
  return (save: Save<T> = onSave) =>
    (e?: { preventDefault: () => void }) => {
      e?.preventDefault();
      if (submitting.current) return;
      submitting.current = true;
      const r = save(values);
      if (r.ok) {
        onClose();
        return;
      }
      submitting.current = false;
      setErrors(r.errors);
      const first = order.find((k) => r.errors[k]) ?? Object.keys(r.errors).find((k) => k.startsWith('line'));
      if (first) document.getElementById(`${id}-${first.replace('.', '-')}`)?.focus();
    };
}

// ---------- Product ----------

export function ProductFormDrawer({ book, mode, initial, open, onClose, onSave }: { book: DistributorBook; mode: 'create' | 'edit'; initial: ProductInput; open: boolean; onClose: () => void; onSave: Save<ProductInput> }) {
  const id = useId();
  const formId = `${id}-form`;
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Errors>({});
  const set = <K extends keyof ProductInput>(k: K, v: ProductInput[K]) => {
    setValues((x) => ({ ...x, [k]: v }));
    setErrors(({ [k]: _x, ...rest }) => rest);
  };
  const submit = useSubmit(id, values, onSave, onClose, ['sku', 'name', 'category', 'unit', 'cost', 'price', 'reorderLevel', 'openingStock'], setErrors);
  const cost = parseMoney(values.cost);
  const price = parseMoney(values.price);
  const margin = cost.ok && price.ok && cost.value > 0 && price.value > 0 ? price.value - cost.value : null;
  const text = (k: 'sku' | 'name' | 'category', label: string, hint?: string, list?: string) => (
    <Field id={`${id}-${k}`} label={label} error={errors[k]} {...(hint ? { hint } : {})}>
      <input
        id={`${id}-${k}`}
        autoComplete="off"
        value={values[k]}
        onChange={(e: { target: { value: string } }) => set(k, e.target.value)}
        className={controlClass(!!errors[k], k === 'sku' ? 'uppercase' : undefined)}
        aria-invalid={!!errors[k]}
        aria-describedby={describedBy(`${id}-${k}`, errors[k], !!hint)}
        {...(list ? { list } : {})}
      />
    </Field>
  );
  return (
    <Dialog
      open={open}
      onClose={onClose}
      variant="drawer"
      title={mode === 'create' ? 'Add product' : `Edit ${initial.name}`}
      description={mode === 'create' ? 'Opening stock is recorded as the first stock movement.' : 'Price changes apply to new purchases and orders only. Stock changes need a stock adjustment.'}
      footer={
        <>
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId}>
            {mode === 'create' ? 'Add product' : 'Save changes'}
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={submit()} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-[10rem_minmax(0,1fr)]">
          {text('sku', 'SKU', 'Your code for it.')}
          {text('name', 'Product name', 'Include the pack size, e.g. “Tea 250 g × 24”.')}
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          {text('category', 'Category', undefined, `${id}-cats`)}
          <datalist id={`${id}-cats`}>
            {categoriesOf(book).map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <Field id={`${id}-unit`} label="Unit" error={errors.unit} hint="Stock is counted in whole units.">
            <select id={`${id}-unit`} value={values.unit} onChange={(e: { target: { value: string } }) => set('unit', e.target.value as ProductInput['unit'])} className={controlClass(!!errors.unit)} aria-invalid={!!errors.unit} aria-describedby={describedBy(`${id}-unit`, errors.unit, true)}>
              <option value="">Choose…</option>
              {units.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id={`${id}-cost`} label="Purchase cost per unit" error={errors.cost} hint="Used to value stock and as the default on purchases.">
            <AmountInput id={`${id}-cost`} value={values.cost} onChange={(v) => set('cost', v)} invalid={!!errors.cost} describedBy={describedBy(`${id}-cost`, errors.cost, true)} />
          </Field>
          <Field id={`${id}-price`} label="Selling price per unit" error={errors.price} hint={margin !== null ? `Margin ${money(margin)} per unit${margin < 0 ? ' (below cost)' : ''}.` : 'The default on new orders.'}>
            <AmountInput id={`${id}-price`} value={values.price} onChange={(v) => set('price', v)} invalid={!!errors.price} describedBy={describedBy(`${id}-price`, errors.price, true)} />
          </Field>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id={`${id}-reorderLevel`} label="Reorder level" error={errors.reorderLevel} hint="Flagged as low stock at or below this. 0 for none.">
            <input id={`${id}-reorderLevel`} inputMode="numeric" value={values.reorderLevel} onChange={(e: { target: { value: string } }) => set('reorderLevel', e.target.value)} className={controlClass(!!errors.reorderLevel, 'tabular')} aria-invalid={!!errors.reorderLevel} aria-describedby={describedBy(`${id}-reorderLevel`, errors.reorderLevel, true)} />
          </Field>
          {mode === 'create' ? (
            <Field id={`${id}-openingStock`} label="Opening stock" error={errors.openingStock} hint="Units on hand today.">
              <input id={`${id}-openingStock`} inputMode="numeric" value={values.openingStock} onChange={(e: { target: { value: string } }) => set('openingStock', e.target.value)} className={controlClass(!!errors.openingStock, 'tabular')} aria-invalid={!!errors.openingStock} aria-describedby={describedBy(`${id}-openingStock`, errors.openingStock, true)} />
            </Field>
          ) : null}
        </div>
        {mode === 'edit' ? (
          <Choice
            id={`${id}-active`}
            legend="Status"
            columns={2}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
            value={values.active ? 'active' : 'inactive'}
            onChange={(v) => set('active', v === 'active')}
          />
        ) : null}
        {mode === 'edit' && !values.active ? <p className="-mt-3 text-sm text-fg-muted">Inactive products stay on past purchases and orders but can’t be added to new ones.</p> : null}
      </form>
    </Dialog>
  );
}

// ---------- Supplier / customer ----------

export function PartyFormDrawer({ kind, mode, initial, open, onClose, onSave }: { kind: PartyKind; mode: 'create' | 'edit'; initial: PartyInput; open: boolean; onClose: () => void; onSave: Save<PartyInput> }) {
  const id = useId();
  const formId = `${id}-form`;
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Errors>({});
  const set = <K extends keyof PartyInput>(k: K, v: PartyInput[K]) => {
    setValues((x) => ({ ...x, [k]: v }));
    setErrors(({ [k]: _x, ...rest }) => rest);
  };
  const submit = useSubmit(id, values, onSave, onClose, ['name', 'contactName', 'phone', 'email', 'address', 'creditDays', 'notes'], setErrors);
  const word = kind === 'supplier' ? 'supplier' : 'customer';
  const text = (k: 'name' | 'contactName' | 'phone' | 'email' | 'address', label: string, opts: { hint?: string; optional?: boolean; type?: string } = {}) => (
    <Field id={`${id}-${k}`} label={label} error={errors[k]} {...(opts.hint ? { hint: opts.hint } : {})} {...(opts.optional ? { optional: true } : {})}>
      <input
        id={`${id}-${k}`}
        type={opts.type ?? 'text'}
        autoComplete="off"
        value={values[k]}
        onChange={(e: { target: { value: string } }) => set(k, e.target.value)}
        className={controlClass(!!errors[k])}
        aria-invalid={!!errors[k]}
        aria-describedby={describedBy(`${id}-${k}`, errors[k], !!opts.hint)}
      />
    </Field>
  );
  return (
    <Dialog
      open={open}
      onClose={onClose}
      variant="drawer"
      title={mode === 'create' ? `Add ${word}` : `Edit ${initial.name}`}
      description={mode === 'create' ? 'Use made-up contact details in this demo.' : `Past ${kind === 'supplier' ? 'purchases' : 'orders'} stay linked and keep their amounts.`}
      footer={
        <>
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId}>
            {mode === 'create' ? `Add ${word}` : 'Save changes'}
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={submit()} className="space-y-5">
        {text('name', 'Business name')}
        <div className="grid gap-5 sm:grid-cols-2">
          {text('contactName', 'Contact person')}
          {text('phone', 'Phone', { type: 'tel', hint: '10-digit Indian numbers get +91 added.' })}
        </div>
        {text('email', 'Email', { type: 'email', optional: true })}
        {text('address', 'Address or area', { optional: true })}
        <Field id={`${id}-creditDays`} label="Credit days" error={errors.creditDays} hint={kind === 'supplier' ? 'A received purchase falls due this many days later.' : 'A delivered order falls due this many days later. 0 for cash on delivery.'}>
          <input id={`${id}-creditDays`} inputMode="numeric" value={values.creditDays} onChange={(e: { target: { value: string } }) => set('creditDays', e.target.value)} className={controlClass(!!errors.creditDays, 'tabular sm:w-32')} aria-invalid={!!errors.creditDays} aria-describedby={describedBy(`${id}-creditDays`, errors.creditDays, true)} />
        </Field>
        <Field id={`${id}-notes`} label="Notes" optional error={errors.notes}>
          <textarea id={`${id}-notes`} rows={3} value={values.notes} onChange={(e: { target: { value: string } }) => set('notes', e.target.value)} className={textareaClass(!!errors.notes)} aria-invalid={!!errors.notes} aria-describedby={describedBy(`${id}-notes`, errors.notes)} />
        </Field>
        {mode === 'edit' ? (
          <Choice
            id={`${id}-active`}
            legend="Status"
            columns={2}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
            value={values.active ? 'active' : 'inactive'}
            onChange={(v) => set('active', v === 'active')}
          />
        ) : null}
        {mode === 'edit' && !values.active ? <p className="-mt-3 text-sm text-fg-muted">Inactive {word}s keep their history and balances but can’t be used on new {kind === 'supplier' ? 'purchases' : 'orders'}.</p> : null}
      </form>
    </Dialog>
  );
}

// ---------- Purchase / order ----------

type DocInput = PurchaseInput | OrderInput;

/** New or edited purchase or sales order, with product lines. Totals are shown as the rules compute them: sum of lines, no tax or discount. */
export function DocFormDrawer({
  book,
  kind,
  mode,
  editingId,
  initial,
  open,
  onClose,
  onSave,
  onSaveAndAdvance,
}: {
  book: DistributorBook;
  kind: 'purchase' | 'order';
  mode: 'create' | 'edit';
  editingId?: string;
  initial: DocInput;
  open: boolean;
  onClose: () => void;
  onSave: Save<DocInput>;
  /** Create only: save and receive (purchase) or save and confirm (order). */
  onSaveAndAdvance?: Save<DocInput>;
}) {
  const id = useId();
  const formId = `${id}-form`;
  const [values, setValues] = useState<DocInput>(initial);
  const [errors, setErrors] = useState<Errors>({});
  const submit = useSubmit(id, values, onSave, onClose, ['party', 'ref', 'date', 'lines', 'notes'], setErrors);
  const partyKey = kind === 'purchase' ? 'supplierId' : 'customerId';
  const partyId = (values as unknown as Record<string, string>)[partyKey] ?? '';
  const parties = (kind === 'purchase' ? book.suppliers : book.customers).filter((p) => p.active || p.id === partyId);
  const products = book.products.filter((p) => p.active || values.lines.some((l) => l.productId === p.id));
  const isOrder = kind === 'order';
  const editingConfirmed = isOrder && mode === 'edit' && book.orders.find((o) => o.id === editingId)?.status === 'confirmed';

  const setHeader = (k: 'party' | 'ref' | 'date' | 'notes', v: string) => {
    setValues((x) => (k === 'party' ? ({ ...x, [partyKey]: v } as DocInput) : ({ ...x, [k]: v } as DocInput)));
    setErrors(({ [k]: _x, ...rest }) => rest);
  };
  const setLine = (i: number, patch: Partial<LineInput>) => {
    setValues((x) => ({ ...x, lines: x.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) }));
    setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => !k.startsWith(`line${i}.`) && k !== 'lines')));
  };
  const removeLine = (i: number) => {
    setValues((x) => ({ ...x, lines: x.lines.length > 1 ? x.lines.filter((_, j) => j !== i) : [{ productId: '', qty: '', price: '' }] }));
    setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => !k.startsWith('line'))));
  };
  const total = values.lines.reduce((s, l) => {
    const q = /^\d+$/.test(l.qty.trim()) ? Number(l.qty.trim()) : 0;
    const p = parseMoney(l.price);
    return s + (p.ok ? q * p.value : 0);
  }, 0);
  const word = isOrder ? 'order' : 'purchase';
  const title = mode === 'create' ? (isOrder ? 'New sales order' : 'New purchase') : `Edit ${initial.ref}`;
  const description =
    mode === 'create'
      ? isOrder
        ? 'A draft changes nothing. Confirming checks free stock. Stock is deducted only when the order is delivered.'
        : 'A draft changes nothing. Stock is added once, when the purchase is received.'
      : editingConfirmed
        ? 'This order is confirmed: changes are checked against free stock again. Stock is deducted only on delivery.'
        : 'Drafts can be changed freely. They don’t affect stock or balances.';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      variant="drawer"
      title={title}
      description={description}
      footer={
        <>
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          {mode === 'create' && onSaveAndAdvance ? (
            <>
              <Button variant="secondary" type="submit" form={formId}>
                Save draft
              </Button>
              <Button onClick={() => submit(onSaveAndAdvance)()}>{isOrder ? 'Save and confirm' : 'Save and receive'}</Button>
            </>
          ) : (
            <Button type="submit" form={formId}>
              Save changes
            </Button>
          )}
        </>
      }
    >
      <form id={formId} noValidate onSubmit={submit()} className="space-y-5">
        {errors.form ? <p className="rounded-[var(--radius-control)] bg-danger-soft px-3 py-2 text-sm font-medium text-danger-strong">{errors.form}</p> : null}
        <Field id={`${id}-party`} label={isOrder ? 'Customer' : 'Supplier'} error={errors.party} hint={isOrder ? 'Active customers only.' : 'Active suppliers only.'}>
          <select id={`${id}-party`} value={partyId} onChange={(e: { target: { value: string } }) => setHeader('party', e.target.value)} className={controlClass(!!errors.party)} aria-invalid={!!errors.party} aria-describedby={describedBy(`${id}-party`, errors.party, true)}>
            <option value="">Choose…</option>
            {parties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.active ? '' : ' (inactive)'}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id={`${id}-ref`} label={isOrder ? 'Order number' : 'Purchase number'} error={errors.ref} hint="Must be unique.">
            <input id={`${id}-ref`} autoComplete="off" value={values.ref} onChange={(e: { target: { value: string } }) => setHeader('ref', e.target.value)} className={controlClass(!!errors.ref, 'tabular uppercase')} aria-invalid={!!errors.ref} aria-describedby={describedBy(`${id}-ref`, errors.ref, true)} />
          </Field>
          <Field id={`${id}-date`} label={isOrder ? 'Order date' : 'Purchase date'} error={errors.date}>
            <input id={`${id}-date`} type="date" max={book.today} value={values.date} onChange={(e: { target: { value: string } }) => setHeader('date', e.target.value)} className={controlClass(!!errors.date, 'tabular')} aria-invalid={!!errors.date} aria-describedby={describedBy(`${id}-date`, errors.date)} />
          </Field>
        </div>

        <fieldset aria-describedby={errors.lines ? `${id}-lines-error` : undefined}>
          <legend className="mb-1.5 block text-sm font-medium text-fg">Products</legend>
          <ol id={`${id}-lines`} tabIndex={-1} className="space-y-3">
            {values.lines.map((l, i) => {
              const p = productOf(book, l.productId);
              const stock = p ? stockOf(book, p.id) : 0;
              const committed = p && isOrder ? committedOf(book, p.id, editingId) : 0;
              const q = /^\d+$/.test(l.qty.trim()) ? Number(l.qty.trim()) : 0;
              const pr = parseMoney(l.price);
              const short = isOrder && p && q > stock - committed;
              const e = (k: string) => errors[`line${i}.${k}`];
              const lid = (k: string) => `${id}-line${i}-${k}`;
              return (
                <li key={i} className="rounded-[var(--radius-control)] border border-line p-3">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <label htmlFor={lid('product')} className="mb-1 block text-xs font-medium text-fg-muted">
                        Product {i + 1}
                      </label>
                      <select
                        id={lid('product')}
                        value={l.productId}
                        onChange={(ev: { target: { value: string } }) => {
                          const np = productOf(book, ev.target.value);
                          setLine(i, { productId: ev.target.value, ...(np ? { price: String((isOrder ? np.pricePaise : np.costPaise) / 100) } : {}) });
                        }}
                        className={controlClass(!!e('product'))}
                        aria-invalid={!!e('product')}
                        aria-describedby={e('product') ? `${lid('product')}-error` : undefined}
                      >
                        <option value="">Choose a product…</option>
                        {products.map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.name} ({x.sku}){x.active ? '' : ' — inactive'}
                          </option>
                        ))}
                      </select>
                      {e('product') ? (
                        <p id={`${lid('product')}-error`} className="mt-1 text-sm font-medium text-danger-strong">
                          {e('product')}
                        </p>
                      ) : null}
                    </div>
                    <Button variant="subtle" size="sm" className="mt-5" onClick={() => removeLine(i)} ariaLabel={`Remove product ${i + 1}`}>
                      <Trash2 size={16} aria-hidden="true" />
                    </Button>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-[7rem_minmax(0,1fr)_minmax(0,1fr)]">
                    <div>
                      <label htmlFor={lid('qty')} className="mb-1 block text-xs font-medium text-fg-muted">
                        Quantity{p ? ` (${units.find((u) => u.value === p.unit)!.plural})` : ''}
                      </label>
                      <input id={lid('qty')} inputMode="numeric" value={l.qty} onChange={(ev: { target: { value: string } }) => setLine(i, { qty: ev.target.value })} className={controlClass(!!e('qty'), 'tabular')} aria-invalid={!!e('qty')} aria-describedby={e('qty') ? `${lid('qty')}-error` : undefined} />
                    </div>
                    <div>
                      <label htmlFor={lid('price')} className="mb-1 block text-xs font-medium text-fg-muted">
                        {isOrder ? 'Selling price per unit' : 'Cost per unit'}
                      </label>
                      <AmountInput id={lid('price')} value={l.price} onChange={(v) => setLine(i, { price: v })} invalid={!!e('price')} describedBy={e('price') ? `${lid('price')}-error` : undefined} />
                    </div>
                    <div className="col-span-2 flex items-center justify-between gap-2 sm:col-span-1 sm:block sm:text-right">
                      <span className="block text-xs font-medium text-fg-muted">Line total</span>
                      <span className="tabular block text-sm font-semibold text-fg sm:py-2">{pr.ok && q ? money(q * pr.value) : '—'}</span>
                    </div>
                  </div>
                  {e('qty') ? (
                    <p id={`${lid('qty')}-error`} className="mt-1 text-sm font-medium text-danger-strong">
                      {e('qty')}
                    </p>
                  ) : null}
                  {e('price') ? (
                    <p id={`${lid('price')}-error`} className="mt-1 text-sm font-medium text-danger-strong">
                      {e('price')}
                    </p>
                  ) : null}
                  {p ? (
                    <p className={cn('tabular mt-1.5 text-xs', short ? 'font-medium text-warning-strong' : 'text-fg-muted')}>
                      {unitText(p.unit, stock)} in stock
                      {isOrder && committed ? ` · ${committed} promised to other confirmed orders` : ''}
                      {short ? ' · not enough to confirm' : ''}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ol>
          {errors.lines ? (
            <p id={`${id}-lines-error`} role="alert" className="mt-2 text-sm font-medium text-danger-strong">
              {errors.lines}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <Button variant="secondary" size="sm" disabled={values.lines.length >= MAX_LINES} onClick={() => setValues((x) => ({ ...x, lines: [...x.lines, { productId: '', qty: '', price: '' }] }))}>
              <Plus size={16} aria-hidden="true" /> Add product
            </Button>
            <p className="tabular text-sm text-fg">
              Total <span className="ml-2 text-base font-semibold">{money(total)}</span>
            </p>
          </div>
          <p className="mt-1 text-right text-xs text-fg-muted">Sum of the lines. No tax or discount in this demo.</p>
        </fieldset>

        <Field id={`${id}-notes`} label="Notes" optional error={errors.notes}>
          <textarea id={`${id}-notes`} rows={2} value={values.notes} onChange={(e: { target: { value: string } }) => setHeader('notes', e.target.value)} className={textareaClass(!!errors.notes, 'min-h-16')} aria-invalid={!!errors.notes} aria-describedby={describedBy(`${id}-notes`, errors.notes)} />
        </Field>
        <p className="flex gap-2 rounded-[var(--radius-control)] bg-subtle px-3 py-2.5 text-sm text-fg-muted">
          <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          Each line keeps a copy of the product name, SKU, unit and {isOrder ? 'price' : 'cost'}, so later product changes don’t alter this {word}.
        </p>
      </form>
    </Dialog>
  );
}
