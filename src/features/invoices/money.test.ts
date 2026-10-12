import { describe, expect, it } from 'vitest';
import { applyBasisPoints, multiplyQuantity, paiseToInput, parseMoney, parseQuantity } from './money';

describe('parseMoney', () => {
  it('reads rupees and paise exactly, ignoring common separators', () => {
    expect(parseMoney('12,500.5')).toEqual({ ok: true, value: 1_250_050 });
    expect(parseMoney('₹ 99.99')).toEqual({ ok: true, value: 9999 });
    expect(parseMoney('0.1')).toEqual({ ok: true, value: 10 });
    expect(parseMoney('00012')).toEqual({ ok: true, value: 1200 });
    expect(parseMoney('0')).toEqual({ ok: true, value: 0 });
  });

  it('rejects anything that is not a plain amount with up to two decimals', () => {
    for (const bad of ['12.345', '-5', 'abc', '1e3', '.5', '12.', '1,2.3.4', '+5']) {
      expect(parseMoney(bad), bad).toEqual({ ok: false, reason: 'format' });
    }
    expect(parseMoney('  ')).toEqual({ ok: false, reason: 'empty' });
    expect(parseMoney('1000000001')).toEqual({ ok: false, reason: 'too_large' });
  });
});

describe('parseQuantity', () => {
  it('accepts up to three decimals', () => {
    expect(parseQuantity('2.5')).toEqual({ ok: true, value: 2.5 });
    expect(parseQuantity('1.005')).toEqual({ ok: true, value: 1.005 });
    expect(parseQuantity('0')).toEqual({ ok: true, value: 0 });
  });
  it('rejects negatives, extra decimals and huge values', () => {
    expect(parseQuantity('-1')).toEqual({ ok: false, reason: 'format' });
    expect(parseQuantity('1.0005')).toEqual({ ok: false, reason: 'format' });
    expect(parseQuantity('2000000')).toEqual({ ok: false, reason: 'too_large' });
  });
});

describe('exact multiplication', () => {
  it('rounds half up to the paisa without floating-point drift', () => {
    // 1.005 × ₹1.00 is 100.5 paise; naive 1.005 * 100 gives 100.4999… and rounds down.
    expect(multiplyQuantity(1.005, 100)).toBe(101);
    expect(multiplyQuantity(0.5, 5)).toBe(3);
    expect(multiplyQuantity(3, 3333)).toBe(9999);
    expect(applyBasisPoints(25, 1800)).toBe(5); // 4.5 → 5
    expect(applyBasisPoints(1, 1800)).toBe(0); // 0.18 → 0
    expect(applyBasisPoints(9999, 1800)).toBe(1800); // 1799.82 → 1800
  });

  it('formats paise back into an input value', () => {
    expect(paiseToInput(1_234_567)).toBe('12345.67');
    expect(paiseToInput(5)).toBe('0.05');
    expect(paiseToInput(0)).toBe('0.00');
  });
});
