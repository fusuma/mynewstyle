/**
 * Tests for enhanced GET /api/admin/ai-cost-summary endpoint (Story 10.2, Task 3)
 * Covers: latency, success rate, fallback rate fields, period filtering, backward compat
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

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: vi.fn(),
}));

import { createServiceRoleClient } from '@/lib/supabase/server';

const ADMIN_SECRET = 'test-admin-secret-xyz';

function createAuthorizedRequest(period?: string): NextRequest {
  const url = period
    ? `http://localhost:3000/api/admin/ai-cost-summary?period=${period}`
    : 'http://localhost:3000/api/admin/ai-cost-summary';
  return new NextRequest(url, {
    headers: { Authorization: `Bearer ${ADMIN_SECRET}` },
  });
}

type AICallRow = { cost_cents: number; latency_ms: number; success: boolean; provider: string };

/**
 * Creates a thenable/awaitable object that also exposes .gte() for optional chaining.
 * When awaited directly, returns the data. When .gte() is called, also returns data.
 */
function makeAwaitableWithGte<T>(result: T) {
  const p = Promise.resolve(result);
  const gteFn = vi.fn().mockReturnValue(p);
  // Create an object that is both awaitable (has .then) and has .gte()
  const obj = Object.assign(p, { gte: gteFn });
  return obj;
}

/**
 * Builds a mock for the ai_calls query: .select().eq() [optionally .gte()]
 * The route calls: baseQuery.eq('task', X) then optionally baseQuery.gte('timestamp', Y)
 * In the 'all' period case, no .gte() is called — the result of .eq() is awaited directly.
 */
function buildAICallsMock(calls: AICallRow[]) {
  const result = { data: calls, error: null };
  const eqResult = makeAwaitableWithGte(result);
  const eqMethod = vi.fn().mockReturnValue(eqResult);
  const selectMethod = vi.fn().mockReturnValue({ eq: eqMethod });
  return { select: selectMethod };
}

/**
 * Builds a mock for the consultations count query:
 * .select('id', {count, head}).eq('status') [optionally .gte('created_at')]
 */
function buildCountMock(count: number) {
  const result = { count, error: null };
  const eqResult = makeAwaitableWithGte(result);
  const eqFn = vi.fn().mockReturnValue(eqResult);
  const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
  return { select: selectFn };
}

/**
 * Builds a mock for the consultations cost query:
 * .select('ai_cost_cents').eq('status') [optionally .gte('created_at')]
 */
function buildCostMock(data: { ai_cost_cents: number | null }[]) {
  const result = { data, error: null };
  const eqResult = makeAwaitableWithGte(result);
  const eqFn = vi.fn().mockReturnValue(eqResult);
  const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
  return { select: selectFn };
}

/**
 * Creates a full mock Supabase client for the enhanced ai-cost-summary endpoint.
 * Query order:
 *   1. consultations: select ai_cost_cents where status='complete' [optional gte]
 *   2. ai_calls: select * where task='face-analysis' [optional gte]
 *   3. ai_calls: select * where task='consultation' [optional gte]
 *   4. ai_calls: select * where task='preview' [optional gte]
 *   5. consultations: select id (count) where status='complete' [optional gte]
 */
function createEnhancedMock({
  consultationCosts = [] as { ai_cost_cents: number | null }[],
  totalCount = 0,
  faceAnalysisCalls = [] as AICallRow[],
  consultationCalls = [] as AICallRow[],
  previewCalls = [] as AICallRow[],
} = {}) {
  let fromCallCount = 0;

  const mockFrom = vi.fn().mockImplementation((_table: string) => {
    fromCallCount++;
    const call = fromCallCount;

    if (call === 1) return buildCostMock(consultationCosts);
    if (call === 2) return buildAICallsMock(faceAnalysisCalls);
    if (call === 3) return buildAICallsMock(consultationCalls);
    if (call === 4) return buildAICallsMock(previewCalls);
    if (call === 5) return buildCountMock(totalCount);

    return buildAICallsMock([]);
  });

  return { from: mockFrom };
}

