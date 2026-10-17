import { IndianRupee, LogIn, Pencil, RefreshCw } from 'lucide-react';
import type { GymBook } from '../../types/gym';
import { Dialog } from '../../components/Dialog';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { cn } from '../../utils/cn';
import { attendanceStart, checkInBlock, labelOf, membershipPayments, membershipsOf, money, paymentMethods, planOf, renewalBlock, rowOf } from './gymLogic';
import { Initials, StatusBadge, longDate, shortDay } from './GymBits';

interface Props {
  book: GymBook;
  memberId: string | null;
  open: boolean;
  onClose: () => void;
  onEdit: (id: string) => void;
  onRenew: (id: string) => void;
  onPay: (id: string) => void;
  onCheckIn: (id: string) => void;
}

const payTone = { paid: 'success', part: 'warning', unpaid: 'danger' } as const;
const payLabel = { paid: 'Paid', part: 'Part paid', unpaid: 'Unpaid' } as const;

/** Member record: status, balance, memberships, attendance and payments. */
export function MemberDrawer({ book, memberId, open, onClose, onEdit, onRenew, onPay, onCheckIn }: Props) {
  const row = memberId ? rowOf(book, memberId) : undefined;
  if (!row) return null;
  const m = row.member;
  const info = row.info;
  const memberships = [...membershipsOf(book, m.id)].reverse();
  const pays = membershipPayments(book, m.id);
  const from = attendanceStart(book);
  const visits = book.checkIns.filter((c) => c.memberId === m.id && c.date >= from).sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`));
  const payments = book.payments.filter((p) => p.memberId === m.id).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  const checkBlock = checkInBlock(book, m.id);
  const renewBlock = renewalBlock(book, m.id);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      variant="drawer"
      title={m.name}
      description={`Member since ${longDate(m.joinedOn)}`}
      footer={
        <>
          <Button variant="subtle" onClick={() => onEdit(m.id)}>
            <Pencil size={16} aria-hidden="true" /> Edit
          </Button>
          <Button variant="secondary" onClick={() => onPay(m.id)} disabled={row.ledger.balance <= 0}>
            <IndianRupee size={16} aria-hidden="true" /> Record payment
          </Button>
          <Button onClick={() => onRenew(m.id)}>
            <RefreshCw size={16} aria-hidden="true" /> Renew
          </Button>
        </>
      }
    >
      <div className="flex items-center gap-4">
        <Initials name={m.name} size="lg" muted={info.status === 'expired'} />
        <dl className="grid flex-1 grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-sm">
          <dt className="text-fg-muted">Phone</dt>
          <dd className="tabular text-fg">{m.phone}</dd>
          <dt className="text-fg-muted">Email</dt>
          <dd className="truncate text-fg">{m.email || '—'}</dd>
          <dt className="text-fg-muted">Status</dt>
          <dd>
            <StatusBadge status={info.status} />
          </dd>
        </dl>
      </div>

      <dl className="mt-5 grid grid-cols-2 overflow-hidden rounded-[var(--radius-control)] border border-line bg-line [gap:1px]">
        <div className="bg-surface px-3 py-2.5">
          <dt className="text-xs text-fg-muted">{info.validUntil ? 'Valid until' : info.status === 'upcoming' ? 'Starts on' : 'Expired on'}</dt>
          <dd className="tabular text-lg font-semibold text-fg">{longDate(info.validUntil ?? info.next?.start ?? info.latest?.end ?? m.joinedOn)}</dd>
          <dd className="text-xs text-fg-muted">
            {info.daysLeft !== undefined ? (info.daysLeft === 0 ? 'Last day today' : `${info.daysLeft} ${info.daysLeft === 1 ? 'day' : 'days'} left`) : row.plan ? row.plan.name : ''}
          </dd>
        </div>
        <div className="bg-surface px-3 py-2.5">
          <dt className="text-xs text-fg-muted">Balance owed</dt>
          <dd className={cn('tabular text-lg font-semibold', row.ledger.balance > 0 ? 'text-danger-strong' : 'text-fg')}>{money(row.ledger.balance)}</dd>
          <dd className="tabular text-xs text-fg-muted">
            {money(row.ledger.charges)} charged · {money(row.ledger.paid)} paid
          </dd>
        </div>
      </dl>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => onCheckIn(m.id)} disabled={!!checkBlock}>
          <LogIn size={15} aria-hidden="true" /> Check in today
        </Button>
        {checkBlock ? <span className="text-xs text-fg-muted">{checkBlock}</span> : null}
      </div>
      {renewBlock ? <p className="mt-2 text-xs text-fg-muted">Renewal: {renewBlock}</p> : null}

      <h3 className="mt-6 text-sm font-semibold text-fg">Memberships</h3>
      <div className="mt-2 overflow-x-auto rounded-[var(--radius-control)] border border-line">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Memberships of {m.name}</caption>
          <thead className="bg-subtle/60 text-xs text-fg-muted">
            <tr>
              <th scope="col" className="px-2.5 py-2 font-medium">Plan</th>
              <th scope="col" className="px-2.5 py-2 font-medium">Period</th>
              <th scope="col" className="px-2.5 py-2 text-right font-medium">Price</th>
              <th scope="col" className="px-2.5 py-2 font-medium">Payment</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {memberships.map((ms) => {
              const pay = pays.get(ms.id)!;
              return (
                <tr key={ms.id}>
                  <td className="px-2.5 py-2 text-fg">
                    {planOf(book, ms.planId)?.name}
                    <span className="block text-xs text-fg-muted">{ms.kind === 'new' ? 'Joined' : 'Renewal'}</span>
                  </td>
                  <td className="tabular px-2.5 py-2 whitespace-nowrap text-fg">
                    {shortDay(ms.start)} –<span className="block">{shortDay(ms.end)}</span>
                  </td>
                  <td className="tabular px-2.5 py-2 text-right text-fg">{money(ms.pricePaise)}</td>
                  <td className="px-2.5 py-2">
                    <Badge tone={payTone[pay.state]}>{payLabel[pay.state]}</Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h3 className="mt-6 text-sm font-semibold text-fg">Attendance, last 14 days</h3>
      {visits.length === 0 ? (
        <p className="mt-1.5 text-sm text-fg-subtle">No check-ins in the last 14 days.</p>
      ) : (
        <>
          <p className="mt-0.5 text-xs text-fg-muted">
            {visits.length} {visits.length === 1 ? 'visit' : 'visits'}
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5" aria-label={`Check-ins of ${m.name}`}>
            {visits.map((c) => (
              <li key={c.id} className="tabular rounded-full border border-line px-2.5 py-1 text-xs text-fg">
                {c.date === book.today ? 'Today' : shortDay(c.date)} · {c.time}
              </li>
            ))}
          </ul>
        </>
      )}

      <h3 className="mt-6 text-sm font-semibold text-fg">Payments</h3>
      {payments.length === 0 ? (
        <p className="mt-1.5 text-sm text-fg-subtle">No payments recorded.</p>
      ) : (
        <ul className="mt-2 divide-y divide-line rounded-[var(--radius-control)] border border-line">
          {payments.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span className="tabular text-fg">
                {p.date === book.today ? 'Today' : longDate(p.date)}
                <span className="block text-xs text-fg-muted">{labelOf(paymentMethods, p.method)}</span>
              </span>
              <span className="tabular font-medium text-success-strong">{money(p.amountPaise)}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-6 text-xs text-fg-muted">Fictional member. Status and balance are worked out from the memberships and payments above.</p>
    </Dialog>
  );
}
