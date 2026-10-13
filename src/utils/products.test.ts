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
      'Business Analytics',
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

  it('names the analytics product Business Analytics and keeps it separate from invoicing', () => {
    // Internal id and slug stay `pulse` (its earlier name) so existing links keep working.
    const pulse = getProductById('pulse')!;
    expect(pulse.name).toBe('Business Analytics');
    expect(pulse.slug).toBe('pulse');
    expect(pulse.summary).toBe('Understand sales, revenue, orders, and business performance.');
    expect(pulse.demo?.label).toBe('Try the demo');
    expect(productActions(pulse).primary).toEqual({ label: 'Try demo', to: '/products/pulse/try' });
    const pulseText = [pulse.summary, pulse.tagline, pulse.description, ...pulse.features, ...pulse.benefits].join(' ');
    expect(/invoice|payment|paid|outstanding|overdue|owes|balance|accounting/i.test(pulseText)).toBe(false);
    expect(/\bAI\b|artificial intelligence|real[- ]time|machine learning/i.test(pulseText)).toBe(false);
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

  it('keeps Business Analytics in development even though it has a demo', () => {
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
  const tasks = getProductById('tasks')!;
  const leave = getProductById('leave')!;

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
    const { primary, secondary } = productActions(leave);
    expect(primary).toEqual({ label: 'View concept', to: '/products/leave-attendance' });
    expect(secondary).toBeUndefined();
  });

  it('shows Simple CRM as in development with a sample-data demo', () => {
    expect(crm).toMatchObject({ name: 'Simple CRM', slug: 'simple-crm', kind: 'Customer Management', status: 'in_build' });
    expect(crm.summary).toBe('Keep customer relationships organized.');
    expect(crm.description).toBe('Manage customer details, track interactions, and keep important relationship information in one convenient place.');
    expect(crm.demo).toEqual({ id: 'crm', label: 'Try the demo', kind: 'interactive' });
    expect(productActions(crm)).toEqual({
      primary: { label: 'Try demo', to: '/products/simple-crm/try' },
      secondary: { label: 'View details', to: '/products/simple-crm' },
    });
  });

  it('shows Tasks & Follow-ups as in development with a sample-data demo, on its existing slug', () => {
    expect(tasks).toMatchObject({ name: 'Tasks & Follow-ups', slug: 'tasks-follow-ups', kind: 'Productivity', status: 'in_build' });
    expect(tasks.summary).toBe('Keep tasks organized and follow-ups on track.');
    expect(tasks.description).toBe('Organize daily work, track deadlines, and keep important customer follow-ups from slipping through the cracks.');
    expect(tasks.demo).toEqual({ id: 'tasks', label: 'Try the demo', kind: 'interactive' });
    expect(productActions(tasks).primary).toEqual({ label: 'Try demo', to: '/products/tasks-follow-ups/try' });
  });

  it('makes no claims about reminders, notifications or integrations for tasks', () => {
    const text = [tasks.summary, tasks.description, tasks.tagline, ...tasks.features, ...tasks.benefits].join(' ');
    expect(/remind|notif|real[- ]time|integrat|sync|automat|calendar|owner/i.test(text)).toBe(false);
  });

  it('keeps the CRM separate from analytics, invoicing and tasks', () => {
    const text = [crm.summary, crm.description, ...crm.features, ...crm.benefits].join(' ');
    expect(/invoice|payment|revenue|forecast|reminder|due date|\bAI\b/i.test(text)).toBe(false);
  });

  it('builds interest links without personal data', () => {
    expect(interestPath(crm)).toBe('/workflow?topic=product-interest&product=simple-crm');
  });
});
