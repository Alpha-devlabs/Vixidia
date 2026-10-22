import { useMemo, useState, type ReactNode } from 'react';
import { Banknote, CheckCheck, MapPin, Minus, Plus, Repeat, StickyNote } from 'lucide-react';
import type { WaterState } from '../../types/water';
import { customerBalances, defaultEmpties, orderTotal, roundStops, roundSummary, type RoundStop } from './waterLogic';
import type { WaterActions } from './useWaterDemo';
import { sampleBusiness } from '../../data/waterSample';
import { Badge } from '../../components/Badge';
import { formatCurrency, pluralize } from '../../utils/format';
import { cn } from '../../utils/cn';

interface Props {
  state: WaterState;
  actions: WaterActions;
}

/**
 * What the delivery person sees on their phone: today's stops in route order,
 * with one big button per stop. Rendered inside a phone-sized frame on larger
 * screens so owners can picture it in their staff's hands.
 */
export function RoundView({ state, actions }: Props) {
  const stops = useMemo(() => roundStops(state, sampleBusiness.today, sampleBusiness.routeOrder), [state]);
  const summary = roundSummary(stops);
  const dues = useMemo(() => new Map(customerBalances(state).map((b) => [b.customer.id, b.outstanding])), [state]);
  const next = stops.find((s) => s.order.delivery === 'pending');
  const progress = summary.stops === 0 ? 0 : Math.round((summary.done / summary.stops) * 100);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:items-start">
      <div className="mx-auto w-full max-w-sm overflow-hidden rounded-[2rem] border-[6px] border-fg/85 bg-canvas shadow-[var(--shadow-panel)] lg:sticky lg:top-20">
        <div className="on-inverse bg-inverse px-4 pt-4 pb-3 text-on-inverse">
          <p className="text-xs text-on-inverse-muted">{sampleBusiness.deliveryPerson}’s round · {sampleBusiness.name}</p>
          <div className="mt-1 flex items-baseline justify-between gap-2">
            <p className="text-lg font-semibold">
              {summary.done} of {summary.stops} stops done
            </p>
            <p className="tabular text-sm text-on-inverse-muted">{pluralize(summary.cansToGo, 'can')} to go</p>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-on-inverse/15" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Round progress">
            <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${progress}%` }} />
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-lg bg-on-inverse/10 px-2 py-1.5">
              <dt className="text-[11px] text-on-inverse-muted">Cash in hand</dt>
              <dd className="tabular font-semibold">{formatCurrency(summary.cashInHand)}</dd>
            </div>
            <div className="rounded-lg bg-on-inverse/10 px-2 py-1.5">
              <dt className="text-[11px] text-on-inverse-muted">Empties on van</dt>
              <dd className="tabular font-semibold">{summary.emptiesBack}</dd>
            </div>
          </dl>
        </div>

        <ol className="max-h-[38rem] space-y-2 overflow-y-auto p-3" aria-label="Stops in route order">
          {stops.map((stop, i) => (
            <li key={stop.order.id}>
              <StopCard stop={stop} position={i + 1} isNext={stop === next} owes={dues.get(stop.order.customerId) ?? 0} actions={actions} />
            </li>
          ))}
        </ol>
        {summary.stops > 0 && !next ? (
          <p className="border-t border-line px-4 py-3 text-center text-sm font-medium text-success-strong">Round complete — hand over {formatCurrency(summary.cashInHand)} in cash.</p>
        ) : null}
      </div>

      <aside className="space-y-4 text-fg-muted">
        <h2 className="text-lg font-semibold text-fg">Your delivery person’s phone</h2>
        <p className="max-w-[56ch] leading-relaxed">
          Each delivery person gets this simple screen on their own phone. Stops are already in route order, so there’s nothing to plan on the road.
        </p>
        <ul className="max-w-[56ch] space-y-2.5">
          {[
            'Adjust empties collected if the customer returns fewer cans — their can balance updates straight away.',
            'Tick “Cash collected” when they pay on the spot. It adds to the cash in hand to hand over at the end.',
            'Everything they do shows up on your Today screen as it happens.',
          ].map((t) => (
            <li key={t} className="flex gap-2">
              <span aria-hidden="true" className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              {t}
            </li>
          ))}
        </ul>
        <p className="text-sm">Sample data: try completing the next stop.</p>
      </aside>
    </div>
  );
}

function StopCard({ stop, position, isNext, owes, actions }: { stop: RoundStop; position: number; isNext: boolean; owes: number; actions: WaterActions }) {
  const { order, customer } = stop;
  const done = order.delivery === 'delivered';
  const [empties, setEmpties] = useState(() => defaultEmpties(stop));
  const [cash, setCash] = useState(false);
  const maxEmpties = stop.cansBefore;
  const name = customer?.name ?? 'Unknown customer';

  if (done) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-line bg-surface/60 px-3 py-2.5 text-sm">
        <CheckCheck size={18} className="shrink-0 text-success-strong" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-fg-muted">
          <span className="font-medium text-fg">{name}</span> · {pluralize(order.quantity, 'can')}
        </span>
        <span className="tabular shrink-0 text-xs text-fg-muted">{order.emptiesCollected ?? order.quantity} back</span>
      </div>
    );
  }

  return (
    <article className={cn('rounded-xl border bg-surface p-3', isNext ? 'border-accent shadow-[var(--shadow-panel)]' : 'border-line')} aria-label={`Stop ${position}: ${name}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-wide text-fg-muted uppercase">
            Stop {position}
            {isNext ? <span className="text-accent-strong"> · next</span> : null}
          </p>
          <h3 className="truncate font-semibold text-fg">{name}</h3>
          <p className="flex items-center gap-1 text-sm text-fg-muted">
            <MapPin size={13} aria-hidden="true" /> {customer?.area ?? '—'}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="tabular text-xl font-bold text-fg">{order.quantity}</p>
          <p className="text-[11px] text-fg-muted">{order.quantity === 1 ? 'can' : 'cans'}</p>
        </div>
      </div>

      {order.note || customer?.note || order.fromSchedule ? (
        <div className="mt-2 space-y-1 text-xs text-fg-muted">
          {order.fromSchedule ? (
            <p className="flex items-center gap-1">
              <Repeat size={12} aria-hidden="true" /> Regular delivery
            </p>
          ) : null}
          {[order.note, customer?.note].filter(Boolean).map((n) => (
            <p key={n} className="flex gap-1">
              <StickyNote size={12} className="mt-0.5 shrink-0" aria-hidden="true" /> {n}
            </p>
          ))}
        </div>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-subtle/60 px-2 py-1.5">
        <span className="text-sm text-fg">Empties collected</span>
        <span className="flex items-center gap-1">
          <StepButton label={`One fewer empty from ${name}`} disabled={empties <= 0} onClick={() => setEmpties((e) => Math.max(0, e - 1))}>
            <Minus size={16} aria-hidden="true" />
          </StepButton>
          <span className="tabular w-7 text-center font-semibold" aria-live="polite" aria-label={`${empties} empties`}>
            {empties}
          </span>
          <StepButton label={`One more empty from ${name}`} disabled={empties >= maxEmpties} onClick={() => setEmpties((e) => Math.min(maxEmpties, e + 1))}>
            <Plus size={16} aria-hidden="true" />
          </StepButton>
        </span>
      </div>

      {order.payment === 'unpaid' ? (
        <label className="mt-2 flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-subtle/60">
          <span className="text-sm text-fg">
            Cash collected <span className="tabular font-semibold">{formatCurrency(orderTotal(order))}</span>
            {owes > orderTotal(order) ? <span className="block text-xs text-danger-strong">Also owes {formatCurrency(owes - orderTotal(order))} from before</span> : null}
          </span>
          <input type="checkbox" checked={cash} onChange={(e) => setCash(e.target.checked)} className="h-5 w-5 shrink-0 accent-[var(--accent)]" />
        </label>
      ) : (
        <p className="mt-2 px-2">
          <Badge tone="success" icon={Banknote}>
            Already paid
          </Badge>
        </p>
      )}

      <button
        type="button"
        onClick={() => actions.completeStop(order.id, name, empties, cash)}
        className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 font-semibold text-on-accent transition-colors hover:bg-accent-hover"
        aria-label={`Mark ${name} delivered`}
      >
        <CheckCheck size={18} aria-hidden="true" /> Delivered
      </button>
    </article>
  );
}

function StepButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line-strong bg-surface text-fg transition-colors hover:bg-subtle disabled:opacity-40"
    >
      {children}
    </button>
  );
}
