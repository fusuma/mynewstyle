/**
 * Tests for src/lib/alerts/metrics.ts
 * Story 10.3 — Cost & Quality Alerts
 * AC: #1, #2, #3, #4
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock createServiceRoleClient to allow import of metrics module in test env
vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: vi.fn(),
}));

type MockSupabase = ReturnType<typeof createMockSupabase>;

function createMockSupabase() {
  return {
    from: vi.fn(),
    rpc: vi.fn(),
  };
}

describe('Alert Metrics', () => {
  let mockSupabase: MockSupabase;

  beforeEach(() => {
    vi.resetModules();
    mockSupabase = createMockSupabase();
  });

  describe('getAvgCostPerConsultation', () => {
    it('returns correct average and sample size for completed consultations', async () => {
      const { getAvgCostPerConsultation } = await import('@/lib/alerts/metrics');

      // Mock: consultations query returns rows
      const consultationRows = [
        { ai_cost_cents: 20 },
        { ai_cost_cents: 30 },
        { ai_cost_cents: 25 },
      ];
      const gteResult = Promise.resolve({ data: consultationRows, error: null });
      const eqResult = { gte: vi.fn().mockReturnValue(gteResult) };
      const selectResult = { eq: vi.fn().mockReturnValue(eqResult) };
      mockSupabase.from.mockReturnValue({ select: vi.fn().mockReturnValue(selectResult) });

      const result = await getAvgCostPerConsultation(mockSupabase as never, 60 * 60 * 1000);

      expect(result.value).toBeCloseTo(25, 2); // avg of 20, 30, 25
      expect(result.sampleSize).toBe(3);
    });

    it('returns value=0 and sampleSize=0 when no completed consultations', async () => {
      const { getAvgCostPerConsultation } = await import('@/lib/alerts/metrics');

      const gteResult = Promise.resolve({ data: [], error: null });
      const eqResult = { gte: vi.fn().mockReturnValue(gteResult) };
      const selectResult = { eq: vi.fn().mockReturnValue(eqResult) };
      mockSupabase.from.mockReturnValue({ select: vi.fn().mockReturnValue(selectResult) });

      const result = await getAvgCostPerConsultation(mockSupabase as never, 60 * 60 * 1000);

      expect(result.value).toBe(0);
      expect(result.sampleSize).toBe(0);
    });

    it('handles null ai_cost_cents values gracefully', async () => {
      const { getAvgCostPerConsultation } = await import('@/lib/alerts/metrics');

      const consultationRows = [
        { ai_cost_cents: null },
        { ai_cost_cents: 30 },
      ];
      const gteResult = Promise.resolve({ data: consultationRows, error: null });
      const eqResult = { gte: vi.fn().mockReturnValue(gteResult) };
      const selectResult = { eq: vi.fn().mockReturnValue(eqResult) };
      mockSupabase.from.mockReturnValue({ select: vi.fn().mockReturnValue(selectResult) });

      const result = await getAvgCostPerConsultation(mockSupabase as never, 60 * 60 * 1000);

      // Only non-null values count: 30 / 1 = 30
      expect(result.value).toBe(30);
      expect(result.sampleSize).toBe(1);
    });
  });

  describe('getErrorRate', () => {
    it('returns correct error rate percentage and sample size', async () => {
      const { getErrorRate } = await import('@/lib/alerts/metrics');

      // 10 total calls, 1 failed = 10% error rate
      const aiCallRows = [
        { success: false },
        { success: true },
        { success: true },
        { success: true },
        { success: true },
        { success: true },
        { success: true },
        { success: true },
        { success: true },
        { success: true },
      ];
      const gteResult = Promise.resolve({ data: aiCallRows, error: null });
      const selectResult = { gte: vi.fn().mockReturnValue(gteResult) };
      mockSupabase.from.mockReturnValue({ select: vi.fn().mockReturnValue(selectResult) });

      const result = await getErrorRate(mockSupabase as never, 60 * 60 * 1000);

      expect(result.value).toBe(10);
      expect(result.sampleSize).toBe(10);
    });

    it('returns value=0 and sampleSize=0 when no AI calls', async () => {
      const { getErrorRate } = await import('@/lib/alerts/metrics');

      const gteResult = Promise.resolve({ data: [], error: null });
      const selectResult = { gte: vi.fn().mockReturnValue(gteResult) };
      mockSupabase.from.mockReturnValue({ select: vi.fn().mockReturnValue(selectResult) });

      const result = await getErrorRate(mockSupabase as never, 60 * 60 * 1000);

      expect(result.value).toBe(0);
      expect(result.sampleSize).toBe(0);
    });

    it('returns 0 error rate when all calls succeed', async () => {
      const { getErrorRate } = await import('@/lib/alerts/metrics');

      const aiCallRows = [{ success: true }, { success: true }, { success: true }];
      const gteResult = Promise.resolve({ data: aiCallRows, error: null });
      const selectResult = { gte: vi.fn().mockReturnValue(gteResult) };
      mockSupabase.from.mockReturnValue({ select: vi.fn().mockReturnValue(selectResult) });

      const result = await getErrorRate(mockSupabase as never, 60 * 60 * 1000);

      expect(result.value).toBe(0);
      expect(result.sampleSize).toBe(3);
    });
  });

  describe('getPreviewQualityFailureRate', () => {
    it('returns correct failure rate and sample size', async () => {
      const { getPreviewQualityFailureRate } = await import('@/lib/alerts/metrics');

      // 4 previews completed: 1 unavailable + 3 ready = 25% failure rate
      const recommendationRows = [
        { preview_status: 'unavailable' },
        { preview_status: 'ready' },
        { preview_status: 'ready' },
        { preview_status: 'ready' },
        { preview_status: 'generating' }, // not counted (not completed)
        { preview_status: 'none' },        // not counted
      ];
      const gteResult = Promise.resolve({ data: recommendationRows, error: null });
      const selectResult = { gte: vi.fn().mockReturnValue(gteResult) };
      mockSupabase.from.mockReturnValue({ select: vi.fn().mockReturnValue(selectResult) });

      const result = await getPreviewQualityFailureRate(mockSupabase as never, 24 * 60 * 60 * 1000);

      expect(result.value).toBe(25); // 1/4 * 100 = 25%
      expect(result.sampleSize).toBe(4); // only ready + unavailable count
    });

    it('returns value=0 and sampleSize=0 when no completed previews', async () => {
      const { getPreviewQualityFailureRate } = await import('@/lib/alerts/metrics');

      const recommendationRows = [
        { preview_status: 'generating' },
        { preview_status: 'none' },
      ];
      const gteResult = Promise.resolve({ data: recommendationRows, error: null });
      const selectResult = { gte: vi.fn().mockReturnValue(gteResult) };
      mockSupabase.from.mockReturnValue({ select: vi.fn().mockReturnValue(selectResult) });

      const result = await getPreviewQualityFailureRate(mockSupabase as never, 24 * 60 * 60 * 1000);

      expect(result.value).toBe(0);
      expect(result.sampleSize).toBe(0);
    });

    it('returns 100% when all completed previews are unavailable', async () => {
      const { getPreviewQualityFailureRate } = await import('@/lib/alerts/metrics');

      const recommendationRows = [
        { preview_status: 'unavailable' },
        { preview_status: 'unavailable' },
      ];
      const gteResult = Promise.resolve({ data: recommendationRows, error: null });
      const selectResult = { gte: vi.fn().mockReturnValue(gteResult) };
      mockSupabase.from.mockReturnValue({ select: vi.fn().mockReturnValue(selectResult) });

      const result = await getPreviewQualityFailureRate(mockSupabase as never, 24 * 60 * 60 * 1000);

      expect(result.value).toBe(100);
      expect(result.sampleSize).toBe(2);
    });
  });

  describe('getLatencyP95', () => {
    it('returns p95 value and sample size from RPC', async () => {
      const { getLatencyP95 } = await import('@/lib/alerts/metrics');

      mockSupabase.rpc.mockResolvedValue({
        data: [{ p95_ms: 38000, sample_size: 87 }],
        error: null,
      });

      const result = await getLatencyP95(mockSupabase as never, 60 * 60 * 1000);

      expect(result.value).toBe(38000);
      expect(result.sampleSize).toBe(87);
    });

    it('returns value=0 and sampleSize=0 when RPC returns empty result', async () => {
      const { getLatencyP95 } = await import('@/lib/alerts/metrics');

      mockSupabase.rpc.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await getLatencyP95(mockSupabase as never, 60 * 60 * 1000);

      expect(result.value).toBe(0);
      expect(result.sampleSize).toBe(0);
    });

    it('returns value=0 and sampleSize=0 when RPC returns null p95', async () => {
      const { getLatencyP95 } = await import('@/lib/alerts/metrics');

      mockSupabase.rpc.mockResolvedValue({
        data: [{ p95_ms: null, sample_size: 0 }],
        error: null,
      });

      const result = await getLatencyP95(mockSupabase as never, 60 * 60 * 1000);

      expect(result.value).toBe(0);
      expect(result.sampleSize).toBe(0);
    });

    it('calls RPC with correct window interval string', async () => {
      const { getLatencyP95 } = await import('@/lib/alerts/metrics');

      mockSupabase.rpc.mockResolvedValue({
        data: [{ p95_ms: 32000, sample_size: 50 }],
        error: null,
      });

      await getLatencyP95(mockSupabase as never, 60 * 60 * 1000); // 1 hour

      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'get_face_analysis_p95_latency',
        { window_interval: '01:00:00' }
      );
    });
  });
});
