/**
 * Brand configuration. Change the name or tagline here and every page,
 * page title and footer picks it up.
 */
export const brand = {
  name: 'Vixidia',
  tagline: 'Ready-to-use software for small businesses.',
  shortDescription:
    'Vixidia builds ready-to-use software for small businesses, made for how each industry actually works — from water delivery rounds to gym memberships.',
  positioning: 'Practical software. Clear workflows. Less operational friction.',
} as const;

/** Builds a document title such as "Products — Vixidia". */
export function pageTitle(page?: string): string {
  return page ? `${page} — ${brand.name}` : `${brand.name} — Ready-to-use software for small businesses`;
}
