/**
 * Unit tests for claimGuestSession() client utility
 * Story 8.5, Task 6.2
 *
 * Tests cover:
 * - Calls API and clears localStorage on success (AC: #6, #7)
 * - No-op when no guest session ID exists (AC: #8)
 * - Does not throw on API failure (graceful degradation) (AC: #7)
 * - Resets Zustand consultation store cache after successful migration (Task 4.5)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mock Zustand consultation store (Task 4.5) ───────────────────────────────

const mockReset = vi.fn();

vi.mock('@/stores/consultation', () => ({
  useConsultationStore: {
    getState: vi.fn(() => ({ reset: mockReset })),
  },
}));

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'mynewstyle-guest-session-id';
const VALID_GUEST_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setGuestId(id: string) {
  localStorage.setItem(STORAGE_KEY, id);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('claimGuestSession() client utility', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  // ── No-op when no guest session ID ────────────────────────────────────────

  it('returns { migrated: 0 } immediately when no guest session ID in localStorage', async () => {
    // No guest session set -- localStorage is empty
    const { claimGuestSession } = await import('@/lib/auth/claim-guest');
    const result = await claimGuestSession();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result).toEqual({ migrated: 0 });
  });

  // ── Successful claim ──────────────────────────────────────────────────────

  it('calls POST /api/auth/claim-guest with the guest session ID on success', async () => {
    setGuestId(VALID_GUEST_ID);
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ migrated: 1, consultationIds: ['abc'] }), { status: 200 })
    );

    const { claimGuestSession } = await import('@/lib/auth/claim-guest');
    const result = await claimGuestSession();

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/auth/claim-guest',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ guestSessionId: VALID_GUEST_ID }),
      })
    );
    expect(result).toEqual({ migrated: 1 });
  });

  it('clears localStorage after successful claim', async () => {
    setGuestId(VALID_GUEST_ID);
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ migrated: 1, consultationIds: ['abc'] }), { status: 200 })
    );

    const { claimGuestSession } = await import('@/lib/auth/claim-guest');
    await claimGuestSession();

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('resets Zustand consultation store after successful migration (Task 4.5)', async () => {
    setGuestId(VALID_GUEST_ID);
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ migrated: 1, consultationIds: ['abc'] }), { status: 200 })
    );

    const { claimGuestSession } = await import('@/lib/auth/claim-guest');
    await claimGuestSession();

    // Store should be reset so profile page fetches fresh server data
    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it('does NOT reset Zustand store when migrated is 0 (no records to migrate)', async () => {
    setGuestId(VALID_GUEST_ID);
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ migrated: 0, message: 'No guest consultations found' }), { status: 200 })
    );

    const { claimGuestSession } = await import('@/lib/auth/claim-guest');
    await claimGuestSession();

    // No migration occurred -- no need to invalidate cache
    expect(mockReset).not.toHaveBeenCalled();
  });

  it('returns migrated count from API response', async () => {
    setGuestId(VALID_GUEST_ID);
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ migrated: 3, consultationIds: ['a', 'b', 'c'] }), { status: 200 })
    );

    const { claimGuestSession } = await import('@/lib/auth/claim-guest');
    const result = await claimGuestSession();

    expect(result).toEqual({ migrated: 3 });
  });

  // ── AC #8: No matching consultations (migrated: 0) ────────────────────────

  it('clears localStorage even when API returns migrated: 0 (no-op migration)', async () => {
    setGuestId(VALID_GUEST_ID);
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ migrated: 0, message: 'No guest consultations found' }), { status: 200 })
    );

    const { claimGuestSession } = await import('@/lib/auth/claim-guest');
    const result = await claimGuestSession();

    // Should still clear localStorage even with migrated: 0
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(result).toEqual({ migrated: 0 });
  });

  // ── Graceful degradation on API failure ───────────────────────────────────

  it('does not throw when API returns a non-OK response', async () => {
    setGuestId(VALID_GUEST_ID);
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    );

    const { claimGuestSession } = await import('@/lib/auth/claim-guest');

    await expect(claimGuestSession()).resolves.not.toThrow();
  });

  it('does not throw when fetch throws a network error', async () => {
    setGuestId(VALID_GUEST_ID);
    fetchSpy.mockRejectedValueOnce(new Error('Network error'));

    const { claimGuestSession } = await import('@/lib/auth/claim-guest');

    await expect(claimGuestSession()).resolves.not.toThrow();
  });

  it('does NOT clear localStorage when API returns non-OK response', async () => {
    setGuestId(VALID_GUEST_ID);
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 })
    );

    const { claimGuestSession } = await import('@/lib/auth/claim-guest');
    await claimGuestSession();

    // localStorage should remain intact on failure (so user can retry later)
    expect(localStorage.getItem(STORAGE_KEY)).toBe(VALID_GUEST_ID);
  });

  it('does NOT clear localStorage when network fetch fails', async () => {
    setGuestId(VALID_GUEST_ID);
    fetchSpy.mockRejectedValueOnce(new Error('Network error'));

    const { claimGuestSession } = await import('@/lib/auth/claim-guest');
    await claimGuestSession();

    // localStorage should remain intact on failure
    expect(localStorage.getItem(STORAGE_KEY)).toBe(VALID_GUEST_ID);
  });

  it('returns { migrated: 0 } when API call fails (graceful degradation)', async () => {
    setGuestId(VALID_GUEST_ID);
    fetchSpy.mockRejectedValueOnce(new Error('Network error'));

    const { claimGuestSession } = await import('@/lib/auth/claim-guest');
    const result = await claimGuestSession();

    expect(result).toEqual({ migrated: 0 });
  });
});