describe('GET /api/admin/ai-cost-summary - enhanced (Story 10.2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.ADMIN_SECRET = ADMIN_SECRET;
  });

  afterEach(() => {
    delete process.env.ADMIN_SECRET;
  });

  it('returns 401 when no auth header provided', async () => {
    const { GET } = await import('@/app/api/admin/ai-cost-summary/route');
    const req = new NextRequest('http://localhost:3000/api/admin/ai-cost-summary');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns 401 when wrong secret provided', async () => {
    const { GET } = await import('@/app/api/admin/ai-cost-summary/route');
    const req = new NextRequest('http://localhost:3000/api/admin/ai-cost-summary', {
      headers: { Authorization: 'Bearer wrong' },
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('response includes all backward-compatible fields', async () => {
    const mockSupabase = createEnhancedMock({
      consultationCosts: [{ ai_cost_cents: 20 }],
      totalCount: 1,
      faceAnalysisCalls: [{ cost_cents: 5, latency_ms: 800, success: true, provider: 'gemini' }],
      consultationCalls: [{ cost_cents: 15, latency_ms: 1200, success: true, provider: 'gemini' }],
      previewCalls: [{ cost_cents: 4, latency_ms: 3000, success: true, provider: 'kie' }],
    });
    (createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

    const { GET } = await import('@/app/api/admin/ai-cost-summary/route');
    const res = await GET(createAuthorizedRequest());
    const data = await res.json();

    // Backward-compatible fields must still be present
    expect(data).toHaveProperty('avgCostCentsPerConsultation');
    expect(data).toHaveProperty('avgCostCentsPerStep');
    expect(data.avgCostCentsPerStep).toHaveProperty('faceAnalysis');
    expect(data.avgCostCentsPerStep).toHaveProperty('consultation');
    expect(data).toHaveProperty('totalConsultations');
    expect(data).toHaveProperty('alertTriggered');
  });

  it('response includes new latency, success rate, fallback rate fields', async () => {
    const mockSupabase = createEnhancedMock({
      consultationCosts: [{ ai_cost_cents: 20 }],
      totalCount: 1,
      faceAnalysisCalls: [{ cost_cents: 5, latency_ms: 800, success: true, provider: 'gemini' }],
      consultationCalls: [{ cost_cents: 15, latency_ms: 1200, success: true, provider: 'gemini' }],
      previewCalls: [{ cost_cents: 4, latency_ms: 3000, success: true, provider: 'kie' }],
    });
    (createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

    const { GET } = await import('@/app/api/admin/ai-cost-summary/route');
    const res = await GET(createAuthorizedRequest());
    const data = await res.json();

    // New fields
    expect(data).toHaveProperty('avgLatencyMsPerStep');
    expect(data.avgLatencyMsPerStep).toHaveProperty('faceAnalysis');
    expect(data.avgLatencyMsPerStep).toHaveProperty('consultation');
    expect(data.avgLatencyMsPerStep).toHaveProperty('preview');

    expect(data).toHaveProperty('successRatePerStep');
    expect(data.successRatePerStep).toHaveProperty('faceAnalysis');
    expect(data.successRatePerStep).toHaveProperty('consultation');
    expect(data.successRatePerStep).toHaveProperty('preview');

    expect(data).toHaveProperty('fallbackRatePerStep');
    expect(data.fallbackRatePerStep).toHaveProperty('faceAnalysis');
    expect(data.fallbackRatePerStep).toHaveProperty('consultation');
    expect(data.fallbackRatePerStep).toHaveProperty('preview');

    expect(data).toHaveProperty('period');
  });

  it('period defaults to "all" when no ?period query param', async () => {
    const mockSupabase = createEnhancedMock();
    (createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

    const { GET } = await import('@/app/api/admin/ai-cost-summary/route');
    const res = await GET(createAuthorizedRequest());
    const data = await res.json();

    expect(data.period).toBe('all');
  });

  it('period is "24h" when ?period=24h query param provided', async () => {
    const mockSupabase = createEnhancedMock();
    (createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

    const { GET } = await import('@/app/api/admin/ai-cost-summary/route');
    const res = await GET(createAuthorizedRequest('24h'));
    const data = await res.json();

    expect(data.period).toBe('24h');
  });

  it('period is "7d" when ?period=7d query param provided', async () => {
    const mockSupabase = createEnhancedMock();
    (createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

    const { GET } = await import('@/app/api/admin/ai-cost-summary/route');
    const res = await GET(createAuthorizedRequest('7d'));
    const data = await res.json();

    expect(data.period).toBe('7d');
  });

  it('period is "30d" when ?period=30d query param provided', async () => {
    const mockSupabase = createEnhancedMock();
    (createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

    const { GET } = await import('@/app/api/admin/ai-cost-summary/route');
    const res = await GET(createAuthorizedRequest('30d'));
    const data = await res.json();

    expect(data.period).toBe('30d');
  });

  it('computes avgLatencyMsPerStep correctly from ai_calls data', async () => {
    const mockSupabase = createEnhancedMock({
      consultationCosts: [],
      totalCount: 0,
      faceAnalysisCalls: [
        { cost_cents: 5, latency_ms: 1000, success: true, provider: 'gemini' },
        { cost_cents: 5, latency_ms: 2000, success: true, provider: 'gemini' },
      ],
      consultationCalls: [
        { cost_cents: 15, latency_ms: 500, success: true, provider: 'gemini' },
      ],
      previewCalls: [
        { cost_cents: 4, latency_ms: 3000, success: false, provider: 'kie' },
        { cost_cents: 4, latency_ms: 5000, success: true, provider: 'kie' },
      ],
    });
    (createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

    const { GET } = await import('@/app/api/admin/ai-cost-summary/route');
    const res = await GET(createAuthorizedRequest());
    const data = await res.json();

    expect(data.avgLatencyMsPerStep.faceAnalysis).toBe(1500); // (1000+2000)/2
    expect(data.avgLatencyMsPerStep.consultation).toBe(500);
    expect(data.avgLatencyMsPerStep.preview).toBe(4000); // (3000+5000)/2
  });

  it('computes successRatePerStep correctly (0.0 to 1.0)', async () => {
    const mockSupabase = createEnhancedMock({
      consultationCosts: [],
      totalCount: 0,
      faceAnalysisCalls: [
        { cost_cents: 5, latency_ms: 1000, success: true, provider: 'gemini' },
        { cost_cents: 5, latency_ms: 1000, success: true, provider: 'gemini' },
        { cost_cents: 5, latency_ms: 1000, success: false, provider: 'gemini' },
        { cost_cents: 5, latency_ms: 1000, success: false, provider: 'gemini' },
      ],
      consultationCalls: [
        { cost_cents: 15, latency_ms: 500, success: true, provider: 'gemini' },
        { cost_cents: 15, latency_ms: 500, success: true, provider: 'gemini' },
        { cost_cents: 15, latency_ms: 500, success: true, provider: 'gemini' },
        { cost_cents: 15, latency_ms: 500, success: false, provider: 'gemini' },
      ],
      previewCalls: [
        { cost_cents: 4, latency_ms: 3000, success: true, provider: 'kie' },
      ],
    });
    (createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

    const { GET } = await import('@/app/api/admin/ai-cost-summary/route');
    const res = await GET(createAuthorizedRequest());
    const data = await res.json();

    expect(data.successRatePerStep.faceAnalysis).toBe(0.5);   // 2/4
    expect(data.successRatePerStep.consultation).toBe(0.75);  // 3/4
    expect(data.successRatePerStep.preview).toBe(1.0);        // 1/1
  });

  it('computes fallbackRatePerStep correctly using provider-to-primary mapping', async () => {
    const mockSupabase = createEnhancedMock({
      consultationCosts: [],
      totalCount: 0,
      // face-analysis fallback = provider='openai'
      faceAnalysisCalls: [
        { cost_cents: 5, latency_ms: 1000, success: true, provider: 'gemini' },  // primary
        { cost_cents: 5, latency_ms: 1000, success: true, provider: 'openai' },  // fallback
        { cost_cents: 5, latency_ms: 1000, success: true, provider: 'openai' },  // fallback
        { cost_cents: 5, latency_ms: 1000, success: true, provider: 'gemini' },  // primary
      ],
      // consultation fallback = provider='openai'
      consultationCalls: [
        { cost_cents: 15, latency_ms: 500, success: true, provider: 'gemini' },  // primary
        { cost_cents: 15, latency_ms: 500, success: true, provider: 'gemini' },  // primary
        { cost_cents: 15, latency_ms: 500, success: true, provider: 'gemini' },  // primary
        { cost_cents: 15, latency_ms: 500, success: true, provider: 'openai' },  // fallback
      ],
      // preview fallback = provider='gemini' (primary is 'kie')
      previewCalls: [
        { cost_cents: 4, latency_ms: 3000, success: true, provider: 'kie' },     // primary
        { cost_cents: 4, latency_ms: 3000, success: true, provider: 'gemini' },  // fallback
      ],
    });
    (createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

    const { GET } = await import('@/app/api/admin/ai-cost-summary/route');
    const res = await GET(createAuthorizedRequest());
    const data = await res.json();

    expect(data.fallbackRatePerStep.faceAnalysis).toBe(0.5);      // 2/4
    expect(data.fallbackRatePerStep.consultation).toBe(0.25);     // 1/4
    expect(data.fallbackRatePerStep.preview).toBe(0.5);           // 1/2
  });

  it('returns zeros for new fields when no data exists', async () => {
    const mockSupabase = createEnhancedMock({
      consultationCosts: [],
      totalCount: 0,
      faceAnalysisCalls: [],
      consultationCalls: [],
      previewCalls: [],
    });
    (createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

    const { GET } = await import('@/app/api/admin/ai-cost-summary/route');
    const res = await GET(createAuthorizedRequest());
    const data = await res.json();

    expect(data.avgLatencyMsPerStep.faceAnalysis).toBe(0);
    expect(data.avgLatencyMsPerStep.consultation).toBe(0);
    expect(data.avgLatencyMsPerStep.preview).toBe(0);
    expect(data.successRatePerStep.faceAnalysis).toBe(0);
    expect(data.successRatePerStep.consultation).toBe(0);
    expect(data.successRatePerStep.preview).toBe(0);
    expect(data.fallbackRatePerStep.faceAnalysis).toBe(0);
    expect(data.fallbackRatePerStep.consultation).toBe(0);
    expect(data.fallbackRatePerStep.preview).toBe(0);
  });

  it('existing fields remain unchanged (backward compatibility)', async () => {
    const mockSupabase = createEnhancedMock({
      consultationCosts: [{ ai_cost_cents: 20 }, { ai_cost_cents: 22 }],
      totalCount: 2,
      faceAnalysisCalls: [{ cost_cents: 4, latency_ms: 1000, success: true, provider: 'gemini' }],
      consultationCalls: [{ cost_cents: 16, latency_ms: 900, success: true, provider: 'gemini' }],
      previewCalls: [],
    });
    (createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

    const { GET } = await import('@/app/api/admin/ai-cost-summary/route');
    const res = await GET(createAuthorizedRequest());
    const data = await res.json();

    // Existing fields values should match original logic
    expect(data.avgCostCentsPerConsultation).toBe(21); // (20+22)/2
    expect(data.totalConsultations).toBe(2);
    expect(data.alertTriggered).toBe(false);
    expect(data.avgCostCentsPerStep.faceAnalysis).toBe(4);
    expect(data.avgCostCentsPerStep.consultation).toBe(16);
  });
});
