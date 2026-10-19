import { products as registry } from '../config/products';
import { paths } from '../config/routes';
import type { Product, ProductStatus } from '../types/product';

export function getProductBySlug(slug: string | undefined, list: readonly Product[] = registry): Product | undefined {
  if (!slug) return undefined;
  return list.find((p) => p.slug === slug.toLowerCase());
}

export function getProductById(id: string, list: readonly Product[] = registry): Product | undefined {
  return list.find((p) => p.id === id);
}

export function productPath(product: Pick<Product, 'slug'>): string {
  return `${paths.products}/${product.slug}`;
}

export function demoPath(product: Pick<Product, 'slug'>): string {
  return `${productPath(product)}/try`;
}

export function hasDemo(product: Product): product is Product & { demo: NonNullable<Product['demo']> } {
  return product.demo !== undefined;
}

/** Inquiry form link with the topic preselected. Contains no personal data. */
export function interestPath(product: Pick<Product, 'slug'>): string {
  const params = new URLSearchParams({ topic: 'product-interest', product: product.slug });
  return `${paths.inquiry}?${params.toString()}`;
}

export interface StatusInfo {
  label: string;
  /** Plain-language explanation of what the status means for a visitor. */
  explanation: string;
}

export const statusInfo: Record<ProductStatus, StatusInfo> = {
  planned: {
    label: 'Planned',
    explanation: 'This is a product concept. Nothing is available to use yet.',
  },
  in_build: {
    label: 'In development',
    explanation: 'We are building this now. It is not released, but you can explore a demo with sample data.',
  },
  live: {
    label: 'Available',
    explanation: 'Released and ready to use.',
  },
};

export interface ProductAction {
  label: string;
  to: string;
}

/**
 * What a visitor can do with a product, derived from its status and demo.
 * Only actions with a real destination are returned.
 */
export function productActions(product: Product): { primary: ProductAction; secondary?: ProductAction } {
  const details: ProductAction = { label: 'View solution', to: productPath(product) };
  if (product.status === 'live' && product.appUrl) {
    return { primary: { label: `Open ${product.name}`, to: product.appUrl }, secondary: details };
  }
  if (hasDemo(product)) {
    const label = product.demo.kind === 'design-preview' ? 'See preview' : 'Try demo';
    return { primary: { label, to: demoPath(product) }, secondary: details };
  }
  return { primary: { label: 'View concept', to: productPath(product) } };
}

export interface DetailState {
  /** What the visitor can do right now, if anything. Only real destinations. */
  primary?: ProductAction & { kind: 'app' | 'demo' | 'preview' };
  /** Short availability line shown next to the call to action. */
  note: string;
  /** Heading and text for the availability panel. */
  availability: { title: string; text: string };
}

/**
 * The detail page's call to action and availability wording, derived only from
 * the registry: a live app, a working demo, a design preview, or nothing yet.
 * Demo links always use the registry slug via demoPath, never a display name.
 */
export function detailState(product: Product): DetailState {
  if (product.status === 'live' && product.appUrl) {
    return {
      primary: { kind: 'app', label: `Open ${product.name}`, to: product.appUrl },
      note: 'Released and ready to use.',
      availability: { title: 'Available', text: statusInfo.live.explanation },
    };
  }
  if (hasDemo(product) && product.demo.kind === 'interactive') {
    return {
      primary: { kind: 'demo', label: 'Try live demo', to: demoPath(product) },
      note: 'Opens right away with a fictional sample business. No sign-up.',
      availability: { title: 'In development, with a working demo', text: statusInfo[product.status].explanation },
    };
  }
  if (hasDemo(product)) {
    return {
      primary: { kind: 'preview', label: 'See the design preview', to: demoPath(product) },
      note: 'Screens with sample data. Saving and payments aren’t built yet.',
      availability: { title: 'Design preview only', text: 'The screens can be explored with fictional sample data, but the logic behind them is not built yet, so nothing you enter is saved.' },
    };
  }
  return {
    note: 'There is no demo yet.',
    availability: { title: 'Demo not available yet', text: `${statusInfo[product.status].explanation} There is nothing to try yet; hearing from people who would use it helps us decide what to build.` },
  };
}
