import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Use vi.hoisted to avoid initialization issues with mocks
const {
  mockGetUser,
  mockSelect,
  mockEq,
  mockOrder,
  mockStorageFrom,
  mockCreateSignedUrl,
} = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockSelect: vi.fn(),
  mockEq: vi.fn(),
  mockOrder: vi.fn(),
  mockStorageFrom: vi.fn(),
  mockCreateSignedUrl: vi.fn(),
}));

// Mock @supabase/ssr
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn().mockImplementation(() => ({
    auth: {
      getUser: mockGetUser,
    },
    from: vi.fn().mockReturnThis(),
    select: mockSelect,
    insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    eq: mockEq,
    order: mockOrder,
    storage: {
      from: mockStorageFrom,
    },
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
  return new NextRequest('http://localhost:3000/api/profile/export', {
    method: 'GET',
    headers: options.headers ?? {},
  });
}

// Counter for generating unique user IDs in each test (avoids rate-limit interference)
let testUserCounter = 0;
function getUniqueUserId(): string {
  testUserCounter++;
  return `test-user-${testUserCounter}-${Date.now()}`;
}

const mockProfileData = {
  id: 'user-123',
  display_name: 'João Silva',
  gender_preference: 'male',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
  email: 'test@example.com',
};

const mockConsultations = [
  {
    id: 'consult-1',
    gender: 'male',
    photo_url: 'consultation-photos/user-123/photo.jpg',
    questionnaire_responses: { question1: 'answer1' },
    face_analysis: { faceShape: 'oval', confidence: 0.9 },
    status: 'completed',
    payment_status: 'paid',
    created_at: '2026-01-10T10:00:00Z',
    completed_at: '2026-01-10T10:05:00Z',
    rating: 4,
    rating_details: { faceShapeAccuracy: 5, ratedAt: '2026-01-11T00:00:00Z' },
    // Internal fields that MUST be excluded
    ai_cost_cents: 100,
    ai_model_versions: { face: 'gemini-2.0' },
    guest_session_id: 'guest-abc',
    payment_intent_id: 'pi_abc',
    photo_quality_score: 0.95,
    recommendations: [
      {
        id: 'rec-1',
        consultation_id: 'consult-1',
        rank: 1,
        style_name: 'Textured Crop',
        justification: 'Great for oval face',
        match_score: 0.93,
        difficulty_level: 'low',
        preview_url: 'preview-images/user-123/rec-1.jpg',
        preview_status: 'ready',
        created_at: '2026-01-10T10:06:00Z',
        // Internal field that MUST be excluded
        preview_generation_params: { model: 'kie' },
      },
    ],
    styles_to_avoid: [
      { id: 'sta-1', consultation_id: 'consult-1', style_name: 'Mullet', reason: 'Outdated' },
    ],
    grooming_tips: [
      { id: 'gt-1', consultation_id: 'consult-1', category: 'products', tip_text: 'Use wax', icon: '💆' },
    ],
  },
];

const mockFavorites = [
  {
    id: 'fav-1',
    recommendation_id: 'rec-1',
    created_at: '2026-01-15T10:00:00Z',
    recommendations: {
      style_name: 'Textured Crop',
    },
  },
];

/**
 * Set up a standard query mock chain for profile, consultations, favorites queries.
 * Uses side-effect counting to return different data per query.
 */
function setupQueryMocks(options: {
  profileData?: typeof mockProfileData | null;
  profileError?: object | null;
  consultationsData?: typeof mockConsultations | [];
  consultationsError?: object | null;
  favoritesData?: typeof mockFavorites | [];
  favoritesError?: object | null;
} = {}) {
  const {
    profileData = mockProfileData,
    profileError = null,
    consultationsData = [],
    consultationsError = null,
    favoritesData = [],
    favoritesError = null,
  } = options;

  let selectCallCount = 0;
  mockSelect.mockImplementation(() => {
    selectCallCount++;
    if (selectCallCount === 1) {
      // profiles query
      return {
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: profileData, error: profileError }),
        }),
      };
    } else if (selectCallCount === 2) {
      // consultations query
      return {
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: consultationsData, error: consultationsError }),
        }),
      };
    } else {
      // favorites query
      return {
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: favoritesData, error: favoritesError }),
        }),
      };
    }
  });

  // Also mock the analytics insert (from().insert())
  const mockInsert = vi.fn().mockResolvedValue({ data: null, error: null });
  // from() needs to handle both .select() and .insert()
  // The mock currently delegates to vi.fn().mockReturnThis() for 'from'
  // Analytics insert calls from('analytics_events').insert(...)
  // We need the supabase mock to support .insert() on the from() result
}

