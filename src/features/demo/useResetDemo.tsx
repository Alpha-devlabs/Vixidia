import { useState, type ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';
import { Dialog } from '../../components/Dialog';
import { Button } from '../../components/Button';

/**
 * Reset with a safety net: if the visitor has changed anything, ask before
 * discarding it; if not, reset straight away. The reset itself is the demo's
 * own, which rebuilds the whole sample (every record, balance and figure).
 */
export function useResetDemo(changed: boolean, resetNow: () => void): { reset: () => void; resetDialog: ReactNode } {
  const [asking, setAsking] = useState(false);
  const reset = () => {
    if (changed) setAsking(true);
    else resetNow();
  };
  const resetDialog = asking ? (
    <Dialog
      open
      onClose={() => setAsking(false)}
      title="Reset the demo?"
      description="This brings back the original sample data and discards the changes you’ve made in this tab."
      footer={
        <>
          <Button variant="subtle" onClick={() => setAsking(false)}>
            Keep my changes
          </Button>
          <Button
            onClick={() => {
              setAsking(false);
              resetNow();
            }}
          >
            <RotateCcw size={16} aria-hidden="true" /> Reset demo
          </Button>
        </>
      }
    >
      <p className="text-sm text-fg-muted">Nothing outside this tab is affected. You can also reload the page to start again.</p>
    </Dialog>
  ) : null;
  return { reset, resetDialog };
}
