/**
 * Unit tests for POST /api/consultation/[id]/rate
 * Story 10.5: Post-Consultation Rating — AC #4
 *
 * Target: 8+ tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const VALID_ID = '550e8400-e29b-41d4-a716-446655440000';
const NONEXISTENT_ID = '550e8400-e29b-41d4-a716-446655440001';

// Use vi.hoisted to ensure mocks are set up before imports
const {
  mockGetUser,
  mockFrom,
  mockSelect,
  mockEq,
  mockSingle,
  mockUpdate,
  mockUpdateEq,
} = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  mockSelect: vi.fn(),
  mockEq: vi.fn(),
  mockSingle: vi.fn(),
  mockUpdate: vi.fn(),
  mockUpdateEq: vi.fn(),
}));

// Mock @supabase/ssr (the underlying module used by auth-server.ts)
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn().mockImplementation(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

function makeRequest(id: string, body: unknown, opts: { guestSessionId?: string } = {}) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (opts.guestSessionId) headers['x-guest-session-id'] = opts.guestSessionId;
  return new NextRequest(`http://localhost/api/consultation/${id}/rate`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

const MOCK_USER = { id: 'user-abc-123' };
const MOCK_CONSULTATION = {
  id: VALID_ID,
  payment_status: 'paid',
  user_id: 'user-abc-123',
  guest_session_id: null,
};

describe('POST /api/consultation/[id]/rate', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: authenticated user
    mockGetUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null });

    // Default: consultation found and paid
    // Note: eq() can be chained, so it must return an object with both .eq and .single
    mockSingle.mockResolvedValue({ data: MOCK_CONSULTATION, error: null });
    mockEq.mockReturnValue({ eq: mockEq, single: mockSingle });
    mockSelect.mockReturnValue({ eq: mockEq });

    // Default: successful update
    mockUpdateEq.mockResolvedValue({ error: null, data: null });
    mockUpdate.mockReturnValue({ eq: mockUpdateEq });

    mockFrom.mockReturnValue({
      select: mockSelect,
      update: mockUpdate,
    });
  });

  it('returns 401 for unauthenticated request (no user, no guest session)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'not authenticated' } });

    const { POST } = await import('@/app/api/consultation/[id]/rate/route');
    const res = await POST(makeRequest(VALID_ID, { rating: 4 }), {
      params: Promise.resolve({ id: VALID_ID }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid rating value 0 (below min)', async () => {
    const { POST } = await import('@/app/api/consultation/[id]/rate/route');
    const res = await POST(makeRequest(VALID_ID, { rating: 0 }), {
      params: Promise.resolve({ id: VALID_ID }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid rating value 6 (above max)', async () => {
    const { POST } = await import('@/app/api/consultation/[id]/rate/route');
    const res = await POST(makeRequest(VALID_ID, { rating: 6 }), {
      params: Promise.resolve({ id: VALID_ID }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 for float rating value', async () => {
    const { POST } = await import('@/app/api/consultation/[id]/rate/route');
    const res = await POST(makeRequest(VALID_ID, { rating: 3.5 }), {
      params: Promise.resolve({ id: VALID_ID }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 404 for non-existent consultation', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'not found' } });
    mockEq.mockReturnValue({ eq: mockEq, single: mockSingle });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect, update: mockUpdate });

    const { POST } = await import('@/app/api/consultation/[id]/rate/route');
    const res = await POST(makeRequest(NONEXISTENT_ID, { rating: 4 }), {
      params: Promise.resolve({ id: NONEXISTENT_ID }),
    });
    expect(res.status).toBe(404);
  });

  it('returns 404 for unpaid consultation', async () => {
    mockSingle.mockResolvedValue({
      data: { ...MOCK_CONSULTATION, payment_status: 'none' },
      error: null,
    });
    mockEq.mockReturnValue({ eq: mockEq, single: mockSingle });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect, update: mockUpdate });

    const { POST } = await import('@/app/api/consultation/[id]/rate/route');
    const res = await POST(makeRequest(VALID_ID, { rating: 4 }), {
      params: Promise.resolve({ id: VALID_ID }),
    });
    expect(res.status).toBe(404);
  });

  it('successfully rates a consultation', async () => {
    const { POST } = await import('@/app/api/consultation/[id]/rate/route');
    const res = await POST(makeRequest(VALID_ID, { rating: 4 }), {
      params: Promise.resolve({ id: VALID_ID }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.rating).toBe(4);
  });

  it('successfully updates (overwrites) an existing rating', async () => {
    const { POST } = await import('@/app/api/consultation/[id]/rate/route');
    const res = await POST(makeRequest(VALID_ID, { rating: 5 }), {
      params: Promise.resolve({ id: VALID_ID }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.rating).toBe(5);
  });

  it('validates detail sub-ratings must be 1-5 (rejects 6)', async () => {
    const { POST } = await import('@/app/api/consultation/[id]/rate/route');
    const res = await POST(makeRequest(VALID_ID, { rating: 4, details: { faceShapeAccuracy: 6 } }), {
      params: Promise.resolve({ id: VALID_ID }),
    });
    expect(res.status).toBe(400);
  });

  it('successfully rates with valid decomposed details', async () => {
    const { POST } = await import('@/app/api/consultation/[id]/rate/route');
    const res = await POST(makeRequest(VALID_ID, {
      rating: 5,
      details: { faceShapeAccuracy: 4, recommendationQuality: 5, previewRealism: 3 },
    }), {
      params: Promise.resolve({ id: VALID_ID }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.rating).toBe(5);
  });

  it('returns 400 for invalid consultation UUID format', async () => {
    const { POST } = await import('@/app/api/consultation/[id]/rate/route');
    const res = await POST(makeRequest('not-a-uuid', { rating: 4 }), {
      params: Promise.resolve({ id: 'not-a-uuid' }),
    });
    expect(res.status).toBe(400);
  });
});
