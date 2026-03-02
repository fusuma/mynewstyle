import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Use vi.hoisted to avoid initialization issues with mocks
const { mockGetUser, mockSelect, mockEq, mockOrder, mockLimit } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockSelect: vi.fn(),
  mockEq: vi.fn(),
  mockOrder: vi.fn(),
  mockLimit: vi.fn(),
}));

// Mock @supabase/ssr
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn().mockImplementation(() => ({
    auth: {
      getUser: mockGetUser,
    },
    from: vi.fn().mockReturnThis(),
    select: mockSelect,
    eq: mockEq,
    order: mockOrder,
    limit: mockLimit,
  })),
}));

// Mock next/headers
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => [],
    set: vi.fn(),
  }),
}));

function createRequest(options: { headers?: Record<string, string> } = {}): NextRequest {
  return new NextRequest('http://localhost:3000/api/profile/consultations', {
    method: 'GET',
    headers: options.headers ?? {},
  });
}

describe('GET /api/profile/consultations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const { GET } = await import('@/app/api/profile/consultations/route');
    const request = createRequest();
    const response = await GET(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  it('returns 401 when getUser returns an error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Invalid token' } });

    const { GET } = await import('@/app/api/profile/consultations/route');
    const request = createRequest();
    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it('returns 200 with consultations array for authenticated user', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    const mockConsultations = [
      {
        id: 'consult-1',
        gender: 'male',
        face_analysis: { faceShape: 'oval', confidence: 0.9 },
        status: 'completed',
        payment_status: 'paid',
        created_at: '2026-01-01T10:00:00Z',
        completed_at: '2026-01-01T10:05:00Z',
        style_name: 'Undercut Moderno',
        match_score: 92,
      },
    ];

    // Chain mock for from().select().eq().eq().order().limit()
    const mockQueryChain = {
      data: mockConsultations,
      error: null,
    };
    mockLimit.mockResolvedValue(mockQueryChain);
    mockOrder.mockReturnValue({ limit: mockLimit });
    // eq() can be called multiple times — returns an object with eq and order
    mockEq.mockReturnValue({ eq: mockEq, order: mockOrder });
    mockSelect.mockReturnValue({ eq: mockEq });

    const { GET } = await import('@/app/api/profile/consultations/route');
    const request = createRequest();
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('consultations');
    expect(Array.isArray(data.consultations)).toBe(true);
  });

  it('returns empty array for authenticated user with no consultations', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    const mockQueryChain = {
      data: [],
      error: null,
    };
    mockLimit.mockResolvedValue(mockQueryChain);
    mockOrder.mockReturnValue({ limit: mockLimit });
    mockEq.mockReturnValue({ eq: mockEq, order: mockOrder });
    mockSelect.mockReturnValue({ eq: mockEq });

    const { GET } = await import('@/app/api/profile/consultations/route');
    const request = createRequest();
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.consultations).toEqual([]);
  });

  it('returns 500 when database query fails', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    const mockQueryChain = {
      data: null,
      error: { message: 'DB Error' },
    };
    mockLimit.mockResolvedValue(mockQueryChain);
    mockOrder.mockReturnValue({ limit: mockLimit });
    mockEq.mockReturnValue({ eq: mockEq, order: mockOrder });
    mockSelect.mockReturnValue({ eq: mockEq });

    const { GET } = await import('@/app/api/profile/consultations/route');
    const request = createRequest();
    const response = await GET(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  it('returns response with application/json content-type', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    const mockQueryChain = { data: [], error: null };
    mockLimit.mockResolvedValue(mockQueryChain);
    mockOrder.mockReturnValue({ limit: mockLimit });
    mockEq.mockReturnValue({ eq: mockEq, order: mockOrder });
    mockSelect.mockReturnValue({ eq: mockEq });

    const { GET } = await import('@/app/api/profile/consultations/route');
    const request = createRequest();
    const response = await GET(request);

    expect(response.headers.get('content-type')).toContain('application/json');
  });
});
