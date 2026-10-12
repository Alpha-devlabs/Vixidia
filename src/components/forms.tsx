import type { ReactNode } from 'react';
import { cn } from '../utils/cn';

/** Shared look for text inputs and selects: 40px tall, token-driven, visible invalid state. */
export function controlClass(invalid = false, extra?: string): string {
  return cn(
    'h-10 w-full rounded-[var(--radius-control)] border bg-surface px-3 text-[0.95rem] text-fg placeholder:text-fg-subtle',
    'transition-colors disabled:cursor-not-allowed disabled:bg-subtle disabled:text-fg-muted',
    invalid ? 'border-danger' : 'border-line-strong hover:border-fg-subtle focus:border-accent',
    extra,
  );
}

export function textareaClass(invalid = false, extra?: string): string {
  return controlClass(invalid, cn('h-auto min-h-24 py-2 leading-relaxed', extra));
}

interface FieldProps {
  id: string;
  label: string;
  /** Short guidance shown under the control when there is no error. */
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * Label + control + hint/error. Give the control `aria-describedby={describedBy(id, …)}`
 * so screen readers hear the hint or the error.
 */
export function Field({ id, label, hint, error, optional, className, children }: FieldProps) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-fg">
        {label}
        {optional ? <span className="font-normal text-fg-subtle"> (optional)</span> : null}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-sm font-medium text-danger-strong">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-sm text-fg-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function describedBy(id: string, error?: string, hasHint?: boolean): string | undefined {
  if (error) return `${id}-error`;
  return hasHint ? `${id}-hint` : undefined;
}

/** A titled group of related fields. */
export function FieldGroup({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <fieldset className="min-w-0">
      <legend className="text-base font-semibold text-fg">{title}</legend>
      {description ? <p className="mt-0.5 text-sm text-fg-muted">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </fieldset>
  );
}
