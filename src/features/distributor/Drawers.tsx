import { CircleCheckBig, IndianRupee, PackageCheck, Pencil, SlidersHorizontal, Truck, CircleX } from 'lucide-react';
import type { DistributorBook } from '../../types/distributor';
import { Dialog } from '../../components/Dialog';
import { Button } from '../../components/Button';
import { cn } from '../../utils/cn';
import {
  customerRows,
  docTotal,
  labelOf,
  ledger,
  lineTotal,
  money,
  movementLabels,
  orderRow,
  orderRows,
  paymentMethods,
  productOf,
  productRow,
  purchaseRow,
  purchaseRows,
  reconcile,
  rupees,
  shortfalls,
  supplierRows,
  unitText,
  type PartyKind,
} from './distributorLogic';
import { ActiveBadge, DocStatusBadge, PayBadge, Qty, StockBadge, longDate, shortDay } from './DistributorBits';

const dl = 'grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-sm';
const h3 = 'mt-6 text-sm font-semibold text-fg';
const box = 'mt-2 divide-y divide-line rounded-[var(--radius-control)] border border-line';

// ---------- Product ----------

export function ProductDrawer({ book, productId, open, onClose, onEdit, onAdjust }: { book: DistributorBook; productId: string | null; open: boolean; onClose: () => void; onEdit: (id: string) => void; onAdjust: (id: string) => void }) {
  const p = productId ? productOf(book, productId) : undefined;
  if (!p) return null;
  const r = productRow(book, p);
  const rec = reconcile(book, p.id);
  const moves = ledger(book, { productId: p.id });
  return (
    <Dialog
      open={open}
      onClose={onClose}
      variant="drawer"
      title={p.name}
      description={`${p.sku} · ${p.category} · sold by the ${p.unit}`}
      footer={
        <>
          <Button variant="subtle" onClick={() => onEdit(p.id)}>
            <Pencil size={16} aria-hidden="true" /> Edit
          </Button>
          <Button onClick={() => onAdjust(p.id)}>
            <SlidersHorizontal size={16} aria-hidden="true" /> Adjust stock
          </Button>
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <ActiveBadge active={p.active} />
        <StockBadge stock={r.stock} low={r.low} active={p.active} />
      </div>
      <dl className="mt-4 grid grid-cols-2 overflow-hidden rounded-[var(--radius-control)] border border-line bg-line [gap:1px] text-sm">
        {[
          ['In stock', unitText(p.unit, r.stock), `Reorder at ${p.reorderLevel}`],
          ['Free to promise', unitText(p.unit, Math.max(0, r.available)), r.committed ? `${r.committed} on confirmed orders` : 'None promised'],
          ['Value at cost', rupees(r.costValue), `${money(p.costPaise)} per ${p.unit}`],
          ['Value at selling price', rupees(r.saleValue), `${money(p.pricePaise)} per ${p.unit}`],
        ].map(([label, value, note]) => (
          <div key={label} className="bg-surface px-3 py-2.5">
            <dt className="text-xs text-fg-muted">{label}</dt>
            <dd className="tabular font-semibold text-fg">{value}</dd>
            <dd className="text-xs text-fg-muted">{note}</dd>
          </div>
        ))}
      </dl>

      <h3 className={h3}>How the stock adds up</h3>
      <dl className={cn(dl, 'tabular mt-2 rounded-[var(--radius-control)] bg-subtle px-3 py-2.5')} aria-label={`Stock check for ${p.name}`}>
        <dt className="text-fg-muted">Opening stock</dt>
        <dd className="text-right text-fg">{rec.opening}</dd>
        <dt className="text-fg-muted">+ Purchases received</dt>
        <dd className="text-right text-fg">{rec.received}</dd>
        <dt className="text-fg-muted">+ Adjustments up</dt>
        <dd className="text-right text-fg">{rec.adjustedIn}</dd>
        <dt className="text-fg-muted">− Orders delivered</dt>
        <dd className="text-right text-fg">{rec.sold}</dd>
        <dt className="text-fg-muted">− Adjustments down</dt>
        <dd className="text-right text-fg">{rec.adjustedOut}</dd>
        <div className="col-span-2 mt-0.5 flex justify-between border-t border-line pt-1.5">
          <dt className="font-medium text-fg">= In stock</dt>
          <dd className="text-right font-semibold text-fg">{rec.expected}</dd>
        </div>
      </dl>

      <h3 className={h3}>Stock movements</h3>
      <ul className={box} aria-label={`Stock movements of ${p.name}`}>
        {moves.map(({ movement: m, refText }) => (
          <li key={m.id} className="flex items-start justify-between gap-3 px-3 py-2 text-sm">
            <span className="min-w-0">
              <span className="block text-fg">
                {movementLabels[m.type]}
                {refText ? ` · ${refText}` : ''}
              </span>
              <span className="block text-xs text-fg-muted">
                {shortDay(m.date)} · {m.reason}
                {m.note ? ` — ${m.note}` : ''}
              </span>
            </span>
            <span className="shrink-0 text-right">
              <Qty n={m.qty} />
              <span className="tabular block text-xs text-fg-muted">→ {m.balanceAfter}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-xs text-fg-muted">Stock only changes through these movements. Purchases and orders keep their own copy of the price and name.</p>
    </Dialog>
  );
}

// ---------- Supplier / customer ----------

export function PartyDrawer({
  book,
  kind,
  partyId,
  open,
  onClose,
  onEdit,
  onNewDoc,
  onOpenDoc,
}: {
  book: DistributorBook;
  kind: PartyKind;
  partyId: string | null;
  open: boolean;
  onClose: () => void;
  onEdit: (id: string) => void;
  onNewDoc: (partyId: string) => void;
  onOpenDoc: (docId: string) => void;
}) {
  const row = (kind === 'supplier' ? supplierRows(book) : customerRows(book)).find((r) => r.party.id === partyId);
  if (!row) return null;
  const p = row.party;
  const docs = kind === 'supplier' ? purchaseRows(book).filter((r) => r.purchase.supplierId === p.id) : orderRows(book).filter((r) => r.order.customerId === p.id);
  const o = row.outstanding;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      variant="drawer"
      title={p.name}
      description={`${kind === 'supplier' ? 'Supplier' : 'Customer'} · ${p.creditDays ? `${p.creditDays} days’ credit` : 'Cash on delivery'}`}
      footer={
        <>
          <Button variant="subtle" onClick={() => onEdit(p.id)}>
            <Pencil size={16} aria-hidden="true" /> Edit
          </Button>
          <Button onClick={() => onNewDoc(p.id)} disabled={!p.active}>
            {kind === 'supplier' ? 'New purchase' : 'New order'}
          </Button>
        </>
      }
    >
      <dl className={dl}>
        <dt className="text-fg-muted">Status</dt>
        <dd>
          <ActiveBadge active={p.active} />
        </dd>
        <dt className="text-fg-muted">Contact</dt>
        <dd className="text-fg">{p.contactName}</dd>
        <dt className="text-fg-muted">Phone</dt>
        <dd className="tabular text-fg">{p.phone}</dd>
        <dt className="text-fg-muted">Email</dt>
        <dd className="truncate text-fg">{p.email || '—'}</dd>
        <dt className="text-fg-muted">Address</dt>
        <dd className="text-fg">{p.address || '—'}</dd>
        {p.notes ? (
          <>
            <dt className="text-fg-muted">Notes</dt>
            <dd className="text-fg">{p.notes}</dd>
          </>
        ) : null}
      </dl>
      <dl className="mt-5 grid grid-cols-2 overflow-hidden rounded-[var(--radius-control)] border border-line bg-line [gap:1px] text-sm">
        <div className="bg-surface px-3 py-2.5">
          <dt className="text-xs text-fg-muted">{kind === 'supplier' ? 'We owe them' : 'They owe us'}</dt>
          <dd className={cn('tabular text-lg font-semibold', o.overdue ? 'text-danger-strong' : 'text-fg')}>{money(o.total)}</dd>
          <dd className="tabular text-xs text-fg-muted">{o.total ? (o.overdue ? `${rupees(o.overdue)} overdue` : 'None overdue') : 'Nothing outstanding'}</dd>
        </div>
        <div className="bg-surface px-3 py-2.5">
          <dt className="text-xs text-fg-muted">{kind === 'supplier' ? 'Purchases received' : 'Orders delivered'}</dt>
          <dd className="tabular text-lg font-semibold text-fg">{rupees(row.value)}</dd>
          <dd className="text-xs text-fg-muted">All time, before payments</dd>
        </div>
      </dl>
      <h3 className={h3}>{kind === 'supplier' ? 'Purchases' : 'Orders'}</h3>
      {docs.length === 0 ? (
        <p className="mt-1.5 text-sm text-fg-subtle">None yet.</p>
      ) : (
        <ul className={box} aria-label={`${kind === 'supplier' ? 'Purchases from' : 'Orders from'} ${p.name}`}>
          {docs.map((d) => {
            const isP = 'purchase' in d;
            const doc = isP ? d.purchase : d.order;
            return (
              <li key={doc.id}>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenDoc(doc.id);
                  }}
                  className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5 text-left text-sm hover:bg-subtle/50"
                  aria-label={`Open ${doc.ref}`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="tabular block font-medium text-fg">{doc.ref}</span>
                    <span className="block text-xs text-fg-muted">
                      {shortDay(doc.date)} · {pluralLines(doc.lines.length)}
                    </span>
                  </span>
                  <span className="tabular text-right">
                    <span className="block font-semibold text-fg">{rupees(d.total)}</span>
                    {d.balance > 0 ? <span className="block text-xs text-fg-muted">{rupees(d.balance)} due</span> : null}
                  </span>
                  <span className="flex basis-full flex-wrap gap-1.5 sm:basis-auto">
                    {isP ? <DocStatusBadge kind="purchase" status={d.purchase.status} /> : <DocStatusBadge kind="order" status={d.order.status} />}
                    {d.pay !== 'not_due' ? <PayBadge state={d.pay} overdue={d.overdue} /> : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Dialog>
  );
}
const pluralLines = (n: number) => `${n} ${n === 1 ? 'product' : 'products'}`;

// ---------- Purchase / order ----------

export function DocDrawer({
  book,
  kind,
  docId,
  open,
  onClose,
  onEdit,
  onAdvance,
  onCancel,
  onPay,
  onOpenProduct,
}: {
  book: DistributorBook;
  kind: 'purchase' | 'order';
  docId: string | null;
  open: boolean;
  onClose: () => void;
  onEdit: (id: string) => void;
  /** Receive a draft purchase; confirm a draft order or deliver a confirmed one. */
  onAdvance: (id: string, step: 'receive' | 'confirm' | 'fulfil') => void;
  onCancel: (id: string) => void;
  onPay: (id: string) => void;
  onOpenProduct: (id: string) => void;
}) {
  const purchase = kind === 'purchase' ? book.purchases.find((p) => p.id === docId) : undefined;
  const order = kind === 'order' ? book.orders.find((o) => o.id === docId) : undefined;
  const doc = purchase ?? order;
  if (!doc) return null;
  const row = purchase ? purchaseRow(book, purchase) : orderRow(book, order!);
  const partyName = 'supplier' in row ? row.supplier.name : row.customer.name;
  const status = doc.status;
  const editable = status === 'draft' || status === 'confirmed';
  const advance: { step: 'receive' | 'confirm' | 'fulfil'; label: string; icon: typeof Truck } | null =
    kind === 'purchase' ? (status === 'draft' ? { step: 'receive', label: 'Receive stock', icon: PackageCheck } : null) : status === 'draft' ? { step: 'confirm', label: 'Confirm', icon: CircleCheckBig } : status === 'confirmed' ? { step: 'fulfil', label: 'Mark delivered', icon: Truck } : null;
  const short = order && (status === 'draft' || status === 'confirmed') ? shortfalls(book, order, status === 'draft' ? 'confirm' : 'fulfil') : [];
  const paid = 'received' in row ? row.received : row.paid;
  const word = kind === 'purchase' ? 'purchase' : 'order';
  const timeline: [string, string | undefined][] =
    kind === 'purchase'
      ? [
          ['Purchase date', purchase!.date],
          ['Received', purchase!.receivedOn],
          ['Payment due', purchase!.dueDate],
          ['Cancelled', purchase!.cancelledOn],
        ]
      : [
          ['Order date', order!.date],
          ['Confirmed', order!.confirmedOn],
          ['Delivered', order!.fulfilledOn],
          ['Payment due', order!.dueDate],
          ['Cancelled', order!.cancelledOn],
        ];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      variant="drawer"
      title={`${doc.ref} · ${partyName}`}
      description={kind === 'purchase' ? 'Purchase from a supplier' : 'Sales order'}
      footer={
        <>
          {editable && (kind === 'order' || status === 'draft') ? (
            <Button variant="subtle" onClick={() => onCancel(doc.id)}>
              <CircleX size={16} aria-hidden="true" /> Cancel {word}
            </Button>
          ) : null}
          {editable && (kind === 'order' || status === 'draft') ? (
            <Button variant="secondary" onClick={() => onEdit(doc.id)}>
              <Pencil size={16} aria-hidden="true" /> Edit
            </Button>
          ) : null}
          {advance ? (
            <Button onClick={() => onAdvance(doc.id, advance.step)}>
              <advance.icon size={16} aria-hidden="true" /> {advance.label}
            </Button>
          ) : null}
          {row.balance > 0 ? (
            <Button onClick={() => onPay(doc.id)}>
              <IndianRupee size={16} aria-hidden="true" /> Record payment
            </Button>
          ) : null}
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        {purchase ? <DocStatusBadge kind="purchase" status={purchase.status} /> : <DocStatusBadge kind="order" status={order!.status} />}
        {row.pay !== 'not_due' ? <PayBadge state={row.pay} overdue={row.overdue} /> : null}
      </div>
      <dl className={cn(dl, 'mt-4')}>
        {timeline
          .filter(([, d]) => d)
          .map(([label, d]) => (
            <div key={label} className="contents">
              <dt className="text-fg-muted">{label}</dt>
              <dd className="tabular text-fg">{longDate(d!)}</dd>
            </div>
          ))}
      </dl>

      <h3 className={h3}>Products</h3>
      <ul className={box} aria-label={`Lines of ${doc.ref}`}>
        {doc.lines.map((l) => {
          const s = short.find((x) => x.line.productId === l.productId);
          return (
            <li key={l.productId} className="px-3 py-2.5 text-sm">
              <div className="flex items-start justify-between gap-3">
                <button type="button" onClick={() => onOpenProduct(l.productId)} className="min-w-0 text-left" aria-label={`Open product ${l.name}`}>
                  <span className="block font-medium text-fg hover:underline">{l.name}</span>
                  <span className="tabular block text-xs text-fg-muted">
                    {l.sku} · {unitText(l.unit, l.qty)} × {money(l.unitPaise)}
                  </span>
                </button>
                <span className="tabular shrink-0 font-semibold text-fg">{money(lineTotal(l))}</span>
              </div>
              {s ? (
                <p className="tabular mt-1 text-xs font-medium text-warning-strong">
                  Short: {status === 'draft' ? `${Math.max(0, s.available)} free` : `${s.onHand} in stock`}, needs {s.line.qty}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
      <dl className="tabular mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 text-sm">
        <dt className="font-medium text-fg">Total</dt>
        <dd className="text-right text-base font-semibold text-fg">{money(docTotal(doc.lines))}</dd>
        {status === (kind === 'purchase' ? 'received' : 'fulfilled') ? (
          <>
            <dt className="text-fg-muted">{kind === 'purchase' ? 'Paid' : 'Received'}</dt>
            <dd className="text-right text-fg">{money(paid)}</dd>
            <dt className="text-fg-muted">Balance due</dt>
            <dd className={cn('text-right font-semibold', row.overdue ? 'text-danger-strong' : 'text-fg')}>{money(row.balance)}</dd>
          </>
        ) : null}
      </dl>
      <p className="mt-1 text-right text-xs text-fg-muted">No tax or discount in this demo.</p>

      {status === 'draft' || status === 'confirmed' ? (
        <p className="mt-4 rounded-[var(--radius-control)] bg-subtle px-3 py-2.5 text-sm text-fg-muted">
          {kind === 'purchase'
            ? 'A draft hasn’t changed stock. Receiving adds every line to stock once and starts the payment terms.'
            : status === 'draft'
              ? 'A draft doesn’t affect stock or balances. Confirming checks there’s enough free stock.'
              : 'Confirmed: stock is set aside on paper but not deducted. Delivering deducts it once and starts the payment terms.'}
        </p>
      ) : null}
      {status === 'received' || status === 'fulfilled' ? <p className="mt-4 text-xs text-fg-muted">This {word} is final: its stock is in the ledger, so it can’t be edited or cancelled in this demo.</p> : null}
      {doc.notes ? (
        <>
          <h3 className={h3}>Notes</h3>
          <p className="mt-1 text-sm text-fg">{doc.notes}</p>
        </>
      ) : null}

      <h3 className={h3}>Payments</h3>
      {row.payments.length === 0 ? (
        <p className="mt-1.5 text-sm text-fg-subtle">{row.pay === 'not_due' ? `Nothing is owed until the ${kind === 'purchase' ? 'purchase is received' : 'order is delivered'}.` : 'No payments yet.'}</p>
      ) : (
        <ul className={box} aria-label={`Payments for ${doc.ref}`}>
          {row.payments.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span>
                <span className="tabular block text-fg">{longDate(p.date)}</span>
                <span className="block text-xs text-fg-muted">
                  {labelOf(paymentMethods, p.method)}
                  {p.note ? ` · ${p.note}` : ''}
                </span>
              </span>
              <span className="tabular font-semibold text-success-strong">{money(p.amountPaise)}</span>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}
