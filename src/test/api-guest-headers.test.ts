/**
 * Unit tests for src/lib/api/headers.ts
 * Story 8.4, Task 2 (AC: #2)
 *
 * Verifies that the x-guest-session-id header is attached to fetch calls
 * when user is NOT authenticated, and omitted when authenticated.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Stable UUID for tests
const GUEST_UUID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

describe('buildGuestHeaders', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('returns x-guest-session-id header when no auth session exists', async () => {
    localStorage.setItem('mynewstyle-guest-session-id', GUEST_UUID);

    const { buildGuestHeaders } = await import('@/lib/api/headers');
    const headers = buildGuestHeaders({ isAuthenticated: false });

    expect(headers['x-guest-session-id']).toBe(GUEST_UUID);
  });

  it('does NOT include x-guest-session-id when user is authenticated', async () => {
    localStorage.setItem('mynewstyle-guest-session-id', GUEST_UUID);

    const { buildGuestHeaders } = await import('@/lib/api/headers');
    const headers = buildGuestHeaders({ isAuthenticated: true });

    expect(headers['x-guest-session-id']).toBeUndefined();
  });

  it('returns empty object when unauthenticated but no guest session in localStorage', async () => {
    const { buildGuestHeaders } = await import('@/lib/api/headers');
    const headers = buildGuestHeaders({ isAuthenticated: false });

    // No guest session stored → no header
    expect(headers['x-guest-session-id']).toBeUndefined();
  });

  it('does not create a new guest session when building headers', async () => {
    const { buildGuestHeaders } = await import('@/lib/api/headers');
    buildGuestHeaders({ isAuthenticated: false });

    // Should NOT have created a new key in localStorage
    expect(localStorage.getItem('mynewstyle-guest-session-id')).toBeNull();
  });
});

describe('getGuestRequestHeaders', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('returns Content-Type and x-guest-session-id when unauthenticated and session exists', async () => {
    localStorage.setItem('mynewstyle-guest-session-id', GUEST_UUID);

    const { getGuestRequestHeaders } = await import('@/lib/api/headers');
    const headers = getGuestRequestHeaders({ isAuthenticated: false });

    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['x-guest-session-id']).toBe(GUEST_UUID);
  });

  it('returns only Content-Type when authenticated (no guest header)', async () => {
    localStorage.setItem('mynewstyle-guest-session-id', GUEST_UUID);

    const { getGuestRequestHeaders } = await import('@/lib/api/headers');
    const headers = getGuestRequestHeaders({ isAuthenticated: true });

    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['x-guest-session-id']).toBeUndefined();
  });
});
