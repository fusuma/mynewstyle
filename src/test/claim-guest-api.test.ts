/**
 * API route tests for POST /api/auth/claim-guest
 * Story 8.5, Task 6.1
 *
 * Tests cover:
 * - Authenticated request with valid guest session ID migrates consultations (AC: #1, #3)
 * - Unauthenticated request returns 401 (AC: #2)
 * - Invalid UUID returns 400 (AC: #1)
 * - No matching consultations returns 200 with migrated: 0 (AC: #8)
 * - Already-claimed consultations are not re-migrated / idempotency (AC: #9, #10)
 * - Only unclaimed records (user_id IS NULL) are migrated (AC: #9)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockGetUser, mockRpc } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockRpc: vi.fn(),
}));

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: mockGetUser,
    },
    rpc: mockRpc,
  }),
  createServiceRoleClient: vi.fn().mockReturnValue({
    storage: {
      from: vi.fn().mockReturnValue({
        copy: vi.fn().mockResolvedValue({ error: null }),
        remove: vi.fn().mockResolvedValue({ error: null }),
      }),
    },
    from: vi.fn().mockReturnValue({
      // Matches: serviceClient.from('consultations').update({ photo_url }).eq('id', ...)
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
      // Matches: serviceClient.from('consultations').select('photo_url').eq('id', ...).single()
      //          serviceClient.from('recommendations').select('id, preview_url').eq(...).not(...)
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          not: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
        not: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    }),
  }),
}));

// ─── Import route handler after mocks ────────────────────────────────────────

import { POST } from '@/app/api/auth/claim-guest/route';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VALID_GUEST_SESSION_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
const AUTHENTICATED_USER_ID = 'a1b2c3d4-0000-0000-0000-000000000001';

function makeRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost:3000/api/auth/claim-guest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/auth/claim-guest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── AC #2: Unauthenticated request returns 401 ────────────────────────────

  it('returns 401 when no authenticated user session exists', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });

    const req = makeRequest({ guestSessionId: VALID_GUEST_SESSION_ID });
    const res = await POST(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toMatchObject({ error: 'Authentication required' });
  });

  it('returns 401 when getUser returns an error', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'JWT expired' },
    });

    const req = makeRequest({ guestSessionId: VALID_GUEST_SESSION_ID });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  // ── AC #1: Input validation -- invalid UUID returns 400 ───────────────────

  it('returns 400 when guestSessionId is not a valid UUID', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: AUTHENTICATED_USER_ID } },
      error: null,
    });

    const req = makeRequest({ guestSessionId: 'not-a-uuid' });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  it('returns 400 when guestSessionId is missing', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: AUTHENTICATED_USER_ID } },
      error: null,
    });

    const req = makeRequest({});
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it('returns 400 when guestSessionId is an empty string', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: AUTHENTICATED_USER_ID } },
      error: null,
    });

    const req = makeRequest({ guestSessionId: '' });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  // ── AC #8: No matching consultations returns 200 with migrated: 0 ─────────

  it('returns 200 with migrated: 0 when no matching consultations exist', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: AUTHENTICATED_USER_ID } },
      error: null,
    });
    // RPC returns empty result (no rows migrated)
    mockRpc.mockResolvedValueOnce({
      data: { migrated_count: 0, consultation_ids: [] },
      error: null,
    });

    const req = makeRequest({ guestSessionId: VALID_GUEST_SESSION_ID });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ migrated: 0 });
  });

  // ── AC #3: Successful migration updates consultations ─────────────────────

  it('migrates consultations and returns count and IDs on success', async () => {
    const consultationId1 = 'c0000000-0000-0000-0000-000000000001';
    const consultationId2 = 'c0000000-0000-0000-0000-000000000002';

    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: AUTHENTICATED_USER_ID } },
      error: null,
    });
    mockRpc.mockResolvedValueOnce({
      data: {
        migrated_count: 2,
        consultation_ids: [consultationId1, consultationId2],
      },
      error: null,
    });

    const req = makeRequest({ guestSessionId: VALID_GUEST_SESSION_ID });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      migrated: 2,
      consultationIds: expect.arrayContaining([consultationId1, consultationId2]),
    });
  });

  it('calls RPC with correct guest_session_id and user_id parameters', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: AUTHENTICATED_USER_ID } },
      error: null,
    });
    mockRpc.mockResolvedValueOnce({
      data: { migrated_count: 1, consultation_ids: ['c0000000-0000-0000-0000-000000000001'] },
      error: null,
    });

    const req = makeRequest({ guestSessionId: VALID_GUEST_SESSION_ID });
    await POST(req);

    expect(mockRpc).toHaveBeenCalledWith('claim_guest_consultations', {
      p_guest_session_id: VALID_GUEST_SESSION_ID,
      p_user_id: AUTHENTICATED_USER_ID,
    });
  });

  // ── AC #9, #10: Idempotency -- already claimed records not re-migrated ─────

  it('is idempotent: calling with already-claimed guest session returns migrated: 0', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: AUTHENTICATED_USER_ID } },
      error: null,
    });
    // Second call: all records already claimed (user_id IS NOT NULL), RPC returns 0
    mockRpc.mockResolvedValueOnce({
      data: { migrated_count: 0, consultation_ids: [] },
      error: null,
    });

    const req = makeRequest({ guestSessionId: VALID_GUEST_SESSION_ID });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ migrated: 0 });
  });

  // ── RPC error handling ─────────────────────────────────────────────────────

  it('returns 500 when RPC call fails', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: AUTHENTICATED_USER_ID } },
      error: null,
    });
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'Database error' },
    });

    const req = makeRequest({ guestSessionId: VALID_GUEST_SESSION_ID });
    const res = await POST(req);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });
});
