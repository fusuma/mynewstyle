/**
 * Analytics Integration Tests
 * Story 10.1, Task 8.5
 *
 * End-to-end flow: track event -> batch -> flush -> API -> DB insert
 * Tests the full analytics pipeline working together.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fetch for API calls
const mockFetch = vi.fn().mockResolvedValue({
  ok: true,
  json: vi.fn().mockResolvedValue({ success: true, count: 1 }),
});
global.fetch = mockFetch;

// Mock guest session
vi.mock('@/lib/guest-session', () => ({
  getOrCreateGuestSessionId: vi.fn().mockReturnValue('integration-test-session-id'),
}));

// Mock device info
vi.mock('@/lib/analytics/device-info', () => ({
  getDeviceInfo: vi.fn().mockReturnValue({
    browser: 'Chrome',
    browserVersion: '120.0',
    os: 'macOS',
    osVersion: '14.0',
    screenWidth: 1440,
    screenHeight: 900,
    viewportWidth: 1440,
    viewportHeight: 900,
    isMobile: false,
  }),
}));

describe('Analytics Integration: track -> batch -> flush -> API', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    mockFetch.mockClear();
  });

  afterEach(async () => {
    // Clean up tracker state
    const tracker = await import('@/lib/analytics/tracker');
    tracker._resetTracker();
    vi.useRealTimers();
  });

  it('full pipeline: trackEvent queues event and flushes to API', async () => {
    const { trackEvent, flushEvents } = await import('@/lib/analytics/tracker');
    const { AnalyticsEventType } = await import('@/lib/analytics/types');

    // Track an event
    trackEvent(AnalyticsEventType.GENDER_SELECTED, { gender: 'male' });

    // Manually flush
    await flushEvents();

    // Verify API was called
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/analytics/events',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );

    // Verify payload structure
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.events).toHaveLength(1);
    expect(body.events[0]).toMatchObject({
      eventType: 'gender_selected',
      eventData: { gender: 'male' },
      sessionId: 'integration-test-session-id',
      deviceInfo: expect.objectContaining({ browser: 'Chrome' }),
    });
    expect(body.events[0].timestamp).toBeDefined();
  });

  it('batches multiple events before flushing', async () => {
    const { trackEvent, flushEvents } = await import('@/lib/analytics/tracker');
    const { AnalyticsEventType } = await import('@/lib/analytics/types');

    // Track multiple events
    trackEvent(AnalyticsEventType.GENDER_SELECTED, { gender: 'male' });
    trackEvent(AnalyticsEventType.PHOTO_CAPTURED, { method: 'camera', sizeKb: 250 });
    trackEvent(AnalyticsEventType.QUESTIONNAIRE_STARTED);

    await flushEvents();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.events).toHaveLength(3);
    expect(body.events[0].eventType).toBe('gender_selected');
    expect(body.events[1].eventType).toBe('photo_captured');
    expect(body.events[2].eventType).toBe('questionnaire_started');
  });

  it('each event includes correct sessionId from guest session', async () => {
    const { trackEvent, flushEvents } = await import('@/lib/analytics/tracker');
    const { AnalyticsEventType } = await import('@/lib/analytics/types');

    trackEvent(AnalyticsEventType.PAYWALL_SHOWN, { price: 599, isReturning: false });
    await flushEvents();

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.events[0].sessionId).toBe('integration-test-session-id');
  });

  it('each event includes deviceInfo from getDeviceInfo()', async () => {
    const { trackEvent, flushEvents } = await import('@/lib/analytics/tracker');
    const { AnalyticsEventType } = await import('@/lib/analytics/types');

    trackEvent(AnalyticsEventType.QUESTIONNAIRE_COMPLETED, { durationMs: 45000 });
    await flushEvents();

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.events[0].deviceInfo).toMatchObject({
      browser: 'Chrome',
      os: 'macOS',
      isMobile: false,
    });
  });

  it('auto-flushes after 5-second timer', async () => {
    const { trackEvent } = await import('@/lib/analytics/tracker');
    const { AnalyticsEventType } = await import('@/lib/analytics/types');

    trackEvent(AnalyticsEventType.FACE_ANALYSIS_COMPLETED, {
      faceShape: 'oval',
      confidence: 0.92,
    });

    expect(mockFetch).not.toHaveBeenCalled();

    // Advance fake timer by 5 seconds
    vi.advanceTimersByTime(5000);
    await Promise.resolve();
    await Promise.resolve();

    expect(mockFetch).toHaveBeenCalled();
  });

  it('handles API failure gracefully (fire-and-forget)', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network failure'));

    const { trackEvent, flushEvents } = await import('@/lib/analytics/tracker');
    const { AnalyticsEventType } = await import('@/lib/analytics/types');

    trackEvent(AnalyticsEventType.PAYMENT_FAILED, { reason: 'card_declined' });

    // Should not throw
    await expect(flushEvents()).resolves.not.toThrow();

    // No retry
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('queue is cleared after successful flush', async () => {
    const { trackEvent, flushEvents } = await import('@/lib/analytics/tracker');
    const { AnalyticsEventType } = await import('@/lib/analytics/types');

    trackEvent(AnalyticsEventType.CONSULTATION_COMPLETED, { durationMs: 60000 });
    await flushEvents();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    mockFetch.mockClear();

    // Second flush should be empty (queue was cleared)
    await flushEvents();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('flushes at batch size threshold without waiting for timer', async () => {
    const { trackEvent } = await import('@/lib/analytics/tracker');
    const { AnalyticsEventType } = await import('@/lib/analytics/types');

    // Add 9 events — should not flush yet
    for (let i = 0; i < 9; i++) {
      trackEvent(AnalyticsEventType.QUESTIONNAIRE_STARTED);
    }
    expect(mockFetch).not.toHaveBeenCalled();

    // 10th event triggers immediate flush
    trackEvent(AnalyticsEventType.QUESTIONNAIRE_COMPLETED, { durationMs: 30000 });

    // Allow microtasks to resolve
    await Promise.resolve();
    await Promise.resolve();

    expect(mockFetch).toHaveBeenCalled();
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.events).toHaveLength(10);
  });

  it('API endpoint receives correct JSON structure', async () => {
    const { trackEvent, flushEvents } = await import('@/lib/analytics/tracker');
    const { AnalyticsEventType } = await import('@/lib/analytics/types');

    trackEvent(AnalyticsEventType.SHARE_GENERATED, { format: 'story' });
    await flushEvents();

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('/api/analytics/events');
    expect(options.method).toBe('POST');
    expect(options.headers).toEqual({ 'Content-Type': 'application/json' });

    const body = JSON.parse(options.body);
    expect(body).toHaveProperty('events');
    expect(Array.isArray(body.events)).toBe(true);
  });
});
