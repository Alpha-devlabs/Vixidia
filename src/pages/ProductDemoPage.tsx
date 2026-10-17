import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, FlaskConical } from 'lucide-react';
import { usePageMeta } from '../hooks/usePageMeta';
import { SiteFrame } from '../app/SiteLayout';
import { NotFoundContent } from './NotFoundPage';
import { BrandMark } from '../components/Wordmark';
import { ThemeToggle } from '../theme/ThemeToggle';
import { PulseDemo } from '../features/pulse/PulseDemo';
import { InvoiceTracker } from '../features/invoices/InvoiceTracker';
import { CrmApp } from '../features/crm/CrmApp';
import { TasksApp } from '../features/tasks/TasksApp';
import { LeaveApp } from '../features/leave/LeaveApp';
import { WaterApp } from '../features/water/WaterApp';
import { GymApp } from '../features/gym/GymApp';
import { brand } from '../config/brand';
import { paths } from '../config/routes';
import { getProductBySlug, productPath } from '../utils/products';
import type { DemoId, Product } from '../types/product';

/** Demo components keyed by demo id. Add an entry here when a new demo is built. */
const demos: Record<DemoId, () => ReactNode> = {
  'pulse-dashboard': () => <PulseDemo />,
  'invoice-tracker': () => <InvoiceTracker />,
  crm: () => <CrmApp />,
  tasks: () => <TasksApp />,
  leave: () => <LeaveApp />,
  water: () => <WaterApp />,
  gym: () => <GymApp />,
};

export function ProductDemoPage() {
  const { slug } = useParams<'slug'>();
  const product = getProductBySlug(slug);
  const demo = product?.demo;
  usePageMeta(
    product && demo ? `${product.name} demo` : 'Demo not found',
    product && demo ? `Try ${product.name} with sample data — no sign-up required.` : undefined,
  );

  if (!product) {
    return (
      <SiteFrame>
        <NotFoundContent
          title="There’s no demo at this address"
          message="We couldn’t find a product with that name. Browse the products to see which demos are available."
        />
      </SiteFrame>
    );
  }
  if (!demo) {
    return (
      <SiteFrame>
        <NotFoundContent
          title={`${product.name} doesn’t have a demo yet`}
          message={`${product.name} is still a planned product, so there is nothing to try yet. You can read about it or tell us you would use it.`}
        />
      </SiteFrame>
    );
  }
  return <DemoShell product={product}>{demos[demo.id]()}</DemoShell>;
}

const shellCopy = {
  interactive: {
    badge: 'Interactive demo · Sample data',
    short: 'Demo · Sample data',
    note: 'A fictional business. Changes stay in this tab and are cleared when you reload — nothing is saved or sent anywhere.',
  },
  'design-preview': {
    badge: 'Design preview · Sample data',
    short: 'Preview',
    note: 'A fictional business. These screens show the planned design; forms are checked but nothing is saved or sent anywhere.',
  },
} as const;

function DemoShell({ product, children }: { product: Product; children: ReactNode }) {
  const copy = shellCopy[product.demo?.kind ?? 'interactive'];
  return (
    <div className="min-h-dvh bg-canvas">
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-line bg-surface px-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <Link
            to={productPath(product)}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-[var(--radius-control)] px-2 text-sm font-medium text-fg-muted hover:bg-subtle hover:text-fg"
          >
            <ArrowLeft size={17} aria-hidden="true" />
            <span className="hidden lg:inline">Back to {product.name}</span>
            <span className="lg:hidden">Back</span>
          </Link>
          <Link to={paths.home} className="hidden min-w-0 items-center gap-2 md:inline-flex" aria-label={`${brand.name} home`}>
            <BrandMark className="h-6 w-6" />
            <span className="truncate text-sm font-semibold">
              {brand.name} {product.name}
            </span>
          </Link>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-accent/50 bg-accent-soft px-3 py-1 text-xs font-semibold text-accent-strong">
            <FlaskConical size={14} aria-hidden="true" />
            <span className="hidden sm:inline">{copy.badge}</span>
            <span className="sm:hidden">{copy.short}</span>
          </p>
          <ThemeToggle />
        </div>
      </header>
      <main id="main">
        <p className="border-b border-line bg-surface px-4 py-2 text-center text-xs text-fg-muted sm:text-sm">
          {copy.note}
        </p>
        {children}
      </main>
    </div>
  );
}
