import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { products } from '../../config/products';
import { demoGuides } from './demoGuides';
import { DemoGuide } from './DemoGuide';

describe('demo first-run guidance', () => {
  it('every demo in the registry has a guide with a short intro and one first action', () => {
    for (const p of products) {
      expect(p.demo, p.id).toBeDefined();
      const g = demoGuides[p.demo!.id];
      expect(g, p.id).toBeDefined();
      expect(g.intro.length, p.id).toBeLessThan(110);
      expect(g.tryFirst.length, p.id).toBeLessThan(90);
      expect(g.intro.endsWith('.'), p.id).toBe(true);
      expect(typeof g.target).toBe('function');
    }
  });

  it('suggestions never promise what the demos list as not built yet', () => {
    const all = Object.values(demoGuides).map((g) => `${g.intro} ${g.tryFirst}`).join(' ');
    expect(/remind|notif|sms|whatsapp|empty can|online booking|import/i.test(all)).toBe(false);
  });

  it('always states fictional data and how long changes last; the suggestion can be hidden', () => {
    const html = renderToStaticMarkup(createElement(DemoGuide, { guide: demoGuides.water, kind: 'interactive' }));
    expect(html).toContain('aria-label="About this demo"');
    expect(html).toContain('Run today’s water-can deliveries');
    expect(html).toContain('Fictional sample data. Changes last until you reload or choose Reset demo; nothing is saved or sent.');
    expect(html).toContain('Try first:');
    expect(html).toContain('>Show me<');
    expect(html).toContain('aria-label="Hide suggestion"');
    expect(html).not.toContain('<dialog');
  });

  it('describes a design preview without claiming anything is saved', () => {
    const html = renderToStaticMarkup(createElement(DemoGuide, { guide: demoGuides.crm, kind: 'design-preview' }));
    expect(html).toContain('A preview of the planned screens');
    expect(html).not.toContain('Reset demo');
  });
});
