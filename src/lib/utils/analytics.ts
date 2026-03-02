/**
 * Analytics event tracking utility (Story 9-3)
 *
 * Tracks user interaction events for analytics purposes.
 * If the analytics_events table (Epic 10) does not yet exist,
 * events are logged to console with a [analytics] prefix for future integration.
 */

export interface ShareEventPayload {
  type: 'share_generated';
  format: 'story' | 'square';
  method: 'native_share' | 'download' | 'copy_link';
  success: boolean;
}

export type AnalyticsEvent = ShareEventPayload;

/**
 * Track a share event.
 * Currently logs to console with [analytics] prefix for Epic 10 integration.
 */
export function trackShareEvent(event: ShareEventPayload): void {
  // TODO(Epic 10): Replace with analytics_events table insert when analytics system is built
  console.log('[analytics]', event);
}
