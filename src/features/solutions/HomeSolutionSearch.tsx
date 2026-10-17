import { useId, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Search, SearchX, X } from 'lucide-react';
import { Button, ButtonLink, buttonClass } from '../../components/Button';
import { paths } from '../../config/routes';
import { pluralize } from '../../utils/format';
import { queryWords, topMatches } from './catalog';
import { SolutionResult } from './SolutionResult';
import { HOME_RESULT_LIMIT, exampleSearches, siteCatalog, withQuery } from './siteCatalog';
import { RequestSolutionDialog } from './RequestSolutionDialog';

/**
 * The homepage's search: the same catalogue and ranking as the Solutions
 * finder, with a compact set of best matches shown right under the field.
 * The query lives in the URL (`/?q=…`, the same parameter the finder uses), so
 * results survive a refresh and can be shared. Typing updates results live;
 * Enter keeps the visitor here and brings the results into view; Escape clears.
 */
export function HomeSolutionSearch() {
  const id = useId();
  const { search, pathname } = useLocation();
  const navigate = useNavigate();
  const query = new URLSearchParams(search).get('q') ?? '';
  const [request, setRequest] = useState<{ ideaName?: string; businessType?: string; key: number } | null>(null);
  const resultsRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const active = queryWords(query).length > 0;
  const { shown, total } = useMemo(() => topMatches(siteCatalog, query, HOME_RESULT_LIMIT), [query]);
  const all = siteCatalog.length;

  const setQuery = (q: string) => {
    const p = new URLSearchParams(search);
    if (q) p.set('q', q);
    else p.delete('q');
    const s = p.toString();
    navigate(`${pathname}${s ? `?${s}` : ''}`, { replace: true });
  };
  const runExample = (q: string) => {
    setQuery(q);
    inputRef.current?.focus();
  };
  const openRequest = (ideaName?: string, businessType?: string) => setRequest({ ...(ideaName ? { ideaName } : {}), ...(businessType ? { businessType } : {}), key: Date.now() });

  return (
    <div className="mx-auto w-full max-w-3xl">
      <form
        role="search"
        aria-label="Find a solution"
        onSubmit={(e: { preventDefault: () => void }) => {
          e.preventDefault();
          const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
          resultsRef.current?.scrollIntoView?.({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
        }}
      >
        <label htmlFor={`${id}-q`} className="sr-only">
          What do you need help managing?
        </label>
        <div className="relative">
          <Search size={22} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
          <input
            ref={inputRef}
            id={`${id}-q`}
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            spellCheck={false}
            value={query}
            onChange={(e: { target: { value: string } }) => setQuery(e.target.value)}
            onKeyDown={(e: { key: string; preventDefault: () => void }) => {
              if (e.key === 'Escape' && query) {
                e.preventDefault();
                setQuery('');
              }
            }}
            placeholder="What do you need help managing?"
            aria-describedby={`${id}-status`}
            className="block min-h-16 w-full rounded-[var(--radius-panel)] border border-line-strong bg-surface pr-32 pl-13 text-base text-fg shadow-[var(--shadow-panel)] placeholder:text-fg-subtle focus:border-accent sm:pr-36 sm:text-lg [&::-webkit-search-cancel-button]:hidden"
          />
          <div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-1">
            {query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  inputRef.current?.focus();
                }}
                className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-control)] text-fg-muted hover:bg-subtle hover:text-fg"
                aria-label="Clear search"
              >
                <X size={18} aria-hidden="true" />
              </button>
            ) : null}
            <button type="submit" className={buttonClass('primary', 'md', 'min-h-11 px-3 sm:px-4')}>
              <Search size={17} aria-hidden="true" className="sm:hidden" />
              <span className="sr-only sm:not-sr-only">Search</span>
            </button>
          </div>
        </div>
      </form>

      <p id={`${id}-status`} className="sr-only" aria-live="polite">
        {active ? (total ? `${pluralize(total, 'solution')} match “${query.trim()}”.` : `No solutions match “${query.trim()}”.`) : ''}
      </p>

      {!active ? (
        <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-2 text-sm">
          <span className="text-fg-muted">Try:</span>
          {exampleSearches.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => runExample(s)}
              className="inline-flex min-h-9 items-center rounded-full border border-line bg-surface px-3 text-fg-muted transition-colors hover:border-line-strong hover:text-fg"
            >
              {s}
            </button>
          ))}
        </div>
      ) : (
        <section ref={resultsRef} aria-labelledby={`${id}-results`} className="mt-3 scroll-mt-24 overflow-hidden rounded-[var(--radius-panel)] border border-line bg-surface text-left shadow-[var(--shadow-panel)]">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-line px-4 py-3 sm:px-5">
            <h2 id={`${id}-results`} className="text-sm font-semibold text-fg">
              {total ? `${pluralize(total, 'matching solution')}` : 'No matching solutions'}
              <span className="font-normal text-fg-muted"> for “{query.trim()}”</span>
            </h2>
            {total > shown.length ? (
              <Link to={withQuery(paths.products, query)} className="text-sm font-medium text-accent-strong underline-offset-4 hover:underline">
                See all {total} in Solutions
              </Link>
            ) : null}
          </div>
          {shown.length ? (
            <ul className="divide-y divide-line" aria-label="Matching solutions">
              {shown.map((e) => (
                <li key={e.id}>
                  <SolutionResult entry={e} onInterest={() => openRequest(e.name, e.label)} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-8 text-center sm:px-5">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-subtle text-fg-subtle">
                <SearchX size={20} aria-hidden="true" />
              </span>
              <p className="mt-3 font-medium text-fg">Nothing matches “{query.trim()}” yet</p>
              <p className="mx-auto mt-1 max-w-[46ch] text-sm text-fg-muted">Try a different word for your business or what you want to manage, or tell us what you need.</p>
              <div className="mt-4 flex flex-wrap justify-center gap-x-2 gap-y-2 text-sm">
                {exampleSearches.slice(0, 4).map((s) => (
                  <button key={s} type="button" onClick={() => runExample(s)} className="inline-flex min-h-9 items-center rounded-full border border-line px-3 text-fg-muted hover:border-line-strong hover:text-fg">
                    {s}
                  </button>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <ButtonLink to={paths.products} variant="secondary" size="sm">
                  Browse all {all} solutions
                </ButtonLink>
                <Button size="sm" onClick={() => openRequest(undefined, query.trim())}>
                  Request a solution
                </Button>
              </div>
            </div>
          )}
          {shown.length && total <= shown.length ? (
            <p className="border-t border-line px-4 py-2.5 text-sm sm:px-5">
              <Link to={paths.products} className="font-medium text-fg-muted underline-offset-4 hover:text-fg hover:underline">
                Browse all {all} solutions
              </Link>
            </p>
          ) : null}
        </section>
      )}

      {!active ? (
        <p className="mt-6 text-sm text-fg-muted">
          <Link to={paths.products} className="font-semibold text-fg underline decoration-accent decoration-2 underline-offset-4 hover:decoration-fg">
            Browse all {all} solutions
          </Link>{' '}
          or{' '}
          <Link to={paths.services} className="font-medium text-fg underline decoration-line-strong underline-offset-4 hover:decoration-fg">
            ask about custom software
          </Link>
          .
        </p>
      ) : null}

      {request ? <RequestSolutionDialog key={request.key} open ideaName={request.ideaName} businessType={request.businessType} onClose={() => setRequest(null)} /> : null}
    </div>
  );
}
