import { Link, useLocation } from 'react-router';
import { ArrowRight } from 'lucide-react';
import type { Product } from '../types/product';
import { productActions, productPath } from '../utils/products';
import { StatusBadge } from './StatusBadge';
import { buttonClass } from './Button';
import { cn } from '../utils/cn';
import { originState } from '../utils/origin';

/** Product card driven entirely by registry data. */
export function ProductCard({ product, headingLevel = 'h3' }: { product: Product; headingLevel?: 'h2' | 'h3' }) {
  const { primary, secondary } = productActions(product);
  const Icon = product.icon;
  const Heading = headingLevel;
  const featured = product.demo !== undefined;
  // Lets the solution page offer a way back to these exact results.
  const state = originState(useLocation());

  return (
    <article
      className={cn(
        'flex h-full flex-col rounded-[var(--radius-panel)] border bg-surface p-5 sm:p-6',
        featured ? 'border-fg shadow-[var(--shadow-panel)]' : 'border-line',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            'inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-control)]',
            featured ? 'bg-accent text-on-accent' : 'bg-subtle text-fg-muted',
          )}
        >
          <Icon size={22} strokeWidth={2} aria-hidden="true" />
        </span>
        <StatusBadge status={product.status} />
      </div>

      <Heading className="mt-5 text-xl font-semibold tracking-[-0.015em]">
        <Link to={productPath(product)} state={state} className="hover:underline hover:decoration-accent hover:decoration-2 hover:underline-offset-4">
          {product.name}
        </Link>
      </Heading>
      <p className="text-sm font-medium text-fg-muted">{product.kind}</p>
      <p className="mt-2 flex-1 leading-relaxed text-fg-muted">{product.summary}</p>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Link
          to={primary.to}
          state={state}
          className={buttonClass(featured ? 'primary' : 'secondary', 'sm')}
          aria-label={`${primary.label}: ${product.name}`}
        >
          {primary.label}
          {featured ? <ArrowRight size={16} aria-hidden="true" /> : null}
        </Link>
        {secondary ? (
          <Link
            to={secondary.to}
            state={state}
            className={buttonClass('subtle', 'sm')}
            aria-label={`${secondary.label}: ${product.name}`}
          >
            {secondary.label}
          </Link>
        ) : null}
      </div>
    </article>
  );
}
