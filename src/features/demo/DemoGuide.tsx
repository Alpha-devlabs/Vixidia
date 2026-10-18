import { useState } from 'react';
import { Info, Lightbulb, X } from 'lucide-react';
import type { DemoGuide as Guide } from './demoGuides';

/**
 * The compact strip under the demo header. It always says what the data is and
 * how long changes last; the suggested first action can be hidden. Nothing here
 * blocks the demo, and "Show me" only scrolls to and focuses a real control.
 */
export function DemoGuide({ guide, kind }: { guide: Guide; kind: 'interactive' | 'design-preview' }) {
  const [showTip, setShowTip] = useState(true);
  const [missing, setMissing] = useState(false);

  const showMe = () => {
    const el = guide.target(document.getElementById('main') ?? document);
    if (!el) {
      setMissing(true);
      return;
    }
    setMissing(false);
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView?.({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
    el.focus({ preventScroll: true });
    el.setAttribute('data-demo-highlight', '');
    window.setTimeout(() => el.removeAttribute('data-demo-highlight'), 2400);
  };

  return (
    <section aria-label="About this demo" className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-2.5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:gap-6 lg:px-8">
        <div className="min-w-0">
          <p className="text-sm font-medium text-fg">{guide.intro}</p>
          <p className="mt-0.5 flex items-start gap-1.5 text-xs text-fg-muted">
            <Info size={14} className="mt-px shrink-0" aria-hidden="true" />
            <span>
              {kind === 'interactive'
                ? 'Fictional sample data. Changes last until you reload or choose Reset demo; nothing is saved or sent.'
                : 'Fictional sample data. A preview of the planned screens: forms are checked, but nothing is saved or sent.'}
            </span>
          </p>
        </div>
        {showTip ? (
          <div className="flex shrink-0 items-center gap-x-2 rounded-[var(--radius-control)] bg-accent-soft py-1 pr-1 pl-2.5 text-sm text-accent-strong sm:pl-3 lg:max-w-[36rem]">
            <Lightbulb size={16} className="hidden shrink-0 sm:block" aria-hidden="true" />
            <p className="min-w-0 flex-1 leading-snug">
              <span className="font-semibold">Try first:</span> {guide.tryFirst}
              {missing ? <span className="block text-xs font-normal text-fg-muted">It’s on the demo’s first screen. Go back there, or reset the demo if you’ve already done it.</span> : null}
            </p>
            <button
              type="button"
              onClick={showMe}
              className="inline-flex min-h-9 shrink-0 items-center rounded-[var(--radius-control)] bg-surface px-3 text-sm font-semibold text-accent-strong shadow-[var(--shadow-panel)] hover:bg-canvas"
            >
              Show me
            </button>
            <button
              type="button"
              onClick={() => setShowTip(false)}
              className="inline-flex h-9 w-8 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-accent-strong hover:bg-surface/60"
              aria-label="Hide suggestion"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
