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
  return new NextRequest('http://localhost:3000/api/profile/favorites', {
    method: 'GET',
    headers: options.headers ?? {},
  });
}

describe('GET /api/profile/favorites', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const { GET } = await import('@/app/api/profile/favorites/route');
    const request = createRequest();
    const response = await GET(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  it('returns 401 when getUser returns an auth error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'JWT expired' } });

    const { GET } = await import('@/app/api/profile/favorites/route');
    const request = createRequest();
    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it('returns 200 with favorites array for authenticated user', async () => {
    const mockUser = { id: 'user-456', email: 'user@example.com' };
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    const mockFavorites = [
      {
        id: 'fav-1',
        created_at: '2026-02-01T10:00:00Z',
        recommendation_id: 'rec-1',
        style_name: 'Pompadour Clássico',
        match_score: 88,
        consultation_id: 'consult-1',
        face_analysis: { faceShape: 'square', confidence: 0.85 },
        gender: 'male',
        consultation_date: '2026-01-15T10:00:00Z',
      },
    ];

    const mockQueryChain = { data: mockFavorites, error: null };
    mockLimit.mockResolvedValue(mockQueryChain);
    mockOrder.mockReturnValue({ limit: mockLimit });
    mockEq.mockReturnValue({ eq: mockEq, order: mockOrder });
    mockSelect.mockReturnValue({ eq: mockEq });

    const { GET } = await import('@/app/api/profile/favorites/route');
    const request = createRequest();
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('favorites');
    expect(Array.isArray(data.favorites)).toBe(true);
  });

  it('returns empty array for authenticated user with no favorites', async () => {
    const mockUser = { id: 'user-456', email: 'user@example.com' };
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    const mockQueryChain = { data: [], error: null };
    mockLimit.mockResolvedValue(mockQueryChain);
    mockOrder.mockReturnValue({ limit: mockLimit });
    mockEq.mockReturnValue({ eq: mockEq, order: mockOrder });
    mockSelect.mockReturnValue({ eq: mockEq });

    const { GET } = await import('@/app/api/profile/favorites/route');
    const request = createRequest();
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.favorites).toEqual([]);
  });

  it('returns 500 when database query fails', async () => {
    const mockUser = { id: 'user-456', email: 'user@example.com' };
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    const mockQueryChain = { data: null, error: { message: 'Query error' } };
    mockLimit.mockResolvedValue(mockQueryChain);
    mockOrder.mockReturnValue({ limit: mockLimit });
    mockEq.mockReturnValue({ eq: mockEq, order: mockOrder });
    mockSelect.mockReturnValue({ eq: mockEq });

    const { GET } = await import('@/app/api/profile/favorites/route');
    const request = createRequest();
    const response = await GET(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  it('returns response with application/json content-type', async () => {
    const mockUser = { id: 'user-456', email: 'user@example.com' };
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    const mockQueryChain = { data: [], error: null };
    mockLimit.mockResolvedValue(mockQueryChain);
    mockOrder.mockReturnValue({ limit: mockLimit });
    mockEq.mockReturnValue({ eq: mockEq, order: mockOrder });
    mockSelect.mockReturnValue({ eq: mockEq });

    const { GET } = await import('@/app/api/profile/favorites/route');
    const request = createRequest();
    const response = await GET(request);

    expect(response.headers.get('content-type')).toContain('application/json');
  });
});

describe('POST /api/profile/favorites', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const { POST } = await import('@/app/api/profile/favorites/route');
    const request = new NextRequest('http://localhost:3000/api/profile/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recommendationId: 'rec-1' }),
    });
    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it('returns 400 when recommendationId is missing', async () => {
    const mockUser = { id: 'user-456', email: 'user@example.com' };
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    const { POST } = await import('@/app/api/profile/favorites/route');
    const request = new NextRequest('http://localhost:3000/api/profile/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
  });
});

describe('DELETE /api/profile/favorites', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const { DELETE } = await import('@/app/api/profile/favorites/route');
    const request = new NextRequest('http://localhost:3000/api/profile/favorites?recommendationId=rec-1', {
      method: 'DELETE',
    });
    const response = await DELETE(request);

    expect(response.status).toBe(401);
  });

  it('returns 400 when recommendationId query param is missing', async () => {
    const mockUser = { id: 'user-456', email: 'user@example.com' };
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    const { DELETE } = await import('@/app/api/profile/favorites/route');
    const request = new NextRequest('http://localhost:3000/api/profile/favorites', {
      method: 'DELETE',
    });
    const response = await DELETE(request);

    expect(response.status).toBe(400);
  });
});
