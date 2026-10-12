import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../utils/cn';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** `drawer` slides in from the right edge on wider screens; on phones it fills the screen. */
  variant?: 'dialog' | 'drawer';
  /** Dialog width. */
  size?: 'md' | 'lg';
}

/**
 * Modal dialog built on the native <dialog> element, which provides focus
 * containment, Escape-to-close and an inert background.
 */
export function Dialog({ open, onClose, title, description, children, footer, variant = 'dialog', size = 'md' }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();
  const drawer = variant === 'drawer';

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onClose={onClose}
      onCancel={(e: { preventDefault: () => void }) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e: { target: EventTarget; currentTarget: EventTarget }) => {
        // Clicking the backdrop (the dialog element itself) closes it.
        if (e.target === e.currentTarget) onClose();
      }}
      className={cn(
        'border border-line bg-surface p-0 text-fg shadow-[var(--shadow-lift)]',
        drawer
          ? 'm-0 ml-auto h-dvh max-h-dvh w-full max-w-md sm:rounded-l-[var(--radius-panel)] open:animate-drawer'
          : cn('m-auto w-[calc(100%-1.5rem)] rounded-[var(--radius-panel)] open:animate-pop', size === 'lg' ? 'max-w-2xl' : 'max-w-lg'),
      )}
    >
      {open ? (
        <div className={cn('flex flex-col', drawer ? 'h-full' : 'max-h-[calc(100dvh-2rem)]')}>
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <h2 id={titleId} className="text-lg font-semibold tracking-[-0.01em]">
                {title}
              </h2>
              {description ? (
                <p id={descId} className="mt-1 text-sm text-fg-muted">
                  {description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="-mr-2 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-fg-muted hover:bg-subtle hover:text-fg"
              aria-label={drawer ? 'Close panel' : 'Close dialog'}
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
          {footer ? <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-4">{footer}</div> : null}
        </div>
      ) : null}
    </dialog>
  );
}
