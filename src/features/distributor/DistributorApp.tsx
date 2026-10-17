import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Boxes,
  ClipboardList,
  Factory,
  IndianRupee,
  Info,
  LayoutDashboard,
  PackageCheck,
  PackagePlus,
  Plus,
  SearchX,
  ShoppingCart,
  Store,
  Truck,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import type { DistributorBook, MovementType } from '../../types/distributor';
import { distributorBusiness } from '../../data/distributorSample';
import {
  customerRows,
  docTotal,
  emptyOrder,
  emptyParty,
  emptyProduct,
  emptyPurchase,
  filterOrders,
  filterParties,
  filterPayments,
  filterProducts,
  filterPurchases,
  labelOf,
  ledger,
  lowStockRows,
  money,
  movementLabels,
  orderRows,
  orderToInput,
  overview,
  partyToInput,
  payableDocs,
  paymentMethods,
  paymentRows,
  periodOptions,
  productOf,
  productRows,
  productToInput,
  purchaseRows,
  purchaseToInput,
  rangeFor,
  recentActivity,
  rupees,
  categoriesOf,
  stockOf,
  supplierRows,
  unitText,
  type OrderInput,
  type PartyKind,
  type PartyRow,
  type PeriodKey,
  type PurchaseInput,
} from './distributorLogic';
import { useDistributorDemo } from './useDistributorDemo';
import { DocFormDrawer, PartyFormDrawer, ProductFormDrawer } from './Forms';
import { DocDrawer, PartyDrawer, ProductDrawer } from './Drawers';
import { AdjustStockDialog, ConfirmDialog, PaymentDialog } from './ActionDialogs';
import { ActiveBadge, DocStatusBadge, Empty, FilterBar, Figures, ListCard, PageHeading, PayBadge, Qty, SearchBox, SelectBox, StockBadge, longDate, shortDay, rowClass, td, tdFirst, th, theadClass, thFirst } from './DistributorBits';
import { Button } from '../../components/Button';
import { Panel } from '../../components/Panel';
import { ToastRegion, useToast } from '../../components/Toast';
import { pluralize } from '../../utils/format';
import { cn } from '../../utils/cn';

