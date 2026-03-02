import { describe, it, expect, vi, beforeEach } from 'vitest';
import { persistAICallLog } from '@/lib/ai';
import type { AICallLog } from '@/types';
import { NextRequest } from 'next/server';

// Mock NextResponse for route tests
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

// Mock Supabase server client for route tests
vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: vi.fn(),
}));

import { createServiceRoleClient } from '@/lib/supabase/server';

const mockAICallLog: AICallLog = {
  id: 'test-uuid-123',
  provider: 'gemini',
  model: 'gemini-2.5-flash',
  task: 'face-analysis',
  inputTokens: 1000,
  outputTokens: 500,
  costCents: 0.045,
  latencyMs: 1200,
  success: true,
  timestamp: '2026-03-02T10:00:00.000Z',
};

describe('persistAICallLog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inserts a row into ai_calls with correct snake_case field mapping', async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
    const mockSupabase = { from: mockFrom } as ReturnType<typeof createServiceRoleClient>;

    await persistAICallLog(mockSupabase, 'consultation-uuid-456', mockAICallLog);

    expect(mockFrom).toHaveBeenCalledWith('ai_calls');
    expect(mockInsert).toHaveBeenCalledWith({
      id: 'test-uuid-123',
      consultation_id: 'consultation-uuid-456',
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      task: 'face-analysis',
      input_tokens: 1000,
      output_tokens: 500,
      cost_cents: 0.045,
      latency_ms: 1200,
      success: true,
      error: null,
      timestamp: '2026-03-02T10:00:00.000Z',
    });
  });

  it('does not throw when insert returns an error — logs to console.error', async () => {
    const dbError = { message: 'DB insert failed', code: '23503' };
    const mockInsert = vi.fn().mockResolvedValue({ error: dbError });
    const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
    const mockSupabase = { from: mockFrom } as ReturnType<typeof createServiceRoleClient>;

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Should NOT throw
    await expect(persistAICallLog(mockSupabase, 'consultation-uuid-456', mockAICallLog)).resolves.toBeUndefined();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[AI Cost Tracking] Failed to persist AI call:',
      dbError
    );

    consoleErrorSpy.mockRestore();
  });

  it('handles log with optional error field (sets error: null when undefined)', async () => {
    const logWithoutError: AICallLog = { ...mockAICallLog, error: undefined };
    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
    const mockSupabase = { from: mockFrom } as ReturnType<typeof createServiceRoleClient>;

    await persistAICallLog(mockSupabase, 'consultation-id', logWithoutError);

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ error: null })
    );
  });

  it('handles log with error string set', async () => {
    const logWithError: AICallLog = { ...mockAICallLog, error: 'Provider timeout' };
    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
    const mockSupabase = { from: mockFrom } as ReturnType<typeof createServiceRoleClient>;

    await persistAICallLog(mockSupabase, 'consultation-id', logWithError);

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Provider timeout' })
    );
  });
});

