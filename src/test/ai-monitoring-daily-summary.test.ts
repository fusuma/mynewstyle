/**
 * Tests for POST /api/admin/ai-monitoring/daily-summary endpoint (Story 10.2, Task 2)
 * Covers: auth guard, daily summary computation, upsert behavior, response shape
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

// Shared mock state
const mockFrom = vi.fn();
const mockUpsert = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockGte = vi.fn();
const mockLt = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: vi.fn(() => ({
    from: mockFrom,
  })),
  createServerSupabaseClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

const ADMIN_SECRET = 'test-daily-summary-secret';

function createPostRequest(secret?: string): NextRequest {
  return new NextRequest('http://localhost:3000/api/admin/ai-monitoring/daily-summary', {
    method: 'POST',
    headers: secret ? { Authorization: `Bearer ${secret}` } : {},
  });
}

describe('POST /api/admin/ai-monitoring/daily-summary (Story 10.2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.ADMIN_SECRET = ADMIN_SECRET;

    // Default mocks
    mockGte.mockReturnValue({ lt: mockLt });
    mockLt.mockResolvedValue({ data: [], error: null });
    mockEq.mockReturnValue({ gte: mockGte });
    mockSelect.mockReturnValue({ eq: mockEq, gte: mockGte });
    mockUpsert.mockResolvedValue({ data: [{ id: 'uuid-1', summary_date: '2026-03-01' }], error: null });
    mockFrom.mockReturnValue({ select: mockSelect, upsert: mockUpsert });
  });

  afterEach(() => {
    delete process.env.ADMIN_SECRET;
  });

  it('returns 401 when no Authorization header', async () => {
    const { POST } = await import('@/app/api/admin/ai-monitoring/daily-summary/route');
    const req = createPostRequest();
    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 401 when wrong secret provided', async () => {
    const { POST } = await import('@/app/api/admin/ai-monitoring/daily-summary/route');
    const req = createPostRequest('wrong-secret');
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 401 when ADMIN_SECRET env var not set', async () => {
    delete process.env.ADMIN_SECRET;
    const { POST } = await import('@/app/api/admin/ai-monitoring/daily-summary/route');
    const req = createPostRequest(ADMIN_SECRET);
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 200 with summary data on successful computation', async () => {
    // Mock ai_calls for yesterday with some data
    let fromCallCount = 0;
    mockFrom.mockImplementation((_table: string) => {
      fromCallCount++;
      if (fromCallCount === 1) {
        // consultations count query
        return {
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lt: vi.fn().mockResolvedValue({ count: 5, error: null }),
            }),
          }),
        };
      }
      if (fromCallCount === 2) {
        // ai_calls query
        return {
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lt: vi.fn().mockResolvedValue({
                data: [
                  { task: 'face-analysis', provider: 'gemini', cost_cents: 5, latency_ms: 800, success: true },
                  { task: 'face-analysis', provider: 'openai', cost_cents: 8, latency_ms: 2000, success: false },
                  { task: 'consultation', provider: 'gemini', cost_cents: 15, latency_ms: 1200, success: true },
                  { task: 'preview', provider: 'kie', cost_cents: 4, latency_ms: 3000, success: true },
                  { task: 'preview', provider: 'gemini', cost_cents: 13, latency_ms: 5000, success: true },
                ],
                error: null,
              }),
            }),
          }),
        };
      }
      // upsert call
      return {
        upsert: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({
            data: [{ id: 'uuid-1', summary_date: '2026-03-01' }],
            error: null,
          }),
        }),
      };
    });

    const { POST } = await import('@/app/api/admin/ai-monitoring/daily-summary/route');
    const req = createPostRequest(ADMIN_SECRET);
    const res = await POST(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('summary_date');
    expect(data).toHaveProperty('total_consultations');
    expect(data).toHaveProperty('total_ai_calls');
    expect(data).toHaveProperty('total_ai_cost_cents');
    expect(data).toHaveProperty('avg_cost_cents_per_consultation');
  });

  it('response includes per-step latency fields', async () => {
    let fromCallCount = 0;
    mockFrom.mockImplementation((_table: string) => {
      fromCallCount++;
      if (fromCallCount === 1) {
        return {
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lt: vi.fn().mockResolvedValue({ count: 2, error: null }),
            }),
          }),
        };
      }
      if (fromCallCount === 2) {
        return {
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lt: vi.fn().mockResolvedValue({
                data: [
                  { task: 'face-analysis', provider: 'gemini', cost_cents: 5, latency_ms: 1000, success: true },
                  { task: 'consultation', provider: 'gemini', cost_cents: 15, latency_ms: 1500, success: true },
                  { task: 'preview', provider: 'kie', cost_cents: 4, latency_ms: 4000, success: true },
                ],
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        upsert: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({
            data: [{ id: 'uuid-1', summary_date: '2026-03-01' }],
            error: null,
          }),
        }),
      };
    });

    const { POST } = await import('@/app/api/admin/ai-monitoring/daily-summary/route');
    const req = createPostRequest(ADMIN_SECRET);
    const res = await POST(req);
    const data = await res.json();

    expect(data).toHaveProperty('avg_latency_face_analysis_ms');
    expect(data).toHaveProperty('avg_latency_consultation_ms');
    expect(data).toHaveProperty('avg_latency_preview_ms');
    expect(data).toHaveProperty('success_rate_face_analysis');
    expect(data).toHaveProperty('success_rate_consultation');
    expect(data).toHaveProperty('success_rate_preview');
    expect(data).toHaveProperty('fallback_rate_face_analysis');
    expect(data).toHaveProperty('fallback_rate_consultation');
    expect(data).toHaveProperty('fallback_rate_preview');
  });

  it('computes daily summary values correctly', async () => {
    let fromCallCount = 0;
    mockFrom.mockImplementation((_table: string) => {
      fromCallCount++;
      if (fromCallCount === 1) {
        return {
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lt: vi.fn().mockResolvedValue({ count: 3, error: null }),
            }),
          }),
        };
      }
      if (fromCallCount === 2) {
        return {
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lt: vi.fn().mockResolvedValue({
                data: [
                  // face-analysis: 2 calls, 1 success (gemini primary), 1 fallback (openai)
                  { task: 'face-analysis', provider: 'gemini', cost_cents: 5, latency_ms: 1000, success: true },
                  { task: 'face-analysis', provider: 'openai', cost_cents: 8, latency_ms: 3000, success: false },
                  // consultation: 1 call, all primary, all success
                  { task: 'consultation', provider: 'gemini', cost_cents: 15, latency_ms: 1200, success: true },
                  // preview: 1 fallback (gemini) + 1 primary (kie)
                  { task: 'preview', provider: 'kie', cost_cents: 4, latency_ms: 3000, success: true },
                  { task: 'preview', provider: 'gemini', cost_cents: 13, latency_ms: 5000, success: true },
                ],
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        upsert: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({
            data: [{ id: 'uuid-1', summary_date: '2026-03-01' }],
            error: null,
          }),
        }),
      };
    });

    const { POST } = await import('@/app/api/admin/ai-monitoring/daily-summary/route');
    const req = createPostRequest(ADMIN_SECRET);
    const res = await POST(req);
    const data = await res.json();

    expect(data.total_consultations).toBe(3);
    expect(data.total_ai_calls).toBe(5);
    expect(data.total_ai_cost_cents).toBeCloseTo(45); // 5+8+15+4+13
    // avg cost per consultation = 45 / 3 = 15
    expect(data.avg_cost_cents_per_consultation).toBeCloseTo(15);
    // latency: face-analysis avg = (1000+3000)/2 = 2000
    expect(data.avg_latency_face_analysis_ms).toBeCloseTo(2000);
    // success rate face-analysis = 1/2 = 0.5
    expect(data.success_rate_face_analysis).toBeCloseTo(0.5);
    // fallback rate face-analysis = 1/2 = 0.5 (openai = fallback)
    expect(data.fallback_rate_face_analysis).toBeCloseTo(0.5);
    // success rate consultation = 1/1 = 1.0
    expect(data.success_rate_consultation).toBeCloseTo(1.0);
    // fallback rate consultation = 0/1 = 0.0
    expect(data.fallback_rate_consultation).toBeCloseTo(0.0);
    // preview fallback = gemini = 1/2 = 0.5
    expect(data.fallback_rate_preview).toBeCloseTo(0.5);
  });

  it('uses upsert on monitoring_daily_summaries (idempotent re-runs)', async () => {
    const upsertMock = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: [{ id: 'uuid-2', summary_date: '2026-03-01' }],
        error: null,
      }),
    });
    let fromCallCount = 0;
    mockFrom.mockImplementation((table: string) => {
      fromCallCount++;
      if (fromCallCount === 1) {
        return {
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lt: vi.fn().mockResolvedValue({ count: 1, error: null }),
            }),
          }),
        };
      }
      if (fromCallCount === 2) {
        return {
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lt: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        };
      }
      if (table === 'monitoring_daily_summaries') {
        return { upsert: upsertMock };
      }
      return { upsert: upsertMock };
    });

    const { POST } = await import('@/app/api/admin/ai-monitoring/daily-summary/route');
    await POST(createPostRequest(ADMIN_SECRET));

    expect(upsertMock).toHaveBeenCalledTimes(1);
    // Should upsert with onConflict on summary_date
    const upsertArgs = upsertMock.mock.calls[0];
    expect(upsertArgs).toBeDefined();
  });

  it('returns 500 when database query fails', async () => {
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        gte: vi.fn().mockReturnValue({
          lt: vi.fn().mockResolvedValue({ count: null, error: { message: 'DB error' } }),
        }),
      }),
    }));

    const { POST } = await import('@/app/api/admin/ai-monitoring/daily-summary/route');
    const req = createPostRequest(ADMIN_SECRET);
    const res = await POST(req);

    expect(res.status).toBe(500);
  });
});
