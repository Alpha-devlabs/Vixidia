import { useId, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Lightbulb, Search, SearchX, X } from 'lucide-react';
import { usePageMeta } from '../hooks/usePageMeta';
import { Container } from '../components/Container';
import { ProductCard } from '../components/ProductCard';
import { Button, ButtonLink } from '../components/Button';
import { StatusBadge } from '../components/StatusBadge';
import { Badge } from '../components/Badge';
import { products } from '../config/products';
import { solutionIdeas } from '../config/solutionIdeas';
import { paths } from '../config/routes';
import { buildCatalog, categoryCounts, categoryFilters, searchCatalog, type CategoryFilter } from '../features/solutions/catalog';
import { IdeaCard } from '../features/solutions/IdeaCard';
import { RequestSolutionDialog } from '../features/solutions/RequestSolutionDialog';
import { pluralize } from '../utils/format';
import { cn } from '../utils/cn';

const suggestions = ['water delivery', 'gym', 'invoices', 'customers', 'attendance', 'follow-ups'];

function isCategory(v: string | null): v is CategoryFilter {
  return categoryFilters.some((c) => c.value === v);
}

/**
 * The solutions finder (at /products): search-first discovery across the
 * products in the registry and the planned solution ideas. The search and the
 * category live in the URL (?q=…&category=…), so results can be shared and the
 * back button works.
 */
