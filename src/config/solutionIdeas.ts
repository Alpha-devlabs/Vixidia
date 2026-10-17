import type { LucideIcon } from 'lucide-react';

/**
 * Industry-specific solution ideas shown in the solutions finder.
 *
 * These are catalogue entries only: nothing here is built, in development or
 * available, and none has a page, route or demo. They exist so visitors can find
 * them by search and tell us they would use them. When an idea becomes a real
 * product it moves to the product registry (config/products.ts) instead, as
 * Water Delivery Management, Gym Membership Management, Salon Management,
 * Tuition Centre Management and Small Distributor Management did.
 */
export interface SolutionIdea {
  id: string;
  name: string;
  /** Who it is for, shown on the card, e.g. "Fitness & gyms". */
  industry: string;
  summary: string;
  /** What it would help manage. Planned scope, not features that exist. */
  wouldCover: readonly string[];
  /** Business types, synonyms and problems people might search for. */
  searchKeywords: readonly string[];
  icon: LucideIcon;
}

// Every idea so far has become a product with a demo. New ideas go here until they do.
export const solutionIdeas: readonly SolutionIdea[] = [];
