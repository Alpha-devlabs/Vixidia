import { describe, expect, it } from 'vitest';
import { emptyInquiry, isInquiryTopic, submitInquiry, validateInquiry } from './inquiry';

const valid = {
  name: 'Kavitha',
  email: 'kavitha@example.com',
  organization: '',
  topic: 'custom-software' as const,
  message: 'We track tailoring orders in a notebook and lose track of delivery dates.',
};

describe('inquiry validation', () => {
  it('accepts a complete inquiry with no organisation', () => {
    expect(validateInquiry(valid)).toEqual({});
  });

  it('flags every required field on an empty form', () => {
    const errors = validateInquiry(emptyInquiry());
    expect(Object.keys(errors).sort()).toEqual(['email', 'message', 'name', 'topic']);
  });

  it('rejects malformed email addresses', () => {
    for (const email of ['kavitha', 'kavitha@', 'kavitha@example', 'a b@example.com']) {
      expect(validateInquiry({ ...valid, email }).email).toBeDefined();
    }
  });

  it('requires a meaningful description', () => {
    expect(validateInquiry({ ...valid, message: 'help' }).message).toBeDefined();
    expect(validateInquiry({ ...valid, message: '   ' }).message).toBeDefined();
  });

  it('recognises valid topics only', () => {
    expect(isInquiryTopic('product-interest')).toBe(true);
    expect(isInquiryTopic('tools')).toBe(false);
    expect(isInquiryTopic(null)).toBe(false);
  });
});

describe('submission', () => {
  it('reports honestly that no service is connected', async () => {
    expect(await submitInquiry(valid)).toEqual({ status: 'not_connected' });
  });
});
