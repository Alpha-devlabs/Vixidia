import { Lightbulb } from 'lucide-react';
import type { IdeaEntry } from './catalog';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';

/**
 * A planned solution idea. Deliberately different from product cards: dashed
 * border, muted icon, "Planned idea" badge, no link to a page or demo. Its only
 * action is telling us you would use it.
 */
export function IdeaCard({ entry, onInterest }: { entry: IdeaEntry; onInterest: () => void }) {
  const Icon = entry.icon;
  return (
    <article className="flex h-full flex-col rounded-[var(--radius-panel)] border border-dashed border-line-strong bg-surface p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-control)] bg-subtle text-fg-muted">
          <Icon size={22} strokeWidth={2} aria-hidden="true" />
        </span>
        <Badge tone="neutral" icon={Lightbulb} dashed>
          Planned idea
        </Badge>
      </div>
      <h3 className="mt-5 text-xl font-semibold tracking-[-0.015em]">{entry.name}</h3>
      <p className="text-sm font-medium text-fg-muted">{entry.label}</p>
      <p className="mt-2 leading-relaxed text-fg-muted">{entry.summary}</p>
      <div className="mt-4 flex-1">
        <p className="text-xs font-medium text-fg-subtle">Would help with</p>
        <ul className="mt-1.5 flex flex-wrap gap-1.5" aria-label={`${entry.name} would help with`}>
          {entry.idea.wouldCover.map((w) => (
            <li key={w} className="rounded-full border border-line bg-canvas px-2.5 py-0.5 text-xs text-fg-muted">
              {w}
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2">
        <Button variant="secondary" size="sm" onClick={onInterest} ariaLabel={`I’d use this: ${entry.name}`}>
          I’d use this
        </Button>
        <span className="text-xs text-fg-subtle">Not built yet · no demo</span>
      </div>
    </article>
  );
}
