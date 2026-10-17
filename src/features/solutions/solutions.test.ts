import { describe, expect, it } from 'vitest';
import { products } from '../../config/products';
import { solutionIdeas } from '../../config/solutionIdeas';
import { buildCatalog, categoryCounts, normalize, queryWords, searchCatalog, stem, type SolutionEntry } from './catalog';
import { emptySolutionRequest, requestSummary, submitSolutionRequest, validateSolutionRequest } from './solutionRequest';

const catalog = buildCatalog(products, solutionIdeas);
const names = (q: string, f: Parameters<typeof searchCatalog>[2] = 'all') => searchCatalog(catalog, q, f).map((e) => e.name);
const first = (q: string) => names(q)[0];

describe('catalogue', () => {
  it('reuses the registry products unchanged and adds the planned ideas', () => {
    const productEntries = catalog.filter((e) => e.type === 'product');
    expect(productEntries.map((e) => e.id)).toEqual(products.map((p) => p.id));
    for (const e of productEntries) if (e.type === 'product') expect(e.product).toBe(products.find((p) => p.id === e.id));
    expect(catalog.filter((e) => e.type === 'idea').map((e) => e.name)).toEqual([
      'Gym Membership Management',
      'Salon Management',
      'Tuition Centre Management',
      'Small Distributor Management',
    ]);
  });

  it('links existing products to their current detail and demo routes', () => {
    const byId = (id: string) => catalog.find((e) => e.id === id) as Extract<SolutionEntry, { type: 'product' }>;
    expect(byId('pulse')).toMatchObject({ detailPath: '/products/pulse', demoPath: '/products/pulse/try' });
    expect(byId('invoices')).toMatchObject({ detailPath: '/products/invoice-payment-tracker', demoPath: '/products/invoice-payment-tracker/try' });
    expect(byId('crm').demoPath).toBe('/products/simple-crm/try');
    expect(byId('tasks').demoPath).toBe('/products/tasks-follow-ups/try');
    expect(byId('leave').demoPath).toBe('/products/leave-attendance/try');
    expect(byId('water')).toMatchObject({ detailPath: '/products/water-delivery-management', demoPath: '/products/water-delivery-management/try' });
  });

  it('lists Water Delivery Management once, as an industry-specific product with a demo, not a planned idea', () => {
    const water = catalog.filter((e) => e.name === 'Water Delivery Management');
    expect(water).toHaveLength(1);
    expect(water[0]).toMatchObject({ type: 'product', id: 'water', category: 'industry', label: 'Water delivery' });
    expect(solutionIdeas.some((i) => i.id === 'water-delivery' || /water/i.test(i.name))).toBe(false);
    expect(searchCatalog(catalog, '', 'planned').some((e) => e.name === 'Water Delivery Management')).toBe(false);
    expect(searchCatalog(catalog, '', 'industry').map((e) => e.name)[0]).toBe('Water Delivery Management');
  });

  it('marks only industry products as industry-specific; the general tools stay general', () => {
    for (const e of catalog.filter((x) => x.type === 'product')) expect(e.category).toBe(e.id === 'water' ? 'industry' : 'general');
  });

  it('never gives a planned idea a route or a demo', () => {
    const slugs = new Set(products.map((p) => p.slug));
    for (const e of catalog.filter((x) => x.type === 'idea')) {
      expect('detailPath' in e).toBe(false);
      expect('demoPath' in e).toBe(false);
      expect(slugs.has(e.id)).toBe(false);
    }
  });

  it('has unique ids across products and ideas', () => {
    expect(new Set(catalog.map((e) => e.id)).size).toBe(catalog.length);
  });
});

describe('normalisation', () => {
  it('lower-cases, removes punctuation and accents, reads & as and', () => {
    expect(normalize('  Follow-ups & Invoices!  ')).toBe('follow ups and invoices');
    expect(normalize('Café')).toBe('cafe');
  });
  it('reduces simple plurals consistently', () => {
    expect(stem('invoices')).toBe('invoice');
    expect(stem('payments')).toBe('payment');
    expect(stem('classes')).toBe('class');
    expect(stem('deliveries')).toBe('delivery');
    expect(stem('business')).toBe('business');
    expect(stem('gst')).toBe('gst');
  });
  it('ignores filler words and empty input', () => {
    expect(queryWords('software for my gym management')).toEqual(['gym']);
    expect(queryWords('   ')).toEqual([]);
  });
});

