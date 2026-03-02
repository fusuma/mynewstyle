/**
 * Unit tests for GET /api/consultation/[id]/results — rating fields
 * Story 10.5: Post-Consultation Rating — AC #7
 *
 * Target: 2+ tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const VALID_ID = '550e8400-e29b-41d4-a716-446655440000';

const { mockGetUser, mockFrom, mockSelect, mockEq, mockSingle } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  mockSelect: vi.fn(),
  mockEq: vi.fn(),
  mockSingle: vi.fn(),
}));

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn().mockImplementation(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

const MOCK_USER = { id: 'user-abc-123' };

const BASE_CONSULTATION = {
  id: VALID_ID,
  gender: 'male',
  face_analysis: null,
  status: 'completed',
  payment_status: 'paid',
  created_at: '2026-03-01T10:00:00Z',
  completed_at: null,
  rating: null,
  rating_details: null,
};

function makeRequest(id: string): NextRequest {
  return new NextRequest(`http://localhost/api/consultation/${id}/results`, {
    method: 'GET',
  });
}

describe('GET /api/consultation/[id]/results — rating fields', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null });

    // Setup the chained query mock
    const mockRecommendations = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    });
    const mockStylesQuery = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    });

    mockSingle.mockResolvedValue({ data: BASE_CONSULTATION, error: null });
    mockEq.mockReturnValue({ eq: mockEq, single: mockSingle });
    mockSelect.mockReturnValue({ eq: mockEq });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'consultations') {
        return { select: mockSelect };
      }
      if (table === 'recommendations') {
        return { select: mockRecommendations };
      }
      return { select: mockStylesQuery };
    });
  });

  it('returns null rating and ratingDetails when consultation has no rating', async () => {
    // BASE_CONSULTATION already has rating: null, rating_details: null
    const { GET } = await import('@/app/api/consultation/[id]/results/route');
    const res = await GET(makeRequest(VALID_ID), { params: Promise.resolve({ id: VALID_ID }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.consultation).toBeDefined();
    expect(body.consultation.rating).toBeNull();
    expect(body.consultation.ratingDetails).toBeNull();
  });

  it('returns rating and ratingDetails when consultation has been rated', async () => {
    const ratedConsultation = {
      ...BASE_CONSULTATION,
      rating: 4,
      rating_details: {
        faceShapeAccuracy: 5,
        recommendationQuality: 4,
        ratedAt: '2026-03-02T10:00:00Z',
      },
    };
    mockSingle.mockResolvedValue({ data: ratedConsultation, error: null });
    mockEq.mockReturnValue({ eq: mockEq, single: mockSingle });
    mockSelect.mockReturnValue({ eq: mockEq });

    const { GET } = await import('@/app/api/consultation/[id]/results/route');
    const res = await GET(makeRequest(VALID_ID), { params: Promise.resolve({ id: VALID_ID }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.consultation.rating).toBe(4);
    expect(body.consultation.ratingDetails).toEqual({
      faceShapeAccuracy: 5,
      recommendationQuality: 4,
      ratedAt: '2026-03-02T10:00:00Z',
    });
  });
});
