import { describe, expect, it } from 'vitest';
import { createSampleState, HISTORY_DAYS, sampleBusiness } from '../../data/pulseSample';
import {
  activityFeed,
  breakdown,
  insights,
  orderTotal,
  ordersIn,
  percentChange,
  periodRange,
  previousRange,
  pulseReducer,
  scaledTarget,
  summarize,
  targetProgress,
  trendSeries,
  validateTarget,
  parseTarget,
  type PeriodDays,
} from './pulseLogic';
import { addDays, daysBetween } from '../../utils/dates';

const TODAY = '2026-10-12';
const fresh = () => createSampleState(TODAY);
const allPeriods: PeriodDays[] = [7, 30, 90];
const total = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

describe('sample data', () => {
  it('is deterministic for a given day', () => {
    expect(createSampleState(TODAY)).toEqual(createSampleState(TODAY));
  });

  it('covers the history window and nothing after today', () => {
    const s = fresh();
    const first = addDays(TODAY, -(HISTORY_DAYS - 1));
    for (const o of s.orders) expect(o.date >= first && o.date <= TODAY).toBe(true);
  });

  it('only references known customers and catalogue items', () => {
    const s = fresh();
    const customers = new Set(s.customers.map((c) => c.id));
    const items = new Map(s.catalog.map((c) => [c.id, c.price]));
    for (const o of s.orders) {
      expect(customers.has(o.customerId)).toBe(true);
      expect(o.lines.length).toBeGreaterThan(0);
      for (const l of o.lines) {
        expect(items.get(l.productId)).toBe(l.unitPrice);
        expect(l.quantity).toBeGreaterThan(0);
      }
    }
    expect(new Set(s.orders.map((o) => o.ref)).size).toBe(s.orders.length);
  });

  it('gives every period real activity whatever day it is anchored to', () => {
    for (const day of ['2026-01-01', '2026-06-15', '2027-02-28']) {
      const s = createSampleState(day);
      for (const days of allPeriods) expect(summarize(s, days).current.orders).toBeGreaterThan(0);
    }
  });

  it('contains no invoice, payment or expense concepts', () => {
    const text = JSON.stringify(fresh()) + JSON.stringify(sampleBusiness);
    expect(/invoice|paid|payment|outstanding|overdue|expense|due/i.test(text)).toBe(false);
  });
});

describe('periods', () => {
  it('counts today and the days before it', () => {
    expect(periodRange(TODAY, 7)).toEqual({ start: '2026-10-06', end: TODAY });
    expect(previousRange(TODAY, 7)).toEqual({ start: '2026-09-29', end: '2026-10-05' });
  });

  it('returns null change when there is nothing to compare with', () => {
    expect(percentChange(5, 0)).toBeNull();
    expect(percentChange(150, 100)).toBe(50);
  });
});

describe('KPIs match the underlying orders', () => {
  const s = fresh();
  for (const days of allPeriods) {
    it(`for the last ${days} days`, () => {
      const { current, previous, range } = summarize(s, days);
      const list = ordersIn(s, range);
      expect(current.revenue).toBe(total(list.map(orderTotal)));
      expect(current.orders).toBe(list.length);
      expect(current.averageOrderValue).toBe(Math.round(current.revenue / current.orders));
      expect(current.itemsSold).toBe(total(list.flatMap((o) => o.lines.map((l) => l.quantity))));
      expect(previous.revenue).toBeGreaterThan(0);
    });
  }

  it('changes when the period changes', () => {
    const r7 = summarize(s, 7).current.revenue;
    const r30 = summarize(s, 30).current.revenue;
    const r90 = summarize(s, 90).current.revenue;
    expect(r7).toBeLessThan(r30);
    expect(r30).toBeLessThan(r90);
  });

  it('counts each customer as new only in the period of their first order', () => {
    const { current } = summarize(s, 90);
    const firstSeen = new Map<string, string>();
    for (const o of s.orders) if (!firstSeen.has(o.customerId) || o.date < firstSeen.get(o.customerId)!) firstSeen.set(o.customerId, o.date);
    const start = periodRange(TODAY, 90).start;
    expect(current.newCustomers).toBe([...firstSeen.values()].filter((d) => d >= start).length);
  });
});

describe('trend series', () => {
  const s = fresh();
  it('uses daily buckets for 7 and 30 days and weekly for 90', () => {
    expect(trendSeries(s, 7).buckets).toHaveLength(7);
    expect(trendSeries(s, 30).buckets).toHaveLength(30);
    expect(trendSeries(s, 90).granularity).toBe('week');
    expect(trendSeries(s, 90).buckets).toHaveLength(13);
  });

  for (const days of allPeriods) {
    it(`adds up to the period totals and covers it exactly (${days} days)`, () => {
      const { buckets } = trendSeries(s, days);
      const { current } = summarize(s, days);
      expect(total(buckets.map((b) => b.revenue))).toBe(current.revenue);
      expect(total(buckets.map((b) => b.orders))).toBe(current.orders);
      expect(buckets[0]!.start).toBe(periodRange(TODAY, days).start);
      expect(buckets.at(-1)!.end).toBe(TODAY);
      expect(total(buckets.map((b) => daysBetween(b.start, b.end) + 1))).toBe(days);
    });
  }

  it('computes average order value per bucket, or null when empty', () => {
    for (const b of trendSeries(s, 30).buckets) {
      expect(b.averageOrderValue).toBe(b.orders ? Math.round(b.revenue / b.orders) : null);
    }
  });
});

