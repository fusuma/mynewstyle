/**
 * Tests for GET /api/admin/alerts/check
 * Story 10.3 — Cost & Quality Alerts
 * AC: #6, #8, #9
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

// Mock fetch for webhook dispatch
vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));

import { createServiceRoleClient } from '@/lib/supabase/server';

const ADMIN_SECRET = 'test-admin-secret-alerts';
const CRON_SECRET = 'test-cron-secret-alerts';

function createAuthorizedRequest(): NextRequest {
  return new NextRequest('http://localhost:3000/api/admin/alerts/check', {
    headers: { Authorization: `Bearer ${ADMIN_SECRET}` },
  });
}

function createCronRequest(): NextRequest {
  return new NextRequest('http://localhost:3000/api/admin/alerts/check', {
    headers: { Authorization: `Bearer ${CRON_SECRET}` },
  });
}

function createUnauthorizedRequest(): NextRequest {
  return new NextRequest('http://localhost:3000/api/admin/alerts/check');
}

/**
 * Creates a mock Supabase client for the alerts/check route.
 * The route makes multiple queries (metrics + deduplication checks + inserts).
 * We configure it to return 'all clear' (no alerts triggered) by default.
 */
function createMockSupabase({
  avgCost = 18.5,
  errorRateData = [{ success: true }, { success: true }],
  previewData = [{ preview_status: 'ready' }, { preview_status: 'ready' }],
  p95LatencyData = [{ p95_ms: 32000, sample_size: 87 }],
  duplicateExists = false,
}: {
  avgCost?: number;
  errorRateData?: { success: boolean }[];
  previewData?: { preview_status: string }[];
  p95LatencyData?: { p95_ms: number | null; sample_size: number }[];
  duplicateExists?: boolean;
} = {}) {
  const mockRpc = vi.fn().mockResolvedValue({ data: p95LatencyData, error: null });

  // Deduplication results
  const dupData = duplicateExists ? [{ id: 'dup-id' }] : [];
  const dupLimitResult = Promise.resolve({ data: dupData, error: null });
  const dupGteResult = { limit: vi.fn().mockReturnValue(dupLimitResult) };
  const dupOrderResult = { gte: vi.fn().mockReturnValue(dupGteResult) };
  const dupEqResult = { order: vi.fn().mockReturnValue(dupOrderResult) };
  const dupSelectResult = { eq: vi.fn().mockReturnValue(dupEqResult) };

  // Alert history insert result
  const mockInsert = vi.fn().mockResolvedValue({ error: null });

  let alertHistoryCallCount = 0;
  const mockFrom = vi.fn().mockImplementation((table: string) => {
    if (table === 'consultations') {
      // getAvgCostPerConsultation query
      const rows = avgCost > 0 ? [{ ai_cost_cents: avgCost }] : [];
      const gteResult = Promise.resolve({ data: rows, error: null });
      const eqResult = { gte: vi.fn().mockReturnValue(gteResult) };
      return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue(eqResult) }) };
    }

    if (table === 'ai_calls') {
      // getErrorRate query
      const gteResult = Promise.resolve({ data: errorRateData, error: null });
      return { select: vi.fn().mockReturnValue({ gte: vi.fn().mockReturnValue(gteResult) }) };
    }

    if (table === 'recommendations') {
      // getPreviewQualityFailureRate query
      const gteResult = Promise.resolve({ data: previewData, error: null });
      return { select: vi.fn().mockReturnValue({ gte: vi.fn().mockReturnValue(gteResult) }) };
    }

    if (table === 'alert_history') {
      alertHistoryCallCount++;
      // Odd calls = isAlertDuplicate (select), even calls = recordAlert (insert)
      if (alertHistoryCallCount % 2 === 1) {
        return { select: vi.fn().mockReturnValue(dupSelectResult) };
      } else {
        return { insert: mockInsert };
      }
    }

    return { select: vi.fn(), insert: vi.fn() };
  });

  return { from: mockFrom, rpc: mockRpc };
}

