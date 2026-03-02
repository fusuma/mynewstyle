/** First consultation price in EUR cents */
export const FIRST_CONSULTATION_PRICE = 599;

/** Returning user consultation price in EUR cents */
export const RETURNING_CONSULTATION_PRICE = 299;

/** Payment currency (EUR) */
export const CURRENCY = 'eur' as const;

export type UserPricingType = 'first' | 'returning' | 'guest';

export interface PricingResult {
  amount: number;
  userType: UserPricingType;
}

/**
 * Determines the consultation price based on user history.
 * - Guests or first-time authenticated users: EUR 5.99 (599 cents)
 * - Returning users with previous paid consultation: EUR 2.99 (299 cents)
 */
export function determinePrice(
  isGuest: boolean,
  hasPreviousPaidConsultation: boolean
): PricingResult {
  if (isGuest) {
    return { amount: FIRST_CONSULTATION_PRICE, userType: 'guest' };
  }
  if (hasPreviousPaidConsultation) {
    return { amount: RETURNING_CONSULTATION_PRICE, userType: 'returning' };
  }
  return { amount: FIRST_CONSULTATION_PRICE, userType: 'first' };
}
