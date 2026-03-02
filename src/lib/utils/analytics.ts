/**
 * Analytics event tracking utility (Story 9-3, Story 9-4)
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

/** Story 9-4: Preview image share/download event (AC: 7) */
export interface PreviewSharedEventPayload {
  type: 'preview_shared';
  recommendationRank: number;
  method: 'share' | 'download';
  styleName: string;
}

export type AnalyticsEvent = ShareEventPayload | PreviewSharedEventPayload;

/**
 * Track a share event.
 * Currently logs to console with [analytics] prefix for Epic 10 integration.
 */
export function trackShareEvent(event: ShareEventPayload): void {
  // TODO(Epic 10): Replace with analytics_events table insert when analytics system is built
  console.log('[analytics]', event);
}

/**
 * Track any analytics event.
 * Currently logs to console with [analytics] prefix for Epic 10 integration.
 */
export function trackEvent(event: AnalyticsEvent): void {
  // TODO(Epic 10): Replace with analytics_events table insert when analytics system is built
  console.log('[analytics]', event);
}
