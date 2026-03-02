/**
 * Analytics event tracking utility
 * Story 10.1: Analytics Event System — replaces console.log stubs
 *
 * This module re-exports from the real analytics implementation in src/lib/analytics/.
 * Maintains backward-compatible function signatures for existing callers:
 * - PreviewShareButton.tsx → trackEvent({ type: 'preview_shared', ... })
 * - useNativeShare.ts     → trackShareEvent({ type: 'share_generated', ... })
 * - useShareCard.ts       → trackShareEvent({ type: 'share_generated', ... })
 */

export { trackEvent as trackEventBase, flushEvents } from '@/lib/analytics/tracker';
export type { DeviceInfo, AnalyticsEventRecord } from '@/lib/analytics/types';
import { AnalyticsEventType } from '@/lib/analytics/types';
import { trackEvent as _trackEvent } from '@/lib/analytics/tracker';

/**
 * Payload for share events (backward-compatible type preserved from Stories 9-3 / 9-4).
 */
export interface ShareEventPayload {
  type: 'share_generated';
  format: 'story' | 'square';
  method: 'native_share' | 'download' | 'copy_link';
  success: boolean;
}

/**
 * Payload for preview shared events (backward-compatible type from Story 9-4).
 * NOTE: 'preview_shared' is not a standard AnalyticsEventType enum value —
 * it is a legacy type used in PreviewShareButton. The standard type is 'share_generated'.
 */
export interface PreviewSharedEventPayload {
  type: 'preview_shared';
  recommendationRank: number;
  method: 'share' | 'download';
  styleName: string;
}

/**
 * Union of all analytics event payload types (backward-compatible).
 * Superset of the new typed union from src/lib/analytics/types.ts.
 */
export type AnalyticsEvent = ShareEventPayload | PreviewSharedEventPayload;

/**
 * Track a share event.
 * Delegates to the real analytics tracker with fire-and-forget semantics.
 */
export function trackShareEvent(event: ShareEventPayload): void {
  const { type, ...eventData } = event;
  _trackEvent(type as AnalyticsEventType, eventData);
}

/**
 * Track any analytics event (backward-compatible overload).
 * Accepts the legacy AnalyticsEvent union shape (ShareEventPayload | PreviewSharedEventPayload).
 * Delegates to the real analytics tracker with fire-and-forget semantics.
 */
export function trackEvent(event: AnalyticsEvent): void {
  const { type, ...eventData } = event;
  _trackEvent(type as AnalyticsEventType, eventData);
}