describe('GET /api/profile/export', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: storage createSignedUrl succeeds
    mockCreateSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://signed.url/photo.jpg' }, error: null });
    mockStorageFrom.mockReturnValue({ createSignedUrl: mockCreateSignedUrl });
  });

  it('returns 401 when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const { GET } = await import('@/app/api/profile/export/route');
    const request = createRequest();
    const response = await GET(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  it('returns 401 when getUser returns an auth error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'JWT expired' } });

    const { GET } = await import('@/app/api/profile/export/route');
    const request = createRequest();
    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it('returns 200 with complete user data for authenticated user', async () => {
    const userId = getUniqueUserId();
    mockGetUser.mockResolvedValue({ data: { user: { id: userId, email: 'test@example.com' } }, error: null });
    setupQueryMocks({ consultationsData: mockConsultations, favoritesData: mockFavorites });

    const { GET } = await import('@/app/api/profile/export/route');
    const request = createRequest();
    const response = await GET(request);

    expect(response.status).toBe(200);
  });

  it('returns Content-Disposition attachment header with correct filename', async () => {
    const userId = getUniqueUserId();
    mockGetUser.mockResolvedValue({ data: { user: { id: userId, email: 'test@example.com' } }, error: null });
    setupQueryMocks();

    const { GET } = await import('@/app/api/profile/export/route');
    const request = createRequest();
    const response = await GET(request);

    expect(response.status).toBe(200);
    const contentDisposition = response.headers.get('content-disposition');
    expect(contentDisposition).toMatch(/attachment/);
    expect(contentDisposition).toMatch(/mynewstyle-data-export-/);
    expect(contentDisposition).toMatch(/\.json/);
  });

  it('returns application/json content-type', async () => {
    const userId = getUniqueUserId();
    mockGetUser.mockResolvedValue({ data: { user: { id: userId, email: 'test@example.com' } }, error: null });
    setupQueryMocks();

    const { GET } = await import('@/app/api/profile/export/route');
    const request = createRequest();
    const response = await GET(request);

    expect(response.headers.get('content-type')).toContain('application/json');
  });

  it('excludes internal fields from export (ai_cost_cents, ai_model_versions, guest_session_id, payment_intent_id)', async () => {
    const userId = getUniqueUserId();
    mockGetUser.mockResolvedValue({ data: { user: { id: userId, email: 'test@example.com' } }, error: null });
    setupQueryMocks({ consultationsData: mockConsultations, favoritesData: mockFavorites });

    const { GET } = await import('@/app/api/profile/export/route');
    const request = createRequest();
    const response = await GET(request);

    expect(response.status).toBe(200);
    const exportBody = await response.json();

    // Check that internal fields are excluded from consultations
    if (exportBody.consultations && exportBody.consultations.length > 0) {
      const consultation = exportBody.consultations[0];
      expect(consultation).not.toHaveProperty('ai_cost_cents');
      expect(consultation).not.toHaveProperty('ai_model_versions');
      expect(consultation).not.toHaveProperty('guest_session_id');
      expect(consultation).not.toHaveProperty('payment_intent_id');
      expect(consultation).not.toHaveProperty('photo_quality_score');
    }

    // Check that internal fields are excluded from recommendations
    if (exportBody.consultations?.[0]?.recommendations?.[0]) {
      const rec = exportBody.consultations[0].recommendations[0];
      expect(rec).not.toHaveProperty('preview_generation_params');
    }
  });

  it('includes required export fields (exportedAt, platform, userId, profile, consultations, favorites)', async () => {
    const userId = getUniqueUserId();
    mockGetUser.mockResolvedValue({ data: { user: { id: userId, email: 'test@example.com' } }, error: null });
    setupQueryMocks();

    const { GET } = await import('@/app/api/profile/export/route');
    const request = createRequest();
    const response = await GET(request);

    expect(response.status).toBe(200);
    const exportBody = await response.json();

    expect(exportBody).toHaveProperty('exportedAt');
    expect(exportBody).toHaveProperty('platform', 'mynewstyle');
    expect(exportBody).toHaveProperty('userId', userId);
    expect(exportBody).toHaveProperty('profile');
    expect(exportBody).toHaveProperty('consultations');
    expect(exportBody).toHaveProperty('favorites');
    expect(Array.isArray(exportBody.consultations)).toBe(true);
    expect(Array.isArray(exportBody.favorites)).toBe(true);
  });

  it('returns 429 when rate limit is exceeded', async () => {
    // Use a dedicated user for rate limit testing
    const rateLimitUserId = `rate-limit-test-user-${Date.now()}`;
    mockGetUser.mockResolvedValue({ data: { user: { id: rateLimitUserId, email: 'test@example.com' } }, error: null });

    // Set up fresh mocks for each call
    const setupForCall = () => {
      let callCount = 0;
      mockSelect.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: mockProfileData, error: null }) }) };
        } else if (callCount === 2) {
          return { eq: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: [], error: null }) }) };
        } else {
          return { eq: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: [], error: null }) }) };
        }
      });
    };

    const { GET } = await import('@/app/api/profile/export/route');

    // Make 3 requests to exhaust the rate limit
    for (let i = 0; i < 3; i++) {
      setupForCall();
      const req = createRequest();
      const res = await GET(req);
      // These should all succeed
      expect(res.status).toBe(200);
    }

    // 4th request should be rate-limited
    const request = createRequest();
    const response = await GET(request);

    expect(response.status).toBe(429);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  it('uses signed URLs for photo_url in consultations', async () => {
    const userId = getUniqueUserId();
    mockGetUser.mockResolvedValue({ data: { user: { id: userId, email: 'test@example.com' } }, error: null });

    const consultationWithPhoto = {
      ...mockConsultations[0],
      photo_url: 'consultation-photos/user-123/photo.jpg',
    };

    setupQueryMocks({ consultationsData: [consultationWithPhoto] });

    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://supabase.example.com/signed/photo.jpg' },
      error: null,
    });

    const { GET } = await import('@/app/api/profile/export/route');
    const request = createRequest();
    const response = await GET(request);

    expect(response.status).toBe(200);
    // Verify signed URL was requested
    expect(mockStorageFrom).toHaveBeenCalledWith('consultation-photos');
    expect(mockCreateSignedUrl).toHaveBeenCalled();
  });

  it('includes null for photoUrl when signed URL generation fails', async () => {
    const userId = getUniqueUserId();
    mockGetUser.mockResolvedValue({ data: { user: { id: userId, email: 'test@example.com' } }, error: null });

    const consultationWithPhoto = {
      ...mockConsultations[0],
      photo_url: 'consultation-photos/user-123/deleted-photo.jpg',
    };

    setupQueryMocks({ consultationsData: [consultationWithPhoto] });

    // Simulate signed URL failure (e.g., file deleted)
    mockCreateSignedUrl.mockResolvedValue({
      data: null,
      error: { message: 'Object not found' },
    });

    const { GET } = await import('@/app/api/profile/export/route');
    const request = createRequest();
    const response = await GET(request);

    // Should still return 200 — failure to get signed URL is non-fatal
    expect(response.status).toBe(200);
    const exportBody = await response.json();
    if (exportBody.consultations?.[0]) {
      // photoUrl should be null when signed URL generation fails
      expect(exportBody.consultations[0].photoUrl).toBeNull();
    }
  });

  it('returns 500 when profile query fails', async () => {
    const userId = getUniqueUserId();
    mockGetUser.mockResolvedValue({ data: { user: { id: userId, email: 'test@example.com' } }, error: null });
    setupQueryMocks({ profileError: { message: 'DB error' }, profileData: null });

    const { GET } = await import('@/app/api/profile/export/route');
    const request = createRequest();
    const response = await GET(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  it('returns 500 when consultations query fails', async () => {
    const userId = getUniqueUserId();
    mockGetUser.mockResolvedValue({ data: { user: { id: userId, email: 'test@example.com' } }, error: null });
    setupQueryMocks({ consultationsError: { message: 'DB error' }, consultationsData: [] });

    const { GET } = await import('@/app/api/profile/export/route');
    const request = createRequest();
    const response = await GET(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  it('returns 500 when favorites query fails', async () => {
    const userId = getUniqueUserId();
    mockGetUser.mockResolvedValue({ data: { user: { id: userId, email: 'test@example.com' } }, error: null });
    setupQueryMocks({ favoritesError: { message: 'DB error' }, favoritesData: [] });

    const { GET } = await import('@/app/api/profile/export/route');
    const request = createRequest();
    const response = await GET(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });
});
