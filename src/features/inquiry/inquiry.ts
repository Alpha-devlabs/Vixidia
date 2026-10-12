import { brand } from '../../config/brand';

export type InquiryTopic = 'custom-software' | 'product-feedback' | 'product-interest' | 'other';

export const inquiryTopics: { value: InquiryTopic; label: string }[] = [
  { value: 'custom-software', label: 'Custom software for my business' },
  { value: 'product-interest', label: `Interest in a ${brand.name} product` },
  { value: 'product-feedback', label: 'Feedback on a product or demo' },
  { value: 'other', label: 'Something else' },
];

export interface InquiryInput {
  name: string;
  email: string;
  organization: string;
  topic: InquiryTopic | '';
  message: string;
}

export type InquiryErrors = Partial<Record<keyof InquiryInput, string>>;

export const MESSAGE_MIN = 20;
export const MESSAGE_MAX = 2000;

// Deliberately practical rather than RFC-complete: something@domain.tld, no spaces.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function emptyInquiry(topic: InquiryTopic | '' = ''): InquiryInput {
  return { name: '', email: '', organization: '', topic, message: '' };
}

export function isInquiryTopic(value: string | null): value is InquiryTopic {
  return inquiryTopics.some((t) => t.value === value);
}

export function validateInquiry(input: InquiryInput): InquiryErrors {
  const errors: InquiryErrors = {};
  const name = input.name.trim();
  if (!name) errors.name = 'Enter your name so we know who is asking.';
  else if (name.length > 80) errors.name = 'Keep your name under 80 characters.';

  const email = input.email.trim();
  if (!email) errors.email = 'Enter your email address.';
  else if (!EMAIL_PATTERN.test(email)) errors.email = 'Enter an email address like name@example.com.';

  if (input.organization.trim().length > 100) errors.organization = 'Keep the business name under 100 characters.';

  if (!input.topic) errors.topic = 'Choose what your inquiry is about.';

  const message = input.message.trim();
  if (!message) errors.message = 'Describe the problem or idea you have in mind.';
  else if (message.length < MESSAGE_MIN) errors.message = `Add a little more detail — at least ${MESSAGE_MIN} characters.`;
  else if (message.length > MESSAGE_MAX) errors.message = `Keep the description under ${MESSAGE_MAX} characters.`;

  return errors;
}

/**
 * Result of handing an inquiry to the submission service.
 * `not_connected` means no service exists yet, so nothing was sent or stored.
 */
export type SubmissionResult =
  | { status: 'delivered'; reference: string }
  | { status: 'not_connected' }
  | { status: 'failed'; message: string };

export type InquirySubmitter = (input: InquiryInput) => Promise<SubmissionResult>;

/**
 * Current submitter: there is no backend yet, so the inquiry is discarded and
 * the caller is told so. Replace this with a real implementation (an API call)
 * when a submission service exists — the form itself does not need to change.
 */
export const submitInquiry: InquirySubmitter = async () => ({ status: 'not_connected' });
