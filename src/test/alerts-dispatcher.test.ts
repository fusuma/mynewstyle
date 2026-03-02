/**
 * Tests for src/lib/alerts/dispatcher.ts
 * Story 10.3 — Cost & Quality Alerts
 * AC: #5, #7
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: vi.fn(),
}));

type MockSupabase = {
  from: ReturnType<typeof vi.fn>;
};

function createMockSupabase(): MockSupabase {
  return { from: vi.fn() };
}

const ONE_HOUR_MS = 60 * 60 * 1000;

describe('Alert Dispatcher', () => {
  let mockSupabase: MockSupabase;
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    vi.resetModules();
    mockSupabase = createMockSupabase();
    // Save and clear env vars
    savedEnv.ALERT_WEBHOOK_URL = process.env.ALERT_WEBHOOK_URL;
    delete process.env.ALERT_WEBHOOK_URL;
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    vi.unstubAllGlobals();
  });

  describe('isAlertDuplicate', () => {
    it('returns true when an alert of the same type was sent within the dedup window', async () => {
      const { isAlertDuplicate } = await import('@/lib/alerts/dispatcher');

      // Simulate: one recent alert found
      const recentAlert = [{ id: 'abc', triggered_at: new Date().toISOString() }];
      const limitResult = Promise.resolve({ data: recentAlert, error: null });
      const gteResult = { limit: vi.fn().mockReturnValue(limitResult) };
      const orderResult = { gte: vi.fn().mockReturnValue(gteResult) };
      const eqResult = { order: vi.fn().mockReturnValue(orderResult) };
      const selectResult = { eq: vi.fn().mockReturnValue(eqResult) };
      mockSupabase.from.mockReturnValue({ select: vi.fn().mockReturnValue(selectResult) });

      const result = await isAlertDuplicate(mockSupabase as never, 'cost', ONE_HOUR_MS);
      expect(result).toBe(true);
    });

    it('returns false when no recent alert of the same type exists', async () => {
      const { isAlertDuplicate } = await import('@/lib/alerts/dispatcher');

      const limitResult = Promise.resolve({ data: [], error: null });
      const gteResult = { limit: vi.fn().mockReturnValue(limitResult) };
      const orderResult = { gte: vi.fn().mockReturnValue(gteResult) };
      const eqResult = { order: vi.fn().mockReturnValue(orderResult) };
      const selectResult = { eq: vi.fn().mockReturnValue(eqResult) };
      mockSupabase.from.mockReturnValue({ select: vi.fn().mockReturnValue(selectResult) });

      const result = await isAlertDuplicate(mockSupabase as never, 'cost', ONE_HOUR_MS);
      expect(result).toBe(false);
    });
  });

  describe('recordAlert', () => {
    it('inserts alert into alert_history table with correct fields', async () => {
      const { recordAlert } = await import('@/lib/alerts/dispatcher');
      const { AlertType } = await import('@/lib/alerts/config');

      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({ insert: mockInsert });

      await recordAlert(mockSupabase as never, {
        alertType: AlertType.cost,
        metricValue: 32.5,
        threshold: 25,
        windowDescription: '1 hour',
        sampleSize: 42,
        triggeredAt: '2026-03-02T14:30:00.000Z',
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('alert_history');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          alert_type: 'cost',
          metric_value: 32.5,
          threshold: 25,
          sample_size: 42,
        })
      );
    });
  });

  describe('dispatchAlert', () => {
    it('POSTs to ALERT_WEBHOOK_URL when configured', async () => {
      process.env.ALERT_WEBHOOK_URL = 'https://hooks.example.com/test';
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));

      const { dispatchAlert } = await import('@/lib/alerts/dispatcher');
      const { AlertType } = await import('@/lib/alerts/config');

      await dispatchAlert({
        alertType: AlertType.cost,
        metricValue: 32.5,
        threshold: 25,
        windowDescription: '1 hour',
        sampleSize: 42,
        triggeredAt: '2026-03-02T14:30:00.000Z',
      });

      expect(fetch).toHaveBeenCalledWith(
        'https://hooks.example.com/test',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        })
      );

      const callArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.alertType).toBe('cost');
      expect(body.metricValue).toBe(32.5);
      expect(body.threshold).toBe(25);
    });

    it('logs to console with [ALERT] prefix when no webhook URL configured', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const { dispatchAlert } = await import('@/lib/alerts/dispatcher');
      const { AlertType } = await import('@/lib/alerts/config');

      await dispatchAlert({
        alertType: AlertType.error_rate,
        metricValue: 7.5,
        threshold: 5,
        windowDescription: '1 hour',
        sampleSize: 100,
        triggeredAt: '2026-03-02T14:30:00.000Z',
      });

      expect(fetch).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ALERT]'),
        expect.anything()
      );

      consoleSpy.mockRestore();
    });

    it('catches and logs fetch errors without throwing', async () => {
      process.env.ALERT_WEBHOOK_URL = 'https://hooks.example.com/test';
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { dispatchAlert } = await import('@/lib/alerts/dispatcher');
      const { AlertType } = await import('@/lib/alerts/config');

      // Should NOT throw
      await expect(
        dispatchAlert({
          alertType: AlertType.cost,
          metricValue: 32.5,
          threshold: 25,
          windowDescription: '1 hour',
          sampleSize: 42,
          triggeredAt: '2026-03-02T14:30:00.000Z',
        })
      ).resolves.toBeUndefined();

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('processAlert', () => {
    it('dispatches alert and records it when not a duplicate', async () => {
      const { processAlert } = await import('@/lib/alerts/dispatcher');
      const { AlertType } = await import('@/lib/alerts/config');

      // isAlertDuplicate: no duplicates
      const limitResult = Promise.resolve({ data: [], error: null });
      const gteResult = { limit: vi.fn().mockReturnValue(limitResult) };
      const orderResult = { gte: vi.fn().mockReturnValue(gteResult) };
      const eqResult = { order: vi.fn().mockReturnValue(orderResult) };
      const selectResult = { eq: vi.fn().mockReturnValue(eqResult) };

      // recordAlert: successful insert
      const mockInsert = vi.fn().mockResolvedValue({ error: null });

      let fromCallCount = 0;
      mockSupabase.from.mockImplementation(() => {
        fromCallCount++;
        if (fromCallCount === 1) {
          // isAlertDuplicate query
          return { select: vi.fn().mockReturnValue(selectResult) };
        } else {
          // recordAlert insert
          return { insert: mockInsert };
        }
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await processAlert(
        mockSupabase as never,
        {
          alertType: AlertType.cost,
          metricValue: 32.5,
          threshold: 25,
          windowDescription: '1 hour',
          sampleSize: 42,
          triggeredAt: new Date().toISOString(),
        },
        ONE_HOUR_MS
      );

      expect(result.dispatched).toBe(true);
      expect(mockInsert).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('does NOT dispatch when alert is a duplicate', async () => {
      const { processAlert } = await import('@/lib/alerts/dispatcher');
      const { AlertType } = await import('@/lib/alerts/config');

      // isAlertDuplicate: duplicate found
      const recentAlert = [{ id: 'abc', triggered_at: new Date().toISOString() }];
      const limitResult = Promise.resolve({ data: recentAlert, error: null });
      const gteResult = { limit: vi.fn().mockReturnValue(limitResult) };
      const orderResult = { gte: vi.fn().mockReturnValue(gteResult) };
      const eqResult = { order: vi.fn().mockReturnValue(orderResult) };
      const selectResult = { eq: vi.fn().mockReturnValue(eqResult) };
      mockSupabase.from.mockReturnValue({ select: vi.fn().mockReturnValue(selectResult) });

      const result = await processAlert(
        mockSupabase as never,
        {
          alertType: AlertType.cost,
          metricValue: 32.5,
          threshold: 25,
          windowDescription: '1 hour',
          sampleSize: 42,
          triggeredAt: new Date().toISOString(),
        },
        ONE_HOUR_MS
      );

      expect(result.dispatched).toBe(false);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('records alert in history after successful dispatch', async () => {
      const { processAlert } = await import('@/lib/alerts/dispatcher');
      const { AlertType } = await import('@/lib/alerts/config');

      // No duplicate
      const limitResult = Promise.resolve({ data: [], error: null });
      const gteResult = { limit: vi.fn().mockReturnValue(limitResult) };
      const orderResult = { gte: vi.fn().mockReturnValue(gteResult) };
      const eqResult = { order: vi.fn().mockReturnValue(orderResult) };
      const selectResult = { eq: vi.fn().mockReturnValue(eqResult) };
      const mockInsert = vi.fn().mockResolvedValue({ error: null });

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return { select: vi.fn().mockReturnValue(selectResult) };
        return { insert: mockInsert };
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await processAlert(
        mockSupabase as never,
        {
          alertType: AlertType.latency_p95,
          metricValue: 50000,
          threshold: 45000,
          windowDescription: '1 hour',
          sampleSize: 87,
          triggeredAt: new Date().toISOString(),
        },
        ONE_HOUR_MS
      );

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({ alert_type: 'latency_p95' })
      );

      consoleSpy.mockRestore();
    });
  });
});
