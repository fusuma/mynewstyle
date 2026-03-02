import { describe, it, expect, vi, beforeEach } from 'vitest';

// Set up env vars before any imports
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service_role_key_test';

// Mock @supabase/supabase-js
const mockSingle = vi.fn();
const mockEq = vi.fn(() => ({ single: mockSingle }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

const validId = '550e8400-e29b-41d4-a716-446655440000';
const invalidId = 'not-a-uuid';

function createGetRequest(id: string): Request {
  return new Request(`http://localhost:3000/api/consultation/${id}/status`, {
    method: 'GET',
  });
}

describe('GET /api/consultation/[id]/status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock chain
    mockSingle.mockReset();
    mockEq.mockReturnValue({ single: mockSingle });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });
  });

  it('returns 400 for an invalid UUID', async () => {
    const { GET } = await import('@/app/api/consultation/[id]/status/route');
    const request = createGetRequest(invalidId);
    const response = await GET(request, { params: Promise.resolve({ id: invalidId }) });
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('Invalid');
  });

  it('returns 404 when consultation is not found (PGRST116)', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116', message: 'Row not found' } });
    const { GET } = await import('@/app/api/consultation/[id]/status/route');
    const request = createGetRequest(validId);
    const response = await GET(request, { params: Promise.resolve({ id: validId }) });
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  it('returns 500 when supabase returns an unexpected DB error', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { code: '08006', message: 'connection failure' } });
    const { GET } = await import('@/app/api/consultation/[id]/status/route');
    const request = createGetRequest(validId);
    const response = await GET(request, { params: Promise.resolve({ id: validId }) });
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  it('returns 200 with correct id, status, paymentStatus when consultation found', async () => {
    mockSingle.mockResolvedValueOnce({
      data: { id: validId, status: 'complete', payment_status: 'paid' },
      error: null,
    });
    const { GET } = await import('@/app/api/consultation/[id]/status/route');
    const request = createGetRequest(validId);
    const response = await GET(request, { params: Promise.resolve({ id: validId }) });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({
      id: validId,
      status: 'complete',
      paymentStatus: 'paid',
    });
  });

  it('maps snake_case payment_status to camelCase paymentStatus', async () => {
    mockSingle.mockResolvedValueOnce({
      data: { id: validId, status: 'pending', payment_status: 'refunded' },
      error: null,
    });
    const { GET } = await import('@/app/api/consultation/[id]/status/route');
    const request = createGetRequest(validId);
    const response = await GET(request, { params: Promise.resolve({ id: validId }) });
    const data = await response.json();
    expect(data.paymentStatus).toBe('refunded');
    expect(data).not.toHaveProperty('payment_status');
  });

  it('queries consultations table with id, status, payment_status columns', async () => {
    mockSingle.mockResolvedValueOnce({
      data: { id: validId, status: 'complete', payment_status: 'paid' },
      error: null,
    });
    const { GET } = await import('@/app/api/consultation/[id]/status/route');
    const request = createGetRequest(validId);
    await GET(request, { params: Promise.resolve({ id: validId }) });
    expect(mockFrom).toHaveBeenCalledWith('consultations');
    expect(mockSelect).toHaveBeenCalledWith('id, status, payment_status');
    expect(mockEq).toHaveBeenCalledWith('id', validId);
  });

  it('returns 404 when supabase returns null data with no error', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: null });
    const { GET } = await import('@/app/api/consultation/[id]/status/route');
    const request = createGetRequest(validId);
    const response = await GET(request, { params: Promise.resolve({ id: validId }) });
    expect(response.status).toBe(404);
  });
});
