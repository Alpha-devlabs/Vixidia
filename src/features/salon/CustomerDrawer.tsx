import { CalendarPlus, Pencil } from 'lucide-react';
import type { SalonBook } from '../../types/salon';
import { Dialog } from '../../components/Dialog';
import { Button } from '../../components/Button';
import { customerSummary, formatTime, money, servicesText } from './salonLogic';
import { Initials, PayBadge, StatusBadge, longDate, shortDay } from './SalonBits';

interface Props {
  book: SalonBook;
  customerId: string | null;
  open: boolean;
  onClose: () => void;
  onEdit: (id: string) => void;
  onBook: (id: string) => void;
  onOpenAppointment: (id: string) => void;
}

/** Customer record: contact, notes, visits, favourite service and history. */
export function CustomerDrawer({ book, customerId, open, onClose, onEdit, onBook, onOpenAppointment }: Props) {
  const customer = book.customers.find((c) => c.id === customerId);
  if (!customer) return null;
  const s = customerSummary(book, customer);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      variant="drawer"
      title={customer.name}
      description={`Customer since ${longDate(customer.createdOn)}`}
      footer={
        <>
          <Button variant="secondary" onClick={() => onEdit(customer.id)}>
            <Pencil size={16} aria-hidden="true" /> Edit
          </Button>
          <Button onClick={() => onBook(customer.id)}>
            <CalendarPlus size={16} aria-hidden="true" /> New appointment
          </Button>
        </>
      }
    >
      <div className="flex items-center gap-4">
        <Initials name={customer.name} size="lg" />
        <dl className="grid flex-1 grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-sm">
          <dt className="text-fg-muted">Phone</dt>
          <dd className="tabular text-fg">{customer.phone}</dd>
          <dt className="text-fg-muted">Email</dt>
          <dd className="truncate text-fg">{customer.email || '—'}</dd>
        </dl>
      </div>
      {customer.notes ? <p className="mt-4 rounded-[var(--radius-control)] bg-subtle px-3 py-2.5 text-sm text-fg">{customer.notes}</p> : null}

      <dl className="mt-4 grid grid-cols-3 overflow-hidden rounded-[var(--radius-control)] border border-line bg-line [gap:1px] text-sm">
        <div className="bg-surface px-3 py-2.5">
          <dt className="text-xs text-fg-muted">Visits</dt>
          <dd className="tabular font-semibold text-fg">{s.visits}</dd>
        </div>
        <div className="bg-surface px-3 py-2.5">
          <dt className="text-xs text-fg-muted">Last visit</dt>
          <dd className="tabular font-semibold text-fg">{s.lastVisit ? (s.lastVisit === book.today ? 'Today' : shortDay(s.lastVisit)) : '—'}</dd>
        </div>
        <div className="bg-surface px-3 py-2.5">
          <dt className="text-xs text-fg-muted">Paid in total</dt>
          <dd className="tabular font-semibold text-fg">{money(s.spent).replace('.00', '')}</dd>
        </div>
      </dl>
      <p className="mt-2 text-sm text-fg-muted">{s.favourite ? `Usually books: ${s.favourite}` : 'No completed visits yet.'}</p>

      <h3 className="mt-6 text-sm font-semibold text-fg">Appointments</h3>
      {s.history.length === 0 ? (
        <p className="mt-1.5 text-sm text-fg-subtle">No appointments yet.</p>
      ) : (
        <ul className="mt-2 divide-y divide-line rounded-[var(--radius-control)] border border-line" aria-label={`Appointments of ${customer.name}`}>
          {s.history.map((r) => (
            <li key={r.appointment.id}>
              <button type="button" onClick={() => onOpenAppointment(r.appointment.id)} className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5 text-left text-sm hover:bg-subtle/50">
                <span className="min-w-0 flex-1 basis-full sm:basis-0">
                  <span className="tabular block font-medium text-fg">
                    {r.appointment.date === book.today ? 'Today' : shortDay(r.appointment.date)}, {formatTime(r.appointment.start)}
                  </span>
                  <span className="block truncate text-xs text-fg-muted">
                    {servicesText(r.appointment.services)} · {r.stylist.name}
                  </span>
                </span>
                <span className="tabular text-xs text-fg-muted">{money(r.total).replace('.00', '')}</span>
                <StatusBadge status={r.appointment.status} />
                <PayBadge state={r.pay} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-6 text-xs text-fg-muted">Fictional customer. Visits, favourite service and totals are worked out from the appointments and payments above.</p>
    </Dialog>
  );
}
