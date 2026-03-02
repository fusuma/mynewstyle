import { createHash } from 'crypto';

const REFERRAL_SALT = process.env.REFERRAL_CODE_SALT || 'mynewstyle-referral-v1';

/**
 * Generates a deterministic referral code from a user's UUID.
 *
 * Algorithm: SHA-256 of `userId:SALT`, take first 7 hex chars, uppercase.
 * - Same user always gets the same code (deterministic, no randomness).
 * - 7 uppercase hex chars → 16^7 ≈ 268M unique codes (sufficient for MVP).
 * - URL-safe and case-insensitive.
 *
 * AC #1: 6-8 character alphanumeric, URL-safe, case-insensitive.
 */
export function generateReferralCode(userId: string): string {
  const hash = createHash('sha256')
    .update(`${userId}:${REFERRAL_SALT}`)
    .digest('hex');
  // Take first 7 chars of hex hash, convert to uppercase.
  // Hex chars are 0-9 and A-F — URL-safe and case-insensitive.
  return hash.slice(0, 7).toUpperCase();
}
