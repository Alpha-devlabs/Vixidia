import { products } from '../../config/products';

/** Industry solutions a business can sign up for, plus a way to name another. */
export const OTHER_INDUSTRY = 'other';

export const industryOptions: { value: string; label: string }[] = [
  ...products.filter((p) => p.industry).map((p) => ({ value: p.slug, label: p.name })),
  { value: OTHER_INDUSTRY, label: 'Another kind of business' },
];

export const sizeOptions = [
  { value: 'under-50', label: 'Fewer than 50' },
  { value: '50-100', label: '50 to 100' },
  { value: '100-500', label: '100 to 500' },
  { value: 'over-500', label: 'More than 500' },
] as const;

export type CustomerBand = (typeof sizeOptions)[number]['value'];

export interface EarlyAccessInput {
  name: string;
  phone: string;
  business: string;
  /** A solution slug from industryOptions, or OTHER_INDUSTRY. */
  industry: string;
  /** Required only when industry is OTHER_INDUSTRY. */
  otherIndustry: string;
  customers: CustomerBand | '';
  city: string;
}

export type EarlyAccessErrors = Partial<Record<keyof EarlyAccessInput, string>>;

export function emptyEarlyAccess(industry = ''): EarlyAccessInput {
  return { name: '', phone: '', business: '', industry: isIndustryOption(industry) ? industry : '', otherIndustry: '', customers: '', city: '' };
}

export function isIndustryOption(value: string | null | undefined): value is string {
  return !!value && industryOptions.some((o) => o.value === value);
}

/**
 * Normalises an Indian mobile number to its 10 digits, accepting spaces,
 * dashes and a +91 / 91 / 0 prefix. Returns null when it isn't one.
 */
export function normalizeMobile(raw: string): string | null {
  const digits = raw.replace(/[\s\-().]/g, '');
  const match = /^(?:\+?91|0)?([6-9]\d{9})$/.exec(digits);
  return match ? match[1] : null;
}

export function validateEarlyAccess(input: EarlyAccessInput): EarlyAccessErrors {
  const errors: EarlyAccessErrors = {};

  const name = input.name.trim();
  if (!name) errors.name = 'Enter your name.';
  else if (name.length > 80) errors.name = 'Keep your name under 80 characters.';

  if (!input.phone.trim()) errors.phone = 'Enter a mobile number we can reach you on.';
  else if (!normalizeMobile(input.phone)) errors.phone = 'Enter a 10-digit mobile number, like 98765 43210.';

  if (input.business.trim().length > 100) errors.business = 'Keep the business name under 100 characters.';

  if (!input.industry) errors.industry = 'Choose the kind of business you run.';
  else if (input.industry === OTHER_INDUSTRY) {
    const other = input.otherIndustry.trim();
    if (!other) errors.otherIndustry = 'Tell us what kind of business it is.';
    else if (other.length > 80) errors.otherIndustry = 'Keep this under 80 characters.';
  }

  if (input.city.trim().length > 60) errors.city = 'Keep the town or city under 60 characters.';

  return errors;
}

/**
 * Result of handing a sign-up to the submission service.
 * `not_connected` means no service exists yet, so nothing was sent or stored.
 */
export type EarlyAccessResult = { status: 'delivered' } | { status: 'not_connected' } | { status: 'failed'; message: string };

export type EarlyAccessSubmitter = (input: EarlyAccessInput) => Promise<EarlyAccessResult>;

/**
 * Current submitter: there is no backend yet, so the sign-up is discarded and
 * the caller is told so. Replace this with a real implementation (an API call,
 * form service or sheet) when one exists — the form itself does not need to change.
 */
export const submitEarlyAccess: EarlyAccessSubmitter = async () => ({ status: 'not_connected' });
