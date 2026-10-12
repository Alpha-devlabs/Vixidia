import type { CatalogItem, IsoDay, Order, PulseState } from '../../types/pulse';
import { addDays, isWithin, weekday } from '../../utils/dates';

/*
 * Metric definitions used everywhere in Pulse:
 * - Revenue: total value of orders placed in the period (by order date).
 * - Orders: number of orders placed in the period.
 * - Average order value: revenue ÷ orders for the period.
 * - Items sold: total quantity across all order lines in the period.
 * - New customers: customers whose first-ever order falls in the period.
 * Every figure is compared with the period of the same length immediately before.
 */

// ---------- Reporting periods ----------

export type PeriodDays = 7 | 30 | 90;

export const periods: { days: PeriodDays; label: string }[] = [
  { days: 7, label: 'Last 7 days' },
  { days: 30, label: 'Last 30 days' },
  { days: 90, label: 'Last 90 days' },
];

export interface DayRange {
  start: IsoDay;
  end: IsoDay;
}

/** The period ending today, inclusive: e.g. 7 days = today and the 6 days before. */
export function periodRange(today: IsoDay, days: number): DayRange {
  return { start: addDays(today, -(days - 1)), end: today };
}

/** The period of the same length immediately before the current one. */
export function previousRange(today: IsoDay, days: number): DayRange {
  const current = periodRange(today, days);
  return { start: addDays(current.start, -days), end: addDays(current.start, -1) };
}

const inRange = (day: IsoDay, r: DayRange) => isWithin(day, r.start, r.end);
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

/** Percentage change, or null when there is nothing earlier to compare with. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export function orderTotal(order: Order): number {
  return sum(order.lines.map((l) => l.quantity * l.unitPrice));
}

export function orderItems(order: Order): number {
  return sum(order.lines.map((l) => l.quantity));
}

export function ordersIn(state: PulseState, range: DayRange): Order[] {
  return state.orders.filter((o) => inRange(o.date, range));
}

/** The day of each customer's first order. */
export function firstOrderDays(state: PulseState): Map<string, IsoDay> {
  const first = new Map<string, IsoDay>();
  for (const o of state.orders) {
    const seen = first.get(o.customerId);
    if (!seen || o.date < seen) first.set(o.customerId, o.date);
  }
  return first;
}

// ---------- KPIs ----------

export interface Kpis {
  revenue: number;
  orders: number;
  averageOrderValue: number;
  itemsSold: number;
  newCustomers: number;
}

function kpisFor(state: PulseState, range: DayRange, firsts: Map<string, IsoDay>): Kpis {
  const list = ordersIn(state, range);
  const revenue = sum(list.map(orderTotal));
  return {
    revenue,
    orders: list.length,
    averageOrderValue: list.length ? Math.round(revenue / list.length) : 0,
    itemsSold: sum(list.map(orderItems)),
    newCustomers: [...firsts.values()].filter((d) => inRange(d, range)).length,
  };
}

export interface PeriodSummary {
  range: DayRange;
  current: Kpis;
  previous: Kpis;
}

export function summarize(state: PulseState, days: PeriodDays): PeriodSummary {
  const firsts = firstOrderDays(state);
  return {
    range: periodRange(state.today, days),
    current: kpisFor(state, periodRange(state.today, days), firsts),
    previous: kpisFor(state, previousRange(state.today, days), firsts),
  };
}

// ---------- Trend over time ----------

export type TrendMetric = 'revenue' | 'orders' | 'averageOrderValue';

export const trendMetrics: { value: TrendMetric; label: string }[] = [
  { value: 'revenue', label: 'Revenue' },
  { value: 'orders', label: 'Orders' },
  { value: 'averageOrderValue', label: 'Average order value' },
];

export interface TrendBucket {
  start: IsoDay;
  end: IsoDay;
  revenue: number;
  orders: number;
  /** Null when the bucket has no orders, so no average exists. */
  averageOrderValue: number | null;
}

export interface TrendSeries {
  granularity: 'day' | 'week';
  buckets: TrendBucket[];
}

/**
 * Daily buckets for 7 and 30 days, weekly for 90. Weeks are counted back from
 * today and the earliest bucket is shortened, so the buckets cover the period
 * exactly and their revenue and orders add up to the period totals.
 */
