import { ArrowLeft, Banknote, CircleCheck, Send } from 'lucide-react';
import { gstLabel, lineAmount, type InvoiceRow } from './invoiceLogic';
import { toRupees } from './money';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';
import { Button } from '../../components/Button';
import { Card, Panel } from '../../components/Panel';
import { invoiceIssuer } from '../../data/invoiceSample';
import { formatAmount, formatDate, pluralize } from '../../utils/format';

interface Props {
  row: InvoiceRow;
  onBack: () => void;
  onRecordPayment: () => void;
  onMarkSent: () => void;
}

export function InvoiceDetail({ row, onBack, onRecordPayment, onMarkSent }: Props) {
  const { invoice, totals } = row;
  const isDraft = row.status === 'draft';
  const canRecord = !isDraft && row.balance > 0;
  const paidShare = totals.total ? Math.min(1, row.paid / totals.total) : 0;
  const money = (paise: number) => formatAmount(toRupees(paise));

  return (
    <div className="space-y-6">
      <div>
        <button
          type="button"
          onClick={onBack}
          className="-ml-2 inline-flex min-h-9 items-center gap-1.5 rounded-[var(--radius-control)] px-2 text-sm font-medium text-fg-muted hover:bg-subtle hover:text-fg"
        >
          <ArrowLeft size={16} aria-hidden="true" /> All invoices
        </button>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="tabular text-2xl font-semibold tracking-[-0.02em] text-fg sm:text-[1.75rem]">{invoice.number}</h1>
              <InvoiceStatusBadge status={row.status} />
            </div>
            <p className="mt-1 text-sm text-fg-muted">
              {row.customer} · Issued {formatDate(invoice.issueDate)} · Due {formatDate(invoice.dueDate)}
              {row.status === 'overdue' ? <span className="text-danger-strong"> · {pluralize(row.daysOverdue, 'day')} late</span> : null}
            </p>
          </div>
          {isDraft ? (
            <Button onClick={onMarkSent}>
              <Send size={17} aria-hidden="true" /> Mark as sent
            </Button>
          ) : (
            <Button onClick={onRecordPayment} disabled={!canRecord}>
              <Banknote size={17} aria-hidden="true" /> Record payment
            </Button>
          )}
        </div>
        {!canRecord ? (
          <p className="mt-2 text-right text-xs text-fg-subtle">
            {isDraft ? 'Mark the invoice as sent before recording payments.' : 'This invoice is fully paid.'}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        {/* The invoice itself, laid out like the document a customer receives. */}
        <Card className="overflow-hidden">
          <div className="grid gap-6 border-b border-line p-5 sm:grid-cols-2 sm:p-7">
            <div>
              <p className="text-xs font-medium text-fg-subtle">From</p>
              <p className="mt-1 font-semibold text-fg">{invoiceIssuer.name}</p>
              <p className="text-sm text-fg-muted">{invoiceIssuer.city} · fictional sample business</p>
            </div>
            <div>
              <p className="text-xs font-medium text-fg-subtle">Bill to</p>
              <p className="mt-1 font-semibold text-fg">{row.customer}</p>
              <p className="text-sm text-fg-muted">{row.city}</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <caption className="sr-only">Line items for {invoice.number}</caption>
              <thead className="border-b border-line bg-subtle/60 text-xs text-fg-muted">
                <tr>
                  <th scope="col" className="px-5 py-2.5 font-medium sm:px-7">Item</th>
                  <th scope="col" className="w-20 px-3 py-2.5 text-right font-medium">Qty</th>
                  <th scope="col" className="w-32 px-3 py-2.5 text-right font-medium">Rate</th>
                  <th scope="col" className="w-36 px-5 py-2.5 text-right font-medium sm:px-7">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {invoice.lines.map((l, i) => (
                  <tr key={i}>
                    <td className="px-5 py-3 text-fg sm:px-7">{l.description}</td>
                    <td className="tabular px-3 py-3 text-right text-fg-muted">{l.quantity}</td>
                    <td className="tabular px-3 py-3 text-right text-fg-muted">{money(l.ratePaise)}</td>
                    <td className="tabular px-5 py-3 text-right font-medium text-fg sm:px-7">{money(lineAmount(l))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-line p-5 sm:p-7">
          <dl className="tabular ml-auto max-w-sm space-y-2 text-sm">
            <div className="flex justify-between gap-6">
              <dt className="text-fg-muted">Subtotal</dt>
              <dd className="text-fg">{money(totals.subtotal)}</dd>
            </div>
            <div className="flex justify-between gap-6">
              <dt className="text-fg-muted">GST ({gstLabel(invoice.gstBasisPoints)})</dt>
              <dd className="text-fg">{money(totals.gst)}</dd>
            </div>
            <div className="flex justify-between gap-6 border-t border-line pt-2 text-base font-semibold">
              <dt className="text-fg">Total</dt>
              <dd className="text-fg">{money(totals.total)}</dd>
            </div>
            <div className="flex justify-between gap-6">
              <dt className="text-fg-muted">Paid</dt>
              <dd className="text-fg">− {money(row.paid)}</dd>
            </div>
            <div className="flex justify-between gap-6 rounded-[var(--radius-control)] bg-subtle px-3 py-2 font-semibold">
              <dt className="text-fg">Balance due</dt>
              <dd className={row.status === 'overdue' ? 'text-danger-strong' : 'text-fg'}>{money(row.balance)}</dd>
            </div>
          </dl>
          </div>
          {invoice.notes ? (
            <div className="border-t border-line px-5 py-4 sm:px-7">
              <p className="text-xs font-medium text-fg-subtle">Notes</p>
              <p className="mt-1 text-sm whitespace-pre-line text-fg-muted">{invoice.notes}</p>
            </div>
          ) : null}
        </Card>

        <div className="space-y-6">
          <Panel title="Payment progress">
            <div className="p-4 sm:p-5">
              <p className="tabular text-sm text-fg-muted">
                <span className="text-lg font-semibold text-fg">{money(row.paid)}</span> of {money(totals.total)}
              </p>
              <div
                className="mt-3 h-2 rounded-full bg-chart-track"
                role="progressbar"
                aria-label="Share of invoice paid"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.floor(paidShare * 100)}
              >
                <div className="h-full rounded-full bg-chart" style={{ width: `${paidShare * 100}%` }} />
              </div>
              <p className="mt-2 text-xs text-fg-muted">{Math.floor(paidShare * 100)}% paid</p>
            </div>
          </Panel>
          <Panel title="Payments" aside={<span className="text-xs text-fg-muted">{pluralize(row.payments.length, 'payment')}</span>}>
            {row.payments.length === 0 ? (
              <p className="px-4 py-6 text-sm text-fg-muted sm:px-5">No payments recorded yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {row.payments.map((p) => (
                  <li key={p.id} className="flex items-start justify-between gap-3 px-4 py-3 sm:px-5">
                    <span className="flex min-w-0 gap-2.5">
                      <CircleCheck size={17} className="mt-0.5 shrink-0 text-success-strong" aria-hidden="true" />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-fg">{p.method}</span>
                        <span className="block truncate text-xs text-fg-muted">
                          {formatDate(p.date)}
                          {p.reference ? ` · ${p.reference}` : ''}
                        </span>
                      </span>
                    </span>
                    <span className="tabular shrink-0 text-sm font-semibold text-fg">{money(p.amountPaise)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
