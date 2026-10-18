import { describe, expect, it } from 'vitest';
import { Lightbulb } from 'lucide-react';
import { products } from '../config/products';
import type { Product } from '../types/product';
import { demoPath, detailState, getProductBySlug, productPath } from './products';
import { backLink, originState } from './origin';

const base: Product = {
  id: 'x',
  slug: 'sample-tool',
  name: 'Sample Tool',
  kind: 'Testing',
  question: 'Does it work?',
  status: 'planned',
  icon: Lightbulb,
  summary: 's',
  tagline: 't',
  problem: 'p',
  description: 'd',
  audience: ['Testers'],
  benefits: ['b'],
  features: ['f'],
  steps: ['one', 'two', 'three'],
  searchKeywords: [],
};

describe('solution page call to action', () => {
  it('every product with a working demo offers “Try live demo” to its registry demo route', () => {
    for (const p of products) {
      const s = detailState(p);
      expect(p.demo?.kind, p.id).toBe('interactive');
      expect(s.primary, p.id).toEqual({ kind: 'demo', label: 'Try live demo', to: `/products/${p.slug}/try` });
      expect(s.primary?.to).toBe(demoPath(p));
      expect(getProductBySlug(p.slug)).toBe(p);
    }
  });

  it('keeps Business Analytics on its original pulse routes', () => {
    const pulse = products.find((p) => p.id === 'pulse')!;
    expect(productPath(pulse)).toBe('/products/pulse');
    expect(detailState(pulse).primary?.to).toBe('/products/pulse/try');
  });

  it('a planned product gets no demo link and says so plainly', () => {
    const s = detailState(base);
    expect(s.primary).toBeUndefined();
    expect(s.availability.title).toBe('Demo not available yet');
    expect(s.availability.text).toMatch(/nothing to try yet/);
    expect(s.note).toBe('There is no demo yet.');
  });

  it('a design preview is labelled as a preview, not a working demo', () => {
    const s = detailState({ ...base, status: 'in_build', demo: { id: 'crm', label: 'x', kind: 'design-preview' } });
    expect(s.primary).toEqual({ kind: 'preview', label: 'See the design preview', to: '/products/sample-tool/try' });
    expect(s.note).toMatch(/aren’t built yet/);
  });

  it('a live product opens the app; a live product without an app URL is not offered as one', () => {
    expect(detailState({ ...base, status: 'live', appUrl: 'https://app.example.com' }).primary).toMatchObject({ kind: 'app', to: 'https://app.example.com' });
    expect(detailState({ ...base, status: 'live' }).primary).toBeUndefined();
  });
});

describe('how it works', () => {
  it('every product explains its workflow in three or four steps', () => {
    for (const p of products) {
      expect(p.steps.length, p.id).toBeGreaterThan(2);
      expect(p.steps.length, p.id).toBeLessThan(5);
      for (const s of p.steps) expect(s.length, p.id).toBeLessThan(140);
    }
  });

  it('steps never mention what is listed as not built yet', () => {
    const water = products.find((p) => p.id === 'water')!;
    expect(water.steps.join(' ')).not.toMatch(/empty can|schedule|part payment/i);
    const gym = products.find((p) => p.id === 'gym')!;
    expect(gym.steps.join(' ')).not.toMatch(/remind|freez|trainer/i);
  });
});

describe('way back to results', () => {
  it('returns to the exact search the visitor came from', () => {
    expect(backLink(originState({ pathname: '/', search: '?q=gym' }))).toEqual({ to: '/?q=gym', label: 'Back to results for “gym”', query: 'gym' });
    expect(backLink(originState({ pathname: '/products', search: '?q=salon+appointments&category=industry' }))).toEqual({
      to: '/products?q=salon+appointments&category=industry',
      label: 'Back to results for “salon appointments”',
      query: 'salon appointments',
    });
  });

  it('falls back to all solutions without a search, from elsewhere, or with unsafe state', () => {
    const all = { to: '/products', label: 'All solutions' };
    expect(backLink(null)).toEqual(all);
    expect(backLink(undefined)).toEqual(all);
    expect(backLink({ from: 42 })).toEqual(all);
    expect(backLink({ from: 'https://evil.example/?q=x' })).toEqual(all);
    expect(backLink({ from: '//evil.example/?q=x' })).toEqual(all);
    expect(backLink({ from: '/privacy?q=x' })).toEqual(all);
    expect(backLink({ from: '/' })).toEqual(all);
    expect(backLink({ from: '/products' })).toEqual({ to: '/products', label: 'Back to all solutions' });
    expect(backLink({ from: '/?q=gym&utm=1' })).toMatchObject({ to: '/?q=gym' });
  });
});
