import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { createSampleState } from '../../data/pulseSample';
import { pulseReducer } from './pulseLogic';
import { formatCurrency } from '../../utils/format';

export interface Toast {
  id: number;
  message: string;
}

/**
 * Demo state lives only in memory: nothing is stored or sent anywhere,
 * and reloading the page restores the sample data.
 */
export function usePulseDemo() {
  const initialToday = useRef<string | null>(null);
  const [state, dispatch] = useReducer(pulseReducer, undefined, () => {
    const s = createSampleState();
    initialToday.current = s.today;
    return s;
  });
  const [toast, setToast] = useState<Toast | null>(null);
  const toastSeq = useRef(0);

  const notify = useCallback((message: string) => {
    toastSeq.current += 1;
    setToast({ id: toastSeq.current, message });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(t);
  }, [toast]);

  const actions = useMemo(
    () => ({
      setTarget(revenueTarget30: number) {
        dispatch({ type: 'setTarget', revenueTarget30 });
        notify(`Target set to ${formatCurrency(revenueTarget30)} per 30 days.`);
      },
      reset() {
        // Keep the same "today" so the restored dataset matches the one first shown.
        dispatch({ type: 'reset', state: createSampleState(initialToday.current ?? undefined) });
        notify('Sample data restored.');
      },
    }),
    [notify],
  );

  return { state, actions, toast };
}