describe('GET /api/admin/alerts/check', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ADMIN_SECRET = ADMIN_SECRET;
    process.env.CRON_SECRET = CRON_SECRET;
    delete process.env.ALERT_WEBHOOK_URL;
    delete process.env.ALERT_COST_THRESHOLD_CENTS;
    delete process.env.ALERT_ERROR_RATE_PERCENT;
    delete process.env.ALERT_PREVIEW_QUALITY_PERCENT;
    delete process.env.ALERT_LATENCY_P95_MS;
  });

  afterEach(() => {
    delete process.env.ADMIN_SECRET;
    delete process.env.CRON_SECRET;
    delete process.env.ALERT_WEBHOOK_URL;
  });

  it('returns 401 when no Authorization header is provided', async () => {
    const { GET } = await import('@/app/api/admin/alerts/check/route');
    const response = await GET(createUnauthorizedRequest());
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 401 when Authorization header has wrong secret', async () => {
    const { GET } = await import('@/app/api/admin/alerts/check/route');
    const request = new NextRequest('http://localhost:3000/api/admin/alerts/check', {
      headers: { Authorization: 'Bearer wrong-secret' },
    });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('accepts CRON_SECRET as a valid authorization token', async () => {
    const mockSupabase = createMockSupabase();
    (createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

    const { GET } = await import('@/app/api/admin/alerts/check/route');
    const response = await GET(createCronRequest());

    expect(response.status).toBe(200);
  });

  it('returns all four checks in the response', async () => {
    const mockSupabase = createMockSupabase();
    (createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

    const { GET } = await import('@/app/api/admin/alerts/check/route');
    const response = await GET(createAuthorizedRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.checks).toHaveProperty('cost');
    expect(data.checks).toHaveProperty('error_rate');
    expect(data.checks).toHaveProperty('preview_quality');
    expect(data.checks).toHaveProperty('latency_p95');
  });

  it('returns correct response shape with timestamp, alertsTriggered, and checks', async () => {
    const mockSupabase = createMockSupabase();
    (createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

    const { GET } = await import('@/app/api/admin/alerts/check/route');
    const response = await GET(createAuthorizedRequest());
    const data = await response.json();

    expect(data).toHaveProperty('timestamp');
    expect(data).toHaveProperty('alertsTriggered');
    expect(typeof data.alertsTriggered).toBe('number');
    // Each check should have value, threshold, triggered, sampleSize, dispatched, and window (AC9)
    for (const check of Object.values(data.checks) as Record<string, unknown>[]) {
      expect(check).toHaveProperty('value');
      expect(check).toHaveProperty('threshold');
      expect(check).toHaveProperty('triggered');
      expect(check).toHaveProperty('sampleSize');
      expect(check).toHaveProperty('dispatched');
      expect(check).toHaveProperty('window'); // AC9: time windows queryable from response
    }
  });

  it('triggered is false and alertsTriggered is 0 when all metrics are below threshold', async () => {
    const mockSupabase = createMockSupabase({
      avgCost: 18.5,    // below 25 threshold
      errorRateData: [{ success: true }],  // 0% error rate
      previewData: [{ preview_status: 'ready' }],  // 0% failure rate
      p95LatencyData: [{ p95_ms: 32000, sample_size: 87 }],  // below 45000ms
    });
    (createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

    const { GET } = await import('@/app/api/admin/alerts/check/route');
    const response = await GET(createAuthorizedRequest());
    const data = await response.json();

    expect(data.alertsTriggered).toBe(0);
    expect(data.checks.cost.triggered).toBe(false);
    expect(data.checks.error_rate.triggered).toBe(false);
    expect(data.checks.preview_quality.triggered).toBe(false);
    expect(data.checks.latency_p95.triggered).toBe(false);
  });

  it('does NOT trigger alert when sampleSize is 0 (no data in window)', async () => {
    const mockSupabase = createMockSupabase({
      avgCost: 0,  // no data
      errorRateData: [],  // no AI calls
      previewData: [],  // no previews
      p95LatencyData: [],  // no face analysis calls
    });
    (createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

    const { GET } = await import('@/app/api/admin/alerts/check/route');
    const response = await GET(createAuthorizedRequest());
    const data = await response.json();

    expect(data.alertsTriggered).toBe(0);
    expect(data.checks.cost.sampleSize).toBe(0);
    expect(data.checks.cost.triggered).toBe(false);
  });

  it('triggers cost alert and dispatches when cost exceeds threshold', async () => {
    const mockSupabase = createMockSupabase({
      avgCost: 35,  // above 25 threshold
      duplicateExists: false,
    });
    (createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const { GET } = await import('@/app/api/admin/alerts/check/route');
    const response = await GET(createAuthorizedRequest());
    const data = await response.json();

    expect(data.checks.cost.triggered).toBe(true);
    expect(data.checks.cost.dispatched).toBe(true);
    expect(data.alertsTriggered).toBeGreaterThanOrEqual(1);

    consoleSpy.mockRestore();
  });

  it('respects deduplication — dispatched is false when duplicate alert exists', async () => {
    const mockSupabase = createMockSupabase({
      avgCost: 35,  // would trigger
      duplicateExists: true,  // already sent recently
    });
    (createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

    const { GET } = await import('@/app/api/admin/alerts/check/route');
    const response = await GET(createAuthorizedRequest());
    const data = await response.json();

    // triggered = true (metric exceeds threshold) but dispatched = false (dedup prevented it)
    expect(data.checks.cost.triggered).toBe(true);
    expect(data.checks.cost.dispatched).toBe(false);
  });
});
