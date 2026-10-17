import type { BookedService, SalonBook } from '../../types/salon';
import { Field, controlClass, describedBy } from '../../components/forms';
import { Button } from '../../components/Button';
import { addDays } from '../../utils/dates';
import { MAX_DAYS_AHEAD, categories, endOf, formatTime, freeStartTimes, isIsoDay, isOpenDay, labelOf, type FieldErrors } from './salonLogic';
import { shortDay } from './SalonBits';

interface Props {
  id: string;
  book: SalonBook;
  date: string;
  start: string;
  stylistId: string;
  customerId: string;
  services: Pick<BookedService, 'durationMin' | 'category' | 'name'>[];
  /** The appointment being moved, so its own slot counts as free. */
  ignoreId?: string;
  errors: FieldErrors;
  onChange: (key: 'date' | 'start' | 'stylistId', value: string) => void;
}

/**
 * Stylist, date and start time. The time list only offers free quarter-hour
 * starts that finish by closing; the rules are still checked on save.
 */
export function SlotFields({ id, book, date, start, stylistId, customerId, services, ignoreId, errors, onChange }: Props) {
  const needed = [...new Set(services.map((s) => s.category))];
  const able = (cats: string[]) => needed.every((c) => cats.includes(c));
  const times = services.length && stylistId ? freeStartTimes(book, { date, stylistId, customerId, services, ...(ignoreId ? { ignoreId } : {}) }) : [];
  const closed = isIsoDay(date) && !isOpenDay(book, date);
  const quick = [0, 1, 2].map((n) => addDays(book.today, n));
  const timeHint = !services.length
    ? 'Choose services first.'
    : !stylistId
      ? 'Choose a stylist first.'
      : closed
        ? 'The salon is closed on Tuesdays.'
        : times.length === 0
          ? 'No free time that day for this stylist. Try another day or stylist.'
          : start && times.includes(start)
            ? `Ends at ${formatTime(endOf({ start, services: services as BookedService[] }))}.`
            : `${times.length} free start times.`;

  return (
    <div className="space-y-4">
      <Field id={`${id}-stylist`} label="Stylist" error={errors.stylist} {...(needed.length ? { hint: `Needs: ${needed.map((c) => labelOf(categories, c)).join(', ')}.` } : {})}>
        <select
          id={`${id}-stylist`}
          value={stylistId}
          onChange={(e: { target: { value: string } }) => onChange('stylistId', e.target.value)}
          className={controlClass(!!errors.stylist)}
          aria-invalid={!!errors.stylist}
          aria-describedby={describedBy(`${id}-stylist`, errors.stylist, needed.length > 0)}
        >
          <option value="">Choose a stylist…</option>
          {book.stylists.map((s) => (
            <option key={s.id} value={s.id} disabled={!able(s.categories)}>
              {s.name} — {s.role}
              {able(s.categories) ? '' : ' (doesn’t do these services)'}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`${id}-date`} label="Date" error={errors.date} hint={`Today to ${shortDay(addDays(book.today, MAX_DAYS_AHEAD))}. Closed Tuesdays.`}>
          <input
            id={`${id}-date`}
            type="date"
            value={date}
            min={book.today}
            max={addDays(book.today, MAX_DAYS_AHEAD)}
            onChange={(e: { target: { value: string } }) => onChange('date', e.target.value)}
            className={controlClass(!!errors.date, 'tabular')}
            aria-invalid={!!errors.date}
            aria-describedby={describedBy(`${id}-date`, errors.date, true)}
          />
        </Field>
        <Field id={`${id}-start`} label="Start time" error={errors.start} hint={timeHint}>
          <select
            id={`${id}-start`}
            value={times.includes(start) ? start : ''}
            onChange={(e: { target: { value: string } }) => onChange('start', e.target.value)}
            className={controlClass(!!errors.start, 'tabular')}
            aria-invalid={!!errors.start}
            aria-describedby={describedBy(`${id}-start`, errors.start, true)}
          >
            <option value="">{times.length ? 'Choose a time…' : 'No free times'}</option>
            {times.map((t) => (
              <option key={t} value={t}>
                {formatTime(t)}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="-mt-2 flex flex-wrap gap-2" role="group" aria-label="Quick dates">
        {quick.map((d, i) => (
          <Button key={d} variant={date === d ? 'secondary' : 'subtle'} size="sm" onClick={() => onChange('date', d)} aria-pressed={date === d}>
            {i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : shortDay(d)}
          </Button>
        ))}
      </div>
    </div>
  );
}