describe('breakdown', () => {
  const s = fresh();
  for (const by of ['category', 'product'] as const) {
    it(`by ${by} adds up to revenue and is sorted largest first`, () => {
      for (const days of allPeriods) {
        const rows = breakdown(s, days, by);
        expect(total(rows.map((r) => r.revenue))).toBe(summarize(s, days).current.revenue);
        expect(Math.round(total(rows.map((r) => r.share)) * 1000) / 1000).toBe(1);
        for (let i = 1; i < rows.length; i++) expect(rows[i - 1]!.revenue >= rows[i]!.revenue).toBe(true);
      }
    });
  }
  it('compares each row with the previous period', () => {
    for (const r of breakdown(s, 30, 'category')) expect(r.change).toBe(percentChange(r.revenue, r.previousRevenue));
  });
});

describe('revenue target', () => {
  it('scales the 30-day target to the period', () => {
    expect(scaledTarget(300000, 7)).toBe(70000);
    expect(scaledTarget(300000, 90)).toBe(900000);
  });

  it('measures progress against period revenue', () => {
    const s = fresh();
    const t = targetProgress(s, 30);
    expect(t.revenue).toBe(summarize(s, 30).current.revenue);
    expect(t.ratio).toBe(t.revenue / t.target);
    expect(t.remaining).toBe(Math.max(0, t.target - t.revenue));
  });

  it('can be changed, and reset restores the original', () => {
    const s = fresh();
    const changed = pulseReducer(s, { type: 'setTarget', revenueTarget30: 50000 });
    expect(changed.revenueTarget30).toBe(50000);
    expect(targetProgress(changed, 30).ratio).toBeGreaterThan(1);
    expect(insights(changed, 30).find((i) => i.id === 'target')!.title).toBe('Revenue target met');
    expect(pulseReducer(changed, { type: 'reset', state: fresh() })).toEqual(fresh());
  });

  it('ignores invalid targets', () => {
    const s = fresh();
    expect(pulseReducer(s, { type: 'setTarget', revenueTarget30: 0 })).toBe(s);
    expect(pulseReducer(s, { type: 'setTarget', revenueTarget30: 12.5 })).toBe(s);
  });

  it('validates typed input', () => {
    expect(validateTarget('')).toBeDefined();
    expect(validateTarget('abc')).not.toBeNull();
    expect(validateTarget('500')).not.toBeNull();
    expect(validateTarget('2,50,000.5')).not.toBeNull();
    expect(validateTarget('200000000')).not.toBeNull();
    expect(validateTarget('₹2,50,000')).toBeNull();
    expect(parseTarget('₹2,50,000')).toBe(250000);
  });
});

describe('insights', () => {
  const s = fresh();
  it('are derived from the same numbers the dashboard shows', () => {
    for (const days of allPeriods) {
      const list = insights(s, days);
      const { current, previous } = summarize(s, days);
      const rev = list.find((i) => i.id === 'revenue')!;
      const change = percentChange(current.revenue, previous.revenue)!;
      if (Math.abs(change) < 5) expect(rev.tone).toBe('neutral');
      else expect(rev.title).toContain(`${change > 0 ? 'up' : 'down'} ${Math.abs(Math.round(change))}%`);
    }
  });

  it('lists things that need attention first', () => {
    const tones = insights(s, 30).map((i) => i.tone);
    const firstNonNegative = tones.findIndex((t) => t !== 'negative');
    if (firstNonNegative >= 0) expect(tones.slice(firstNonNegative).includes('negative')).toBe(false);
  });

  it('change when the period changes', () => {
    const titles = (d: PeriodDays) => insights(s, d).map((i) => i.title).join('|');
    expect(titles(7) === titles(90)).toBe(false);
  });

  it('only mention the busiest weekday for periods long enough to judge', () => {
    expect(insights(s, 7).some((i) => i.id === 'best-weekday')).toBe(false);
    expect(insights(s, 30).some((i) => i.id === 'best-weekday')).toBe(true);
  });
});

describe('recent activity', () => {
  const s = fresh();
  it('is newest first and limited', () => {
    const feed = activityFeed(s, 8);
    expect(feed).toHaveLength(8);
    for (let i = 1; i < feed.length; i++) expect(feed[i - 1]!.date >= feed[i]!.date).toBe(true);
  });

  it('uses only generic business events', () => {
    const feed = activityFeed(s, 200);
    const kinds = new Set(feed.map((e) => e.kind));
    for (const k of kinds) expect(['order', 'new-customer', 'milestone', 'best-day']).toContain(k);
    expect(/invoice|payment|paid|overdue/i.test(JSON.stringify(feed))).toBe(false);
  });

  it('reports milestones at whole ₹1,00,000 steps', () => {
    for (const e of activityFeed(s, 500).filter((x) => x.kind === 'milestone')) expect(e.amount! % 100000).toBe(0);
  });
});
