import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock localStorage globally
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock window.location.search / URL
const mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
}));

describe('Referral capture utilities', () => {
  beforeEach(() => {
    localStorageMock.clear();
    mockSearchParams.delete('ref');
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('captureReferralFromUrl', () => {
    it('stores referral code from URL ?ref param in localStorage', async () => {
      // Simulate URL with ref param
      Object.defineProperty(window, 'location', {
        value: { search: '?ref=ABC1234' },
        writable: true,
      });

      const { captureReferralFromUrl } = await import('@/lib/referral/capture');
      captureReferralFromUrl();

      const stored = localStorageMock.getItem('mynewstyle_ref');
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(parsed.code).toBe('ABC1234');
      expect(parsed.capturedAt).toBeDefined();
    });

    it('does NOT overwrite existing referral attribution (first-touch)', async () => {
      // Pre-set an existing referral code
      const existing = { code: 'ORIGINAL', capturedAt: new Date().toISOString() };
      localStorageMock.setItem('mynewstyle_ref', JSON.stringify(existing));

      Object.defineProperty(window, 'location', {
        value: { search: '?ref=NEWCODE1' },
        writable: true,
      });

      const { captureReferralFromUrl } = await import('@/lib/referral/capture');
      captureReferralFromUrl();

      const stored = localStorageMock.getItem('mynewstyle_ref');
      const parsed = JSON.parse(stored!);
      expect(parsed.code).toBe('ORIGINAL'); // First-touch preserved
    });

    it('handles missing ref param gracefully (no URL param)', async () => {
      Object.defineProperty(window, 'location', {
        value: { search: '' },
        writable: true,
      });

      const { captureReferralFromUrl } = await import('@/lib/referral/capture');
      expect(() => captureReferralFromUrl()).not.toThrow();
      expect(localStorageMock.getItem('mynewstyle_ref')).toBeNull();
    });

    it('handles empty ref param gracefully', async () => {
      Object.defineProperty(window, 'location', {
        value: { search: '?ref=' },
        writable: true,
      });

      const { captureReferralFromUrl } = await import('@/lib/referral/capture');
      captureReferralFromUrl();
      // Empty ref should not be stored
      expect(localStorageMock.getItem('mynewstyle_ref')).toBeNull();
    });

    it('stores capturedAt as a valid ISO date string', async () => {
      Object.defineProperty(window, 'location', {
        value: { search: '?ref=TESTCODE' },
        writable: true,
      });

      const { captureReferralFromUrl } = await import('@/lib/referral/capture');
      captureReferralFromUrl();

      const stored = JSON.parse(localStorageMock.getItem('mynewstyle_ref')!);
      expect(() => new Date(stored.capturedAt)).not.toThrow();
      expect(new Date(stored.capturedAt).getTime()).toBeGreaterThan(0);
    });
  });

  describe('getStoredReferralCode', () => {
    it('returns code when valid referral exists in localStorage', async () => {
      const data = { code: 'ABC1234', capturedAt: new Date().toISOString() };
      localStorageMock.setItem('mynewstyle_ref', JSON.stringify(data));

      const { getStoredReferralCode } = await import('@/lib/referral/capture');
      expect(getStoredReferralCode()).toBe('ABC1234');
    });

    it('returns null when localStorage has no referral', async () => {
      const { getStoredReferralCode } = await import('@/lib/referral/capture');
      expect(getStoredReferralCode()).toBeNull();
    });

    it('returns null and clears expired referral (older than 30 days)', async () => {
      const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
      const data = { code: 'EXPIRED1', capturedAt: thirtyOneDaysAgo };
      localStorageMock.setItem('mynewstyle_ref', JSON.stringify(data));

      const { getStoredReferralCode } = await import('@/lib/referral/capture');
      const result = getStoredReferralCode();

      expect(result).toBeNull();
      // Should clear the expired entry
      expect(localStorageMock.getItem('mynewstyle_ref')).toBeNull();
    });

    it('returns code for referral within 30 days', async () => {
      const twentyNineDaysAgo = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString();
      const data = { code: 'VALID123', capturedAt: twentyNineDaysAgo };
      localStorageMock.setItem('mynewstyle_ref', JSON.stringify(data));

      const { getStoredReferralCode } = await import('@/lib/referral/capture');
      expect(getStoredReferralCode()).toBe('VALID123');
    });

    it('returns null when localStorage data is malformed JSON', async () => {
      localStorageMock.setItem('mynewstyle_ref', 'not-valid-json');

      const { getStoredReferralCode } = await import('@/lib/referral/capture');
      expect(getStoredReferralCode()).toBeNull();
    });
  });

  describe('clearReferralCode', () => {
    it('removes referral code from localStorage', async () => {
      const data = { code: 'TODELETE', capturedAt: new Date().toISOString() };
      localStorageMock.setItem('mynewstyle_ref', JSON.stringify(data));

      const { clearReferralCode } = await import('@/lib/referral/capture');
      clearReferralCode();

      expect(localStorageMock.getItem('mynewstyle_ref')).toBeNull();
    });

    it('does not throw when no referral code exists', async () => {
      const { clearReferralCode } = await import('@/lib/referral/capture');
      expect(() => clearReferralCode()).not.toThrow();
    });
  });
});
