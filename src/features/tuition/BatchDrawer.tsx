import { ClipboardCheck, Pencil, UserPlus } from 'lucide-react';
import type { TuitionBook } from '../../types/tuition';
import { Dialog } from '../../components/Dialog';
import { Button } from '../../components/Button';
import { batchOf, batchSessions, currentRoster, gradeText, percent, rupees, scheduleText, sessionSummary, studentAttendance, teacherOf } from './tuitionLogic';
import { ActiveBadge, Initials, shortDay } from './TuitionBits';

interface Props {
  book: TuitionBook;
  batchId: string | null;
  open: boolean;
  onClose: () => void;
  onEdit: (id: string) => void;
  onEnrol: (id: string) => void;
  onUnenrol: (enrolmentId: string) => void;
  onOpenStudent: (id: string) => void;
  onAttendance: (batchId: string) => void;
}

/** A batch: schedule, teacher, roster, and recent classes with attendance. */
export function BatchDrawer({ book, batchId, open, onClose, onEdit, onEnrol, onUnenrol, onOpenStudent, onAttendance }: Props) {
  const b = batchId ? batchOf(book, batchId) : undefined;
  if (!b) return null;
  const roster = currentRoster(book, b.id);
  const recent = batchSessions(book, b.id)
    .filter((s) => s.date <= book.today)
    .reverse()
    .slice(0, 6);
  const active = b.status === 'active';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      variant="drawer"
      title={b.name}
      description={`${b.subject} · ${gradeText(b.gradeFrom, b.gradeTo)}`}
      footer={
        <>
          <Button variant="subtle" onClick={() => onEdit(b.id)}>
            <Pencil size={16} aria-hidden="true" /> Edit
          </Button>
          <Button variant="secondary" onClick={() => onAttendance(b.id)} disabled={!active}>
            <ClipboardCheck size={16} aria-hidden="true" /> Attendance
          </Button>
          <Button onClick={() => onEnrol(b.id)} disabled={!active}>
            <UserPlus size={16} aria-hidden="true" /> Enrol student
          </Button>
        </>
      }
    >
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-sm">
        <dt className="text-fg-muted">Status</dt>
        <dd>
          <ActiveBadge active={active} label={['Running', 'Not running']} />
        </dd>
        <dt className="text-fg-muted">Teacher</dt>
        <dd className="text-fg">{teacherOf(book, b.teacherId)?.name}</dd>
        <dt className="text-fg-muted">Schedule</dt>
        <dd className="tabular text-fg">{scheduleText(b)}</dd>
        <dt className="text-fg-muted">Classroom</dt>
        <dd className="text-fg">{b.room}</dd>
        <dt className="text-fg-muted">Monthly fee</dt>
        <dd className="tabular text-fg">{rupees(b.monthlyFeePaise)} per student</dd>
      </dl>

      <h3 className="mt-6 text-sm font-semibold text-fg">
        Roster <span className="tabular font-normal text-fg-muted">({roster.length})</span>
      </h3>
      {roster.length === 0 ? (
        <p className="mt-1.5 text-sm text-fg-subtle">No students enrolled.</p>
      ) : (
        <ul className="mt-2 divide-y divide-line rounded-[var(--radius-control)] border border-line" aria-label={`Roster of ${b.name}`}>
          {roster.map(({ student, enrolment }) => (
            <li key={enrolment.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenStudent(student.id);
                }}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
                aria-label={`Open ${student.name}`}
              >
                <Initials name={student.name} size="sm" />
                <span className="min-w-0">
                  <span className="block truncate font-medium text-fg hover:underline">{student.name}</span>
                  <span className="tabular block truncate text-xs text-fg-muted">
                    Grade {student.grade} · {percent(studentAttendance(book, student.id, b.id).rate)} attended
                    {enrolment.feePaise !== undefined ? ` · ${rupees(enrolment.feePaise)} fee` : ''}
                  </span>
                </span>
              </button>
              <Button variant="subtle" size="sm" onClick={() => onUnenrol(enrolment.id)} ariaLabel={`Remove ${student.name} from ${b.name}`}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}

      <h3 className="mt-6 text-sm font-semibold text-fg">Recent classes</h3>
      {recent.length === 0 ? (
        <p className="mt-1.5 text-sm text-fg-subtle">No classes yet.</p>
      ) : (
        <ul className="mt-2 divide-y divide-line rounded-[var(--radius-control)] border border-line">
          {recent.map((s) => {
            const sum = sessionSummary(book, s);
            return (
              <li key={s.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span className="tabular text-fg">{s.date === book.today ? 'Today' : shortDay(s.date)}</span>
                <span className="tabular text-xs text-fg-muted">{sum.taken ? `${sum.present + sum.late} of ${sum.eligible} attended · ${percent(sum.rate)}` : 'Attendance not taken'}</span>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-6 text-xs text-fg-muted">Removing a student ends their enrolment today. Their past attendance and fees stay on record.</p>
    </Dialog>
  );
}
