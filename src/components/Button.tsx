import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { cn } from '../utils/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'subtle' | 'destructive' | 'inverse';
export type ButtonSize = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] font-semibold whitespace-nowrap transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50';

const variants: Record<ButtonVariant, string> = {
  /** The one main action in a view. */
  primary: 'bg-accent text-on-accent shadow-[var(--shadow-panel)] hover:bg-accent-hover',
  /** Alternatives next to a primary action. */
  secondary: 'border border-line-strong bg-surface text-fg hover:bg-subtle',
  /** Low-emphasis actions: cancel, view details, toolbar items. */
  subtle: 'text-fg hover:bg-subtle',
  /** Irreversible actions. Outlined, so it never competes with the primary action. */
  destructive: 'border border-danger bg-surface text-danger-strong hover:bg-danger-soft',
  /** Secondary actions on dark brand bands. */
  inverse: 'border border-on-inverse/30 text-on-inverse hover:border-on-inverse hover:bg-on-inverse/10',
};

/** Fixed heights keep controls aligned: 36 / 40 / 48px. */
const sizes: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-3 text-sm',
  md: 'min-h-10 px-4 text-[0.95rem]',
  lg: 'min-h-12 px-5 text-base',
};

export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', extra?: string): string {
  return cn(base, variants[variant], sizes[size], extra);
}

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  /** Associates a submit button outside its form, e.g. in a dialog footer. */
  form?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
  ariaControls?: string;
  ariaExpanded?: boolean;
  ariaPressed?: boolean;
}

export function Button({
  children,
  onClick,
  type = 'button',
  form,
  variant = 'primary',
  size = 'md',
  disabled,
  className,
  ariaLabel,
  ariaControls,
  ariaExpanded,
  ariaPressed,
}: ButtonProps) {
  return (
    <button
      type={type}
      form={form}
      onClick={onClick}
      disabled={disabled}
      className={buttonClass(variant, size, className)}
      aria-label={ariaLabel}
      aria-controls={ariaControls}
      aria-expanded={ariaExpanded}
      aria-pressed={ariaPressed}
    >
      {children}
    </button>
  );
}

interface ButtonLinkProps {
  to: string;
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

/** A link styled as a button. External URLs open as normal anchors. */
export function ButtonLink({ to, children, variant = 'primary', size = 'md', className }: ButtonLinkProps) {
  const cls = buttonClass(variant, size, className);
  if (/^https?:\/\//.test(to)) {
    return (
      <a href={to} className={cls} rel="noopener noreferrer">
        {children}
      </a>
    );
  }
  return (
    <Link to={to} className={cls}>
      {children}
    </Link>
  );
}
