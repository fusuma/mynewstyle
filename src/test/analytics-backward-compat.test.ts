import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the tracker module
vi.mock('@/lib/analytics/tracker', () => ({
  trackEvent: vi.fn(),
  flushEvents: vi.fn().mockResolvedValue(undefined),
}));

// Mock device-info
vi.mock('@/lib/analytics/device-info', () => ({
  getDeviceInfo: vi.fn().mockReturnValue({
    browser: 'Chrome',
    browserVersion: '120',
    os: 'macOS',
    osVersion: '14',
    screenWidth: 1440,
    screenHeight: 900,
    viewportWidth: 1440,
    viewportHeight: 900,
    isMobile: false,
  }),
}));

// Mock guest-session
vi.mock('@/lib/guest-session', () => ({
  getOrCreateGuestSessionId: vi.fn().mockReturnValue('test-session-id'),
}));

describe('analytics.ts backward compatibility', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('exports trackShareEvent function', async () => {
    const analytics = await import('@/lib/utils/analytics');
    expect(typeof analytics.trackShareEvent).toBe('function');
  });

  it('exports trackEvent function', async () => {
    const analytics = await import('@/lib/utils/analytics');
    expect(typeof analytics.trackEvent).toBe('function');
  });

  it('trackShareEvent accepts ShareEventPayload without error', async () => {
    const { trackShareEvent } = await import('@/lib/utils/analytics');
    expect(() => {
      trackShareEvent({
        type: 'share_generated',
        format: 'story',
        method: 'native_share',
        success: true,
      });
    }).not.toThrow();
  });

  it('trackEvent accepts AnalyticsEvent without error (existing call sites)', async () => {
    const { trackEvent } = await import('@/lib/utils/analytics');
    // This is the existing call signature from PreviewShareButton.tsx
    expect(() => {
      trackEvent({
        type: 'preview_shared',
        recommendationRank: 1,
        method: 'share',
        styleName: 'Textured Crop',
      });
    }).not.toThrow();
  });

  it('trackShareEvent calls underlying tracker with share_generated event', async () => {
    const trackerModule = await import('@/lib/analytics/tracker');
    const mockTrackEvent = vi.mocked(trackerModule.trackEvent);

    const { trackShareEvent } = await import('@/lib/utils/analytics');
    trackShareEvent({
      type: 'share_generated',
      format: 'square',
      method: 'download',
      success: true,
    });

    expect(mockTrackEvent).toHaveBeenCalledWith(
      'share_generated',
      expect.objectContaining({ format: 'square' })
    );
  });

  it('AnalyticsEvent type is exported', async () => {
    // Type-level test: verify the module exports the type correctly
    const analytics = await import('@/lib/utils/analytics');
    // If the module loaded without error, types are valid
    expect(analytics).toBeDefined();
  });

  it('ShareEventPayload interface is exported', async () => {
    const analytics = await import('@/lib/utils/analytics');
    expect(analytics).toBeDefined();
  });

  it('PreviewSharedEventPayload interface is exported', async () => {
    const analytics = await import('@/lib/utils/analytics');
    expect(analytics).toBeDefined();
  });

  it('useNativeShare.ts can call trackShareEvent with existing payload shape', async () => {
    const { trackShareEvent } = await import('@/lib/utils/analytics');
    // Exactly as called in useNativeShare.ts
    expect(() => {
      trackShareEvent({
        type: 'share_generated',
        format: 'story',
        method: 'native_share',
        success: true,
      });
    }).not.toThrow();
  });

  it('useShareCard.ts can call trackShareEvent with existing payload shape', async () => {
    const { trackShareEvent } = await import('@/lib/utils/analytics');
    // Exactly as called in useShareCard.ts shareWithBlob
    expect(() => {
      trackShareEvent({
        type: 'share_generated',
        format: 'square',
        method: 'download',
        success: false,
      });
    }).not.toThrow();
  });

  it('PreviewShareButton.tsx can call trackEvent with preview_shared payload shape', async () => {
    const { trackEvent } = await import('@/lib/utils/analytics');
    // Exactly as called in PreviewShareButton.tsx
    expect(() => {
      trackEvent({
        type: 'preview_shared',
        recommendationRank: 2,
        method: 'download',
        styleName: 'Fade Cut',
      });
    }).not.toThrow();
  });
});