export function ProductsPage() {
  usePageMeta('Solutions', 'Find Vixidia software by business, industry or problem: try working demos, or tell us which planned solution you need.');
  const id = useId();
  const { search, pathname } = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(search);
  const query = params.get('q') ?? '';
  const rawCategory = params.get('category');
  const category: CategoryFilter = isCategory(rawCategory) ? rawCategory : 'all';
  const [request, setRequest] = useState<{ ideaName?: string; businessType?: string; key: number } | null>(null);

  const catalog = useMemo(() => buildCatalog(products, solutionIdeas), []);
  const results = useMemo(() => searchCatalog(catalog, query, category), [catalog, query, category]);
  const counts = useMemo(() => categoryCounts(catalog, query), [catalog, query]);
  const filtered = query.trim() !== '' || category !== 'all';

  const update = (next: { q?: string; category?: CategoryFilter }) => {
    const p = new URLSearchParams(search);
    const q = next.q ?? query;
    const c = next.category ?? category;
    if (q) p.set('q', q);
    else p.delete('q');
    if (c !== 'all') p.set('category', c);
    else p.delete('category');
    const s = p.toString();
    navigate(`${pathname}${s ? `?${s}` : ''}`, { replace: true });
  };
  const clear = () => navigate(pathname, { replace: true });
  const openRequest = (ideaName?: string, businessType?: string) => setRequest({ ...(ideaName ? { ideaName } : {}), ...(businessType ? { businessType } : {}), key: Date.now() });

  return (
    <>
      <header className="border-b border-line bg-surface">
        <Container className="py-12 sm:py-16">
          <p className="text-sm font-semibold text-accent-strong">Solutions</p>
          <h1 className="mt-2 max-w-3xl text-4xl font-bold tracking-[-0.03em] text-balance sm:text-5xl">Find software built around how your business works</h1>
          <p className="mt-4 max-w-[62ch] text-lg leading-relaxed text-fg-muted">
            Search by the kind of business you run or the problem you want to solve. Try the tools that have demos, or tell us which planned idea you
            need.
          </p>

          <form
            role="search"
            aria-label="Solutions"
            className="mt-8 max-w-2xl"
            onSubmit={(e: { preventDefault: () => void }) => e.preventDefault()}
          >
            <label htmlFor={`${id}-q`} className="sr-only">
              Search solutions by business, industry or problem
            </label>
            <div className="relative">
              <Search size={20} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
              <input
                id={`${id}-q`}
                type="search"
                value={query}
                onChange={(e: { target: { value: string } }) => update({ q: e.target.value })}
                placeholder="Search by business, industry, or problem..."
                autoComplete="off"
                className={controlClassLarge}
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => update({ q: '' })}
                  className="absolute top-1/2 right-2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-[var(--radius-control)] text-fg-muted hover:bg-subtle hover:text-fg"
                  aria-label="Clear search"
                >
                  <X size={18} aria-hidden="true" />
                </button>
              ) : null}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-2 text-sm">
              <span className="text-fg-muted">Try:</span>
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => update({ q: s })}
                  className="rounded-full border border-line px-2.5 py-1 text-fg-muted transition-colors hover:border-line-strong hover:text-fg"
                >
                  {s}
                </button>
              ))}
            </div>
          </form>
        </Container>
      </header>

      <Container className="py-10 sm:py-12">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-1.5">
            {categoryFilters.map((c) => {
              const active = category === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => update({ category: c.value })}
                  className={cn(
                    'inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors',
                    active ? 'border-accent bg-accent-soft text-accent-strong' : 'border-line bg-surface text-fg-muted hover:border-line-strong hover:text-fg',
                  )}
                >
                  {c.label}
                  <span className="tabular text-xs opacity-80">{counts[c.value]}</span>
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-3 text-sm text-fg-muted">
            <p aria-live="polite">
              {filtered ? `${pluralize(results.length, 'result')}${query.trim() ? ` for “${query.trim()}”` : ''}` : `${pluralize(catalog.length, 'solution')}`}
            </p>
            {filtered ? (
              <Button variant="subtle" size="sm" onClick={clear}>
                Clear search and filters
              </Button>
            ) : null}
          </div>
        </div>

        <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-fg-muted">
          <span className="inline-flex items-center gap-1.5">
            <StatusBadge status="in_build" /> Being built; try the demo with sample data
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Badge tone="neutral" icon={Lightbulb} dashed>
              Planned idea
            </Badge>
            Not built yet and no demo; tell us if you’d use it
          </span>
        </p>

        <h2 className="sr-only">Results</h2>
        {results.length === 0 ? (
          <div className="mt-8 flex flex-col items-center rounded-[var(--radius-panel)] border border-line bg-surface px-4 py-14 text-center">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-subtle text-fg-subtle">
              <SearchX size={20} aria-hidden="true" />
            </span>
            <p className="mt-3 font-medium text-fg">No solutions match{query.trim() ? ` “${query.trim()}”` : ' this filter'}</p>
            <p className="mt-1 max-w-[46ch] text-sm text-fg-muted">Try a different word for your business or problem, or tell us what you need.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Button variant="secondary" size="sm" onClick={clear}>
                Clear search and filters
              </Button>
              <Button size="sm" onClick={() => openRequest(undefined, query.trim())}>
                Request a solution
              </Button>
            </div>
          </div>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((e) => (
              <li key={e.id}>
                {e.type === 'product' ? <ProductCard product={e.product} /> : <IdeaCard entry={e} onInterest={() => openRequest(e.name, e.label)} />}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-12 flex flex-col gap-4 rounded-[var(--radius-panel)] border border-dashed border-line-strong p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Don’t see your business here?</h2>
            <p className="mt-1 text-fg-muted">Tell us what you want to manage. We also build custom software for workflows that are specific to one business.</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button onClick={() => openRequest()}>Request a solution</Button>
            <ButtonLink to={paths.services} variant="secondary">
              Custom software
            </ButtonLink>
          </div>
        </div>
      </Container>

      {request ? (
        <RequestSolutionDialog key={request.key} open ideaName={request.ideaName} businessType={request.businessType} onClose={() => setRequest(null)} />
      ) : null}
    </>
  );
}

const controlClassLarge =
  'block min-h-14 w-full rounded-[var(--radius-panel)] border border-line-strong bg-surface pr-12 pl-12 text-base text-fg shadow-[var(--shadow-panel)] placeholder:text-fg-subtle focus:border-accent [&::-webkit-search-cancel-button]:hidden';
