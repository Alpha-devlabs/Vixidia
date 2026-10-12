import { useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';
import { currentTheme, subscribeTheme, toggleTheme } from './theme';
import { cn } from '../utils/cn';

export function useTheme() {
  return useSyncExternalStore(subscribeTheme, currentTheme, () => 'light' as const);
}

interface Props {
  /** Use on dark brand bands such as product sidebars. */
  inverse?: boolean;
  className?: string;
}

/** Switches between light and dark. The label names the theme it switches to. */
export function ThemeToggle({ inverse = false, className }: Props) {
  const theme = useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';
  const Icon = theme === 'dark' ? Sun : Moon;
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      className={cn(
        'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] transition-colors',
        inverse ? 'text-on-inverse-muted hover:bg-on-inverse/10 hover:text-on-inverse' : 'text-fg-muted hover:bg-subtle hover:text-fg',
        className,
      )}
    >
      <Icon size={19} aria-hidden="true" />
    </button>
  );
}