describe('GET /api/admin/ai-cost-summary', () => {
  const ADMIN_SECRET = 'test-admin-secret-123';

  beforeEach(() => {
    vi.clearAllMocks();
    // Set the ADMIN_SECRET env var for all tests in this suite
    process.env.ADMIN_SECRET = ADMIN_SECRET;
  });

  afterEach(() => {
    delete process.env.ADMIN_SECRET;
  });

  /**
   * Helper to create an authorized NextRequest for the admin endpoint.
   */
  function createAuthorizedRequest(): NextRequest {
    return new NextRequest('http://localhost:3000/api/admin/ai-cost-summary', {
      headers: { Authorization: `Bearer ${ADMIN_SECRET}` },
    });
  }

  /**
   * Helper to create a mock Supabase client for the ai-cost-summary route.
   * The enhanced route (Story 10.2) makes 5 queries:
   *   1. consultations: select ai_cost_cents where status='complete'
   *   2. ai_calls: select cost_cents,latency_ms,success,provider where task='face-analysis'
   *   3. ai_calls: select cost_cents,latency_ms,success,provider where task='consultation'
   *   4. ai_calls: select cost_cents,latency_ms,success,provider where task='preview'
   *   5. consultations: select id (count) where status='complete'
   */
  function createMockSupabaseForCostSummary({
    completedConsultations = [] as { ai_cost_cents: number | null }[],
    faceAnalysisLogs = [] as { cost_cents: number; latency_ms?: number; success?: boolean; provider?: string }[],
    consultationLogs = [] as { cost_cents: number; latency_ms?: number; success?: boolean; provider?: string }[],
    totalCount = 0,
  } = {}) {
    // Normalize legacy test data to include new fields (defaults for backward compat)
    const normalizeLogs = (logs: { cost_cents: number; latency_ms?: number; success?: boolean; provider?: string }[]) =>
      logs.map((l) => ({ cost_cents: l.cost_cents, latency_ms: l.latency_ms ?? 0, success: l.success ?? true, provider: l.provider ?? 'gemini' }));

    const faceAnalysisData = normalizeLogs(faceAnalysisLogs);
    const consultationData = normalizeLogs(consultationLogs);

    // Helper: make awaitable that also supports .gte() chaining
    function makeChainable<T>(result: T) {
      const p = Promise.resolve(result);
      return Object.assign(p, { gte: vi.fn().mockReturnValue(p) });
    }

    let fromCallCount = 0;
    const mockFrom = vi.fn().mockImplementation((_table: string) => {  // eslint-disable-line @typescript-eslint/no-unused-vars
      fromCallCount++;
      const currentCall = fromCallCount;

      if (currentCall === 1) {
        // First from('consultations'): select ai_cost_cents
        const eqResult = makeChainable({ data: completedConsultations, error: null });
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue(eqResult) }) };
      } else if (currentCall === 2) {
        // Second from('ai_calls'): face-analysis
        const eqResult = makeChainable({ data: faceAnalysisData, error: null });
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue(eqResult) }) };
      } else if (currentCall === 3) {
        // Third from('ai_calls'): consultation
        const eqResult = makeChainable({ data: consultationData, error: null });
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue(eqResult) }) };
      } else if (currentCall === 4) {
        // Fourth from('ai_calls'): preview (empty for backward-compat tests)
        const eqResult = makeChainable({ data: [], error: null });
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue(eqResult) }) };
      } else {
        // Fifth from('consultations'): count
        const eqResult = makeChainable({ count: totalCount, error: null });
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue(eqResult) }) };
      }
    });

    return { from: mockFrom };
  }

  it('returns 401 when no Authorization header is provided', async () => {
    const { GET } = await import('@/app/api/admin/ai-cost-summary/route');
    const request = new NextRequest('http://localhost:3000/api/admin/ai-cost-summary');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 401 when Authorization header has wrong secret', async () => {
    const { GET } = await import('@/app/api/admin/ai-cost-summary/route');
    const request = new NextRequest('http://localhost:3000/api/admin/ai-cost-summary', {
      headers: { Authorization: 'Bearer wrong-secret' },
    });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 401 when ADMIN_SECRET env var is not set', async () => {
    delete process.env.ADMIN_SECRET;
    const { GET } = await import('@/app/api/admin/ai-cost-summary/route');
    const request = createAuthorizedRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
    // Restore for subsequent tests
    process.env.ADMIN_SECRET = ADMIN_SECRET;
  });

  it('returns correct response shape with all four required fields', async () => {
    const mockSupabase = createMockSupabaseForCostSummary({
      completedConsultations: [{ ai_cost_cents: 20 }, { ai_cost_cents: 22 }],
      faceAnalysisLogs: [{ cost_cents: 5 }, { cost_cents: 7 }],
      consultationLogs: [{ cost_cents: 15 }, { cost_cents: 15 }],
      totalCount: 2,
    });
    (createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

    const { GET } = await import('@/app/api/admin/ai-cost-summary/route');
    const response = await GET(createAuthorizedRequest());
    const data = await response.json();

    expect(data).toHaveProperty('avgCostCentsPerConsultation');
    expect(data).toHaveProperty('avgCostCentsPerStep');
    expect(data.avgCostCentsPerStep).toHaveProperty('faceAnalysis');
    expect(data.avgCostCentsPerStep).toHaveProperty('consultation');
    expect(data).toHaveProperty('totalConsultations');
    expect(data).toHaveProperty('alertTriggered');
  });

  it('alertTriggered is true when avgCostCentsPerConsultation > 25', async () => {
    const mockSupabase = createMockSupabaseForCostSummary({
      completedConsultations: [{ ai_cost_cents: 30 }, { ai_cost_cents: 30 }],
      faceAnalysisLogs: [],
      consultationLogs: [],
      totalCount: 2,
    });
    (createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

    const { GET } = await import('@/app/api/admin/ai-cost-summary/route');
    const response = await GET(createAuthorizedRequest());
    const data = await response.json();

    expect(data.avgCostCentsPerConsultation).toBe(30);
    expect(data.alertTriggered).toBe(true);
  });

  it('alertTriggered is false when avgCostCentsPerConsultation < 25', async () => {
    const mockSupabase = createMockSupabaseForCostSummary({
      completedConsultations: [{ ai_cost_cents: 20 }, { ai_cost_cents: 20 }],
      faceAnalysisLogs: [],
      consultationLogs: [],
      totalCount: 2,
    });
    (createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

    const { GET } = await import('@/app/api/admin/ai-cost-summary/route');
    const response = await GET(createAuthorizedRequest());
    const data = await response.json();

    expect(data.avgCostCentsPerConsultation).toBe(20);
    expect(data.alertTriggered).toBe(false);
  });

  it('alertTriggered is false when avgCostCentsPerConsultation equals exactly 25 (threshold is strictly > 25)', async () => {
    const mockSupabase = createMockSupabaseForCostSummary({
      completedConsultations: [{ ai_cost_cents: 25 }, { ai_cost_cents: 25 }],
      faceAnalysisLogs: [],
      consultationLogs: [],
      totalCount: 2,
    });
    (createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

    const { GET } = await import('@/app/api/admin/ai-cost-summary/route');
    const response = await GET(createAuthorizedRequest());
    const data = await response.json();

    expect(data.avgCostCentsPerConsultation).toBe(25);
    expect(data.alertTriggered).toBe(false);
  });

  it('returns zeros when there is no data', async () => {
    const mockSupabase = createMockSupabaseForCostSummary({
      completedConsultations: [],
      faceAnalysisLogs: [],
      consultationLogs: [],
      totalCount: 0,
    });
    (createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

    const { GET } = await import('@/app/api/admin/ai-cost-summary/route');
    const response = await GET(createAuthorizedRequest());
    const data = await response.json();

    expect(data.avgCostCentsPerConsultation).toBe(0);
    expect(data.avgCostCentsPerStep.faceAnalysis).toBe(0);
    expect(data.avgCostCentsPerStep.consultation).toBe(0);
    expect(data.totalConsultations).toBe(0);
    expect(data.alertTriggered).toBe(false);
  });

  it('correctly computes averages per step from ai_calls data', async () => {
    const mockSupabase = createMockSupabaseForCostSummary({
      completedConsultations: [{ ai_cost_cents: 10 }],
      faceAnalysisLogs: [{ cost_cents: 4 }, { cost_cents: 6 }], // avg = 5
      consultationLogs: [{ cost_cents: 10 }, { cost_cents: 20 }], // avg = 15
      totalCount: 1,
    });
    (createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

    const { GET } = await import('@/app/api/admin/ai-cost-summary/route');
    const response = await GET(createAuthorizedRequest());
    const data = await response.json();

    expect(data.avgCostCentsPerStep.faceAnalysis).toBe(5);
    expect(data.avgCostCentsPerStep.consultation).toBe(15);
  });
});