describe('search', () => {
  it('finds products by name', () => {
    expect(first('simple crm')).toBe('Simple CRM');
    expect(first('Leave & Attendance')).toBe('Leave & Attendance');
    expect(first('business analytics')).toBe('Business Analytics');
  });

  it('finds the examples from the brief', () => {
    expect(first('water delivery')).toBe('Water Delivery Management');
    expect(first('gym')).toBe('Gym Membership Management');
    expect(first('salon')).toBe('Salon Management');
    expect(first('invoices')).toBe('Invoice & Payment Tracker');
    expect(first('customers')).toBe('Simple CRM');
    expect(first('attendance')).toBe('Leave & Attendance');
    expect(first('follow-ups')).toBe('Tasks & Follow-ups');
    expect(first('sales')).toBe('Business Analytics');
    expect(first('payments')).toBe('Invoice & Payment Tracker');
  });

  it('understands industries and synonyms', () => {
    expect(first('fitness centre')).toBe('Gym Membership Management');
    expect(first('beauty parlour')).toBe('Salon Management');
    expect(first('barber')).toBe('Salon Management');
    expect(first('coaching classes')).toBe('Tuition Centre Management');
    expect(first('wholesale')).toBe('Small Distributor Management');
    expect(first('water cans')).toBe('Water Delivery Management');
    // The original demo doesn't track empty cans, so it isn't offered for that search.
    expect(names('empty cans')).toEqual([]);
    expect(first('delivery management')).toBe('Water Delivery Management');
    // Invoicing is also about customer balances, so both are offered.
    expect(names('customer balances')).toEqual(['Invoice & Payment Tracker', 'Water Delivery Management', 'Small Distributor Management']);
    expect(first('20 litre jar')).toBe('Water Delivery Management');
    expect(first('billing')).toBe('Invoice & Payment Tracker');
    expect(first('time off')).toBe('Leave & Attendance');
    expect(first('to-do list')).toBe('Tasks & Follow-ups');
  });

  it('finds solutions by business problem', () => {
    expect(names('attendance')).toEqual(['Leave & Attendance', 'Gym Membership Management', 'Tuition Centre Management']);
    expect(names('outstanding balance')).toEqual(['Invoice & Payment Tracker', 'Water Delivery Management', 'Small Distributor Management']);
    expect(names('unpaid dues')).toEqual(['Invoice & Payment Tracker', 'Water Delivery Management']);
    expect(first('fee collection')).toBe('Tuition Centre Management');
    expect(first('membership renewals')).toBe('Gym Membership Management');
  });

  it('matches word starts, so partial typing works', () => {
    expect(first('invoic')).toBe('Invoice & Payment Tracker');
    expect(first('distrib')).toBe('Small Distributor Management');
  });

  it('requires every meaningful word to match', () => {
    expect(names('gym invoices')).toEqual([]);
    expect(names('zzz')).toEqual([]);
  });

  it('returns everything, products first, for an empty or filler-only query', () => {
    expect(names('')).toEqual(catalog.map((e) => e.name));
    expect(names('software for my business management').length).toBeGreaterThan(0);
  });
});

describe('categories', () => {
  it('combine with search', () => {
    expect(names('attendance', 'general')).toEqual(['Leave & Attendance']);
    expect(names('attendance', 'industry')).toEqual(['Gym Membership Management', 'Tuition Centre Management']);
    expect(names('attendance', 'planned')).toEqual(['Gym Membership Management', 'Tuition Centre Management']);
    expect(names('invoices', 'planned')).toEqual([]);
    expect(names('water delivery', 'industry')).toEqual(['Water Delivery Management']);
    expect(names('water delivery', 'general')).toEqual([]);
    expect(names('water delivery', 'planned')).toEqual([]);
  });

  it('count each category for the current query; "all" clears the filter', () => {
    expect(categoryCounts(catalog, '')).toEqual({ all: 10, general: 5, industry: 5, planned: 4 });
    expect(categoryCounts(catalog, 'water')).toEqual({ all: 1, general: 0, industry: 1, planned: 0 });
    expect(categoryCounts(catalog, 'attendance')).toEqual({ all: 3, general: 1, industry: 2, planned: 2 });
    expect(names('', 'all')).toHaveLength(10);
  });

  it('keeps every planned idea out of "General business tools"', () => {
    expect(searchCatalog(catalog, '', 'general').every((e) => e.type === 'product')).toBe(true);
    expect(searchCatalog(catalog, '', 'planned').every((e) => e.type === 'idea')).toBe(true);
  });
});

describe('request a solution', () => {
  const valid = { ...emptySolutionRequest('Gym Membership Management', 'Gym'), name: 'Ravi', email: 'ravi@example.com', needs: 'Member renewals and attendance.' };

  it('requires a name, a business type, what to manage, and an email or phone', () => {
    const e = validateSolutionRequest(emptySolutionRequest());
    expect(Object.keys(e).sort()).toEqual(['businessType', 'email', 'name', 'needs']);
    expect(e.email).toMatch(/email address or a phone number/);
  });

  it('accepts either email or phone, and checks their format', () => {
    expect(validateSolutionRequest(valid)).toEqual({});
    expect(validateSolutionRequest({ ...valid, email: '', phone: '+44 20 7946 0321' })).toEqual({});
    expect(validateSolutionRequest({ ...valid, email: 'ravi@' }).email).toMatch(/name@example.com/);
    expect(validateSolutionRequest({ ...valid, phone: 'call me' }).phone).toMatch(/6–15 digits/);
    expect(validateSolutionRequest({ ...valid, needs: 'short' }).needs).toMatch(/at least 10/);
  });

  it('is honest: the current submitter sends nothing', async () => {
    expect(await submitSolutionRequest(valid)).toEqual({ status: 'not_connected' });
  });

  it('builds a plain copy the visitor can keep', () => {
    const text = requestSummary({ ...valid, phone: '98450 12345' });
    expect(text).toContain('Solution: Gym Membership Management');
    expect(text).toContain('Email: ravi@example.com');
    expect(text).toContain('Phone: 98450 12345');
    expect(text).not.toContain('Business:');
  });
});
