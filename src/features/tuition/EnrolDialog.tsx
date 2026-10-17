import { useId, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import type { TuitionBook } from '../../types/tuition';
import { Dialog } from '../../components/Dialog';
import { Button } from '../../components/Button';
import { Field, controlClass, describedBy } from '../../components/forms';
import { cn } from '../../utils/cn';
import { batchOf, enrolBlock, filterStudents, formatPeriod, gradeText, periodOf, rupees, scheduleText, studentOf, studentRows, type FieldErrors } from './tuitionLogic';
import { AmountInput } from './TuitionBits';

interface Props {
  book: TuitionBook;
  /** Enrol into this batch (choose a student), or enrol this student (choose a batch). */
  batchId?: string;
  studentId?: string;
  open: boolean;
  onClose: () => void;
  onSave: (input: { studentId: string; batchId: string; fee: string }) => { ok: true } | { ok: false; errors: FieldErrors };
}

const MATCHES = 8;

/** Enrol a student in a batch from today. Remounted per opening. */
export function EnrolDialog({ book, batchId: fixedBatch, studentId: fixedStudent, open, onClose, onSave }: Props) {
  const id = useId();
  const formId = `${id}-form`;
  const [studentId, setStudentId] = useState(fixedStudent ?? '');
  const [batchId, setBatchId] = useState(fixedBatch ?? '');
  const [query, setQuery] = useState('');
  const [fee, setFee] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const submitting = useRef(false);
  const batch = batchOf(book, batchId);
  const student = studentOf(book, studentId);
  const candidates = useMemo(() => {
    if (!fixedBatch) return [];
    return filterStudents(studentRows(book), { query, status: 'active' })
      .filter((r) => !enrolBlock(book, r.student.id, fixedBatch))
      .slice(0, MATCHES);
  }, [book, fixedBatch, query]);
  const batches = book.batches.filter((b) => b.status === 'active');

  const submit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    const r = onSave({ studentId, batchId, fee });
    if (r.ok) {
      onClose();
      return;
    }
    submitting.current = false;
    setErrors(r.errors);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={fixedBatch ? `Enrol in ${batch?.name}` : `Enrol ${student?.name}`}
      description={`From today. ${formatPeriod(periodOf(book.today))}’s fee is added if there isn’t one yet.`}
      footer={
        <>
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId}>
            Enrol
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={submit} className="space-y-5">
        {errors.student ? <p className="rounded-[var(--radius-control)] bg-danger-soft px-3 py-2 text-sm font-medium text-danger-strong">{errors.student}</p> : null}
        {fixedBatch ? (
          <div className="space-y-2">
            <div className="relative">
              <label htmlFor={`${id}-q`} className="mb-1.5 block text-sm font-medium text-fg">
                Student
              </label>
              <Search size={16} className="pointer-events-none absolute bottom-3 left-3 text-fg-subtle" aria-hidden="true" />
              <input id={`${id}-q`} type="search" value={query} onChange={(e: { target: { value: string } }) => setQuery(e.target.value)} placeholder="Search name or school" className={controlClass(false, 'pl-9')} />
            </div>
            <fieldset>
              <legend className="sr-only">Choose a student</legend>
              <div className="divide-y divide-line rounded-[var(--radius-control)] border border-line">
                {candidates.length === 0 ? (
                  <p className="px-3 py-4 text-center text-sm text-fg-muted">No active student in {gradeText(batch!.gradeFrom, batch!.gradeTo).toLowerCase()} matches who isn’t already in this batch.</p>
                ) : (
                  candidates.map((r) => (
                    <label key={r.student.id} className={cn('flex cursor-pointer items-center gap-3 px-3 py-2 has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-[var(--focus)] has-[:focus-visible]:outline-solid', studentId === r.student.id ? 'bg-accent-soft' : 'hover:bg-subtle/60')}>
                      <input type="radio" name={`${id}-student`} checked={studentId === r.student.id} onChange={() => setStudentId(r.student.id)} className="h-4 w-4 shrink-0 accent-[var(--accent)]" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-fg">{r.student.name}</span>
                        <span className="block truncate text-xs text-fg-muted">
                          Grade {r.student.grade} · {r.student.school}
                        </span>
                      </span>
                    </label>
                  ))
                )}
              </div>
            </fieldset>
            <p className="text-xs text-fg-muted">Only active students in the batch’s grades who aren’t already enrolled are shown.</p>
          </div>
        ) : (
          <Field id={`${id}-batch`} label="Batch">
            <select id={`${id}-batch`} value={batchId} onChange={(e: { target: { value: string } }) => setBatchId(e.target.value)} className={controlClass(false)}>
              <option value="">Choose a batch…</option>
              {batches.map((b) => {
                const block = enrolBlock(book, studentId, b.id);
                return (
                  <option key={b.id} value={b.id} disabled={!!block}>
                    {b.name} — {scheduleText(b)}
                    {block ? (block.includes('already') ? ' (already enrolled)' : ' (other grades)') : ''}
                  </option>
                );
              })}
            </select>
          </Field>
        )}
        <Field id={`${id}-fee`} label="Monthly fee for this student" optional error={errors.fee} hint={batch ? `Leave blank for the batch fee (${rupees(batch.monthlyFeePaise)}). Use for sibling or scholarship fees.` : 'Leave blank for the batch fee.'}>
          <AmountInput id={`${id}-fee`} value={fee} onChange={setFee} invalid={!!errors.fee} {...(describedBy(`${id}-fee`, errors.fee, true) ? { describedBy: describedBy(`${id}-fee`, errors.fee, true)! } : {})} />
        </Field>
      </form>
    </Dialog>
  );
}
