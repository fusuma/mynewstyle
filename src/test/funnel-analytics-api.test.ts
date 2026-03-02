/**
 * Tests for GET /api/admin/funnel-analytics
 * Story 10.4 — Funnel Analytics
 * AC: #4, #6
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock NextResponse
vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>();
  return {
    ...actual,
    NextResponse: {
      json: vi.fn((data: unknown, init?: { status?: number }) => ({
        status: init?.status ?? 200,
        json: async () => data,
      })),
    },
  };
});

// Mock Supabase service role client
vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: vi.fn(),
}));

import { createServiceRoleClient } from '@/lib/supabase/server';

const ADMIN_SECRET = 'test-admin-secret-funnel';

function createAuthorizedRequest(params?: Record<string, string>): NextRequest {
  const url = new URL('http://localhost:3000/api/admin/funnel-analytics');
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }
  return new NextRequest(url.toString(), {
    headers: { Authorization: `Bearer ${ADMIN_SECRET}` },
  });
}

function createUnauthorizedRequest(): NextRequest {
  return new NextRequest('http://localhost:3000/api/admin/funnel-analytics');
}

const mockFunnelData = [
  { step_name: 'landing', step_order: 1, unique_sessions: 1000, previous_step_sessions: null, dropoff_rate: null },
  { step_name: 'gender_selected', step_order: 2, unique_sessions: 800, previous_step_sessions: 1000, dropoff_rate: 0.2 },
  { step_name: 'photo_captured', step_order: 3, unique_sessions: 700, previous_step_sessions: 800, dropoff_rate: 0.125 },
  { step_name: 'questionnaire_completed', step_order: 4, unique_sessions: 600, previous_step_sessions: 700, dropoff_rate: 0.143 },
  { step_name: 'face_analysis_completed', step_order: 5, unique_sessions: 580, previous_step_sessions: 600, dropoff_rate: 0.033 },
  { step_name: 'paywall_shown', step_order: 6, unique_sessions: 500, previous_step_sessions: 580, dropoff_rate: 0.138 },
  { step_name: 'payment_completed', step_order: 7, unique_sessions: 200, previous_step_sessions: 500, dropoff_rate: 0.6 },
  { step_name: 'consultation_completed', step_order: 8, unique_sessions: 190, previous_step_sessions: 200, dropoff_rate: 0.05 },
  { step_name: 'preview_requested', step_order: 9, unique_sessions: 150, previous_step_sessions: 190, dropoff_rate: 0.211 },
  { step_name: 'share_generated', step_order: 10, unique_sessions: 80, previous_step_sessions: 150, dropoff_rate: 0.467 },
];

function createMockSupabaseWithRpc(rpcData: unknown[], rpcError: unknown = null) {
  return {
    rpc: vi.fn().mockResolvedValue({ data: rpcData, error: rpcError }),
  };
}

describe('GET /api/admin/funnel-analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.ADMIN_SECRET = ADMIN_SECRET;
  });

  afterEach(() => {
    delete process.env.ADMIN_SECRET;
  });

  // AUTH TESTS
  it('returns 401 when no Authorization header provided', async () => {
    const { GET } = await import('@/app/api/admin/funnel-analytics/route');
    const res = await GET(createUnauthorizedRequest());
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data).toHaveProperty('error');
  });

  it('returns 401 when wrong secret provided', async () => {
    const { GET } = await import('@/app/api/admin/funnel-analytics/route');
    const req = new NextRequest('http://localhost:3000/api/admin/funnel-analytics', {
      headers: { Authorization: 'Bearer wrong-secret' },
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns 401 when ADMIN_SECRET env var is not set', async () => {
    delete process.env.ADMIN_SECRET;
    const { GET } = await import('@/app/api/admin/funnel-analytics/route');
    const res = await GET(createAuthorizedRequest());
    expect(res.status).toBe(401);
  });

  // HAPPY PATH TESTS
  it('returns 200 with funnel data on valid authorized request', async () => {
    const mockSupabase = createMockSupabaseWithRpc(mockFunnelData);
    (createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

    const { GET } = await import('@/app/api/admin/funnel-analytics/route');
    const res = await GET(createAuthorizedRequest());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('funnel');
    expect(Array.isArray(data.funnel)).toBe(true);
  });

  it('returns funnel array with correct shape per step', async () => {
    const mockSupabase = createMockSupabaseWithRpc(mockFunnelData);
    (createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

    const { GET } = await import('@/app/api/admin/funnel-analytics/route');
    const res = await GET(createAuthorizedRequest());
    const data = await res.json();

    expect(data.funnel.length).toBeGreaterThan(0);
    const step = data.funnel[0];
    expect(step).toHaveProperty('step');
    expect(step).toHaveProperty('order');
    expect(step).toHaveProperty('sessions');
    expect(step).toHaveProperty('previousStepSessions');
    expect(step).toHaveProperty('dropoffRate');
  });

  it('returns response with filters and generatedAt fields', async () => {
    const mockSupabase = createMockSupabaseWithRpc(mockFunnelData);
    (createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

    const { GET } = await import('@/app/api/admin/funnel-analytics/route');
    const res = await GET(createAuthorizedRequest());
    const data = await res.json();

    expect(data).toHaveProperty('filters');
    expect(data).toHaveProperty('generatedAt');
    expect(data.filters).toHaveProperty('from');
    expect(data.filters).toHaveProperty('to');
  });

  it('maps SQL snake_case response to camelCase response shape', async () => {
    const mockSupabase = createMockSupabaseWithRpc(mockFunnelData);
    (createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

    const { GET } = await import('@/app/api/admin/funnel-analytics/route');
    const res = await GET(createAuthorizedRequest());
    const data = await res.json();

    const firstStep = data.funnel[0];
    expect(firstStep.step).toBe('landing');
    expect(firstStep.order).toBe(1);
    expect(firstStep.sessions).toBe(1000);
  });

  // FILTER TESTS
  it('passes gender filter to SQL function when provided', async () => {
    const mockRpc = vi.fn().mockResolvedValue({ data: mockFunnelData, error: null });
    (createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue({ rpc: mockRpc });

    const { GET } = await import('@/app/api/admin/funnel-analytics/route');
    await GET(createAuthorizedRequest({ gender: 'male' }));

    expect(mockRpc).toHaveBeenCalledWith('funnel_counts', expect.objectContaining({
      gender_filter: 'male',
    }));
  });

  it('passes device filter to SQL function when provided', async () => {
    const mockRpc = vi.fn().mockResolvedValue({ data: mockFunnelData, error: null });
    (createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue({ rpc: mockRpc });

    const { GET } = await import('@/app/api/admin/funnel-analytics/route');
    await GET(createAuthorizedRequest({ device: 'mobile' }));

    expect(mockRpc).toHaveBeenCalledWith('funnel_counts', expect.objectContaining({
      device_filter: 'mobile',
    }));
  });

  it('passes null for gender_filter when gender param is absent', async () => {
    const mockRpc = vi.fn().mockResolvedValue({ data: mockFunnelData, error: null });
    (createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue({ rpc: mockRpc });

    const { GET } = await import('@/app/api/admin/funnel-analytics/route');
    await GET(createAuthorizedRequest());

    expect(mockRpc).toHaveBeenCalledWith('funnel_counts', expect.objectContaining({
      gender_filter: null,
    }));
  });

  it('ignores invalid gender filter values', async () => {
    const mockRpc = vi.fn().mockResolvedValue({ data: mockFunnelData, error: null });
    (createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue({ rpc: mockRpc });

    const { GET } = await import('@/app/api/admin/funnel-analytics/route');
    const res = await GET(createAuthorizedRequest({ gender: 'unknown' }));
    const data = await res.json();

    // Should either ignore or return 400 — the invalid filter must not crash
    expect([200, 400]).toContain(res.status);
    if (res.status === 200) {
      // gender_filter should be null (invalid value ignored)
      expect(mockRpc).toHaveBeenCalledWith('funnel_counts', expect.objectContaining({
        gender_filter: null,
      }));
    } else {
      expect(data).toHaveProperty('error');
    }
  });

  it('includes gender and device filters in the response filters object', async () => {
    const mockSupabase = createMockSupabaseWithRpc(mockFunnelData);
    (createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

    const { GET } = await import('@/app/api/admin/funnel-analytics/route');
    const res = await GET(createAuthorizedRequest({ gender: 'female', device: 'desktop' }));
    const data = await res.json();

    expect(data.filters.gender).toBe('female');
    expect(data.filters.device).toBe('desktop');
  });

  // ERROR HANDLING TESTS
  it('returns 503 when analytics_events table does not exist', async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'relation "analytics_events" does not exist', code: '42P01' },
    });
    (createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue({ rpc: mockRpc });

    const { GET } = await import('@/app/api/admin/funnel-analytics/route');
    const res = await GET(createAuthorizedRequest());
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data).toHaveProperty('error', 'analytics_events table not available');
    expect(data).toHaveProperty('hint');
  });

  it('returns 503 with helpful hint for missing table error', async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'relation "analytics_events" does not exist' },
    });
    (createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue({ rpc: mockRpc });

    const { GET } = await import('@/app/api/admin/funnel-analytics/route');
    const res = await GET(createAuthorizedRequest());
    const data = await res.json();

    expect(data.hint).toContain('10-1');
  });

  it('returns 500 on unexpected RPC error', async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'unexpected database error' },
    });
    (createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue({ rpc: mockRpc });

    const { GET } = await import('@/app/api/admin/funnel-analytics/route');
    const res = await GET(createAuthorizedRequest());
    expect(res.status).toBe(500);
  });

  it('returns 500 when RPC throws an exception', async () => {
    const mockRpc = vi.fn().mockRejectedValue(new Error('connection refused'));
    (createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue({ rpc: mockRpc });

    const { GET } = await import('@/app/api/admin/funnel-analytics/route');
    const res = await GET(createAuthorizedRequest());
    expect(res.status).toBe(500);
  });

  // RPC CALL VERIFICATION
  it('calls funnel_counts SQL function with correct date range params', async () => {
    const mockRpc = vi.fn().mockResolvedValue({ data: mockFunnelData, error: null });
    (createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue({ rpc: mockRpc });

    const { GET } = await import('@/app/api/admin/funnel-analytics/route');
    const from = '2026-02-01';
    const to = '2026-02-28';
    await GET(createAuthorizedRequest({ from, to }));

    expect(mockRpc).toHaveBeenCalledWith('funnel_counts', expect.objectContaining({
      from_date: expect.stringContaining('2026-02-01'),
      to_date: expect.stringContaining('2026-02-28'),
    }));
  });

  it('defaults from to 7 days ago and to to now when not provided', async () => {
    const mockRpc = vi.fn().mockResolvedValue({ data: mockFunnelData, error: null });
    (createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue({ rpc: mockRpc });

    const before = new Date();
    const { GET } = await import('@/app/api/admin/funnel-analytics/route');
    await GET(createAuthorizedRequest());
    const after = new Date();

    const callArgs = mockRpc.mock.calls[0][1];
    const fromDate = new Date(callArgs.from_date);
    const toDate = new Date(callArgs.to_date);

    // from_date should be approximately 7 days before now
    const sevenDaysAgo = new Date(before.getTime() - 7 * 24 * 60 * 60 * 1000);
    expect(fromDate.getTime()).toBeGreaterThanOrEqual(sevenDaysAgo.getTime() - 5000);
    expect(fromDate.getTime()).toBeLessThanOrEqual(sevenDaysAgo.getTime() + 5000);

    // to_date should be approximately now
    expect(toDate.getTime()).toBeGreaterThanOrEqual(before.getTime() - 5000);
    expect(toDate.getTime()).toBeLessThanOrEqual(after.getTime() + 5000);
  });

  it('accepts ?secret= query param for auth (dashboard-friendly)', async () => {
    const mockSupabase = createMockSupabaseWithRpc(mockFunnelData);
    (createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

    const { GET } = await import('@/app/api/admin/funnel-analytics/route');
    const req = new NextRequest(
      `http://localhost:3000/api/admin/funnel-analytics?secret=${ADMIN_SECRET}`
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
  });
});
