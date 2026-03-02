import { describe, it, expect } from 'vitest';
import {
  determinePrice,
  FIRST_CONSULTATION_PRICE,
  RETURNING_CONSULTATION_PRICE,
  CURRENCY,
} from '@/lib/stripe/pricing';

describe('Pricing Constants', () => {
  it('first consultation price is 599 cents (EUR 5.99)', () => {
    expect(FIRST_CONSULTATION_PRICE).toBe(599);
  });

  it('returning consultation price is 299 cents (EUR 2.99)', () => {
    expect(RETURNING_CONSULTATION_PRICE).toBe(299);
  });

  it('currency is EUR', () => {
    expect(CURRENCY).toBe('eur');
  });
});

describe('determinePrice', () => {
  it('returns first-time price for guests', () => {
    const result = determinePrice(true, false);
    expect(result).toEqual({ amount: 599, userType: 'guest' });
  });

  it('returns first-time price for guests even with paid history flag', () => {
    const result = determinePrice(true, true);
    expect(result).toEqual({ amount: 599, userType: 'guest' });
  });

  it('returns first-time price for authenticated first-time user', () => {
    const result = determinePrice(false, false);
    expect(result).toEqual({ amount: 599, userType: 'first' });
  });

  it('returns returning price for authenticated returning user', () => {
    const result = determinePrice(false, true);
    expect(result).toEqual({ amount: 299, userType: 'returning' });
  });
});
