import { useId, useState } from 'react';
import { ArrowLeft, Info, Plus, Trash2 } from 'lucide-react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Panel';
import { Field, FieldGroup, controlClass, describedBy, textareaClass } from '../../components/forms';
import type { InvoiceCustomer, InvoiceLine } from '../../types/invoice';
import { totalsFor } from './invoiceView';
import { addDays } from '../../utils/dates';
import { formatAmount, formatDate } from '../../utils/format';

interface Props {
  customers: InvoiceCustomer[];
  nextNumber: string;
  today: string;
  onCancel: () => void;
  /** Design preview: called after validation; nothing is stored yet. */
  onSubmitted: (summary: string, asDraft: boolean) => void;
}

interface DraftLine {
  key: number;
  description: string;
  quantity: string;
  rate: string;
}

const terms = [
  { days: 0, label: 'Due on receipt' },
  { days: 7, label: 'Net 7' },
  { days: 15, label: 'Net 15' },
  { days: 30, label: 'Net 30' },
];

const num = (s: string) => Number(s.replace(/[,\s₹]/g, ''));

export function NewInvoiceForm({ customers, nextNumber, today, onCancel, onSubmitted }: Props) {
  const id = useId();
  const [customerId, setCustomerId] = useState('');
  const [issueDate, setIssueDate] = useState(today);
  const [termDays, setTermDays] = useState(15);
  const [gst, setGst] = useState(true);
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([
    { key: 1, description: 'Festive gift hampers', quantity: '10', rate: '2400' },
    { key: 2, description: '', quantity: '1', rate: '' },
  ]);
  const [nextKey, setNextKey] = useState(3);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const parsed: InvoiceLine[] = lines
    .filter((l) => l.description.trim() && num(l.quantity) > 0 && num(l.rate) >= 0)
    .map((l) => ({ description: l.description.trim(), quantity: num(l.quantity), rate: num(l.rate) }));
  const totals = totalsFor(parsed, gst ? 0.18 : 0);
  const dueDate = addDays(issueDate || today, termDays);

  const updateLine = (key: number, patch: Partial<DraftLine>) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`line-${key}`];
      return next;
    });
  };

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!customerId) e.customer = 'Choose who this invoice is for.';
    if (!issueDate) e.issueDate = 'Choose the invoice date.';
    const filled = lines.filter((l) => l.description.trim() || l.rate.trim());
    if (filled.length === 0) e.lines = 'Add at least one item.';
    for (const l of filled) {
      if (!l.description.trim()) e[`line-${l.key}`] = 'Describe the item.';
      else if (!(num(l.quantity) > 0) || !Number.isFinite(num(l.quantity))) e[`line-${l.key}`] = 'Quantity must be more than zero.';
      else if (!l.rate.trim() || !Number.isFinite(num(l.rate)) || num(l.rate) < 0) e[`line-${l.key}`] = 'Enter a rate in rupees.';
    }
    return e;
  };

  const submit = (asDraft: boolean) => {
    const e = validate();
    setErrors(e);
    const firstKey = Object.keys(e)[0];
    if (firstKey) {
      const target = firstKey === 'customer' ? `${id}-customer` : firstKey === 'issueDate' ? `${id}-issue` : firstKey === 'lines' ? `${id}-desc-${lines[0]?.key}` : `${id}-desc-${firstKey.slice(5)}`;
      document.getElementById(target)?.focus();
      return;
    }
    const customer = customers.find((c) => c.id === customerId)?.name ?? '';
    onSubmitted(`${nextNumber} for ${customer}, ${formatAmount(totals.total)}`, asDraft);
  };

  const sortedCustomers = [...customers].sort((a, b) => a.name.localeCompare(b.name));
  const errorCount = Object.keys(errors).length;

  return (
    <div className="space-y-6">
      <div>
        <button
          type="button"
          onClick={onCancel}
          className="-ml-2 inline-flex min-h-9 items-center gap-1.5 rounded-[var(--radius-control)] px-2 text-sm font-medium text-fg-muted hover:bg-subtle hover:text-fg"
        >
          <ArrowLeft size={16} aria-hidden="true" /> Back
        </button>
        <h1 className="mt-3 text-2xl font-semibold tracking-[-0.02em] text-fg sm:text-[1.75rem]">New invoice</h1>
        <p className="mt-1 text-sm text-fg-muted">Add the customer, dates and items. Totals update as you type.</p>
      </div>

      {errorCount > 0 ? (
        <p role="alert" className="rounded-[var(--radius-control)] border border-danger/30 bg-danger-soft px-4 py-3 text-sm font-medium text-danger-strong">
          {errorCount === 1 ? 'One thing needs attention' : `${errorCount} things need attention`} before this invoice can be created.
        </p>
      ) : null}

      <form
        noValidate
        onSubmit={(e: { preventDefault: () => void }) => {
          e.preventDefault();
          submit(false);
        }}
        className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]"
      >
        <div className="space-y-6">
          <Card className="space-y-8 p-5 sm:p-6">
            <FieldGroup title="Customer and dates">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field id={`${id}-customer`} label="Customer" error={errors.customer} className="sm:col-span-2">
                  <select
                    id={`${id}-customer`}
                    value={customerId}
                    onChange={(e: { target: { value: string } }) => {
                      setCustomerId(e.target.value);
                      setErrors((p) => {
                        const next = { ...p };
                        delete next.customer;
                        return next;
                      });
                    }}
                    className={controlClass(!!errors.customer)}
                    aria-invalid={!!errors.customer}
                    aria-describedby={describedBy(`${id}-customer`, errors.customer)}
                  >
                    <option value="">Select a customer…</option>
                    {sortedCustomers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} — {c.city}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field id={`${id}-number`} label="Invoice number" hint="Assigned automatically.">
                  <input id={`${id}-number`} value={nextNumber} readOnly className={controlClass(false, 'tabular bg-subtle')} aria-describedby={`${id}-number-hint`} />
                </Field>
                <Field id={`${id}-issue`} label="Invoice date" error={errors.issueDate}>
                  <input
                    id={`${id}-issue`}
                    type="date"
                    value={issueDate}
                    onChange={(e: { target: { value: string } }) => setIssueDate(e.target.value)}
                    className={controlClass(!!errors.issueDate)}
                    aria-invalid={!!errors.issueDate}
                    aria-describedby={describedBy(`${id}-issue`, errors.issueDate)}
                  />
                </Field>
                <Field id={`${id}-terms`} label="Payment terms" hint={`Due ${formatDate(dueDate)}`} className="sm:col-span-2 sm:max-w-[calc(50%-0.625rem)]">
                  <select
                    id={`${id}-terms`}
                    value={termDays}
                    onChange={(e: { target: { value: string } }) => setTermDays(Number(e.target.value))}
                    className={controlClass()}
                    aria-describedby={`${id}-terms-hint`}
                  >
                    {terms.map((t) => (
                      <option key={t.days} value={t.days}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </FieldGroup>

            <FieldGroup title="Items" description="Rates are before GST.">
              <div className="@container space-y-3">
                <div className="hidden grid-cols-[minmax(0,1fr)_4rem_6.5rem_7rem_2.5rem] gap-3 px-1 text-xs font-medium text-fg-muted @xl:grid" aria-hidden="true">
                  <span>Description</span>
                  <span className="text-right">Qty</span>
                  <span className="text-right">Rate (₹)</span>
                  <span className="text-right">Amount</span>
                  <span />
                </div>
                {lines.map((l, i) => {
                  const err = errors[`line-${l.key}`];
                  const amount = num(l.quantity) * num(l.rate);
                  return (
                    <div key={l.key} className="rounded-[var(--radius-control)] border border-line p-3 @xl:border-0 @xl:p-0">
                      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3 @xl:grid-cols-[minmax(0,1fr)_4rem_6.5rem_7rem_2.5rem] @xl:items-center">
                        <div className="col-span-2 @xl:col-span-1">
                          <label htmlFor={`${id}-desc-${l.key}`} className="mb-1 block text-xs font-medium text-fg-muted @xl:sr-only">
                            <span className="sr-only">Item {i + 1} </span>Description
                          </label>
                          <input
                            id={`${id}-desc-${l.key}`}
                            value={l.description}
                            placeholder="What was sold"
                            onChange={(e: { target: { value: string } }) => updateLine(l.key, { description: e.target.value })}
                            className={controlClass(!!err)}
                            aria-invalid={!!err}
                            aria-describedby={err ? `${id}-line-${l.key}-error` : undefined}
                          />
                        </div>
                        <div>
                          <label htmlFor={`${id}-qty-${l.key}`} className="mb-1 block text-xs font-medium text-fg-muted @xl:sr-only">
                            <span className="sr-only">Item {i + 1} </span>Quantity
                          </label>
                          <input
                            id={`${id}-qty-${l.key}`}
                            inputMode="decimal"
                            value={l.quantity}
                            onChange={(e: { target: { value: string } }) => updateLine(l.key, { quantity: e.target.value })}
                            className={controlClass(false, 'tabular text-right')}
                          />
                        </div>
                        <div>
                          <label htmlFor={`${id}-rate-${l.key}`} className="mb-1 block text-xs font-medium text-fg-muted @xl:sr-only">
                            <span className="sr-only">Item {i + 1} </span>Rate (₹)
                          </label>
                          <input
                            id={`${id}-rate-${l.key}`}
                            inputMode="decimal"
                            value={l.rate}
                            placeholder="0.00"
                            onChange={(e: { target: { value: string } }) => updateLine(l.key, { rate: e.target.value })}
                            className={controlClass(false, 'tabular text-right')}
                          />
                        </div>
                        <p className="tabular text-right text-sm font-medium text-fg @max-xl:self-center @max-xl:text-left">
                          <span className="text-xs font-normal text-fg-muted @xl:sr-only">Amount </span>
                          {Number.isFinite(amount) ? formatAmount(amount) : '—'}
                        </p>
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => setLines((prev) => prev.filter((x) => x.key !== l.key))}
                            disabled={lines.length === 1}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-control)] text-fg-subtle hover:bg-danger-soft hover:text-danger-strong disabled:pointer-events-none disabled:opacity-40"
                            aria-label={`Remove item ${i + 1}`}
                          >
                            <Trash2 size={17} aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                      {err ? (
                        <p id={`${id}-line-${l.key}-error`} className="mt-1.5 text-sm font-medium text-danger-strong">
                          {err}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
                {errors.lines ? <p className="text-sm font-medium text-danger-strong">{errors.lines}</p> : null}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setLines((prev) => [...prev, { key: nextKey, description: '', quantity: '1', rate: '' }]);
                    setNextKey((k) => k + 1);
                  }}
                >
                  <Plus size={16} aria-hidden="true" /> Add item
                </Button>
              </div>
            </FieldGroup>

            <FieldGroup title="Tax and notes">
              <div className="space-y-5">
                <label className="flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={gst}
                    onChange={(e: { target: { checked: boolean } }) => setGst(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
                  />
                  <span>
                    <span className="block font-medium text-fg">Add GST at 18%</span>
                    <span className="block text-fg-muted">Turn off for items that are exempt.</span>
                  </span>
                </label>
                <Field id={`${id}-notes`} label="Notes for the customer" optional hint="Shown at the bottom of the invoice, e.g. bank details.">
                  <textarea
                    id={`${id}-notes`}
                    rows={3}
                    value={notes}
                    onChange={(e: { target: { value: string } }) => setNotes(e.target.value)}
                    className={textareaClass()}
                    aria-describedby={`${id}-notes-hint`}
                  />
                </Field>
              </div>
            </FieldGroup>
          </Card>
        </div>

        <aside className="xl:sticky xl:top-20 xl:self-start">
          <Card className="p-5">
            <h2 className="text-[0.95rem] font-semibold text-fg">Summary</h2>
            <dl className="tabular mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-fg-muted">Subtotal</dt>
                <dd className="text-fg">{formatAmount(totals.subtotal)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-fg-muted">GST {gst ? '(18%)' : '(not added)'}</dt>
                <dd className="text-fg">{formatAmount(totals.tax)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-line pt-3 text-base font-semibold">
                <dt className="text-fg">Total</dt>
                <dd className="text-fg">{formatAmount(totals.total)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-fg-muted">Due {formatDate(dueDate)}</p>
            <div className="mt-5 grid gap-2">
              <Button type="submit">Create invoice</Button>
              <Button variant="secondary" onClick={() => submit(true)}>
                Save as draft
              </Button>
              <Button variant="subtle" onClick={onCancel}>
                Cancel
              </Button>
            </div>
            <p className="mt-4 flex gap-2 text-xs text-fg-muted">
              <Info size={14} className="mt-px shrink-0" aria-hidden="true" />
              Design preview: the form is checked, but invoices are not saved yet.
            </p>
          </Card>
        </aside>
      </form>
    </div>
  );
}
