import { describe, it, expect } from 'vitest';
import { generateReferralCode } from '@/lib/referral/generate-code';

const SAMPLE_UUID_1 = '550e8400-e29b-41d4-a716-446655440000';
const SAMPLE_UUID_2 = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const SAMPLE_UUID_3 = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

describe('generateReferralCode', () => {
  it('returns the same code for the same userId (deterministic)', () => {
    const code1 = generateReferralCode(SAMPLE_UUID_1);
    const code2 = generateReferralCode(SAMPLE_UUID_1);
    expect(code1).toBe(code2);
  });

  it('returns a string of length 7 (first 7 hex chars uppercased)', () => {
    const code = generateReferralCode(SAMPLE_UUID_1);
    expect(code).toHaveLength(7);
  });

  it('returns only uppercase alphanumeric characters (A-F0-9 from hex)', () => {
    const code = generateReferralCode(SAMPLE_UUID_1);
    expect(code).toMatch(/^[0-9A-F]+$/);
  });

  it('is URL-safe (no special characters)', () => {
    const code = generateReferralCode(SAMPLE_UUID_1);
    expect(code).toMatch(/^[A-Za-z0-9]+$/);
  });

  it('returns different codes for different user IDs', () => {
    const code1 = generateReferralCode(SAMPLE_UUID_1);
    const code2 = generateReferralCode(SAMPLE_UUID_2);
    expect(code1).not.toBe(code2);
  });

  it('returns different codes for three distinct user IDs', () => {
    const code1 = generateReferralCode(SAMPLE_UUID_1);
    const code2 = generateReferralCode(SAMPLE_UUID_2);
    const code3 = generateReferralCode(SAMPLE_UUID_3);
    const codes = new Set([code1, code2, code3]);
    expect(codes.size).toBe(3);
  });

  it('code length is between 6 and 8 characters (AC #1)', () => {
    const code = generateReferralCode(SAMPLE_UUID_1);
    expect(code.length).toBeGreaterThanOrEqual(6);
    expect(code.length).toBeLessThanOrEqual(8);
  });

  it('works with any UUID-like string', () => {
    const code = generateReferralCode('some-arbitrary-user-id-string');
    expect(code).toBeTruthy();
    expect(code.length).toBeGreaterThanOrEqual(6);
  });

  it('is case-insensitive (returns uppercase)', () => {
    const code = generateReferralCode(SAMPLE_UUID_1);
    expect(code).toBe(code.toUpperCase());
  });
});
