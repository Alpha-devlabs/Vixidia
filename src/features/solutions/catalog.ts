import type { LucideIcon } from 'lucide-react';
import type { Product } from '../../types/product';
import type { SolutionIdea } from '../../config/solutionIdeas';
import { demoPath, hasDemo, productPath } from '../../utils/products';

/*
 * The solutions finder's catalogue: the product registry (unchanged, the only
 * source of truth for the products) plus the planned solution ideas,
 * combined into one searchable list.
 *
 * Search is plain, predictable client-side matching:
 *   - text is normalised: lower-case, accents removed, "&" read as "and",
 *     punctuation treated as spaces, simple plurals reduced ("invoices" → "invoice")
 *   - every meaningful word of the query must match a word of the entry
 *     (whole word, or the start of one: "invoic" finds "invoice")
 *   - filler words ("for", "my", "software", "management"…) are ignored
 *   - results are ranked by where the words matched: name, then category or
 *     industry, then keywords, then description; ties keep catalogue order
 */

export type SolutionCategory = 'general' | 'industry';
export type CategoryFilter = 'all' | SolutionCategory | 'planned';

export const categoryFilters: { value: CategoryFilter; label: string }[] = [
  { value: 'all', label: 'All solutions' },
  { value: 'general', label: 'General business tools' },
  { value: 'industry', label: 'Industry-specific' },
  { value: 'planned', label: 'Planned ideas' },
];

interface Base {
  id: string;
  name: string;
  /** Category or industry shown under the name. */
  label: string;
  summary: string;
  category: SolutionCategory;
  icon: LucideIcon;
  keywords: readonly string[];
}

/** An existing product: always has a detail page; may have a demo. */
export interface ProductEntry extends Base {
  type: 'product';
  product: Product;
  detailPath: string;
  demoPath?: string;
}

/** A planned idea: no page, no route, no demo. Its only action is "I'd use this". */
export interface IdeaEntry extends Base {
  type: 'idea';
  idea: SolutionIdea;
}

export type SolutionEntry = ProductEntry | IdeaEntry;

export function buildCatalog(products: readonly Product[], ideas: readonly SolutionIdea[]): SolutionEntry[] {
  return [
    ...products.map(
      (p): ProductEntry => ({
        type: 'product',
        id: p.id,
        name: p.name,
        label: p.kind,
        summary: p.summary,
        category: p.industry ? 'industry' : 'general',
        icon: p.icon,
        keywords: p.searchKeywords,
        product: p,
        detailPath: productPath(p),
        ...(hasDemo(p) ? { demoPath: demoPath(p) } : {}),
      }),
    ),
    ...ideas.map(
      (i): IdeaEntry => ({
        type: 'idea',
        id: i.id,
        name: i.name,
        label: i.industry,
        summary: i.summary,
        category: 'industry',
        icon: i.icon,
        keywords: [...i.searchKeywords, ...i.wouldCover],
        idea: i,
      }),
    ),
  ];
}

// ---------- Normalisation ----------

const STOPWORDS = new Set(['a', 'an', 'and', 'the', 'for', 'of', 'to', 'in', 'my', 'our', 'i', 'we', 'with', 'app', 'apps', 'software', 'system', 'tool', 'tools', 'management', 'manage', 'managing', 'solution', 'solutions']);

/** "Follow-ups & Invoices" → "follow ups and invoices". */
export function normalize(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Reduces simple plurals so "invoices", "payments" and "classes" match their singular. */
export function stem(word: string): string {
  if (word.length > 4 && word.endsWith('ies')) return `${word.slice(0, -3)}y`;
  if (word.length > 4 && /(ss|x|ch|sh)es$/.test(word)) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

export function words(text: string): string[] {
  return normalize(text)
    .split(' ')
    .filter(Boolean)
    .map(stem);
}

/** Meaningful query words: normalised, stemmed, without filler words or single letters. */
export function queryWords(query: string): string[] {
  return normalize(query)
    .split(' ')
    .filter((w) => w.length > 1 && !STOPWORDS.has(w))
    .map(stem);
}

// ---------- Search ----------

interface Indexed {
  entry: SolutionEntry;
  name: string[];
  label: string[];
  tags: string[];
  text: string[];
  /** Full normalised strings, for phrase matches. */
  namePhrase: string;
  tagPhrases: string[];
}

function index(entry: SolutionEntry): Indexed {
  const categoryText = entry.category === 'general' ? 'general business' : 'industry specific';
  return {
    entry,
    name: words(entry.name),
    label: words(entry.label),
    tags: [...entry.keywords, categoryText].flatMap(words),
    text: words(entry.summary),
    namePhrase: words(entry.name).join(' '),
    tagPhrases: entry.keywords.map((k) => words(k).join(' ')),
  };
}

const hit = (list: string[], q: string) => list.some((w) => w === q || w.startsWith(q));

/** Relevance of an entry for the query words, or 0 if any word doesn't match. */
function score(ix: Indexed, q: string[]): number {
  let total = 0;
  for (const w of q) {
    const s = hit(ix.name, w) ? 5 : hit(ix.label, w) ? 4 : hit(ix.tags, w) ? 3 : hit(ix.text, w) ? 1 : 0;
    if (s === 0) return 0;
    total += s;
  }
  const phrase = q.join(' ');
  if (q.length > 1 && ix.namePhrase.includes(phrase)) total += 10;
  else if (q.length > 1 && ix.tagPhrases.some((p) => p.includes(phrase))) total += 6;
  return total;
}

export function matchesCategory(entry: SolutionEntry, filter: CategoryFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'planned') return entry.type === 'idea';
  return entry.category === filter;
}

/**
 * Entries matching the query and category, best match first. An empty query
 * (or one made only of filler words) matches everything, in catalogue order:
 * existing products first, then planned ideas.
 */
export function searchCatalog(entries: readonly SolutionEntry[], query: string, filter: CategoryFilter = 'all'): SolutionEntry[] {
  const q = queryWords(query);
  const inCategory = entries.filter((e) => matchesCategory(e, filter));
  if (q.length === 0) return inCategory;
  return inCategory
    .map((entry, order) => ({ entry, order, s: score(index(entry), q) }))
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s || a.order - b.order)
    .map((r) => r.entry);
}

/** How many entries each category chip would show for the current query. */
export function categoryCounts(entries: readonly SolutionEntry[], query: string): Record<CategoryFilter, number> {
  return Object.fromEntries(categoryFilters.map((c) => [c.value, searchCatalog(entries, query, c.value).length])) as Record<CategoryFilter, number>;
}
