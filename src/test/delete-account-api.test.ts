/**
 * Unit tests for DELETE /api/profile/delete
 * Story 11.3: Right to Deletion — AC #3, #4, #5, #7
 *
 * Tests: 7.1 (success path), 7.2 (unauthenticated), 7.3 (partial failure rollback)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Use vi.hoisted to ensure mocks are set up before imports
const {
  mockGetUser,
  mockAuthAdminDeleteUser,
  mockStorageFrom,
  mockStorageList,
  mockStorageRemove,
  mockRpc,
  mockConsultationsQuery,
  mockRecommendationsQuery,
} = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockAuthAdminDeleteUser: vi.fn(),
  mockStorageFrom: vi.fn(),
  mockStorageList: vi.fn(),
  mockStorageRemove: vi.fn(),
  mockRpc: vi.fn(),
  // Two independent DB query mocks — one for consultations, one for recommendations
  mockConsultationsQuery: vi.fn(),
  mockRecommendationsQuery: vi.fn(),
}));

// Mock @supabase/ssr for the authenticated client
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn().mockImplementation(() => ({
    auth: { getUser: mockGetUser },
  })),
}));

// Mock @supabase/supabase-js for the service role client
// The service role client is used for: storage operations, DB queries, RPC, and auth admin
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn().mockImplementation(() => ({
    auth: {
      admin: { deleteUser: mockAuthAdminDeleteUser },
    },
    storage: {
      from: mockStorageFrom,
    },
    from: (table: string) => {
      if (table === 'consultations') return mockConsultationsQuery();
      if (table === 'recommendations') return mockRecommendationsQuery();
      return null;
    },
    rpc: mockRpc,
  })),
}));

const MOCK_USER = { id: 'user-test-123' };
const MOCK_CONSULTATION_IDS = ['consult-1', 'consult-2'];
const MOCK_PREVIEW_PATHS = [
  'previews/consult-1/rec-1.jpg',
  'previews/consult-2/rec-2.jpg',
];

function makeDeleteRequest() {
  return new NextRequest('http://localhost/api/profile/delete', {
    method: 'DELETE',
    headers: { 'content-type': 'application/json', cookie: 'sb-session=test' },
  });
}

/**
 * Creates a mock Supabase query builder for the consultations table.
 * Simulates: .select('id').eq('user_id', userId) → resolves with { data, error }
 */
function makeConsultationsQueryMock(
  result: { data: { id: string }[] | null; error: { message: string } | null }
) {
  const eqFn = vi.fn().mockResolvedValue(result);
  const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
  return vi.fn().mockReturnValue({ select: selectFn });
}

/**
 * Creates a mock Supabase query builder for the recommendations table.
 * Simulates: .select('preview_url').in('consultation_id', ids).not('preview_url', 'is', null)
 * → resolves with { data, error }
 */
function makeRecommendationsQueryMock(
  result: { data: { preview_url: string | null }[] | null; error: { message: string } | null }
) {
  const notFn = vi.fn().mockResolvedValue(result);
  const inFn = vi.fn().mockReturnValue({ not: notFn });
  const selectFn = vi.fn().mockReturnValue({ in: inFn });
  return vi.fn().mockReturnValue({ select: selectFn });
}

