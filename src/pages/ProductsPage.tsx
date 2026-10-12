import { usePageMeta } from '../hooks/usePageMeta';
import { PageIntro } from '../components/PageIntro';
import { Container } from '../components/Container';
import { ProductCard } from '../components/ProductCard';
import { ButtonLink } from '../components/Button';
import { StatusBadge } from '../components/StatusBadge';
import { products } from '../config/products';
import { paths } from '../config/routes';
import { statusInfo } from '../utils/products';
import type { ProductStatus } from '../types/product';

const statusOrder: ProductStatus[] = ['live', 'in_build', 'planned'];

export function ProductsPage() {
  usePageMeta('Products', 'Practical tools for small businesses: Pulse, Tasks & Follow-ups, Simple CRM, Invoice & Payment Tracker, and Leave & Attendance.');
  const usedStatuses = statusOrder.filter((s) => products.some((p) => p.status === s));

  return (
    <>
      <PageIntro
        title="Products"
        lead="Focused tools for the work small businesses repeat every day. Each one is labelled honestly: what you can try now, what we are building, and what is still an idea."
      />
      <Container className="py-12 sm:py-16">
        <h2 className="sr-only">What each status means</h2>
        <dl className="grid gap-4 rounded-[var(--radius-panel)] border border-line bg-surface p-5 sm:grid-cols-2 lg:grid-cols-3">
          {usedStatuses.map((s) => (
            <div key={s}>
              <dt>
                <StatusBadge status={s} />
              </dt>
              <dd className="mt-2 text-sm leading-relaxed text-fg-muted">{statusInfo[s].explanation}</dd>
            </div>
          ))}
        </dl>

        <h2 className="sr-only">All products</h2>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <li key={p.id}>
              <ProductCard product={p} />
            </li>
          ))}
        </ul>

        <div className="mt-12 flex flex-col gap-4 rounded-[var(--radius-panel)] border border-dashed border-line-strong p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Don’t see your problem here?</h2>
            <p className="mt-1 text-fg-muted">We also explore custom software for workflows that are specific to one business.</p>
          </div>
          <ButtonLink to={paths.services} variant="secondary" className="shrink-0">
            Custom software services
          </ButtonLink>
        </div>
      </Container>
    </>
  );
}