export function trendSeries(state: PulseState, days: PeriodDays): TrendSeries {
  const range = periodRange(state.today, days);
  const size = days > 30 ? 7 : 1;
  const buckets: TrendBucket[] = [];
  for (let end = range.end; end >= range.start; end = addDays(end, -size)) {
    const candidate = addDays(end, -(size - 1));
    const start = candidate < range.start ? range.start : candidate;
    const list = ordersIn(state, { start, end });
    const revenue = sum(list.map(orderTotal));
    buckets.unshift({
      start,
      end,
      revenue,
      orders: list.length,
      averageOrderValue: list.length ? Math.round(revenue / list.length) : null,
    });
  }
  return { granularity: size === 1 ? 'day' : 'week', buckets };
}

export function bucketValue(bucket: TrendBucket, metric: TrendMetric): number | null {
  return bucket[metric];
}

// ---------- Breakdown ----------

export type BreakdownBy = 'category' | 'product';

export interface BreakdownRow {
  key: string;
  label: string;
  revenue: number;
  /** Share of the period's revenue, 0–1. */
  share: number;
  previousRevenue: number;
  change: number | null;
  itemsSold: number;
}

/** Revenue by category or product for the period, largest first. */
export function breakdown(state: PulseState, days: PeriodDays, by: BreakdownBy): BreakdownRow[] {
  const items = new Map<string, CatalogItem>(state.catalog.map((c) => [c.id, c]));
  const keyOf = (productId: string) => (by === 'product' ? productId : (items.get(productId)?.category ?? 'Other'));
  const labelOf = (key: string) => (by === 'product' ? (items.get(key)?.name ?? 'Unknown item') : key);

  const tally = (range: DayRange) => {
    const revenue = new Map<string, number>();
    const units = new Map<string, number>();
    for (const o of ordersIn(state, range)) {
      for (const l of o.lines) {
        const k = keyOf(l.productId);
        revenue.set(k, (revenue.get(k) ?? 0) + l.quantity * l.unitPrice);
        units.set(k, (units.get(k) ?? 0) + l.quantity);
      }
    }
    return { revenue, units };
  };
  const now = tally(periodRange(state.today, days));
  const before = tally(previousRange(state.today, days));
  const total = sum([...now.revenue.values()]);
  const keys = new Set([...now.revenue.keys(), ...before.revenue.keys()]);

  return [...keys]
    .map((key) => {
      const revenue = now.revenue.get(key) ?? 0;
      const previousRevenue = before.revenue.get(key) ?? 0;
      return {
        key,
        label: labelOf(key),
        revenue,
        share: total ? revenue / total : 0,
        previousRevenue,
        change: percentChange(revenue, previousRevenue),
        itemsSold: now.units.get(key) ?? 0,
      };
    })
    .filter((r) => r.revenue > 0 || r.previousRevenue > 0)
    .sort((a, b) => b.revenue - a.revenue || a.label.localeCompare(b.label));
}

// ---------- Target ----------

export interface TargetProgress {
  /** Target for the selected period, scaled from the 30-day target. */
  target: number;
  revenue: number;
  /** 0 and up; 1 means the target is met. */
  ratio: number;
  remaining: number;
}

export function scaledTarget(target30: number, days: PeriodDays): number {
  return Math.round((target30 * days) / 30);
}

export function targetProgress(state: PulseState, days: PeriodDays): TargetProgress {
  const target = scaledTarget(state.revenueTarget30, days);
  const revenue = sum(ordersIn(state, periodRange(state.today, days)).map(orderTotal));
  return { target, revenue, ratio: target ? revenue / target : 0, remaining: Math.max(0, target - revenue) };
}

export const MAX_TARGET = 10_000_000;

/** Validates a 30-day revenue target typed by the visitor. Returns an error message or null. */
export function validateTarget(raw: string): string | null {
  const cleaned = raw.replace(/[,\s₹]/g, '');
  if (!cleaned) return 'Enter a revenue target.';
  if (!/^\d+$/.test(cleaned)) return 'Enter a whole number of rupees, like 250000.';
  const value = Number(cleaned);
  if (value < 1000) return 'Set a target of at least ₹1,000.';
  if (value > MAX_TARGET) return 'For this demo, keep the target under ₹1,00,00,000.';
  return null;
}

export function parseTarget(raw: string): number {
  return Number(raw.replace(/[,\s₹]/g, ''));
}

// ---------- Recent activity ----------

export type ActivityKind = 'order' | 'new-customer' | 'milestone' | 'best-day';

export interface ActivityEvent {
  key: string;
  kind: ActivityKind;
  date: IsoDay;
  /** Orders within a day; higher is later. */
  order: number;
  title: string;
  detail: string;
  amount?: number;
}

