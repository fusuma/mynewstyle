import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock getOrCreateGuestSessionId
vi.mock('@/lib/guest-session', () => ({
  getOrCreateGuestSessionId: vi.fn().mockReturnValue('test-session-uuid'),
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

// Mock fetch
const mockFetch = vi.fn().mockResolvedValue({
  ok: true,
  json: vi.fn().mockResolvedValue({ success: true }),
});
global.fetch = mockFetch;

// Mock navigator.sendBeacon
const mockSendBeacon = vi.fn().mockReturnValue(true);
Object.defineProperty(navigator, 'sendBeacon', {
  value: mockSendBeacon,
  configurable: true,
  writable: true,
});

describe('Client-side Analytics Tracker', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers();
    mockFetch.mockClear();
    mockSendBeacon.mockClear();
  });

  afterEach(async () => {
    // Reset tracker state to prevent timer leaks between tests
    const tracker = await import('@/lib/analytics/tracker');
    tracker._resetTracker();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('queues an event when trackEvent is called', async () => {
    const { trackEvent, flushEvents } = await import('@/lib/analytics/tracker');
    trackEvent('gender_selected', { gender: 'male' });

    // Force flush
    await flushEvents();

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/analytics/events',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('gender_selected'),
      })
    );
  });

  it('includes session_id in queued events', async () => {
    const { trackEvent, flushEvents } = await import('@/lib/analytics/tracker');
    trackEvent('questionnaire_started');
    await flushEvents();

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.events[0]).toHaveProperty('sessionId', 'test-session-uuid');
  });

  it('includes device_info in queued events', async () => {
    const { trackEvent, flushEvents } = await import('@/lib/analytics/tracker');
    trackEvent('paywall_shown', { price: 599, isReturning: false });
    await flushEvents();

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.events[0]).toHaveProperty('deviceInfo');
    expect(body.events[0].deviceInfo).toHaveProperty('browser', 'Chrome');
  });

  it('includes ISO timestamp in queued events', async () => {
    const { trackEvent, flushEvents } = await import('@/lib/analytics/tracker');
    trackEvent('photo_captured', { method: 'camera', sizeKb: 250 });
    await flushEvents();

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.events[0]).toHaveProperty('timestamp');
    // ISO 8601 format
    expect(body.events[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('flushes when queue reaches 10 events (batch size threshold)', async () => {
    const { trackEvent } = await import('@/lib/analytics/tracker');

    // Queue 9 events — should not flush yet
    for (let i = 0; i < 9; i++) {
      trackEvent('questionnaire_started');
    }
    expect(mockFetch).not.toHaveBeenCalled();

    // 10th event triggers flush
    trackEvent('questionnaire_completed', { durationMs: 5000 });

    // Allow microtasks/promises to resolve (don't runAllTimersAsync — infinite setInterval)
    await Promise.resolve();
    await Promise.resolve();

    expect(mockFetch).toHaveBeenCalled();
  });

  it('flushes after 5-second timer interval', async () => {
    const { trackEvent } = await import('@/lib/analytics/tracker');
    trackEvent('preview_requested', { recommendationRank: 1 });

    expect(mockFetch).not.toHaveBeenCalled();

    // Advance timer by 5 seconds (triggers setInterval callback)
    vi.advanceTimersByTime(5000);
    // Allow the async flush promise to settle
    await Promise.resolve();
    await Promise.resolve();

    expect(mockFetch).toHaveBeenCalled();
  });

  it('silently handles fetch failure (fire-and-forget)', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { trackEvent, flushEvents } = await import('@/lib/analytics/tracker');
    trackEvent('gender_selected', { gender: 'female' });

    // Should not throw
    await expect(flushEvents()).resolves.not.toThrow();
  });

  it('does not retry on failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { trackEvent, flushEvents } = await import('@/lib/analytics/tracker');
    trackEvent('photo_captured', { method: 'gallery', sizeKb: 500 });
    await flushEvents();

    // Only called once, no retry
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('uses sendBeacon for beforeunload event', async () => {
    const { trackEvent } = await import('@/lib/analytics/tracker');
    trackEvent('gender_selected', { gender: 'male' });

    // Trigger beforeunload
    window.dispatchEvent(new Event('beforeunload'));

    expect(mockSendBeacon).toHaveBeenCalledWith(
      '/api/analytics/events',
      expect.any(Blob)
    );
  });

  it('flushes via fetch on visibilitychange when document is hidden', async () => {
    const { trackEvent } = await import('@/lib/analytics/tracker');
    trackEvent('consultation_completed', { durationMs: 30000 });

    // Simulate document becoming hidden
    Object.defineProperty(document, 'hidden', {
      value: true,
      configurable: true,
      writable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));

    // Allow async flush to complete (don't runAllTimersAsync — infinite setInterval)
    await Promise.resolve();
    await Promise.resolve();

    // Either sendBeacon or fetch should be called
    const wasFlushed = mockFetch.mock.calls.length > 0 || mockSendBeacon.mock.calls.length > 0;
    expect(wasFlushed).toBe(true);

    // Reset hidden
    Object.defineProperty(document, 'hidden', {
      value: false,
      configurable: true,
      writable: true,
    });
  });

  it('clears queue after successful flush', async () => {
    const { trackEvent, flushEvents } = await import('@/lib/analytics/tracker');
    trackEvent('gender_selected', { gender: 'male' });
    await flushEvents();

    mockFetch.mockClear();

    // Second flush with empty queue should not call fetch
    await flushEvents();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('batches multiple events in a single fetch call', async () => {
    const { trackEvent, flushEvents } = await import('@/lib/analytics/tracker');
    trackEvent('gender_selected', { gender: 'male' });
    trackEvent('photo_captured', { method: 'camera', sizeKb: 300 });
    trackEvent('questionnaire_started');
    await flushEvents();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.events).toHaveLength(3);
  });
});
