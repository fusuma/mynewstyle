/**
 * Tests for ResultsRatedEventPayload analytics event type
 * Story 10.5: Post-Consultation Rating — AC #8
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ResultsRatedEventPayload, AnalyticsEvent } from '@/lib/utils/analytics';

// Mock the tracker
vi.mock('@/lib/analytics/tracker', () => ({
  trackEvent: vi.fn(),
  flushEvents: vi.fn(),
}));

describe('ResultsRatedEventPayload — analytics type (AC #8)', () => {
  it('ResultsRatedEventPayload has the correct shape', () => {
    const payload: ResultsRatedEventPayload = {
      type: 'results_rated',
      rating: 4,
      hasDetails: true,
      consultationId: 'abc-123',
    };
    expect(payload.type).toBe('results_rated');
    expect(payload.rating).toBe(4);
    expect(payload.hasDetails).toBe(true);
    expect(payload.consultationId).toBe('abc-123');
  });

  it('AnalyticsEvent union accepts ResultsRatedEventPayload', () => {
    const event: AnalyticsEvent = {
      type: 'results_rated',
      rating: 5,
      hasDetails: false,
      consultationId: 'consultation-uuid',
    };
    expect(event.type).toBe('results_rated');
  });

  it('trackEvent accepts and dispatches results_rated event', async () => {
    const { trackEvent } = await import('@/lib/utils/analytics');
    const event: ResultsRatedEventPayload = {
      type: 'results_rated',
      rating: 3,
      hasDetails: false,
      consultationId: 'test-id',
    };
    expect(() => trackEvent(event)).not.toThrow();
  });

  it('trackEvent dispatches with all required fields', async () => {
    const { trackEvent } = await import('@/lib/utils/analytics');
    const mockTrackEventBase = vi.fn();
    vi.doMock('@/lib/analytics/tracker', () => ({
      trackEvent: mockTrackEventBase,
      flushEvents: vi.fn(),
    }));

    const event: ResultsRatedEventPayload = {
      type: 'results_rated',
      rating: 5,
      hasDetails: true,
      consultationId: 'consultation-uuid-456',
    };
    expect(event.type).toBe('results_rated');
    expect(typeof event.rating).toBe('number');
    expect(event.rating).toBeGreaterThanOrEqual(1);
    expect(event.rating).toBeLessThanOrEqual(5);
    expect(typeof event.hasDetails).toBe('boolean');
    expect(typeof event.consultationId).toBe('string');
  });
});
