/**
 * Unit tests for guest-session.ts utility module.
 * Story 8.4, Task 1 (AC: #1, #6, #7)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const STORAGE_KEY = 'mynewstyle-guest-session-id';

describe('guest-session utility', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  // ----------------------------------------------------------------
  // getOrCreateGuestSessionId
  // ----------------------------------------------------------------
  describe('getOrCreateGuestSessionId', () => {
    it('generates a UUID and stores it when localStorage is empty', async () => {
      const { getOrCreateGuestSessionId } = await import('@/lib/guest-session');
      const id = getOrCreateGuestSessionId();

      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(id).toMatch(uuidRegex);
      expect(localStorage.getItem(STORAGE_KEY)).toBe(id);
    });

    it('returns the existing value when localStorage already has a valid UUID', async () => {
      const existingId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      localStorage.setItem(STORAGE_KEY, existingId);

      const { getOrCreateGuestSessionId } = await import('@/lib/guest-session');
      const id = getOrCreateGuestSessionId();

      expect(id).toBe(existingId);
    });

    it('returns the same value on repeated calls (idempotent)', async () => {
      const { getOrCreateGuestSessionId } = await import('@/lib/guest-session');
      const id1 = getOrCreateGuestSessionId();
      const id2 = getOrCreateGuestSessionId();

      expect(id1).toBe(id2);
    });

    it('regenerates when stored value is not a valid UUID', async () => {
      localStorage.setItem(STORAGE_KEY, 'not-a-uuid');

      const { getOrCreateGuestSessionId } = await import('@/lib/guest-session');
      const id = getOrCreateGuestSessionId();

      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(id).toMatch(uuidRegex);
      // must NOT return the invalid value
      expect(id).not.toBe('not-a-uuid');
      // must persist the new valid value
      expect(localStorage.getItem(STORAGE_KEY)).toBe(id);
    });

    it('regenerates when stored value is an empty string', async () => {
      localStorage.setItem(STORAGE_KEY, '');

      const { getOrCreateGuestSessionId } = await import('@/lib/guest-session');
      const id = getOrCreateGuestSessionId();

      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(id).toMatch(uuidRegex);
    });
  });

  // ----------------------------------------------------------------
  // getGuestSessionId
  // ----------------------------------------------------------------
  describe('getGuestSessionId', () => {
    it('returns null when localStorage has no value', async () => {
      const { getGuestSessionId } = await import('@/lib/guest-session');
      expect(getGuestSessionId()).toBeNull();
    });

    it('returns the stored UUID when present', async () => {
      const existingId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      localStorage.setItem(STORAGE_KEY, existingId);

      const { getGuestSessionId } = await import('@/lib/guest-session');
      expect(getGuestSessionId()).toBe(existingId);
    });

    it('returns null for invalid stored values (does not regenerate)', async () => {
      localStorage.setItem(STORAGE_KEY, 'bad-value');

      const { getGuestSessionId } = await import('@/lib/guest-session');
      expect(getGuestSessionId()).toBeNull();
      // Should NOT write a new value (read-only operation)
      expect(localStorage.getItem(STORAGE_KEY)).toBe('bad-value');
    });

    it('does not create a new session ID (read-only)', async () => {
      const { getGuestSessionId } = await import('@/lib/guest-session');
      getGuestSessionId();
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });
  });

  // ----------------------------------------------------------------
  // clearGuestSessionId
  // ----------------------------------------------------------------
  describe('clearGuestSessionId', () => {
    it('removes the stored guest session ID from localStorage', async () => {
      const existingId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      localStorage.setItem(STORAGE_KEY, existingId);

      const { clearGuestSessionId } = await import('@/lib/guest-session');
      clearGuestSessionId();

      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('does not throw when localStorage has no guest session ID', async () => {
      const { clearGuestSessionId } = await import('@/lib/guest-session');
      expect(() => clearGuestSessionId()).not.toThrow();
    });
  });

  // ----------------------------------------------------------------
  // isValidGuestSessionId (internal helper exposed for testing)
  // ----------------------------------------------------------------
  describe('UUID validation', () => {
    it('getOrCreateGuestSessionId always returns a valid UUID', async () => {
      const { getOrCreateGuestSessionId } = await import('@/lib/guest-session');
      for (let i = 0; i < 5; i++) {
        localStorage.clear();
        const id = getOrCreateGuestSessionId();
        const uuidRegex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        expect(id).toMatch(uuidRegex);
      }
    });
  });
});
