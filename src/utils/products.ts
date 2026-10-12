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
  const details: ProductAction = { label: 'View details', to: productPath(product) };
  if (product.status === 'live' && product.appUrl) {
    return { primary: { label: `Open ${product.name}`, to: product.appUrl }, secondary: details };
  }
  if (hasDemo(product)) {
    const label = product.demo.kind === 'design-preview' ? 'See preview' : 'Try demo';
    return { primary: { label, to: demoPath(product) }, secondary: details };
  }
  return { primary: { label: 'View concept', to: productPath(product) } };
}
