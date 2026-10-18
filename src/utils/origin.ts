import { paths } from '../config/routes';

/**
 * Where a visitor opened a solution from, so its page can offer a way back to
 * the same results. It travels in router location state (not the URL), so
 * product and demo URLs stay exactly as they are, and a shared or new-tab link
 * simply falls back to "All solutions".
 */
export interface Origin {
  /** "/products?q=gym" or "/?q=gym" */
  from: string;
}

const allowed = [paths.home, paths.products] as const;

/** The state to attach to a link from a search page. */
export function originState(location: { pathname: string; search: string }): Origin {
  return { from: `${location.pathname}${location.search}` };
}

export interface BackLink {
  to: string;
  label: string;
  /** The search being returned to, if any. */
  query?: string;
}

/** A safe back link from location state: only the homepage or the finder, with at most a search and category. */
export function backLink(state: unknown): BackLink {
  const fallback: BackLink = { to: paths.products, label: 'All solutions' };
  const from = (state as Partial<Origin> | null)?.from;
  if (typeof from !== 'string' || !from.startsWith('/') || from.startsWith('//')) return fallback;
  let url: URL;
  try {
    url = new URL(from, 'https://vixidia.invalid');
  } catch {
    return fallback;
  }
  if (!(allowed as readonly string[]).includes(url.pathname)) return fallback;
  const q = url.searchParams.get('q')?.trim() ?? '';
  const keep = new URLSearchParams();
  if (q) keep.set('q', q);
  const category = url.searchParams.get('category');
  if (url.pathname === paths.products && category) keep.set('category', category);
  const search = keep.toString();
  const to = `${url.pathname}${search ? `?${search}` : ''}`;
  if (q) return { to, label: `Back to results for “${q}”`, query: q };
  if (url.pathname === paths.home) return { to: paths.products, label: 'All solutions' };
  return { to, label: 'Back to all solutions' };
}
