/**
 * Tests for GET /api/admin/funnel-analytics/weekly-summary
 * Story 10.4 — Funnel Analytics
 * AC: #5, #6
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

const ADMIN_SECRET = 'test-admin-secret-weekly';

function createAuthorizedRequest(): NextRequest {
  return new NextRequest('http://localhost:3000/api/admin/funnel-analytics/weekly-summary', {
    headers: { Authorization: `Bearer ${ADMIN_SECRET}` },
  });
}

function createUnauthorizedRequest(): NextRequest {
  return new NextRequest('http://localhost:3000/api/admin/funnel-analytics/weekly-summary');
}

const mockWeeklySummaryData = {
  current_week: {
    from: '2026-02-23',
    to: '2026-03-02',
    funnel: [
      { step_name: 'landing', step_order: 1, unique_sessions: 1000, previous_step_sessions: null, dropoff_rate: null },
      { step_name: 'gender_selected', step_order: 2, unique_sessions: 800, previous_step_sessions: 1000, dropoff_rate: 0.2 },
      { step_name: 'payment_completed', step_order: 7, unique_sessions: 200, previous_step_sessions: 500, dropoff_rate: 0.6 },
      { step_name: 'share_generated', step_order: 10, unique_sessions: 80, previous_step_sessions: 150, dropoff_rate: 0.467 },
    ],
  },
  previous_week: {
    from: '2026-02-16',
    to: '2026-02-23',
    funnel: [
      { step_name: 'landing', step_order: 1, unique_sessions: 900, previous_step_sessions: null, dropoff_rate: null },
      { step_name: 'gender_selected', step_order: 2, unique_sessions: 720, previous_step_sessions: 900, dropoff_rate: 0.2 },
      { step_name: 'payment_completed', step_order: 7, unique_sessions: 180, previous_step_sessions: 450, dropoff_rate: 0.6 },
      { step_name: 'share_generated', step_order: 10, unique_sessions: 70, previous_step_sessions: 135, dropoff_rate: 0.481 },
    ],
  },
  deltas: [
    { step_name: 'landing', current_sessions: 1000, previous_sessions: 900, delta_percent: 11.11 },
    { step_name: 'gender_selected', current_sessions: 800, previous_sessions: 720, delta_percent: 11.11 },
    { step_name: 'payment_completed', current_sessions: 200, previous_sessions: 180, delta_percent: 11.11 },
    { step_name: 'share_generated', current_sessions: 80, previous_sessions: 70, delta_percent: 14.29 },
  ],
};

function createMockSupabaseWithRpc(rpcData: unknown, rpcError: unknown = null) {
  return {
    rpc: vi.fn().mockResolvedValue({ data: rpcData, error: rpcError }),
  };
}

describe('GET /api/admin/funnel-analytics/weekly-summary', () => {
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
    const { GET } = await import('@/app/api/admin/funnel-analytics/weekly-summary/route');
    const res = await GET(createUnauthorizedRequest());
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data).toHaveProperty('error');
  });

  it('returns 401 when wrong secret provided', async () => {
    const { GET } = await import('@/app/api/admin/funnel-analytics/weekly-summary/route');
    const req = new NextRequest('http://localhost:3000/api/admin/funnel-analytics/weekly-summary', {
      headers: { Authorization: 'Bearer wrong-secret' },
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns 401 when ADMIN_SECRET env var is not set', async () => {
    delete process.env.ADMIN_SECRET;
    const { GET } = await import('@/app/api/admin/funnel-analytics/weekly-summary/route');
    const res = await GET(createAuthorizedRequest());
    expect(res.status).toBe(401);
  });

  // HAPPY PATH TESTS
  it('returns 200 on authorized request', async () => {
    const mockSupabase = createMockSupabaseWithRpc(mockWeeklySummaryData);
    (createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

    const { GET } = await import('@/app/api/admin/funnel-analytics/weekly-summary/route');
    const res = await GET(createAuthorizedRequest());
    expect(res.status).toBe(200);
  });

  it('returns response with currentWeek, previousWeek, deltas, overallConversion, and generatedAt', async () => {
    const mockSupabase = createMockSupabaseWithRpc(mockWeeklySummaryData);
    (createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

    const { GET } = await import('@/app/api/admin/funnel-analytics/weekly-summary/route');
    const res = await GET(createAuthorizedRequest());
    const data = await res.json();

    expect(data).toHaveProperty('currentWeek');
    expect(data).toHaveProperty('previousWeek');
    expect(data).toHaveProperty('deltas');
    expect(data).toHaveProperty('overallConversion');
    expect(data).toHaveProperty('generatedAt');
  });

  it('currentWeek has from, to, and funnel array', async () => {
    const mockSupabase = createMockSupabaseWithRpc(mockWeeklySummaryData);
    (createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

    const { GET } = await import('@/app/api/admin/funnel-analytics/weekly-summary/route');
    const res = await GET(createAuthorizedRequest());
    const data = await res.json();

    expect(data.currentWeek).toHaveProperty('from');
    expect(data.currentWeek).toHaveProperty('to');
    expect(data.currentWeek).toHaveProperty('funnel');
    expect(Array.isArray(data.currentWeek.funnel)).toBe(true);
  });

  it('previousWeek has from, to, and funnel array', async () => {
    const mockSupabase = createMockSupabaseWithRpc(mockWeeklySummaryData);
    (createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

    const { GET } = await import('@/app/api/admin/funnel-analytics/weekly-summary/route');
    const res = await GET(createAuthorizedRequest());
    const data = await res.json();

    expect(data.previousWeek).toHaveProperty('from');
    expect(data.previousWeek).toHaveProperty('to');
    expect(data.previousWeek).toHaveProperty('funnel');
    expect(Array.isArray(data.previousWeek.funnel)).toBe(true);
  });

  it('deltas is an array with step, currentSessions, previousSessions, deltaPercent', async () => {
    const mockSupabase = createMockSupabaseWithRpc(mockWeeklySummaryData);
    (createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

    const { GET } = await import('@/app/api/admin/funnel-analytics/weekly-summary/route');
    const res = await GET(createAuthorizedRequest());
    const data = await res.json();

    expect(Array.isArray(data.deltas)).toBe(true);
    if (data.deltas.length > 0) {
      const delta = data.deltas[0];
      expect(delta).toHaveProperty('step');
      expect(delta).toHaveProperty('currentSessions');
      expect(delta).toHaveProperty('previousSessions');
      expect(delta).toHaveProperty('deltaPercent');
    }
  });

  it('overallConversion has landingToPayment and landingToShare with current, previous, delta', async () => {
    const mockSupabase = createMockSupabaseWithRpc(mockWeeklySummaryData);
    (createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

    const { GET } = await import('@/app/api/admin/funnel-analytics/weekly-summary/route');
    const res = await GET(createAuthorizedRequest());
    const data = await res.json();

    expect(data.overallConversion).toHaveProperty('landingToPayment');
    expect(data.overallConversion).toHaveProperty('landingToShare');
    expect(data.overallConversion.landingToPayment).toHaveProperty('current');
    expect(data.overallConversion.landingToPayment).toHaveProperty('previous');
    expect(data.overallConversion.landingToPayment).toHaveProperty('delta');
    expect(data.overallConversion.landingToShare).toHaveProperty('current');
    expect(data.overallConversion.landingToShare).toHaveProperty('previous');
    expect(data.overallConversion.landingToShare).toHaveProperty('delta');
  });

  it('calls funnel_weekly_summary RPC function', async () => {
    const mockRpc = vi.fn().mockResolvedValue({ data: mockWeeklySummaryData, error: null });
    (createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue({ rpc: mockRpc });

    const { GET } = await import('@/app/api/admin/funnel-analytics/weekly-summary/route');
    await GET(createAuthorizedRequest());

    expect(mockRpc).toHaveBeenCalledWith('funnel_weekly_summary', expect.any(Object));
    expect(mockRpc.mock.calls[0][0]).toBe('funnel_weekly_summary');
  });

  // CONVERSION RATE CALCULATION TESTS
  it('computes landingToPayment conversion rate correctly', async () => {
    const summaryData = {
      ...mockWeeklySummaryData,
      current_week: {
        ...mockWeeklySummaryData.current_week,
        funnel: [
          { step_name: 'landing', step_order: 1, unique_sessions: 1000, previous_step_sessions: null, dropoff_rate: null },
          { step_name: 'payment_completed', step_order: 7, unique_sessions: 200, previous_step_sessions: 500, dropoff_rate: 0.6 },
          { step_name: 'share_generated', step_order: 10, unique_sessions: 80, previous_step_sessions: 150, dropoff_rate: 0.467 },
        ],
      },
      previous_week: {
        ...mockWeeklySummaryData.previous_week,
        funnel: [
          { step_name: 'landing', step_order: 1, unique_sessions: 800, previous_step_sessions: null, dropoff_rate: null },
          { step_name: 'payment_completed', step_order: 7, unique_sessions: 160, previous_step_sessions: 400, dropoff_rate: 0.6 },
          { step_name: 'share_generated', step_order: 10, unique_sessions: 60, previous_step_sessions: 120, dropoff_rate: 0.5 },
        ],
      },
    };
    const mockSupabase = createMockSupabaseWithRpc(summaryData);
    (createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

    const { GET } = await import('@/app/api/admin/funnel-analytics/weekly-summary/route');
    const res = await GET(createAuthorizedRequest());
    const data = await res.json();

    // landingToPayment: current = 200/1000 = 0.2, previous = 160/800 = 0.2
    expect(data.overallConversion.landingToPayment.current).toBeCloseTo(0.2);
    expect(data.overallConversion.landingToPayment.previous).toBeCloseTo(0.2);

    // landingToShare: current = 80/1000 = 0.08, previous = 60/800 = 0.075
    expect(data.overallConversion.landingToShare.current).toBeCloseTo(0.08);
    expect(data.overallConversion.landingToShare.previous).toBeCloseTo(0.075);
  });

  // ERROR HANDLING TESTS
  it('returns 503 when analytics_events table does not exist', async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'relation "analytics_events" does not exist', code: '42P01' },
    });
    (createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue({ rpc: mockRpc });

    const { GET } = await import('@/app/api/admin/funnel-analytics/weekly-summary/route');
    const res = await GET(createAuthorizedRequest());
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data).toHaveProperty('error', 'analytics_events table not available');
    expect(data).toHaveProperty('hint');
    expect(data.hint).toContain('10-1');
  });

  it('returns 500 on unexpected RPC error', async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'unexpected error' },
    });
    (createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue({ rpc: mockRpc });

    const { GET } = await import('@/app/api/admin/funnel-analytics/weekly-summary/route');
    const res = await GET(createAuthorizedRequest());
    expect(res.status).toBe(500);
  });

  it('returns 500 when RPC throws an exception', async () => {
    const mockRpc = vi.fn().mockRejectedValue(new Error('connection refused'));
    (createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue({ rpc: mockRpc });

    const { GET } = await import('@/app/api/admin/funnel-analytics/weekly-summary/route');
    const res = await GET(createAuthorizedRequest());
    expect(res.status).toBe(500);
  });

  it('accepts ?secret= query param for auth', async () => {
    const mockSupabase = createMockSupabaseWithRpc(mockWeeklySummaryData);
    (createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

    const { GET } = await import('@/app/api/admin/funnel-analytics/weekly-summary/route');
    const req = new NextRequest(
      `http://localhost:3000/api/admin/funnel-analytics/weekly-summary?secret=${ADMIN_SECRET}`
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
  });
});
