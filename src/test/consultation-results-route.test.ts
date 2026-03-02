import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Use vi.hoisted to ensure mock functions are available before vi.mock calls
const { mockGetUser, mockSelect, mockEq, mockSingle, mockOrder } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockSelect: vi.fn(),
  mockEq: vi.fn(),
  mockSingle: vi.fn(),
  mockOrder: vi.fn(),
}));

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn().mockImplementation(() => ({
    auth: {
      getUser: mockGetUser,
    },
    from: vi.fn().mockReturnThis(),
    select: mockSelect,
    eq: mockEq,
    single: mockSingle,
    order: mockOrder,
  })),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => [],
    set: vi.fn(),
  }),
}));

// RFC 4122-compliant UUIDs for testing (version 4, variant 1)
const VALID_UUID_1 = 'a1b2c3d4-e5f6-4789-a1b2-c3d4e5f6a1b2';
const VALID_UUID_2 = 'b2c3d4e5-f6a1-4890-b2c3-d4e5f6a1b2c3';
const VALID_UUID_3 = 'c3d4e5f6-a1b2-4901-a2c3-d4e5f6a1b2c3';
const VALID_UUID_4 = 'd4e5f6a1-b2c3-4012-b3d4-e5f6a1b2c3d4';

function createRequest(id: string): NextRequest {
  return new NextRequest(`http://localhost:3000/api/consultation/${id}/results`, {
    method: 'GET',
  });
}

function createParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function setupConsultationChain(consultationResult: { data: unknown; error: unknown }) {
  mockOrder.mockResolvedValue({ data: [], error: null });
  mockSingle.mockResolvedValue(consultationResult);
  mockEq.mockReturnValue({ eq: mockEq, single: mockSingle, order: mockOrder });
  mockSelect.mockReturnValue({ eq: mockEq });
}

describe('GET /api/consultation/[id]/results', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockOrder.mockResolvedValue({ data: [], error: null });
    mockSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'Not found' } });
    mockEq.mockReturnValue({ eq: mockEq, single: mockSingle, order: mockOrder });
    mockSelect.mockReturnValue({ eq: mockEq });
  });

  it('returns 401 when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const { GET } = await import('@/app/api/consultation/[id]/results/route');
    const response = await GET(createRequest(VALID_UUID_1), createParams(VALID_UUID_1));

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  it('returns 400 when consultation ID is not a valid UUID', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    const { GET } = await import('@/app/api/consultation/[id]/results/route');
    const response = await GET(createRequest('not-a-uuid'), createParams('not-a-uuid'));

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  it('returns 404 when consultation is not found (PGRST116)', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    setupConsultationChain({ data: null, error: { code: 'PGRST116', message: 'Not found' } });

    const { GET } = await import('@/app/api/consultation/[id]/results/route');
    const response = await GET(createRequest(VALID_UUID_2), createParams(VALID_UUID_2));

    expect(response.status).toBe(404);
  });

  it('returns 200 with full consultation data for authenticated user', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    const mockConsultationData = {
      id: VALID_UUID_3,
      gender: 'male',
      face_analysis: { faceShape: 'oval', confidence: 0.9, proportions: {}, hairAssessment: {} },
      status: 'completed',
      payment_status: 'paid',
      created_at: '2026-01-01T10:00:00Z',
      completed_at: '2026-01-01T10:05:00Z',
    };

    setupConsultationChain({ data: mockConsultationData, error: null });

    const { GET } = await import('@/app/api/consultation/[id]/results/route');
    const response = await GET(createRequest(VALID_UUID_3), createParams(VALID_UUID_3));

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('consultation');
    expect(data.consultation).toHaveProperty('id', VALID_UUID_3);
    expect(data.consultation).toHaveProperty('gender', 'male');
    expect(data.consultation).toHaveProperty('paymentStatus', 'paid');
    expect(data.consultation).toHaveProperty('recommendations');
    expect(Array.isArray(data.consultation.recommendations)).toBe(true);
  });

  it('returns 500 when consultation database query fails with unexpected error', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    setupConsultationChain({ data: null, error: { code: '42P01', message: 'DB Error' } });

    const { GET } = await import('@/app/api/consultation/[id]/results/route');
    const response = await GET(createRequest(VALID_UUID_4), createParams(VALID_UUID_4));

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  it('returns 401 when getUser returns an auth error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'JWT expired' } });

    const { GET } = await import('@/app/api/consultation/[id]/results/route');
    const response = await GET(createRequest(VALID_UUID_1), createParams(VALID_UUID_1));

    expect(response.status).toBe(401);
  });
});