const MILESTONE_STEP = 100_000;

/**
 * Generic business events derived from the orders: new orders, first orders from
 * new customers, monthly revenue milestones and record days.
 */
export function activityFeed(state: PulseState, limit = 8): ActivityEvent[] {
  const names = new Map(state.customers.map((c) => [c.id, c.name]));
  const firsts = firstOrderDays(state);
  const firstOrderId = new Map<string, string>();
  const byDate = [...state.orders].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id < b.id ? -1 : 1));
  for (const o of byDate) if (!firstOrderId.has(o.customerId)) firstOrderId.set(o.customerId, o.id);

  const events: ActivityEvent[] = [];
  const recentStart = addDays(state.today, -29);

  byDate.forEach((o, i) => {
    if (o.date < recentStart) return;
    const who = names.get(o.customerId) ?? 'A customer';
    if (firstOrderId.get(o.customerId) === o.id && firsts.get(o.customerId) === o.date) {
      events.push({ key: `new-${o.id}`, kind: 'new-customer', date: o.date, order: i * 10 + 1, title: 'First order from a new customer', detail: `${who} · ${o.ref}`, amount: orderTotal(o) });
    } else {
      events.push({ key: `ord-${o.id}`, kind: 'order', date: o.date, order: i * 10, title: `New order ${o.ref}`, detail: `${who} · ${orderItems(o)} items`, amount: orderTotal(o) });
    }
  });

  // Monthly milestones: each time revenue for the calendar month passes another ₹1,00,000.
  let month = '';
  let running = 0;
  byDate.forEach((o, i) => {
    const m = o.date.slice(0, 7);
    if (m !== month) {
      month = m;
      running = 0;
    }
    const before = running;
    running += orderTotal(o);
    const crossed = Math.floor(running / MILESTONE_STEP);
    if (crossed > Math.floor(before / MILESTONE_STEP) && o.date >= recentStart) {
      const amount = crossed * MILESTONE_STEP;
      events.push({ key: `ms-${m}-${crossed}`, kind: 'milestone', date: o.date, order: i * 10 + 5, title: 'Monthly revenue milestone', detail: `Revenue this month passed ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)}`, amount });
    }
  });

  // Record day: a day whose revenue beats every earlier day in the 30 days before it.
  const daily = new Map<string, number>();
  for (const o of byDate) daily.set(o.date, (daily.get(o.date) ?? 0) + orderTotal(o));
  for (let d = recentStart; d <= state.today; d = addDays(d, 1)) {
    const value = daily.get(d) ?? 0;
    if (!value) continue;
    let beatsAll = true;
    for (let back = 1; back <= 30 && beatsAll; back++) if ((daily.get(addDays(d, -back)) ?? 0) >= value) beatsAll = false;
    if (beatsAll) {
      events.push({ key: `best-${d}`, kind: 'best-day', date: d, order: Number.MAX_SAFE_INTEGER, title: 'Best day in the last 30 days', detail: 'Highest daily revenue in a month', amount: value });
    }
  }

  return events
    .filter((e) => e.date <= state.today)
    .sort((a, b) => (a.date !== b.date ? (a.date < b.date ? 1 : -1) : b.order - a.order))
    .slice(0, limit);
}

// ---------- Rule-based insights ----------

export type InsightTone = 'positive' | 'negative' | 'neutral';

export interface Insight {
  id: string;
  tone: InsightTone;
  title: string;
  detail: string;
}

/** A change smaller than this (in %) is described as steady. */
export const STEADY_THRESHOLD = 5;
const weekdayNames = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];
const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
const pct = (n: number) => `${Math.abs(Math.round(n))}%`;

function changeInsight(id: string, label: string, change: number | null, periodWord: string): Insight | null {
  if (change === null) return null;
  if (Math.abs(change) < STEADY_THRESHOLD) {
    return { id, tone: 'neutral', title: `${label} is steady`, detail: `Within ${STEADY_THRESHOLD}% of the previous ${periodWord}.` };
  }
  const up = change > 0;
  return {
    id,
    tone: up ? 'positive' : 'negative',
    title: `${label} is ${up ? 'up' : 'down'} ${pct(change)}`,
    detail: `Compared with the previous ${periodWord}.`,
  };
}

/**
 * Plain observations produced by fixed rules over the sample data — no AI involved.
 * Ordered so that things needing attention come first.
 */