type Section = 'dashboard' | 'products' | 'suppliers' | 'purchases' | 'customers' | 'orders' | 'payments';
const nav: { name: Section; label: string; icon: LucideIcon }[] = [
  { name: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { name: 'products', label: 'Products & Inventory', icon: Boxes },
  { name: 'suppliers', label: 'Suppliers', icon: Factory },
  { name: 'purchases', label: 'Purchases', icon: ClipboardList },
  { name: 'customers', label: 'Customers', icon: Store },
  { name: 'orders', label: 'Sales Orders', icon: ShoppingCart },
  { name: 'payments', label: 'Payments', icon: Wallet },
];

type DocKind = 'purchase' | 'order';
type Pending = { kind: DocKind; id: string; step: 'receive' | 'confirm' | 'fulfil' | 'cancel' };

/**
 * Small Distributor Management demo with a fictional wholesaler. Every view
 * reads the same in-memory book (useDistributorDemo), so receiving, delivering,
 * adjusting and paying update stock, balances and the dashboard together.
 */
export function DistributorApp() {
  const { book, actions } = useDistributorDemo();
  const [section, setSection] = useState<Section>('dashboard');
  const [productFor, setProductFor] = useState<string | null>(null);
  const [partyFor, setPartyFor] = useState<{ kind: PartyKind; id: string } | null>(null);
  const [docFor, setDocFor] = useState<{ kind: DocKind; id: string } | null>(null);
  const [productForm, setProductForm] = useState<{ id?: string } | null>(null);
  const [partyForm, setPartyForm] = useState<{ kind: PartyKind; id?: string } | null>(null);
  const [docForm, setDocForm] = useState<{ kind: DocKind; id?: string; partyId?: string } | null>(null);
  const [adjustFor, setAdjustFor] = useState<string | null>(null);
  const [payFor, setPayFor] = useState<{ direction?: 'in' | 'out'; docId?: string } | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [session, setSession] = useState(0);
  const { toast, notify } = useToast(5000);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [section]);

  const closeDrawers = () => {
    setProductFor(null);
    setPartyFor(null);
    setDocFor(null);
  };
  const bump = () => setSession((n) => n + 1);
  const open = {
    product: (id: string) => {
      closeDrawers();
      setProductFor(id);
    },
    party: (kind: PartyKind, id: string) => {
      closeDrawers();
      setPartyFor({ kind, id });
    },
    doc: (kind: DocKind, id: string) => {
      closeDrawers();
      setDocFor({ kind, id });
    },
    productForm: (id?: string) => {
      closeDrawers();
      setProductForm(id ? { id } : {});
      bump();
    },
    partyForm: (kind: PartyKind, id?: string) => {
      closeDrawers();
      setPartyForm({ kind, ...(id ? { id } : {}) });
      bump();
    },
    docForm: (kind: DocKind, opts: { id?: string; partyId?: string } = {}) => {
      closeDrawers();
      setDocForm({ kind, ...opts });
      bump();
    },
    adjust: (id: string) => {
      closeDrawers();
      setAdjustFor(id);
      bump();
    },
    pay: (opts: { direction?: 'in' | 'out'; docId?: string } = {}) => {
      closeDrawers();
      setPayFor(opts);
      bump();
    },
    pending: (p: Pending) => {
      closeDrawers();
      setPending(p);
      bump();
    },
  };
  const reset = () => {
    actions.reset();
    closeDrawers();
    notify('Sample data restored.');
  };
  const heading = (title: string, action?: ReactNode) => <PageHeading title={title} book={book} onReset={reset} action={action} />;
  const newBtn = (label: string, onClick: () => void, Icon: LucideIcon = Plus) => (
    <Button onClick={onClick}>
      <Icon size={17} aria-hidden="true" /> {label}
    </Button>
  );

  const editingProduct = productForm?.id ? productOf(book, productForm.id) : undefined;
  const editingParty = partyForm?.id ? (partyForm.kind === 'supplier' ? book.suppliers : book.customers).find((p) => p.id === partyForm.id) : undefined;
  const editingDoc = docForm?.id ? (docForm.kind === 'purchase' ? book.purchases.find((p) => p.id === docForm.id) : book.orders.find((o) => o.id === docForm.id)) : undefined;

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col lg:flex-row">
      <aside className="on-inverse border-b border-inverse-line bg-inverse text-on-inverse lg:w-64 lg:shrink-0 lg:border-r lg:border-b-0">
        <div className="flex flex-col gap-4 px-4 py-4 lg:sticky lg:top-14 lg:px-4 lg:py-6">
          <div className="flex items-center justify-between gap-3 lg:block lg:px-1">
            <p className="flex items-center gap-2.5 text-[0.95rem] font-semibold">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-accent text-on-accent">
                <Truck size={17} aria-hidden="true" />
              </span>
              <span className="leading-tight">
                Distributor
                <span className="block text-xs font-normal text-on-inverse-muted">Industry-specific</span>
              </span>
            </p>
            <p className="text-right text-xs text-on-inverse-muted lg:mt-4 lg:text-left">
              {distributorBusiness.name}
              <span className="block">{distributorBusiness.city} · sample business</span>
            </p>
          </div>
          <nav aria-label="Small Distributor Management" className="relative -mx-1 flex gap-1 overflow-x-auto px-1 lg:mt-2 lg:flex-col">
            {nav.map((n) => {
              const active = section === n.name;
              return (
                <button
                  key={n.name}
                  type="button"
                  onClick={() => setSection(n.name)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative inline-flex min-h-10 shrink-0 items-center gap-2.5 rounded-[var(--radius-control)] px-3 text-sm font-medium whitespace-nowrap transition-colors',
                    active ? 'bg-on-inverse/10 text-on-inverse' : 'text-on-inverse-muted hover:bg-on-inverse/5 hover:text-on-inverse',
                  )}
                >
                  {active ? <span className="absolute inset-y-2 left-0 hidden w-0.5 rounded-full bg-accent lg:block" aria-hidden="true" /> : null}
                  <n.icon size={17} aria-hidden="true" />
                  {n.label}
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      <div className="min-w-0 flex-1 bg-canvas">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {section === 'dashboard' ? <DashboardView book={book} heading={heading('Dashboard', newBtn('New order', () => open.docForm('order')))} onOpenProduct={open.product} onOpenOrder={(id) => open.doc('order', id)} onGo={setSection} /> : null}
          {section === 'products' ? <ProductsView book={book} heading={heading('Products & Inventory', newBtn('Add product', () => open.productForm(), PackagePlus))} onOpen={open.product} /> : null}
          {section === 'suppliers' ? <PartiesView book={book} kind="supplier" heading={heading('Suppliers', newBtn('Add supplier', () => open.partyForm('supplier')))} onOpen={(id) => open.party('supplier', id)} /> : null}
          {section === 'customers' ? <PartiesView book={book} kind="customer" heading={heading('Customers', newBtn('Add customer', () => open.partyForm('customer')))} onOpen={(id) => open.party('customer', id)} /> : null}
          {section === 'purchases' ? <DocsView book={book} kind="purchase" heading={heading('Purchases', newBtn('New purchase', () => open.docForm('purchase')))} onOpen={(id) => open.doc('purchase', id)} /> : null}
          {section === 'orders' ? <DocsView book={book} kind="order" heading={heading('Sales Orders', newBtn('New order', () => open.docForm('order')))} onOpen={(id) => open.doc('order', id)} /> : null}
          {section === 'payments' ? <PaymentsView book={book} heading={heading('Payments', newBtn('Record payment', () => open.pay(), IndianRupee))} onPay={(direction, docId) => open.pay({ direction, docId })} onOpenDoc={open.doc} /> : null}
          <p className="mt-8 flex items-start gap-2 border-t border-line pt-4 text-xs text-fg-muted">
            <Info size={14} className="mt-px shrink-0" aria-hidden="true" />
            Everything here is fictional and kept in memory only, on a fixed sample day. Reloading the page or choosing Reset demo restores the sample data. No money moves, nothing is sent, and there is no tax or accounting in this demo.
          </p>
        </div>
      </div>

      <ProductDrawer book={book} productId={productFor} open={productFor !== null} onClose={() => setProductFor(null)} onEdit={(id) => open.productForm(id)} onAdjust={open.adjust} />
      <PartyDrawer
        book={book}
        kind={partyFor?.kind ?? 'customer'}
        partyId={partyFor?.id ?? null}
        open={partyFor !== null}
        onClose={() => setPartyFor(null)}
        onEdit={(id) => open.partyForm(partyFor!.kind, id)}
        onNewDoc={(partyId) => open.docForm(partyFor!.kind === 'supplier' ? 'purchase' : 'order', { partyId })}
        onOpenDoc={(id) => open.doc(partyFor!.kind === 'supplier' ? 'purchase' : 'order', id)}
      />
      <DocDrawer
        book={book}
        kind={docFor?.kind ?? 'order'}
        docId={docFor?.id ?? null}
        open={docFor !== null}
        onClose={() => setDocFor(null)}
        onEdit={(id) => open.docForm(docFor!.kind, { id })}
        onAdvance={(id, step) => open.pending({ kind: docFor!.kind, id, step })}
        onCancel={(id) => open.pending({ kind: docFor!.kind, id, step: 'cancel' })}
        onPay={(id) => open.pay({ direction: docFor!.kind === 'order' ? 'in' : 'out', docId: id })}
        onOpenProduct={open.product}
      />

      {productForm ? (
        <ProductFormDrawer
          key={`pf${session}`}
          book={book}
          mode={editingProduct ? 'edit' : 'create'}
          initial={editingProduct ? productToInput(editingProduct) : emptyProduct()}
          open
          onClose={() => setProductForm(null)}
          onSave={(input) => {
            if (editingProduct) {
              const r = actions.updateProduct(editingProduct.id, input);
              if (r.ok) notify(`Saved ${r.product.name}. Past purchases and orders keep their prices.`);
              return r;
            }
            const r = actions.createProduct(input);
            if (r.ok) notify(`Added ${r.product.name}${stockOf(r.book, r.product.id) ? ` with ${unitText(r.product.unit, stockOf(r.book, r.product.id))} opening stock` : ''}.`);
            return r;
          }}
        />
      ) : null}
      {partyForm ? (
        <PartyFormDrawer
          key={`pa${session}`}
          kind={partyForm.kind}
          mode={editingParty ? 'edit' : 'create'}
          initial={editingParty ? partyToInput(editingParty) : emptyParty()}
          open
          onClose={() => setPartyForm(null)}
          onSave={(input) => {
            const r = actions.saveParty(partyForm.kind, input, editingParty?.id);
            if (r.ok) notify(editingParty ? `Saved ${r.party.name}.` : `Added ${r.party.name}.`);
            return r;
          }}
        />
      ) : null}
      {docForm ? (
        <DocFormDrawer
          key={`df${session}`}
          book={book}
          kind={docForm.kind}
          mode={editingDoc ? 'edit' : 'create'}
          {...(editingDoc ? { editingId: editingDoc.id } : {})}
          initial={
            editingDoc
              ? 'supplierId' in editingDoc
                ? purchaseToInput(editingDoc)
                : orderToInput(editingDoc)
              : docForm.kind === 'purchase'
                ? { ...emptyPurchase(book), ...(docForm.partyId ? { supplierId: docForm.partyId } : {}) }
                : { ...emptyOrder(book), ...(docForm.partyId ? { customerId: docForm.partyId } : {}) }
          }
          open
          onClose={() => setDocForm(null)}
          onSave={(input) => {
            if (docForm.kind === 'purchase') {
              const r = editingDoc ? actions.updatePurchase(editingDoc.id, input as PurchaseInput) : actions.createPurchase(input as PurchaseInput, false);
              if (r.ok) notify(editingDoc ? `Saved ${r.purchase.ref}.` : `${r.purchase.ref} saved as a draft. Stock is added when you receive it.`);
              return r;
            }
            const r = editingDoc ? actions.updateOrder(editingDoc.id, input as OrderInput) : actions.createOrder(input as OrderInput, false);
            if (r.ok) notify(editingDoc ? `Saved ${r.order.ref}.` : `${r.order.ref} saved as a draft.`);
            return r;
          }}
          onSaveAndAdvance={(input) => {
            if (docForm.kind === 'purchase') {
              const r = actions.createPurchase(input as PurchaseInput, true);
              if (r.ok) notify(`${r.purchase.ref} received: stock added for ${pluralize(r.purchase.lines.length, 'product')}. ${money(docTotal(r.purchase.lines))} now owed to the supplier.`);
              return r;
            }
            const r = actions.createOrder(input as OrderInput, true);
            if (r.ok) notify(`${r.order.ref} confirmed. Stock is deducted when it’s delivered.`);
            return r;
          }}
        />
      ) : null}
      {adjustFor ? (
        <AdjustStockDialog
          key={`ad${session}`}
          book={book}
          productId={adjustFor}
          open
          onClose={() => setAdjustFor(null)}
          onSave={(input) => {
            const r = actions.adjustStock(input);
            if (r.ok) {
              const p = productOf(r.book, r.movement.productId)!;
              notify(`${p.name}: ${r.movement.qty > 0 ? '+' : '−'}${Math.abs(r.movement.qty)} (${r.movement.reason}). Now ${unitText(p.unit, r.movement.balanceAfter)}.`);
            }
            return r;
          }}
        />
      ) : null}
      {payFor ? (
        <PaymentDialog
          key={`py${session}`}
          book={book}
          {...(payFor.direction ? { direction: payFor.direction } : {})}
          {...(payFor.docId ? { docId: payFor.docId } : {})}
          open
          onClose={() => setPayFor(null)}
          onSave={(input) => {
            const r = actions.pay(input);
            if (r.ok) {
              const d = 'order' in r.row ? { ref: r.row.order.ref, who: r.row.customer.name } : { ref: r.row.purchase.ref, who: r.row.supplier.name };
              notify(`${money(r.payment.amountPaise)} ${input.direction === 'in' ? 'received from' : 'paid to'} ${d.who} for ${d.ref} by ${labelOf(paymentMethods, r.payment.method)}. ${r.row.balance > 0 ? `${money(r.row.balance)} still due.` : 'Fully paid.'}`);
            }
            return r;
          }}
        />
      ) : null}
      {pending ? <PendingDialog key={`pe${session}`} book={book} pending={pending} onClose={() => setPending(null)} actions={actions} notify={notify} onOpenDoc={open.doc} /> : null}
      <ToastRegion toast={toast} />
    </div>
  );
}

// ---------- Confirmations ----------

function PendingDialog({
  book,
  pending,
  onClose,
  actions,
  notify,
  onOpenDoc,
}: {
  book: DistributorBook;
  pending: Pending;
  onClose: () => void;
  actions: ReturnType<typeof useDistributorDemo>['actions'];
  notify: (m: string, tone?: 'success' | 'info') => void;
  onOpenDoc: (kind: DocKind, id: string) => void;
}) {
  const doc = pending.kind === 'purchase' ? book.purchases.find((p) => p.id === pending.id) : book.orders.find((o) => o.id === pending.id);
  if (!doc) return null;
  const party = pending.kind === 'purchase' ? book.suppliers.find((s) => s.id === (doc as { supplierId: string }).supplierId) : book.customers.find((c) => c.id === (doc as { customerId: string }).customerId);
  const total = money(docTotal(doc.lines));
  const after = (fn: () => void) => {
    fn();
    onOpenDoc(pending.kind, pending.id);
  };
  const lines = (sign: 1 | -1 | 0) => (
    <ul className="divide-y divide-line rounded-[var(--radius-control)] border border-line text-sm">
      {doc.lines.map((l) => {
        const now = stockOf(book, l.productId);
        return (
          <li key={l.productId} className="flex items-center justify-between gap-3 px-3 py-2">
            <span className="min-w-0 truncate text-fg">{l.name}</span>
            <span className="tabular shrink-0 text-xs text-fg-muted">
              {sign ? (
                <>
                  <Qty n={sign * l.qty} /> · {now} → {now + sign * l.qty}
                </>
              ) : (
                <>
                  {unitText(l.unit, l.qty)} · {now} in stock
                </>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
  const p = pending;
  if (p.step === 'receive')
    return (
      <ConfirmDialog
        open
        title={`Receive ${doc.ref}?`}
        description={`Adds these quantities to stock once, dated today. ${total} becomes owed to ${party?.name}, due in ${party?.creditDays ?? 0} days. This can’t be undone.`}
        confirmLabel="Receive stock"
        onClose={onClose}
        onConfirm={() => {
          const r = actions.receivePurchase(p.id);
          if (r.ok) after(() => notify(`${doc.ref} received. Stock added for ${pluralize(doc.lines.length, 'product')}; ${total} owed to ${party?.name}.`));
          return r;
        }}
      >
        {lines(1)}
      </ConfirmDialog>
    );
  if (p.step === 'confirm')
    return (
      <ConfirmDialog
        open
        title={`Confirm ${doc.ref}?`}
        description="Checks there’s enough stock not already promised to other confirmed orders. Nothing is deducted until delivery."
        confirmLabel="Confirm order"
        onClose={onClose}
        onConfirm={() => {
          const r = actions.confirmOrder(p.id);
          if (r.ok) after(() => notify(`${doc.ref} confirmed. Stock is deducted when it’s delivered.`));
          return r;
        }}
      >
        {lines(0)}
      </ConfirmDialog>
    );
  if (p.step === 'fulfil')
    return (
      <ConfirmDialog
        open
        title={`Mark ${doc.ref} delivered?`}
        description={`Deducts these quantities from stock once, dated today. ${party?.name} will owe ${total}, due in ${party?.creditDays ?? 0} days. Delivered isn’t paid: record payments separately.`}
        confirmLabel="Mark delivered"
        onClose={onClose}
        onConfirm={() => {
          const r = actions.fulfilOrder(p.id);
          if (r.ok) after(() => notify(`${doc.ref} delivered. Stock deducted; ${total} owed by ${party?.name}, due ${longDate(r.order.dueDate!)}.`));
          return r;
        }}
      >
        {lines(-1)}
      </ConfirmDialog>
    );
  return (
    <ConfirmDialog
      open
      destructive
      title={`Cancel ${doc.ref}?`}
      description={pending.kind === 'purchase' ? 'The draft stays on record as cancelled. Stock and balances don’t change.' : 'The order stays on record as cancelled. Stock and balances don’t change, and it can’t be reopened.'}
      confirmLabel={`Cancel ${pending.kind === 'purchase' ? 'purchase' : 'order'}`}
      onClose={onClose}
      onConfirm={() => {
        const r = pending.kind === 'purchase' ? actions.cancelPurchase(p.id) : actions.cancelOrder(p.id);
        if (r.ok) after(() => notify(`${doc.ref} cancelled. Nothing in stock or balances changed.`, 'info'));
        return r;
      }}
    />
  );
}

// ---------- Dashboard ----------

function DashboardView({ book, heading, onOpenProduct, onOpenOrder, onGo }: { book: DistributorBook; heading: ReactNode; onOpenProduct: (id: string) => void; onOpenOrder: (id: string) => void; onGo: (s: Section) => void }) {
  const id = useId();
  const [period, setPeriod] = useState<PeriodKey>('mtd');
  const range = rangeFor(book.today, period);
  const o = overview(book, range);
  const low = lowStockRows(book);
  const recentOrders = orderRows(book).slice(0, 6);
  const activity = recentActivity(book, 8);

  return (
    <div className="space-y-5">
      {heading}
      <div className="flex flex-col gap-3 rounded-[var(--radius-panel)] border border-line bg-surface p-3 shadow-[var(--shadow-panel)] sm:flex-row sm:items-end sm:justify-between sm:px-4">
        <div>
          <h2 className="text-base font-semibold text-fg">Reporting period</h2>
          <p className="tabular text-xs text-fg-muted" aria-live="polite">
            {range.label}
          </p>
        </div>
        <SelectBox id={`${id}-period`} label="Period" value={period} onChange={(v) => setPeriod(v as PeriodKey)} className="sm:w-52">
          {periodOptions.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </SelectBox>
      </div>

      <section aria-labelledby={`${id}-flow`} className="space-y-2">
        <h2 id={`${id}-flow`} className="text-sm font-semibold text-fg">
          In this period
        </h2>
        <Figures
          label="In this period"
          className="lg:grid-cols-4"
          figures={[
            { label: 'Sales', value: rupees(o.sales.value), note: `${pluralize(o.sales.count, 'order')} delivered · not money received` },
            { label: 'Collected from customers', value: rupees(o.collected.value), note: `${pluralize(o.collected.count, 'payment')} received`, tone: 'text-success-strong' },
            { label: 'Purchases', value: rupees(o.purchases.value), note: `${pluralize(o.purchases.count, 'purchase')} received · not money paid` },
            { label: 'Paid to suppliers', value: rupees(o.paidOut.value), note: `${pluralize(o.paidOut.count, 'payment')} made` },
          ]}
        />
      </section>

      <section aria-labelledby={`${id}-now`} className="space-y-2">
        <h2 id={`${id}-now`} className="text-sm font-semibold text-fg">
          Right now
        </h2>
        <Figures
          label="Right now"
          className="sm:grid-cols-3 xl:grid-cols-6"
          figures={[
            { label: 'Active products', value: o.activeProducts, note: `${book.products.length - o.activeProducts} inactive` },
            { label: 'Low stock', value: o.lowStock, note: o.outOfStock ? `${o.outOfStock} out of stock` : 'At or below reorder level', ...(o.lowStock ? { tone: 'text-warning-strong' } : {}) },
            { label: 'Stock value at cost', value: rupees(o.inventoryCost), note: 'What it cost to buy' },
            { label: 'Stock at selling price', value: rupees(o.inventorySaleValue), note: 'Potential sales, not earned' },
            { label: 'Customers owe you', value: rupees(o.receivables.total), note: o.receivables.overdue ? `${rupees(o.receivables.overdue)} overdue` : 'None overdue', ...(o.receivables.overdue ? { tone: 'text-danger-strong' } : {}) },
            { label: 'You owe suppliers', value: rupees(o.payables.total), note: o.payables.overdue ? `${rupees(o.payables.overdue)} overdue` : 'None overdue' },
          ]}
        />
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Low stock" description="Active products at or below their reorder level." aside={<Button variant="subtle" size="sm" onClick={() => onGo('products')}>All products</Button>}>
          {low.length === 0 ? (
            <Empty icon={Boxes} title="Nothing is low" text="Every active product is above its reorder level." />
          ) : (
            <ul className="divide-y divide-line">
              {low.map((r) => (
                <li key={r.product.id}>
                  <button type="button" onClick={() => onOpenProduct(r.product.id)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-subtle/40 sm:px-5" aria-label={`Open ${r.product.name}`}>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-fg">{r.product.name}</span>
                      <span className="tabular block text-xs text-fg-muted">
                        {r.product.sku} · reorder at {r.product.reorderLevel}
                        {r.committed ? ` · ${r.committed} promised` : ''}
                      </span>
                    </span>
                    <span className="tabular text-right text-sm font-semibold text-warning-strong">{unitText(r.product.unit, r.stock)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Recent orders" aside={<Button variant="subtle" size="sm" onClick={() => onGo('orders')}>All orders</Button>}>
          <ul className="divide-y divide-line">
            {recentOrders.map((r) => (
              <li key={r.order.id}>
                <button type="button" onClick={() => onOpenOrder(r.order.id)} className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-left hover:bg-subtle/40 sm:px-5" aria-label={`Open ${r.order.ref}`}>
                  <span className="min-w-0 flex-1 basis-full sm:basis-0">
                    <span className="block truncate text-sm font-medium text-fg">
                      <span className="tabular">{r.order.ref}</span> · {r.customer.name}
                    </span>
                    <span className="block text-xs text-fg-muted">{shortDay(r.order.date)}</span>
                  </span>
                  <span className="tabular text-sm font-semibold text-fg max-sm:mr-auto">{rupees(r.total)}</span>
                  <DocStatusBadge kind="order" status={r.order.status} />
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <Panel title="Recent activity" description="Stock received and delivered, payments and adjustments.">
        <ul className="divide-y divide-line">
          {activity.map((a, i) => {
            const meta: Record<typeof a.kind, { icon: LucideIcon; tone: string }> = {
              received: { icon: PackageCheck, tone: 'text-fg-muted' },
              delivered: { icon: Truck, tone: 'text-fg-muted' },
              payment_in: { icon: ArrowDownLeft, tone: 'text-success-strong' },
              payment_out: { icon: ArrowUpRight, tone: 'text-fg' },
              adjustment: { icon: Boxes, tone: 'text-fg-muted' },
            };
            const M = meta[a.kind];
            return (
              <li key={`${a.kind}${a.seq}${i}`} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
                <M.icon size={16} className="shrink-0 text-fg-subtle" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-fg">{a.text}</span>
                  <span className="block truncate text-xs text-fg-muted">
                    {shortDay(a.date)} · {a.detail}
                  </span>
                </span>
                {a.amount !== undefined ? <span className={cn('tabular text-sm font-semibold', M.tone)}>{a.kind === 'payment_in' ? '+' : a.kind === 'payment_out' ? '−' : ''}{rupees(a.amount)}</span> : null}
              </li>
            );
          })}
        </ul>
      </Panel>
    </div>
  );
}

// ---------- Products & Inventory ----------

function ProductsView({ book, heading, onOpen }: { book: DistributorBook; heading: ReactNode; onOpen: (id: string) => void }) {
  const [tab, setTab] = useState<'products' | 'movements'>('products');
  return (
    <div className="space-y-5">
      {heading}
      <div role="tablist" aria-label="Inventory" className="inline-flex rounded-[var(--radius-control)] border border-line bg-surface p-1 shadow-[var(--shadow-panel)]">
        {(
          [
            ['products', 'Products'],
            ['movements', 'Stock movements'],
          ] as const
        ).map(([v, label]) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={tab === v}
            onClick={() => setTab(v)}
            className={cn('min-h-9 rounded-[calc(var(--radius-control)-2px)] px-3 text-sm font-medium transition-colors', tab === v ? 'bg-accent-soft text-accent-strong' : 'text-fg-muted hover:text-fg')}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'products' ? <ProductTable book={book} onOpen={onOpen} /> : <MovementTable book={book} onOpenProduct={onOpen} />}
    </div>
  );
}

function ProductTable({ book, onOpen }: { book: DistributorBook; onOpen: (id: string) => void }) {
  const id = useId();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState<'active' | 'inactive' | 'all'>('active');
  const [stock, setStock] = useState<'all' | 'low' | 'out'>('all');
  const rows = useMemo(() => productRows(book), [book]);
  const visible = filterProducts(rows, { query, category, status, stock });
  const filtered = query.trim() !== '' || category !== 'all' || status !== 'active' || stock !== 'all';
  const totalCost = visible.reduce((s, r) => s + r.costValue, 0);
  return (
    <ListCard label="Product list">
      <FilterBar
        filtered={filtered}
        onClear={() => {
          setQuery('');
          setCategory('all');
          setStatus('active');
          setStock('all');
        }}
      >
        <SearchBox id={`${id}-q`} label="Search products by name, SKU or category" placeholder="Name, SKU or category" value={query} onChange={setQuery} className="lg:w-64" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:flex">
          <SelectBox id={`${id}-cat`} label="Category" value={category} onChange={setCategory} className="lg:w-40">
            <option value="all">All categories</option>
            {categoriesOf(book).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </SelectBox>
          <SelectBox id={`${id}-status`} label="Status" value={status} onChange={(v) => setStatus(v as typeof status)} className="lg:w-32">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="all">All</option>
          </SelectBox>
          <SelectBox id={`${id}-stock`} label="Stock" value={stock} onChange={(v) => setStock(v as typeof stock)} className="lg:w-36">
            <option value="all">Any stock</option>
            <option value="low">Low stock</option>
            <option value="out">Out of stock</option>
          </SelectBox>
        </div>
      </FilterBar>
      <p className="sr-only" aria-live="polite">
        Showing {visible.length} products
      </p>
      {visible.length === 0 ? (
        <Empty icon={SearchX} title="No products match" text="Try another name, SKU or category, or change the filters." />
      ) : (
        <div className="@container">
          <table className="hidden w-full table-fixed text-left text-sm @4xl:table">
            <caption className="sr-only">Products</caption>
            <colgroup>
              <col />
              <col className="w-28" />
              <col className="w-20" />
              <col className="w-20" />
              <col className="w-40" />
              <col className="w-28" />
              <col className="w-32" />
            </colgroup>
            <thead className={theadClass}>
              <tr>
                <th scope="col" className={thFirst}>Product</th>
                <th scope="col" className={th}>Category</th>
                <th scope="col" className={cn(th, 'text-right')}>Cost</th>
                <th scope="col" className={cn(th, 'text-right')}>Price</th>
                <th scope="col" className={cn(th, 'text-right')}>In stock</th>
                <th scope="col" className={cn(th, 'text-right')}>Value at cost</th>
                <th scope="col" className={th}>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {visible.map((r) => (
                <tr key={r.product.id} className={cn(rowClass, !r.product.active && 'text-fg-muted')}>
                  <td className={tdFirst}>
                    <button type="button" onClick={() => onOpen(r.product.id)} className="block max-w-full truncate text-left font-medium text-fg hover:underline" aria-label={`Open ${r.product.name}`}>
                      {r.product.name}
                    </button>
                    <span className="tabular block text-xs text-fg-muted">
                      {r.product.sku} · per {r.product.unit}
                    </span>
                  </td>
                  <td className={cn(td, 'truncate text-fg-muted')}>{r.product.category}</td>
                  <td className={cn(td, 'tabular text-right text-fg-muted')}>{rupees(r.product.costPaise)}</td>
                  <td className={cn(td, 'tabular text-right text-fg')}>{rupees(r.product.pricePaise)}</td>
                  <td className={cn(td, 'text-right')}>
                    <span className={cn('tabular block font-semibold', r.low ? 'text-warning-strong' : 'text-fg')}>{unitText(r.product.unit, r.stock)}</span>
                    <span className="tabular block text-xs text-fg-muted">
                      reorder at {r.product.reorderLevel}
                      {r.committed ? ` · ${r.committed} promised` : ''}
                    </span>
                  </td>
                  <td className={cn(td, 'tabular text-right text-fg')}>{rupees(r.costValue)}</td>
                  <td className={td}>
                    <span className="flex flex-col items-start gap-1">
                      {r.product.active ? <StockBadge stock={r.stock} low={r.low} active /> : <ActiveBadge active={false} />}
                      {r.product.active && !r.low && r.stock > 0 ? <span className="text-xs text-fg-subtle">In stock</span> : null}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="divide-y divide-line @4xl:hidden" aria-label="Products">
            {visible.map((r) => (
              <li key={r.product.id}>
                <button type="button" onClick={() => onOpen(r.product.id)} className="block w-full px-4 py-3 text-left" aria-label={`Open ${r.product.name}`}>
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block font-medium text-fg">{r.product.name}</span>
                      <span className="tabular block text-xs text-fg-muted">
                        {r.product.sku} · {r.product.category}
                      </span>
                    </span>
                    <span className={cn('tabular shrink-0 text-right text-sm font-semibold', r.low ? 'text-warning-strong' : 'text-fg')}>{unitText(r.product.unit, r.stock)}</span>
                  </span>
                  <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                    {r.product.active ? <StockBadge stock={r.stock} low={r.low} active /> : <ActiveBadge active={false} />}
                    <span className="tabular text-xs text-fg-muted">
                      Cost {rupees(r.product.costPaise)} · price {rupees(r.product.pricePaise)} · reorder at {r.product.reorderLevel}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="tabular border-t border-line px-4 py-2.5 text-right text-xs text-fg-muted sm:px-5">
            {pluralize(visible.length, 'product')} · stock value at cost {rupees(totalCost)}
          </p>
        </div>
      )}
    </ListCard>
  );
}

function MovementTable({ book, onOpenProduct }: { book: DistributorBook; onOpenProduct: (id: string) => void }) {
  const id = useId();
  const [query, setQuery] = useState('');
  const [productId, setProductId] = useState('all');
  const [type, setType] = useState<MovementType | 'all'>('all');
  const rows = ledger(book, { productId, type, query });
  const shown = rows.slice(0, 50);
  const filtered = query.trim() !== '' || productId !== 'all' || type !== 'all';
  return (
    <>
      <p className="flex items-start gap-2 text-sm text-fg-muted">
        <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        Every change to stock is a line here: opening stock, purchases received (in), orders delivered (out) and adjustments with a reason. “Balance” is the product’s stock straight after that line.
      </p>
      <ListCard label="Stock movements">
        <FilterBar
          filtered={filtered}
          onClear={() => {
            setQuery('');
            setProductId('all');
            setType('all');
          }}
        >
          <SearchBox id={`${id}-q`} label="Search movements by product, reference or reason" placeholder="Product, reference or reason" value={query} onChange={setQuery} className="lg:w-64" />
          <div className="grid grid-cols-2 gap-3 lg:flex">
            <SelectBox id={`${id}-product`} label="Product" value={productId} onChange={setProductId} className="lg:w-56">
              <option value="all">All products</option>
              {[...book.products]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </SelectBox>
            <SelectBox id={`${id}-type`} label="Type" value={type} onChange={(v) => setType(v as typeof type)} className="lg:w-44">
              <option value="all">All types</option>
              {(Object.keys(movementLabels) as MovementType[]).map((t) => (
                <option key={t} value={t}>
                  {movementLabels[t]}
                </option>
              ))}
            </SelectBox>
          </div>
        </FilterBar>
        {rows.length === 0 ? (
          <Empty icon={SearchX} title="No movements match" text="Try another product, type or search." />
        ) : (
          <div className="@container">
            <table className="hidden w-full table-fixed text-left text-sm @4xl:table">
              <caption className="sr-only">Stock movements, newest first</caption>
              <colgroup>
                <col className="w-28" />
                <col />
                <col className="w-48" />
                <col className="w-56" />
                <col className="w-20" />
                <col className="w-20" />
              </colgroup>
              <thead className={theadClass}>
                <tr>
                  <th scope="col" className={thFirst}>Date</th>
                  <th scope="col" className={th}>Product</th>
                  <th scope="col" className={th}>Type and reference</th>
                  <th scope="col" className={th}>Reason</th>
                  <th scope="col" className={cn(th, 'text-right')}>In / out</th>
                  <th scope="col" className={cn(th, 'text-right')}>Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {shown.map(({ movement: m, product, refText }) => (
                  <tr key={m.id} className={rowClass}>
                    <td className={cn(tdFirst, 'tabular text-fg-muted')}>{shortDay(m.date)}</td>
                    <td className={td}>
                      <button type="button" onClick={() => onOpenProduct(product.id)} className="block max-w-full truncate text-left text-fg hover:underline">
                        {product.name}
                      </button>
                      <span className="tabular block text-xs text-fg-muted">{product.sku}</span>
                    </td>
                    <td className={td}>
                      <span className="block text-fg">{movementLabels[m.type]}</span>
                      {refText ? <span className="tabular block text-xs text-fg-muted">{refText}</span> : null}
                    </td>
                    <td className={cn(td, 'text-fg-muted')}>
                      <span className="block truncate">{m.reason}</span>
                      {m.note ? <span className="block truncate text-xs">{m.note}</span> : null}
                    </td>
                    <td className={cn(td, 'text-right')}>
                      <Qty n={m.qty} />
                    </td>
                    <td className={cn(td, 'tabular text-right text-fg')}>{m.balanceAfter}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ul className="divide-y divide-line @4xl:hidden" aria-label="Stock movements">
              {shown.map(({ movement: m, product, refText }) => (
                <li key={m.id} className="flex items-start justify-between gap-3 px-4 py-2.5 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-fg">{product.name}</span>
                    <span className="block text-xs text-fg-muted">
                      {shortDay(m.date)} · {movementLabels[m.type]}
                      {refText ? ` · ${refText}` : ''}
                    </span>
                    <span className="block truncate text-xs text-fg-muted">
                      {m.reason}
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
            <p className="border-t border-line px-4 py-2.5 text-right text-xs text-fg-muted sm:px-5">{rows.length > shown.length ? `Showing the newest 50 of ${rows.length} movements. Filter by product to see all of one product’s history.` : pluralize(rows.length, 'movement')}</p>
          </div>
        )}
      </ListCard>
    </>
  );
}

// ---------- Suppliers / customers ----------

function PartiesView({ book, kind, heading, onOpen }: { book: DistributorBook; kind: PartyKind; heading: ReactNode; onOpen: (id: string) => void }) {
  const id = useId();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive' | 'all'>('active');
  const [balance, setBalance] = useState<'all' | 'owing' | 'overdue'>('all');
  const rows: PartyRow[] = useMemo(() => (kind === 'supplier' ? supplierRows(book) : customerRows(book)), [book, kind]);
  const visible = filterParties(rows, { query, status, balance });
  const filtered = query.trim() !== '' || status !== 'active' || balance !== 'all';
  const word = kind === 'supplier' ? 'suppliers' : 'customers';
  const docWord = kind === 'supplier' ? 'Purchases' : 'Orders';
  const owedLabel = kind === 'supplier' ? 'You owe' : 'They owe';
  return (
    <div className="space-y-5">
      {heading}
      <ListCard label={kind === 'supplier' ? 'Supplier list' : 'Customer list'}>
        <FilterBar
          filtered={filtered}
          onClear={() => {
            setQuery('');
            setStatus('active');
            setBalance('all');
          }}
        >
          <SearchBox id={`${id}-q`} label={`Search ${word} by name, contact, phone or area`} placeholder="Name, contact, phone or area" value={query} onChange={setQuery} className="lg:w-72" />
          <div className="grid grid-cols-2 gap-3 lg:flex">
            <SelectBox id={`${id}-status`} label="Status" value={status} onChange={(v) => setStatus(v as typeof status)} className="lg:w-32">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="all">All</option>
            </SelectBox>
            <SelectBox id={`${id}-balance`} label="Balance" value={balance} onChange={(v) => setBalance(v as typeof balance)} className="lg:w-40">
              <option value="all">Any balance</option>
              <option value="owing">Something owed</option>
              <option value="overdue">Overdue</option>
            </SelectBox>
          </div>
        </FilterBar>
        <p className="sr-only" aria-live="polite">
          Showing {visible.length} {word}
        </p>
        {visible.length === 0 ? (
          <Empty icon={SearchX} title={`No ${word} match`} text="Try another name or phone number, or change the filters." />
        ) : (
          <div className="@container">
            <table className="hidden w-full table-fixed text-left text-sm @3xl:table">
              <caption className="sr-only">{word}</caption>
              <colgroup>
                <col />
                <col className="w-40" />
                <col className="w-24" />
                <col className="w-24" />
                <col className="w-36" />
                <col className="w-24" />
              </colgroup>
              <thead className={theadClass}>
                <tr>
                  <th scope="col" className={thFirst}>Name</th>
                  <th scope="col" className={th}>Phone</th>
                  <th scope="col" className={cn(th, 'text-right')}>Credit</th>
                  <th scope="col" className={cn(th, 'text-right')}>{docWord}</th>
                  <th scope="col" className={cn(th, 'text-right')}>{owedLabel}</th>
                  <th scope="col" className={th}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visible.map((r) => (
                  <tr key={r.party.id} className={cn(rowClass, !r.party.active && 'text-fg-muted')}>
                    <td className={tdFirst}>
                      <button type="button" onClick={() => onOpen(r.party.id)} className="block max-w-full truncate text-left font-medium text-fg hover:underline" aria-label={`Open ${r.party.name}`}>
                        {r.party.name}
                      </button>
                      <span className="block truncate text-xs text-fg-muted">
                        {r.party.contactName}
                        {r.party.address ? ` · ${r.party.address}` : ''}
                      </span>
                    </td>
                    <td className={cn(td, 'tabular truncate text-fg-muted')}>{r.party.phone}</td>
                    <td className={cn(td, 'tabular text-right text-fg-muted')}>{r.party.creditDays ? `${r.party.creditDays} days` : 'None'}</td>
                    <td className={cn(td, 'tabular text-right text-fg')}>{r.docs}</td>
                    <td className={cn(td, 'text-right')}>
                      <BalanceCell total={r.outstanding.total} overdue={r.outstanding.overdue} />
                    </td>
                    <td className={td}>
                      <ActiveBadge active={r.party.active} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ul className="divide-y divide-line @3xl:hidden" aria-label={word}>
              {visible.map((r) => (
                <li key={r.party.id}>
                  <button type="button" onClick={() => onOpen(r.party.id)} className="block w-full px-4 py-3 text-left" aria-label={`Open ${r.party.name}`}>
                    <span className="flex items-start justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block font-medium text-fg">{r.party.name}</span>
                        <span className="tabular block truncate text-xs text-fg-muted">
                          {r.party.contactName} · {r.party.phone}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <BalanceCell total={r.outstanding.total} overdue={r.outstanding.overdue} />
                      </span>
                    </span>
                    <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <ActiveBadge active={r.party.active} />
                      <span className="text-xs text-fg-muted">
                        {pluralize(r.docs, docWord.toLowerCase().replace(/s$/, ''))} · {r.party.creditDays ? `${r.party.creditDays} days’ credit` : 'no credit'}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </ListCard>
    </div>
  );
}

function BalanceCell({ total, overdue }: { total: number; overdue: number }) {
  if (total <= 0) return <span className="text-xs text-fg-subtle">Nothing owed</span>;
  return (
    <span className="tabular block">
      <span className="block font-semibold text-fg">{rupees(total)}</span>
      {overdue ? <span className="block text-xs font-medium text-danger-strong">{rupees(overdue)} overdue</span> : <span className="block text-xs text-fg-muted">Not yet due</span>}
    </span>
  );
}

// ---------- Purchases / orders ----------

function DocsView({ book, kind, heading, onOpen }: { book: DistributorBook; kind: DocKind; heading: ReactNode; onOpen: (id: string) => void }) {
  const id = useId();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [partyId, setPartyId] = useState('all');
  const isOrder = kind === 'order';
  const all = useMemo(() => (isOrder ? orderRows(book) : purchaseRows(book)), [book, isOrder]);
  const visible = isOrder ? filterOrders(all as ReturnType<typeof orderRows>, { query, status: status as never, customerId: partyId }) : filterPurchases(all as ReturnType<typeof purchaseRows>, { query, status: status as never, supplierId: partyId });
  const filtered = query.trim() !== '' || status !== 'all' || partyId !== 'all';
  const parties = isOrder ? book.customers : book.suppliers;
  const statusOptions: [string, string][] = isOrder
    ? [
        ['all', 'Any status'],
        ['open', 'Open (draft or confirmed)'],
        ['draft', 'Draft'],
        ['confirmed', 'Confirmed'],
        ['fulfilled', 'Delivered'],
        ['cancelled', 'Cancelled'],
        ['unpaid', 'Balance due'],
      ]
    : [
        ['all', 'Any status'],
        ['draft', 'Draft'],
        ['received', 'Received'],
        ['cancelled', 'Cancelled'],
        ['unpaid', 'Balance due'],
      ];
  const view = (r: (typeof visible)[number]) => {
    const d = 'order' in r ? r.order : r.purchase;
    const party = 'order' in r ? r.customer : r.supplier;
    const badge = 'order' in r ? <DocStatusBadge kind="order" status={r.order.status} /> : <DocStatusBadge kind="purchase" status={r.purchase.status} />;
    return { d, party, badge, r };
  };
  const counts = isOrder
    ? { open: (all as ReturnType<typeof orderRows>).filter((r) => r.order.status === 'draft' || r.order.status === 'confirmed').length }
    : { open: (all as ReturnType<typeof purchaseRows>).filter((r) => r.purchase.status === 'draft').length };

  return (
    <div className="space-y-5">
      {heading}
      <p className="flex items-start gap-2 text-sm text-fg-muted">
        <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        {isOrder
          ? `Draft → Confirmed → Delivered. Stock is deducted once, on delivery; the customer owes the total from then. ${pluralize(counts.open, 'order')} still open.`
          : `Draft → Received. Stock is added once, when received; you owe the supplier from then. ${pluralize(counts.open, 'draft')} waiting to be received.`}
      </p>
      <ListCard label={isOrder ? 'Order list' : 'Purchase list'}>
        <FilterBar
          filtered={filtered}
          onClear={() => {
            setQuery('');
            setStatus('all');
            setPartyId('all');
          }}
        >
          <SearchBox id={`${id}-q`} label={isOrder ? 'Search orders by number, customer or product' : 'Search purchases by number, supplier or product'} placeholder={isOrder ? 'Number, customer or product' : 'Number, supplier or product'} value={query} onChange={setQuery} className="lg:w-64" />
          <div className="grid grid-cols-2 gap-3 lg:flex">
            <SelectBox id={`${id}-status`} label="Status" value={status} onChange={setStatus} className="lg:w-48">
              {statusOptions.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </SelectBox>
            <SelectBox id={`${id}-party`} label={isOrder ? 'Customer' : 'Supplier'} value={partyId} onChange={setPartyId} className="lg:w-56">
              <option value="all">{isOrder ? 'All customers' : 'All suppliers'}</option>
              {parties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </SelectBox>
          </div>
        </FilterBar>
        <p className="sr-only" aria-live="polite">
          Showing {visible.length} {isOrder ? 'orders' : 'purchases'}
        </p>
        {visible.length === 0 ? (
          <Empty icon={SearchX} title={isOrder ? 'No orders match' : 'No purchases match'} text="Try another number, name or product, or change the filters." />
        ) : (
          <div className="@container">
            <table className="hidden w-full table-fixed text-left text-sm @4xl:table">
              <caption className="sr-only">{isOrder ? 'Sales orders' : 'Purchases'}</caption>
              <colgroup>
                <col className="w-28" />
                <col />
                <col className="w-28" />
                <col className="w-28" />
                <col className="w-28" />
                <col className="w-44" />
              </colgroup>
              <thead className={theadClass}>
                <tr>
                  <th scope="col" className={thFirst}>Number</th>
                  <th scope="col" className={th}>{isOrder ? 'Customer' : 'Supplier'}</th>
                  <th scope="col" className={th}>Date</th>
                  <th scope="col" className={cn(th, 'text-right')}>Total</th>
                  <th scope="col" className={cn(th, 'text-right')}>Balance due</th>
                  <th scope="col" className={th}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visible.map((row) => {
                  const { d, party, badge, r } = view(row);
                  return (
                    <tr key={d.id} className={rowClass}>
                      <td className={tdFirst}>
                        <button type="button" onClick={() => onOpen(d.id)} className="tabular font-medium text-fg hover:underline" aria-label={`Open ${d.ref}`}>
                          {d.ref}
                        </button>
                      </td>
                      <td className={td}>
                        <span className="block truncate text-fg">{party.name}</span>
                        <span className="block truncate text-xs text-fg-muted">{d.lines.map((l) => l.name).join(', ')}</span>
                      </td>
                      <td className={cn(td, 'tabular text-fg-muted')}>{shortDay(d.date)}</td>
                      <td className={cn(td, 'tabular text-right text-fg')}>{rupees(r.total)}</td>
                      <td className={cn(td, 'tabular text-right font-semibold', r.balance > 0 ? (r.overdue ? 'text-danger-strong' : 'text-fg') : 'text-fg-subtle')}>{r.pay === 'not_due' ? '—' : rupees(r.balance)}</td>
                      <td className={td}>
                        <span className="flex flex-wrap gap-1.5">
                          {badge}
                          {r.pay !== 'not_due' ? <PayBadge state={r.pay} overdue={r.overdue} /> : null}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <ul className="divide-y divide-line @4xl:hidden" aria-label={isOrder ? 'Sales orders' : 'Purchases'}>
              {visible.map((row) => {
                const { d, party, badge, r } = view(row);
                return (
                  <li key={d.id}>
                    <button type="button" onClick={() => onOpen(d.id)} className="block w-full px-4 py-3 text-left" aria-label={`Open ${d.ref}`}>
                      <span className="flex items-start justify-between gap-3">
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-fg">
                            <span className="tabular">{d.ref}</span> · {party.name}
                          </span>
                          <span className="block text-xs text-fg-muted">
                            {shortDay(d.date)} · {pluralize(d.lines.length, 'product')}
                          </span>
                        </span>
                        <span className="tabular shrink-0 text-right">
                          <span className="block font-semibold text-fg">{rupees(r.total)}</span>
                          {r.balance > 0 ? <span className={cn('block text-xs', r.overdue ? 'font-medium text-danger-strong' : 'text-fg-muted')}>{rupees(r.balance)} due</span> : null}
                        </span>
                      </span>
                      <span className="mt-1.5 flex flex-wrap gap-1.5">
                        {badge}
                        {r.pay !== 'not_due' ? <PayBadge state={r.pay} overdue={r.overdue} /> : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </ListCard>
    </div>
  );
}

// ---------- Payments ----------

function PaymentsView({ book, heading, onPay, onOpenDoc }: { book: DistributorBook; heading: ReactNode; onPay: (direction: 'in' | 'out', docId: string) => void; onOpenDoc: (kind: DocKind, id: string) => void }) {
  const id = useId();
  const [query, setQuery] = useState('');
  const [direction, setDirection] = useState<'in' | 'out' | 'all'>('all');
  const [method, setMethod] = useState('all');
  const rows = useMemo(() => paymentRows(book), [book]);
  const visible = filterPayments(rows, { query, direction, method: method as never });
  const filtered = query.trim() !== '' || direction !== 'all' || method !== 'all';
  const o = overview(book, rangeFor(book.today, 'mtd'));
  const owedIn = payableDocs(book, 'in');
  const owedOut = payableDocs(book, 'out');
  const totals = visible.reduce((t, r) => ({ ...t, [r.payment.direction]: t[r.payment.direction] + r.payment.amountPaise }), { in: 0, out: 0 });

  const owedList = (dir: 'in' | 'out', list: typeof owedIn) => (
    <ul className="divide-y divide-line">
      {list.slice(0, 6).map((r) => {
        const isO = 'order' in r;
        const d = isO ? r.order : r.purchase;
        const name = isO ? r.customer.name : r.supplier.name;
        return (
          <li key={d.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2.5 sm:px-5">
            <button type="button" onClick={() => onOpenDoc(isO ? 'order' : 'purchase', d.id)} className="min-w-0 flex-1 basis-full text-left sm:basis-0" aria-label={`Open ${d.ref}`}>
              <span className="block truncate text-sm font-medium text-fg hover:underline">{name}</span>
              <span className="tabular block text-xs text-fg-muted">
                {d.ref} · {r.overdue ? 'was due' : 'due'} {shortDay(d.dueDate!)}
              </span>
            </button>
            <span className={cn('tabular text-sm font-semibold max-sm:mr-auto', r.overdue ? 'text-danger-strong' : 'text-fg')}>{rupees(r.balance)}</span>
            <PayBadge state={r.pay} overdue={r.overdue} />
            <Button variant="secondary" size="sm" onClick={() => onPay(dir, d.id)} ariaLabel={`Record payment for ${d.ref}`}>
              Pay
            </Button>
          </li>
        );
      })}
      {list.length > 6 ? <li className="px-4 py-2 text-xs text-fg-muted sm:px-5">and {list.length - 6} more</li> : null}
      {list.length === 0 ? <li className="px-4 py-6 text-center text-sm text-fg-muted">Nothing owed.</li> : null}
    </ul>
  );

  return (
    <div className="space-y-5">
      {heading}
      <Figures
        label="Balances"
        className="lg:grid-cols-4"
        figures={[
          { label: 'Customers owe you', value: rupees(o.receivables.total), note: `${pluralize(o.receivables.docs, 'delivered order')}` },
          { label: 'Of which overdue', value: rupees(o.receivables.overdue), note: `Not yet due: ${rupees(o.receivables.notDue)}`, ...(o.receivables.overdue ? { tone: 'text-danger-strong' } : {}) },
          { label: 'You owe suppliers', value: rupees(o.payables.total), note: `${pluralize(o.payables.docs, 'received purchase')}` },
          { label: 'Of which overdue', value: rupees(o.payables.overdue), note: `Not yet due: ${rupees(o.payables.notDue)}`, ...(o.payables.overdue ? { tone: 'text-danger-strong' } : {}) },
        ].map((f, i) => ({ ...f, label: i === 1 ? 'Customer balances overdue' : i === 3 ? 'Supplier balances overdue' : f.label }))}
      />
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="To collect" description="Delivered orders with a balance, overdue first.">
          {owedList('in', owedIn)}
        </Panel>
        <Panel title="To pay" description="Received purchases with a balance, overdue first.">
          {owedList('out', owedOut)}
        </Panel>
      </div>

      <ListCard label="Payment history">
        <FilterBar
          filtered={filtered}
          onClear={() => {
            setQuery('');
            setDirection('all');
            setMethod('all');
          }}
        >
          <SearchBox id={`${id}-q`} label="Search payments by name or reference" placeholder="Name or reference" value={query} onChange={setQuery} className="lg:w-60" />
          <div className="grid grid-cols-2 gap-3 lg:flex">
            <SelectBox id={`${id}-dir`} label="Direction" value={direction} onChange={(v) => setDirection(v as typeof direction)} className="lg:w-44">
              <option value="all">In and out</option>
              <option value="in">Received (in)</option>
              <option value="out">Paid (out)</option>
            </SelectBox>
            <SelectBox id={`${id}-method`} label="Method" value={method} onChange={setMethod} className="lg:w-40">
              <option value="all">Any method</option>
              {paymentMethods.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </SelectBox>
          </div>
        </FilterBar>
        {visible.length === 0 ? (
          <Empty icon={SearchX} title="No payments match" text="Try another name or reference, or change the filters." />
        ) : (
          <div className="@container">
            <table className="hidden w-full table-fixed text-left text-sm @3xl:table">
              <caption className="sr-only">Payments, newest first</caption>
              <colgroup>
                <col className="w-32" />
                <col className="w-28" />
                <col />
                <col className="w-24" />
                <col className="w-32" />
                <col className="w-32" />
              </colgroup>
              <thead className={theadClass}>
                <tr>
                  <th scope="col" className={thFirst}>Date</th>
                  <th scope="col" className={th}>Direction</th>
                  <th scope="col" className={th}>From / to</th>
                  <th scope="col" className={th}>For</th>
                  <th scope="col" className={th}>Method</th>
                  <th scope="col" className={cn(th, 'text-right')}>Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visible.map((r) => (
                  <tr key={r.payment.id} className={rowClass}>
                    <td className={cn(tdFirst, 'tabular text-fg-muted')}>{shortDay(r.payment.date)}</td>
                    <td className={td}>
                      <DirectionLabel dir={r.payment.direction} />
                    </td>
                    <td className={cn(td, 'truncate text-fg')}>{r.partyName}</td>
                    <td className={td}>
                      <button type="button" onClick={() => onOpenDoc(r.payment.direction === 'in' ? 'order' : 'purchase', r.payment.docId)} className="tabular text-fg hover:underline" aria-label={`Open ${r.ref}`}>
                        {r.ref}
                      </button>
                    </td>
                    <td className={cn(td, 'text-fg-muted')}>
                      {labelOf(paymentMethods, r.payment.method)}
                      {r.payment.note ? <span className="block truncate text-xs">{r.payment.note}</span> : null}
                    </td>
                    <td className={cn(td, 'tabular text-right font-semibold', r.payment.direction === 'in' ? 'text-success-strong' : 'text-fg')}>
                      {r.payment.direction === 'in' ? '+' : '−'}
                      {money(r.payment.amountPaise)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ul className="divide-y divide-line @3xl:hidden" aria-label="Payments">
              {visible.map((r) => (
                <li key={r.payment.id} className="flex items-start justify-between gap-3 px-4 py-2.5">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-fg">{r.partyName}</span>
                    <span className="tabular block text-xs text-fg-muted">
                      {shortDay(r.payment.date)} · {r.ref} · {labelOf(paymentMethods, r.payment.method)}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className={cn('tabular block text-sm font-semibold', r.payment.direction === 'in' ? 'text-success-strong' : 'text-fg')}>
                      {r.payment.direction === 'in' ? '+' : '−'}
                      {money(r.payment.amountPaise)}
                    </span>
                    <DirectionLabel dir={r.payment.direction} />
                  </span>
                </li>
              ))}
            </ul>
            <p className="tabular border-t border-line px-4 py-2.5 text-right text-xs text-fg-muted sm:px-5">
              {pluralize(visible.length, 'payment')} · received {rupees(totals.in)} · paid {rupees(totals.out)}
            </p>
          </div>
        )}
      </ListCard>
    </div>
  );
}

function DirectionLabel({ dir }: { dir: 'in' | 'out' }) {
  return dir === 'in' ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-success-strong">
      <ArrowDownLeft size={14} aria-hidden="true" /> Received
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-fg-muted">
      <ArrowUpRight size={14} aria-hidden="true" /> Paid out
    </span>
  );
}

