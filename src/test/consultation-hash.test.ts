import { describe, it, expect } from 'vitest';
import { computePhotoHash, computeQuestionnaireHash } from '../lib/consultation/hash';

describe('computePhotoHash', () => {
  it('returns same hash for same base64 input', () => {
    const b64 = Buffer.from('test photo data').toString('base64');
    expect(computePhotoHash(b64)).toBe(computePhotoHash(b64));
  });

  it('returns different hash for different input', () => {
    const a = Buffer.from('photo A').toString('base64');
    const b = Buffer.from('photo B').toString('base64');
    expect(computePhotoHash(a)).not.toBe(computePhotoHash(b));
  });

  it('returns 64-char hex string (SHA-256)', () => {
    const b64 = Buffer.from('x').toString('base64');
    expect(computePhotoHash(b64)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces a deterministic SHA-256 hash from base64-encoded bytes', () => {
    // SHA-256 of 'hello' bytes = 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
    const b64 = Buffer.from('hello').toString('base64');
    expect(computePhotoHash(b64)).toBe(
      '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'
    );
  });
});

describe('computeQuestionnaireHash', () => {
  it('returns same hash regardless of key insertion order', () => {
    const q1 = { b: 'val', a: 'val2' };
    const q2 = { a: 'val2', b: 'val' };
    expect(computeQuestionnaireHash(q1)).toBe(computeQuestionnaireHash(q2));
  });

  it('returns different hash for different values', () => {
    expect(computeQuestionnaireHash({ a: '1' })).not.toBe(computeQuestionnaireHash({ a: '2' }));
  });

  it('returns 64-char hex string (SHA-256)', () => {
    expect(computeQuestionnaireHash({ key: 'value' })).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is stable across calls with the same data', () => {
    const q = { gender: 'male', lifestyle: 'active', maintenance: 'low' };
    expect(computeQuestionnaireHash(q)).toBe(computeQuestionnaireHash(q));
  });

  it('returns different hash for questionnaires with different keys', () => {
    expect(computeQuestionnaireHash({ a: 'val' })).not.toBe(computeQuestionnaireHash({ b: 'val' }));
  });
});
