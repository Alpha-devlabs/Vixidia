/**
 * Brand configuration. Change the name or tagline here and every page,
 * page title and footer picks it up.
 */
export const brand = {
  name: 'Vixidia',
  tagline: 'Practical software for real-world business problems.',
  shortDescription:
    'Vixidia builds straightforward software that helps small businesses and teams understand their work and organise everyday operations.',
  positioning: 'Practical software. Clear workflows. Less operational friction.',
} as const;

/** Builds a document title such as "Products — Vixidia". */
export function pageTitle(page?: string): string {
  return page ? `${page} — ${brand.name}` : `${brand.name} — Practical software for small businesses`;
}
