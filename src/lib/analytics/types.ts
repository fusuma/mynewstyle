/**
 * Analytics Event System — Types
 * Story 10.1: Analytics Event System
 *
 * Defines the TypeScript enum, typed payload union, and interfaces
 * for the analytics_events table.
 */

/**
 * All analytics event types tracked in the system.
 * Values match the event_type column in analytics_events table (text).
 */
export enum AnalyticsEventType {
  GENDER_SELECTED = 'gender_selected',
  PHOTO_CAPTURED = 'photo_captured',
  PHOTO_REJECTED = 'photo_rejected',
  QUESTIONNAIRE_STARTED = 'questionnaire_started',
  QUESTIONNAIRE_COMPLETED = 'questionnaire_completed',
  QUESTIONNAIRE_ABANDONED = 'questionnaire_abandoned',
  FACE_ANALYSIS_COMPLETED = 'face_analysis_completed',
  PAYWALL_SHOWN = 'paywall_shown',
  PAYMENT_COMPLETED = 'payment_completed',
  PAYMENT_FAILED = 'payment_failed',
  CONSULTATION_COMPLETED = 'consultation_completed',
  PREVIEW_REQUESTED = 'preview_requested',
  PREVIEW_COMPLETED = 'preview_completed',
  BARBER_CARD_GENERATED = 'barber_card_generated',
  SHARE_GENERATED = 'share_generated',
  RESULTS_RATED = 'results_rated',
  DATA_EXPORT_REQUESTED = 'data_export_requested',
}

/**
 * Typed discriminated union for event_data payloads.
 * Each event type maps to its specific data shape.
 * Based on Architecture Section 9.2.
 */
export type AnalyticsEventPayload =
  | { type: 'gender_selected'; gender: string }
  | { type: 'photo_captured'; method: 'camera' | 'gallery'; sizeKb: number }
  | { type: 'photo_rejected'; reason: string }
  | { type: 'questionnaire_started' }
  | { type: 'questionnaire_completed'; durationMs: number }
  | { type: 'questionnaire_abandoned'; lastQuestion: number }
  | { type: 'face_analysis_completed'; faceShape: string; confidence: number }
  | { type: 'paywall_shown'; price: number; isReturning: boolean }
  | { type: 'payment_completed'; amount: number }
  | { type: 'payment_failed'; reason: string }
  | { type: 'consultation_completed'; durationMs: number }
  | { type: 'preview_requested'; recommendationRank: number }
  | { type: 'preview_completed'; durationMs: number; qualityGate: 'pass' | 'fail' }
  | { type: 'barber_card_generated' }
  | { type: 'share_generated'; format: string }
  | { type: 'results_rated'; rating: number }
  | { type: 'data_export_requested'; userId: string };

/**
 * Device information captured on each analytics event.
 * Collected client-side via navigator and window APIs.
 */
export interface DeviceInfo {
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  screenWidth: number;
  screenHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  isMobile: boolean;
}

/**
 * Full database row shape for analytics_events table.
 */
export interface AnalyticsEventRecord {
  id: string;
  session_id: string;
  user_id: string | null;
  event_type: string;
  event_data: Record<string, unknown>;
  device_info: Record<string, unknown>;
  created_at: string;
}

/**
 * Shape of an event queued client-side before being sent to API.
 */
export interface QueuedAnalyticsEvent {
  eventType: string;
  eventData: Record<string, unknown>;
  sessionId: string;
  deviceInfo: Partial<DeviceInfo>;
  timestamp: string;
}
