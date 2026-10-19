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

  it('lists the five general products, in order, then the industry products', () => {
    expect(products.map((p) => p.name)).toEqual([
      'Business Analytics',
      'Tasks & Follow-ups',
      'Simple CRM',
      'Invoice & Payment Tracker',
      'Leave & Attendance',
      'Water Delivery Management',
      'Gym Membership Management',
      'Salon Management',
      'Tuition Centre Management',
      'Small Distributor Management',
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
    // Every current product has a demo, so check the rule on a planned copy without one.
    const { demo: _demo, ...rest } = leave;
    void _demo;
    const { primary, secondary } = productActions({ ...rest, status: 'planned' });
    expect(primary).toEqual({ label: 'View concept', to: '/products/leave-attendance' });
    expect(secondary).toBeUndefined();
  });

  it('shows Leave & Attendance as in development with a sample-data demo, on its existing slug', () => {
    expect(leave).toMatchObject({ name: 'Leave & Attendance', slug: 'leave-attendance', kind: 'HR & Workforce', status: 'in_build' });
    expect(leave.summary).toBe('Simplify daily attendance and leave tracking.');
    expect(leave.description).toBe('Keep employee attendance records organized, review working-day activity, and manage leave requests in one convenient place.');
    expect(leave.demo).toEqual({ id: 'leave', label: 'Try the demo', kind: 'interactive' });
    expect(productActions(leave).primary).toEqual({ label: 'Try demo', to: '/products/leave-attendance/try' });
    const text = [leave.summary, leave.description, leave.tagline, ...leave.features, ...leave.benefits].join(' ');
    expect(/payroll|salary|biometric|fingerprint|GPS|location|notif|automat/i.test(text)).toBe(false);
  });

  it('shows Water Delivery Management as an industry-specific product in development with a sample-data demo', () => {
    const water = getProductById('water')!;
    expect(water).toMatchObject({ name: 'Water Delivery Management', slug: 'water-delivery-management', status: 'in_build', industry: 'Water delivery and reusable-container distribution' });
    expect(water.summary).toBe('A one-screen view of today’s water deliveries, customers and money still to collect.');
    expect(water.demo).toEqual({ id: 'water', label: 'Try the demo', kind: 'interactive' });
    expect(getProductBySlug('water-delivery-management')).toBe(water);
    expect(productPath(water)).toBe('/products/water-delivery-management');
    expect(demoPath(water)).toBe('/products/water-delivery-management/try');
    expect(productActions(water).primary).toEqual({ label: 'Try demo', to: '/products/water-delivery-management/try' });
    for (const k of ['water delivery', 'water cans', 'delivery management', 'customer balances']) expect(water.searchKeywords).toContain(k);
    // Only claims what the demo does: no empty-can tracking yet.
    expect([water.summary, ...water.features].join(' ')).not.toMatch(/empty|reusable/i);
    const text = [water.summary, water.description, water.tagline, ...water.features, ...water.benefits].join(' ');
    expect(/GST|invoice|GPS|WhatsApp|warehouse|payroll|gateway/i.test(text)).toBe(false);
  });

  it('shows Gym Membership Management as an industry-specific product in development with a sample-data demo', () => {
    const gym = getProductById('gym')!;
    expect(gym).toMatchObject({ name: 'Gym Membership Management', slug: 'gym-membership-management', status: 'in_build' });
    expect(gym.summary).toBe('Manage gym members, membership plans, renewals, attendance, and payments in one place.');
    expect(gym.demo).toEqual({ id: 'gym', label: 'Try the demo', kind: 'interactive' });
    expect(getProductBySlug('gym-membership-management')).toBe(gym);
    expect(demoPath(gym)).toBe('/products/gym-membership-management/try');
    expect(productActions(gym).primary).toEqual({ label: 'Try demo', to: '/products/gym-membership-management/try' });
    for (const k of ['gym', 'fitness club', 'gym membership', 'member renewals', 'gym attendance', 'membership expiry']) expect(gym.searchKeywords).toContain(k);
    const text = [gym.summary, gym.description, gym.tagline, ...gym.features, ...gym.benefits].join(' ');
    expect(/biometric|QR|GPS|WhatsApp|SMS|payroll|diet|workout plan|trainer|gateway|GST|invoice/i.test(text)).toBe(false);
  });

  it('marks only the industry products as industry-specific', () => {
    expect(products.filter((p) => p.industry).map((p) => p.id)).toEqual(['water', 'gym', 'salon', 'tuition', 'distributor']);
  });

  it('shows Salon Management as an industry-specific product in development with a sample-data demo', () => {
    const salon = getProductById('salon')!;
    expect(salon).toMatchObject({ name: 'Salon Management', slug: 'salon-management', status: 'in_build' });
    expect(salon.summary).toBe('Manage salon appointments, services, customers, and payments in one convenient place.');
    expect(salon.demo).toEqual({ id: 'salon', label: 'Try the demo', kind: 'interactive' });
    expect(getProductBySlug('salon-management')).toBe(salon);
    expect(productActions(salon).primary).toEqual({ label: 'Try demo', to: '/products/salon-management/try' });
    for (const k of ['salon', 'beauty parlour', 'beauty salon', 'haircut', 'appointments', 'stylist booking', 'facial', 'manicure']) expect(salon.searchKeywords).toContain(k);
    const text = [salon.summary, salon.description, salon.tagline, ...salon.features, ...salon.benefits].join(' ');
    expect(/commission|inventory|stock|retail|GST|WhatsApp|SMS|gateway|payroll|online booking/i.test(text)).toBe(false);
  });

  it('shows Tuition Centre Management as an industry-specific product in development with a sample-data demo', () => {
    const tuition = getProductById('tuition')!;
    expect(tuition).toMatchObject({ name: 'Tuition Centre Management', slug: 'tuition-centre-management', kind: 'Education & coaching', status: 'in_build' });
    expect(tuition.demo).toEqual({ id: 'tuition', label: 'Try the demo', kind: 'interactive' });
    expect(getProductBySlug('tuition-centre-management')).toBe(tuition);
    expect(demoPath(tuition)).toBe('/products/tuition-centre-management/try');
    expect(productActions(tuition).primary).toEqual({ label: 'Try demo', to: '/products/tuition-centre-management/try' });
    for (const k of ['tuition centre', 'tuition classes', 'coaching centre', 'student attendance', 'batch management', 'fee collection', 'school tuition']) expect(tuition.searchKeywords).toContain(k);
    const text = [tuition.summary, tuition.description, tuition.tagline, ...tuition.features, ...tuition.benefits].join(' ');
    expect(/WhatsApp|SMS|gateway|payroll|online class|video|login|GST/i.test(text)).toBe(false);
  });

  it('shows Small Distributor Management as an industry-specific product in development with a sample-data demo', () => {
    const d = getProductById('distributor')!;
    expect(d).toMatchObject({ name: 'Small Distributor Management', slug: 'small-distributor-management', kind: 'Wholesale & distribution', status: 'in_build' });
    expect(d.demo).toEqual({ id: 'distributor', label: 'Try the demo', kind: 'interactive' });
    expect(getProductBySlug('small-distributor-management')).toBe(d);
    expect(productActions(d).primary).toEqual({ label: 'Try demo', to: '/products/small-distributor-management/try' });
    for (const k of ['small distributor', 'wholesale', 'inventory', 'stock management', 'supplier purchases', 'sales orders', 'stock movement', 'outstanding payments']) expect(d.searchKeywords).toContain(k);
    const text = [d.summary, d.description, d.tagline, ...d.features, ...d.benefits].join(' ');
    expect(/GST|tax|barcode|warehouses|accounting|gateway|WhatsApp|SMS|login|batch|expiry/i.test(text)).toBe(false);
  });

  it('shows Simple CRM as in development with a sample-data demo', () => {
    expect(crm).toMatchObject({ name: 'Simple CRM', slug: 'simple-crm', kind: 'Customer Management', status: 'in_build' });
    expect(crm.summary).toBe('Keep customer relationships organized.');
    expect(crm.description).toBe('Manage customer details, track interactions, and keep important relationship information in one convenient place.');
    expect(crm.demo).toEqual({ id: 'crm', label: 'Try the demo', kind: 'interactive' });
    expect(productActions(crm)).toEqual({
      primary: { label: 'Try demo', to: '/products/simple-crm/try' },
      secondary: { label: 'View solution', to: '/products/simple-crm' },
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
