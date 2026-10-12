import { useCallback, useEffect, useRef, useState } from 'react';
import { CircleCheck, Info } from 'lucide-react';

export interface ToastMessage {
  id: number;
  message: string;
  tone: 'success' | 'info';
}

/** Small toast queue: one message at a time, cleared after a few seconds. */
export function useToast(timeoutMs = 4500) {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const seq = useRef(0);
  const notify = useCallback((message: string, tone: ToastMessage['tone'] = 'success') => {
    seq.current += 1;
    setToast({ id: seq.current, message, tone });
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), timeoutMs);
    return () => window.clearTimeout(t);
  }, [toast, timeoutMs]);
  return { toast, notify };
}

/** Announces the toast politely to screen readers and shows it at the bottom of the screen. */
export function ToastRegion({ toast }: { toast: ToastMessage | null }) {
  const Icon = toast?.tone === 'info' ? Info : CircleCheck;
  return (
    <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      {toast ? (
        <p
          key={toast.id}
          className="animate-pop flex max-w-md items-start gap-2 rounded-[var(--radius-control)] bg-fg px-4 py-3 text-sm font-medium text-canvas shadow-[var(--shadow-lift)]"
        >
          <Icon size={17} className="mt-px shrink-0" aria-hidden="true" />
          {toast.message}
        </p>
      ) : null}
    </div>
  );
}