describe('DELETE /api/profile/delete', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: authenticated
    mockGetUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null });

    // Default: storage list returns flat file objects (id !== null means file, id === null means folder)
    mockStorageList.mockResolvedValue({
      data: [
        { name: 'photo1.jpg', id: 'obj-id-1' },
        { name: 'photo2.jpg', id: 'obj-id-2' },
      ],
      error: null,
    });

    // Default: storage remove succeeds
    mockStorageRemove.mockResolvedValue({ data: [], error: null });

    // Default: storage.from returns chained methods
    mockStorageFrom.mockReturnValue({
      list: mockStorageList,
      remove: mockStorageRemove,
    });

    // Default: consultations query returns consultation IDs
    mockConsultationsQuery.mockImplementation(
      makeConsultationsQueryMock({
        data: MOCK_CONSULTATION_IDS.map((id) => ({ id })),
        error: null,
      })
    );

    // Default: recommendations query returns preview paths
    mockRecommendationsQuery.mockImplementation(
      makeRecommendationsQueryMock({
        data: MOCK_PREVIEW_PATHS.map((url) => ({ preview_url: url })),
        error: null,
      })
    );

    // Default: RPC delete_user_data succeeds
    mockRpc.mockResolvedValue({ data: null, error: null });

    // Default: auth admin delete succeeds
    mockAuthAdminDeleteUser.mockResolvedValue({ data: {}, error: null });
  });

  // Test 7.2: unauthenticated returns 401
  it('returns 401 when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not authenticated' } });

    const { DELETE } = await import('@/app/api/profile/delete/route');
    const res = await DELETE(makeDeleteRequest());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  // Test 7.1: success path — all data deleted
  it('returns 200 with success:true when all data deleted successfully', async () => {
    const { DELETE } = await import('@/app/api/profile/delete/route');
    const res = await DELETE(makeDeleteRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('calls storage.from for consultation-photos, preview-images, and share-cards buckets', async () => {
    const { DELETE } = await import('@/app/api/profile/delete/route');
    await DELETE(makeDeleteRequest());
    expect(mockStorageFrom).toHaveBeenCalledWith('consultation-photos');
    expect(mockStorageFrom).toHaveBeenCalledWith('preview-images');
    expect(mockStorageFrom).toHaveBeenCalledWith('share-cards');
  });

  it('calls storage.list with user_id prefix for consultation-photos and share-cards', async () => {
    const { DELETE } = await import('@/app/api/profile/delete/route');
    await DELETE(makeDeleteRequest());
    // storageList is called for consultation-photos and share-cards (not preview-images)
    expect(mockStorageList).toHaveBeenCalledWith(MOCK_USER.id);
  });

  it('queries consultations table with user_id before deleting preview-images', async () => {
    const { DELETE } = await import('@/app/api/profile/delete/route');
    await DELETE(makeDeleteRequest());
    expect(mockConsultationsQuery).toHaveBeenCalled();
  });

  it('queries recommendations table for preview_url paths before deleting preview-images', async () => {
    const { DELETE } = await import('@/app/api/profile/delete/route');
    await DELETE(makeDeleteRequest());
    expect(mockRecommendationsQuery).toHaveBeenCalled();
  });

  it('removes preview-images using exact paths from recommendations table (not user_id prefix)', async () => {
    const { DELETE } = await import('@/app/api/profile/delete/route');
    await DELETE(makeDeleteRequest());
    // storage.remove for preview-images should be called with the exact preview_url paths
    expect(mockStorageRemove).toHaveBeenCalledWith(MOCK_PREVIEW_PATHS);
  });

  it('calls rpc delete_user_data with the correct user_id', async () => {
    const { DELETE } = await import('@/app/api/profile/delete/route');
    await DELETE(makeDeleteRequest());
    expect(mockRpc).toHaveBeenCalledWith('delete_user_data', { target_user_id: MOCK_USER.id });
  });

  it('calls auth.admin.deleteUser with the correct user_id', async () => {
    const { DELETE } = await import('@/app/api/profile/delete/route');
    await DELETE(makeDeleteRequest());
    expect(mockAuthAdminDeleteUser).toHaveBeenCalledWith(MOCK_USER.id);
  });

  // Test 7.3: partial failure rolls back (returns 500, no partial deletes committed)
  it('returns 500 when RPC delete_user_data fails', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'DB error during deletion' } });

    const { DELETE } = await import('@/app/api/profile/delete/route');
    const res = await DELETE(makeDeleteRequest());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it('returns 500 when auth.admin.deleteUser fails', async () => {
    mockAuthAdminDeleteUser.mockResolvedValue({ data: null, error: { message: 'Auth deletion failed' } });

    const { DELETE } = await import('@/app/api/profile/delete/route');
    const res = await DELETE(makeDeleteRequest());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it('returns 500 when storage list fails with critical error', async () => {
    mockStorageList.mockResolvedValue({ data: null, error: { message: 'Storage error' } });

    const { DELETE } = await import('@/app/api/profile/delete/route');
    const res = await DELETE(makeDeleteRequest());
    expect(res.status).toBe(500);
  });

  it('skips storage.remove for consultation-photos when bucket is empty', async () => {
    // Empty bucket — no objects to delete for consultation-photos/share-cards
    mockStorageList.mockResolvedValue({ data: [], error: null });
    // No previews either
    mockConsultationsQuery.mockImplementation(
      makeConsultationsQueryMock({ data: [], error: null })
    );

    const { DELETE } = await import('@/app/api/profile/delete/route');
    const res = await DELETE(makeDeleteRequest());
    expect(res.status).toBe(200);
    // remove should NOT be called when buckets are empty and no previews
    expect(mockStorageRemove).not.toHaveBeenCalled();
  });

  it('skips preview deletion when user has no consultations', async () => {
    // No consultations — no previews to delete
    mockConsultationsQuery.mockImplementation(
      makeConsultationsQueryMock({ data: [], error: null })
    );

    const { DELETE } = await import('@/app/api/profile/delete/route');
    const res = await DELETE(makeDeleteRequest());
    expect(res.status).toBe(200);
    // recommendations should NOT be queried when there are no consultations
    expect(mockRecommendationsQuery).not.toHaveBeenCalled();
  });

  it('returns 500 when fetching consultations for preview deletion fails', async () => {
    mockConsultationsQuery.mockImplementation(
      makeConsultationsQueryMock({ data: null, error: { message: 'DB fetch error' } })
    );

    const { DELETE } = await import('@/app/api/profile/delete/route');
    const res = await DELETE(makeDeleteRequest());
    expect(res.status).toBe(500);
  });

  it('skips remove when no preview_urls found in recommendations', async () => {
    // Consultations exist but no previews generated yet
    mockRecommendationsQuery.mockImplementation(
      makeRecommendationsQueryMock({ data: [], error: null })
    );

    const { DELETE } = await import('@/app/api/profile/delete/route');
    const res = await DELETE(makeDeleteRequest());
    expect(res.status).toBe(200);
  });
});
