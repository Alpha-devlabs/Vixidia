import { describe, expect, it } from 'vitest';
import { emptyEarlyAccess, industryOptions, normalizeMobile, OTHER_INDUSTRY, submitEarlyAccess, validateEarlyAccess } from './earlyAccess';
import { annualTotal, plans, pricePerMonth } from '../../config/pricing';

const valid = {
  name: 'Murugan',
  phone: '98765 43210',
  business: 'Sri Murugan Aqua',
  industry: 'water-delivery-management',
  otherIndustry: '',
  customers: '100-500' as const,
  city: 'Chennai',
};

describe('early access validation', () => {
  it('accepts a complete sign-up', () => {
    expect(validateEarlyAccess(valid)).toEqual({});
  });

  it('needs only name, mobile and kind of business', () => {
    expect(validateEarlyAccess({ ...valid, business: '', customers: '', city: '' })).toEqual({});
    const errors = validateEarlyAccess(emptyEarlyAccess());
    expect(Object.keys(errors).sort()).toEqual(['industry', 'name', 'phone']);
  });

  it('asks what the business is when "another kind" is chosen', () => {
    expect(validateEarlyAccess({ ...valid, industry: OTHER_INDUSTRY }).otherIndustry).toBeDefined();
    expect(validateEarlyAccess({ ...valid, industry: OTHER_INDUSTRY, otherIndustry: 'Laundry' })).toEqual({});
  });

  it('presets only known industries', () => {
    expect(emptyEarlyAccess('gym-membership-management').industry).toBe('gym-membership-management');
    expect(emptyEarlyAccess('not-a-solution').industry).toBe('');
  });

  it('lists every industry solution and an "other" option', () => {
    expect(industryOptions.at(-1)?.value).toBe(OTHER_INDUSTRY);
    expect(industryOptions.some((o) => o.value === 'water-delivery-management')).toBe(true);
  });

  it('does not pretend to send anything yet', async () => {
    expect(await submitEarlyAccess(valid)).toEqual({ status: 'not_connected' });
  });
});

describe('mobile numbers', () => {
  it('accepts common ways of writing an Indian mobile number', () => {
    for (const raw of ['9876543210', '98765 43210', '+91 98765 43210', '+919876543210', '09876543210', '98765-43210']) {
      expect(normalizeMobile(raw)).toBe('9876543210');
    }
  });

  it('rejects numbers that are not mobiles', () => {
    for (const raw of ['12345', '5876543210', '98765432101', 'call me', '044 2345 6789']) {
      expect(normalizeMobile(raw)).toBeNull();
    }
  });
});

describe('pricing', () => {
  it('charges ten months for an annual plan', () => {
    expect(annualTotal({ monthly: 999 })).toBe(9990);
    expect(pricePerMonth({ monthly: 999 }, 'annual')).toBe(833);
    expect(pricePerMonth({ monthly: 999 }, 'monthly')).toBe(999);
  });

  it('recommends exactly one plan and prices plans in rising order', () => {
    expect(plans.filter((p) => p.recommended)).toHaveLength(1);
    const prices = plans.map((p) => p.monthly);
    expect([...prices].sort((a, b) => a - b)).toEqual(prices);
  });
});