export function insights(state: PulseState, days: PeriodDays): Insight[] {
  const periodWord = `${days} days`;
  const { current, previous } = summarize(state, days);
  const out: Insight[] = [];

  const rev = changeInsight('revenue', 'Revenue', percentChange(current.revenue, previous.revenue), periodWord);
  if (rev) out.push(rev);
  const aov = changeInsight('aov', 'Average order value', percentChange(current.averageOrderValue, previous.averageOrderValue), periodWord);
  if (aov && aov.tone !== 'neutral') out.push(aov);

  const t = targetProgress(state, days);
  out.push(
    t.ratio >= 1
      ? { id: 'target', tone: 'positive', title: 'Revenue target met', detail: `${fmt(t.revenue)} against a target of ${fmt(t.target)}.` }
      : { id: 'target', tone: t.ratio >= 0.9 ? 'neutral' : 'negative', title: `${fmt(t.remaining)} short of the target`, detail: `${Math.floor(t.ratio * 100)}% of the ${fmt(t.target)} target for this period.` },
  );

  const products = breakdown(state, days, 'product').filter((r) => r.previousRevenue >= 1000 && r.change !== null);
  const growing = [...products].sort((a, b) => b.change! - a.change!)[0];
  const falling = [...products].sort((a, b) => a.change! - b.change!)[0];
  if (growing && growing.change! >= 15) {
    out.push({ id: 'growing', tone: 'positive', title: `${growing.label} sales are up ${pct(growing.change!)}`, detail: `The fastest-growing product this period, at ${fmt(growing.revenue)}.` });
  }
  if (falling && falling.change! <= -15) {
    out.push({ id: 'falling', tone: 'negative', title: `${falling.label} sales are down ${pct(falling.change!)}`, detail: `${fmt(falling.revenue)} this period, from ${fmt(falling.previousRevenue)} before.` });
  }

  const top = breakdown(state, days, 'category')[0];
  if (top && top.revenue > 0) {
    out.push({ id: 'top-category', tone: 'neutral', title: `${top.label} brings in the most revenue`, detail: `${Math.round(top.share * 100)}% of sales this period.` });
  }

  if (days >= 30) {
    const totals = new Array<number>(7).fill(0);
    const counts = new Array<number>(7).fill(0);
    const range = periodRange(state.today, days);
    for (let d = range.start; d <= range.end; d = addDays(d, 1)) counts[weekday(d)]! += 1;
    for (const o of ordersIn(state, range)) totals[weekday(o.date)]! += orderTotal(o);
    const averages = totals.map((v, i) => (counts[i] ? v / counts[i]! : 0));
    const best = averages.indexOf(Math.max(...averages));
    out.push({ id: 'best-weekday', tone: 'neutral', title: `${weekdayNames[best]} are the busiest day`, detail: `Average revenue of ${fmt(Math.round(averages[best]!))} on ${weekdayNames[best]}.` });
  }

  const nc = percentChange(current.newCustomers, previous.newCustomers);
  if (current.newCustomers > 0 || previous.newCustomers > 0) {
    const tone: InsightTone = nc !== null && nc <= -STEADY_THRESHOLD ? 'negative' : nc !== null && nc >= STEADY_THRESHOLD ? 'positive' : 'neutral';
    out.push({
      id: 'new-customers',
      tone,
      title:
        tone === 'neutral'
          ? `${current.newCustomers} new ${current.newCustomers === 1 ? 'customer' : 'customers'}`
          : `New customers ${tone === 'positive' ? 'up' : 'down'} to ${current.newCustomers}`,
      detail: previous.newCustomers ? `${previous.newCustomers} in the previous ${periodWord}.` : `None in the previous ${periodWord}.`,
    });
  }

  const rank: Record<InsightTone, number> = { negative: 0, positive: 1, neutral: 2 };
  return out.sort((a, b) => rank[a.tone] - rank[b.tone]);
}

// ---------- State updates ----------

export type PulseAction = { type: 'setTarget'; revenueTarget30: number } | { type: 'reset'; state: PulseState };

export function pulseReducer(state: PulseState, action: PulseAction): PulseState {
  switch (action.type) {
    case 'setTarget':
      if (!Number.isInteger(action.revenueTarget30) || action.revenueTarget30 < 1000 || action.revenueTarget30 > MAX_TARGET) return state;
      return { ...state, revenueTarget30: action.revenueTarget30 };
    case 'reset':
      return action.state;
  }
}

