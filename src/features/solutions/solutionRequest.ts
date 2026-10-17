/*
 * "Request a solution": validation and the submission adapter.
 *
 * There is no enquiry backend yet. The submitter below therefore reports
 * `not_connected`, the form says plainly that nothing was sent or stored, and
 * offers the visitor a copy of their request instead. When a real service
 * exists, replace `submitSolutionRequest` — the form does not need to change.
 */

export interface SolutionRequestInput {
  name: string;
  businessName: string;
  email: string;
  phone: string;
  businessType: string;
  needs: string;
  /** Set when the visitor came from a planned idea's card. */
  ideaName?: string;
}

export type SolutionRequestErrors = Partial<Record<'name' | 'businessName' | 'email' | 'phone' | 'businessType' | 'needs', string>>;

export const NEEDS_MIN = 10;
export const NEEDS_MAX = 1000;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Any country's format: digits with spaces, dashes, dots or brackets and an optional leading +; 6–15 digits. */
export function isPhone(value: string): boolean {
  if (!/^\+?[\d\s().-]+$/.test(value)) return false;
  const digits = value.replace(/\D/g, '').length;
  return digits >= 6 && digits <= 15;
}

export function emptySolutionRequest(ideaName?: string, businessType = ''): SolutionRequestInput {
  return { name: '', businessName: '', email: '', phone: '', businessType, needs: '', ...(ideaName ? { ideaName } : {}) };
}

/** Required: name, a way to reply (email or phone, at least one), business type, and what they want to manage. */
export function validateSolutionRequest(input: SolutionRequestInput): SolutionRequestErrors {
  const e: SolutionRequestErrors = {};
  const name = input.name.trim();
  if (!name) e.name = 'Enter your name.';
  else if (name.length > 80) e.name = 'Keep your name under 80 characters.';

  if (input.businessName.trim().length > 100) e.businessName = 'Keep the business name under 100 characters.';

  const email = input.email.trim();
  const phone = input.phone.trim();
  if (!email && !phone) e.email = 'Add an email address or a phone number, so there is a way to reply.';
  if (email && !EMAIL.test(email)) e.email = 'Enter an email address like name@example.com.';
  if (phone && !isPhone(phone)) e.phone = 'Use digits, spaces or dashes, with an optional + and country code (6–15 digits).';

  const type = input.businessType.trim();
  if (!type) e.businessType = 'Tell us what kind of business it is, for example “gym” or “water delivery”.';
  else if (type.length > 80) e.businessType = 'Keep this under 80 characters.';

  const needs = input.needs.trim();
  if (!needs) e.needs = 'Describe what you want to manage or improve.';
  else if (needs.length < NEEDS_MIN) e.needs = `Add a little more detail — at least ${NEEDS_MIN} characters.`;
  else if (needs.length > NEEDS_MAX) e.needs = `Keep this under ${NEEDS_MAX} characters.`;
  return e;
}

/** Plain-text copy of the request, so the visitor can keep or share it themselves. */
export function requestSummary(input: SolutionRequestInput): string {
  const lines = [
    input.ideaName ? `Solution: ${input.ideaName}` : 'Solution: not listed',
    `Name: ${input.name.trim()}`,
    input.businessName.trim() ? `Business: ${input.businessName.trim()}` : '',
    `Business type: ${input.businessType.trim()}`,
    input.email.trim() ? `Email: ${input.email.trim()}` : '',
    input.phone.trim() ? `Phone: ${input.phone.trim()}` : '',
    `What I want to manage or improve: ${input.needs.trim()}`,
  ];
  return lines.filter(Boolean).join('\n');
}

/** `not_connected`: no service exists yet, so nothing was sent or stored. */
export type SolutionRequestResult = { status: 'delivered'; reference: string } | { status: 'not_connected' } | { status: 'failed'; message: string };

export type SolutionRequestSubmitter = (input: SolutionRequestInput) => Promise<SolutionRequestResult>;

/** Current submitter: there is no backend, so the request is discarded and the caller is told so. */
export const submitSolutionRequest: SolutionRequestSubmitter = async () => ({ status: 'not_connected' });
