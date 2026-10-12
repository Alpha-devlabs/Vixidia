import { describe, expect, it } from 'vitest';
import { products } from '../config/products';
import { demoPath, getProductById, getProductBySlug, interestPath, productActions, productPath } from './products';
import type { Product } from '../types/product';

describe('product registry', () => {
  it('has unique ids and slugs', () => {
    expect(new Set(products.map((p) => p.id)).size).toBe(products.length);
    expect(new Set(products.map((p) => p.slug)).size).toBe(products.length);
  });

  it('uses URL-safe slugs', () => {
    for (const p of products) expect(p.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('lists exactly the five initial products, in order', () => {
    expect(products.map((p) => p.name)).toEqual([
      'Pulse',
      'Tasks & Follow-ups',
      'Simple CRM',
      'Invoice & Payment Tracker',
      'Leave & Attendance',
    ]);
  });

  it('gives every product a category and the question it answers', () => {
    for (const p of products) {
      expect(p.kind.length).toBeGreaterThan(0);
      expect(p.question.endsWith('?')).toBe(true);
    }
  });

  it('positions Pulse as analytics, separate from invoicing', () => {
    const pulse = getProductById('pulse')!;
    expect(pulse.kind).toBe('Business insights & analytics');
    const pulseText = [pulse.summary, pulse.tagline, pulse.description, ...pulse.features, ...pulse.benefits].join(' ');
    expect(/invoice|payment|paid|outstanding|overdue|owes|balance|accounting/i.test(pulseText)).toBe(false);
  });

  it('gives invoicing and payments to the Invoice & Payment Tracker', () => {
    const tracker = getProductById('invoices')!;
    const text = [tracker.summary, tracker.description, ...tracker.features].join(' ').toLowerCase();
    for (const word of ['invoice', 'due date', 'payment', 'overdue', 'balance']) expect(text).toContain(word);
  });

  it('only lists future ideas separately from current features', () => {
    for (const p of products) {
      for (const idea of p.futureFeatures ?? []) expect(p.features).not.toContain(idea);
    }
  });

  it('never marks a product live without a real app URL', () => {
    for (const p of products) if (p.status === 'live') expect(p.appUrl).toBeDefined();
  });

  it('shows the invoice tracker as in development with a sample-data demo', () => {
    const tracker = getProductById('invoices')!;
    expect(tracker.status).toBe('in_build');
    expect(tracker.demo?.kind).toBe('interactive');
    expect(productActions(tracker).primary).toEqual({ label: 'Try demo', to: '/products/invoice-payment-tracker/try' });
  });

  it('keeps Pulse in development even though it has a demo', () => {
    const pulse = getProductById('pulse');
    expect(pulse?.status).toBe('in_build');
    expect(pulse?.demo).toBeDefined();
  });
});

describe('slug resolution', () => {
  it('resolves known slugs', () => {
    expect(getProductBySlug('pulse')?.id).toBe('pulse');
    expect(getProductBySlug('simple-crm')?.id).toBe('crm');
  });

  it('is case-insensitive', () => {
    expect(getProductBySlug('PULSE')?.id).toBe('pulse');
  });

  it('returns undefined for unknown or missing slugs', () => {
    expect(getProductBySlug('tools')).toBeUndefined();
    expect(getProductBySlug('')).toBeUndefined();
    expect(getProductBySlug(undefined)).toBeUndefined();
  });

  it('follows a renamed slug without changing ids', () => {
    const renamed: Product[] = products.map((p) => (p.id === 'pulse' ? { ...p, slug: 'daybook' } : p));
    expect(getProductBySlug('daybook', renamed)?.id).toBe('pulse');
    expect(getProductBySlug('pulse', renamed)).toBeUndefined();
  });
});

describe('paths and actions', () => {
  const pulse = getProductById('pulse')!;
  const crm = getProductById('crm')!;

  it('builds product and demo paths under /products', () => {
    expect(productPath(pulse)).toBe('/products/pulse');
    expect(demoPath(pulse)).toBe('/products/pulse/try');
  });

  it('offers the demo as the primary action when one exists', () => {
    const { primary, secondary } = productActions(pulse);
    expect(primary.to).toBe('/products/pulse/try');
    expect(secondary?.to).toBe('/products/pulse');
  });

  it('offers only the concept page for planned products', () => {
    const { primary, secondary } = productActions(crm);
    expect(primary).toEqual({ label: 'View concept', to: '/products/simple-crm' });
    expect(secondary).toBeUndefined();
  });

  it('builds interest links without personal data', () => {
    expect(interestPath(crm)).toBe('/workflow?topic=product-interest&product=simple-crm');
  });
});
