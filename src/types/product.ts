import type { LucideIcon } from 'lucide-react';

/**
 * planned  – an idea we intend to build; nothing usable yet.
 * in_build – actively being developed; may have a sample-data demo.
 * live     – released and usable as a real product.
 */
export type ProductStatus = 'planned' | 'in_build' | 'live';

/** Identifies which interactive demo component renders at /products/:slug/try. */
export type DemoId = 'pulse-dashboard' | 'invoice-tracker' | 'crm' | 'tasks' | 'leave' | 'water' | 'gym' | 'salon' | 'tuition' | 'distributor';

export interface Product {
  /** Stable internal id. Never shown in URLs, so the slug can change freely. */
  id: string;
  /** URL segment used in /products/:slug. */
  slug: string;
  name: string;
  /** Short category shown beside the name, e.g. "Business dashboard". */
  kind: string;
  /**
   * Set for industry-specific solutions (the industry they are built for). The
   * solutions finder lists these under "Industry-specific"; others are general
   * business tools.
   */
  industry?: string;
  /** The single question this product answers for its user. */
  question: string;
  status: ProductStatus;
  icon: LucideIcon;
  /** One sentence for cards and listings. */
  summary: string;
  /** Headline value proposition on the detail page. */
  tagline: string;
  /** The everyday problem this product is meant to solve. */
  problem: string;
  description: string;
  audience: string[];
  benefits: string[];
  /** Capabilities that exist today (in the demo or product), or planned ones for `planned` products. */
  features: string[];
  /** Ideas that are not built yet. Only shown as future concepts. */
  futureFeatures?: string[];
  /** Present only when a browser demo with sample data exists. */
  demo?: {
    id: DemoId;
    label: string;
    /**
     * interactive: a working demo on sample data.
     * design-preview: the screens, with sample data, before the logic is built.
     */
    kind: 'interactive' | 'design-preview';
  };
  /** Public application URL, only for live products. */
  appUrl?: string;
  /**
   * Extra words people might search for (synonyms, business types, problems),
   * used by the solutions finder. Name, category and summary are searched anyway.
   */
  searchKeywords: readonly string[];
}
