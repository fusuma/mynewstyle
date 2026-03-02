import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Use vi.hoisted to avoid initialization issues with mocks
const { mockGetUser, mockFrom, mockSelect, mockEq, mockSingle, mockInsert } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  mockSelect: vi.fn(),
  mockEq: vi.fn(),
  mockSingle: vi.fn(),
  mockInsert: vi.fn(),
}));

// Mock @supabase/ssr (for auth-server.ts createAuthenticatedSupabaseClient)
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn().mockImplementation(() => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  })),
}));

// Mock service role client for INSERT operations
const mockServiceFrom = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: vi.fn().mockReturnValue({
    from: mockServiceFrom,
  }),
}));

function createRequest(): NextRequest {
  return new NextRequest('http://localhost:3000/api/referral/code', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
}

const MOCK_USER = { id: 'user-550e8400-e29b-41d4-a716-446655440000', email: 'test@example.com' };

describe('GET /api/referral/code', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: chain from().select().eq().single()
    mockSingle.mockResolvedValue({ data: null, error: null });
    mockEq.mockReturnValue({ single: mockSingle });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });
  });

  it('returns 401 when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const { GET } = await import('@/app/api/referral/code/route');
    const response = await GET(createRequest());

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  it('returns 401 when getUser returns an auth error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Invalid token' } });

    const { GET } = await import('@/app/api/referral/code/route');
    const response = await GET(createRequest());

    expect(response.status).toBe(401);
  });

  it('returns existing referral code for user who already has one', async () => {
    mockGetUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null });
    mockSingle.mockResolvedValue({
      data: { referral_code: 'ABCDEF1' },
      error: null,
    });

    const { GET } = await import('@/app/api/referral/code/route');
    const response = await GET(createRequest());

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('referralCode', 'ABCDEF1');
    expect(data).toHaveProperty('referralLink');
    expect(data.referralLink).toContain('ABCDEF1');
  });

  it('creates new referral code for user without one', async () => {
    mockGetUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null });
    // No existing code
    mockSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116' } }); // not found

    // Mock INSERT via service role client
    const mockInsertChain = { data: [{ referral_code: 'GENERATED' }], error: null };
    const mockInsertMethod = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue(mockInsertChain),
      }),
    });
    mockServiceFrom.mockReturnValue({ insert: mockInsertMethod });

    const { GET } = await import('@/app/api/referral/code/route');
    const response = await GET(createRequest());

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('referralCode');
    expect(typeof data.referralCode).toBe('string');
    expect(data.referralCode.length).toBeGreaterThanOrEqual(6);
  });

  it('returns correct link format with ?ref=CODE', async () => {
    mockGetUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null });
    mockSingle.mockResolvedValue({
      data: { referral_code: 'XYZ1234' },
      error: null,
    });

    const { GET } = await import('@/app/api/referral/code/route');
    const response = await GET(createRequest());
    const data = await response.json();

    expect(data.referralLink).toMatch(/\?ref=XYZ1234/);
  });

  it('returns response with application/json content-type', async () => {
    mockGetUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null });
    mockSingle.mockResolvedValue({
      data: { referral_code: 'CODE123' },
      error: null,
    });

    const { GET } = await import('@/app/api/referral/code/route');
    const response = await GET(createRequest());

    expect(response.headers.get('content-type')).toContain('application/json');
  });
});
