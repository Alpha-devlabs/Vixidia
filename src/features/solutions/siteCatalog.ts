import { products } from '../../config/products';
import { solutionIdeas } from '../../config/solutionIdeas';
import { buildCatalog } from './catalog';

/**
 * The one catalogue every search on the site uses: the homepage search and the
 * Solutions finder (/products) read the same records and the same ranking.
 */
export const siteCatalog = buildCatalog(products, solutionIdeas);

/** How many matches the homepage shows before pointing to the full finder. */
export const HOME_RESULT_LIMIT = 4;

/** Example searches offered on the homepage. Each one finds at least one existing solution (checked in tests). */
export const exampleSearches = ['water delivery', 'manage gym members', 'salon appointments', 'track invoices', 'manage student fees', 'inventory'] as const;

/** Builds a finder or homepage link that carries a search, using the same `q` parameter everywhere. */
export function withQuery(path: string, query: string): string {
  const q = query.trim();
  return q ? `${path}?${new URLSearchParams({ q }).toString()}` : path;
}
