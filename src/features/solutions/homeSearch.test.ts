import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Lightbulb } from 'lucide-react';
import { products } from '../../config/products';
import { solutionIdeas, type SolutionIdea } from '../../config/solutionIdeas';
import { buildCatalog, queryWords, searchCatalog, topMatches } from './catalog';
import { HOME_RESULT_LIMIT, exampleSearches, siteCatalog, withQuery } from './siteCatalog';
import { SolutionResult } from './SolutionResult';

const top = (q: string) => topMatches(siteCatalog, q, HOME_RESULT_LIMIT);
const firstName = (q: string) => top(q).shown[0]?.name;

describe('homepage search', () => {
  it('uses the same catalogue and ranking as the Solutions finder', () => {
    expect(siteCatalog).toEqual(buildCatalog(products, solutionIdeas));
    for (const q of ['gym', 'payments', 'orders', 'attendance', 'customer balances']) {
      expect(top(q).shown.map((e) => e.id), q).toEqual(searchCatalog(siteCatalog, q).slice(0, HOME_RESULT_LIMIT).map((e) => e.id));
      expect(top(q).total, q).toBe(searchCatalog(siteCatalog, q).length);
    }
  });

  it('finds the right solution for everyday phrasings', () => {
    expect(firstName('water delivery')).toBe('Water Delivery Management');
    expect(firstName('manage gym members')).toBe('Gym Membership Management');
    expect(firstName('salon appointments')).toBe('Salon Management');
    expect(firstName('track invoices')).toBe('Invoice & Payment Tracker');
    expect(firstName('manage student fees')).toBe('Tuition Centre Management');
    expect(firstName('inventory')).toBe('Small Distributor Management');
  });

  it('every example search finds an existing solution with a demo', () => {
    expect(exampleSearches.length).toBeGreaterThan(3);
    for (const q of exampleSearches) {
      const first = top(q).shown[0];
      expect(first, q).toBeDefined();
      expect(first?.type, q).toBe('product');
      if (first?.type === 'product') expect(first.demoPath, q).toBeDefined();
    }
  });

  it('shows a compact set of best matches and reports the full count', () => {
    const r = top('customers');
    expect(r.total).toBe(6);
    expect(r.shown).toHaveLength(HOME_RESULT_LIMIT);
    expect(r.shown[0]?.name).toBe('Simple CRM');
    expect(top('payments')).toMatchObject({ total: 4 });
    expect(top('gym')).toMatchObject({ total: 1 });
  });

  it('treats empty or filler-only input as no search, and unknown words as no results', () => {
    expect(queryWords('')).toEqual([]);
    expect(queryWords('   ')).toEqual([]);
    expect(queryWords('software for my business management')).toEqual(['business']);
    expect(top('florist')).toEqual({ shown: [], total: 0 });
  });

  it('links to the finder with the same q parameter', () => {
    expect(withQuery('/products', 'salon appointments')).toBe('/products?q=salon+appointments');
    expect(withQuery('/products', '  ')).toBe('/products');
    expect(withQuery('/products', 'a&b=c')).toBe('/products?q=a%26b%3Dc');
  });

  it('gives available solutions their existing detail and demo routes', () => {
    const gym = top('gym').shown[0]!;
    expect(gym).toMatchObject({ type: 'product', detailPath: '/products/gym-membership-management', demoPath: '/products/gym-membership-management/try' });
  });
});

describe('planned ideas in homepage results', () => {
  const idea: SolutionIdea = {
    id: 'florist',
    name: 'Florist Order Management',
    industry: 'Florists',
    summary: 'For florists taking wedding and event orders.',
    wouldCover: ['Orders', 'Deliveries'],
    searchKeywords: ['florist', 'flowers'],
    icon: Lightbulb,
  };
  const catalog = buildCatalog(products, [idea]);

  it('are found by the same search and carry no route', () => {
    const r = topMatches(catalog, 'florist', HOME_RESULT_LIMIT);
    expect(r.total).toBe(1);
    expect(r.shown[0]).toMatchObject({ type: 'idea', name: 'Florist Order Management' });
    expect('detailPath' in r.shown[0]!).toBe(false);
    expect('demoPath' in r.shown[0]!).toBe(false);
  });

  it('are labelled as not available and never link to a page or demo', () => {
    const entry = topMatches(catalog, 'florist', 1).shown[0]!;
    const html = renderToStaticMarkup(createElement(SolutionResult, { entry, onInterest: () => {} }));
    expect(html).toContain('Planned idea');
    expect(html).toContain('Not available yet · no demo');
    expect(html).toContain('aria-label="I’d use this: Florist Order Management"');
    expect(html).not.toContain('<a ');
    expect(html).not.toContain('Try demo');
  });
});
