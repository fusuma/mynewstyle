import { describe, it, expect } from 'vitest';
import {
  AnalyticsEventType,
  type DeviceInfo,
  type AnalyticsEventRecord,
} from '@/lib/analytics/types';

describe('AnalyticsEventType enum', () => {
  it('has all 16 required event types', () => {
    const expectedTypes = [
      'gender_selected',
      'photo_captured',
      'photo_rejected',
      'questionnaire_started',
      'questionnaire_completed',
      'questionnaire_abandoned',
      'face_analysis_completed',
      'paywall_shown',
      'payment_completed',
      'payment_failed',
      'consultation_completed',
      'preview_requested',
      'preview_completed',
      'barber_card_generated',
      'share_generated',
      'results_rated',
    ];

    const enumValues = Object.values(AnalyticsEventType);
    expect(enumValues).toHaveLength(16);
    for (const expected of expectedTypes) {
      expect(enumValues).toContain(expected);
    }
  });

  it('has gender_selected event type', () => {
    expect(AnalyticsEventType.GENDER_SELECTED).toBe('gender_selected');
  });

  it('has photo_captured event type', () => {
    expect(AnalyticsEventType.PHOTO_CAPTURED).toBe('photo_captured');
  });

  it('has photo_rejected event type', () => {
    expect(AnalyticsEventType.PHOTO_REJECTED).toBe('photo_rejected');
  });

  it('has questionnaire_started event type', () => {
    expect(AnalyticsEventType.QUESTIONNAIRE_STARTED).toBe('questionnaire_started');
  });

  it('has questionnaire_completed event type', () => {
    expect(AnalyticsEventType.QUESTIONNAIRE_COMPLETED).toBe('questionnaire_completed');
  });

  it('has questionnaire_abandoned event type', () => {
    expect(AnalyticsEventType.QUESTIONNAIRE_ABANDONED).toBe('questionnaire_abandoned');
  });

  it('has face_analysis_completed event type', () => {
    expect(AnalyticsEventType.FACE_ANALYSIS_COMPLETED).toBe('face_analysis_completed');
  });

  it('has paywall_shown event type', () => {
    expect(AnalyticsEventType.PAYWALL_SHOWN).toBe('paywall_shown');
  });

  it('has payment_completed event type', () => {
    expect(AnalyticsEventType.PAYMENT_COMPLETED).toBe('payment_completed');
  });

  it('has payment_failed event type', () => {
    expect(AnalyticsEventType.PAYMENT_FAILED).toBe('payment_failed');
  });

  it('has consultation_completed event type', () => {
    expect(AnalyticsEventType.CONSULTATION_COMPLETED).toBe('consultation_completed');
  });

  it('has preview_requested event type', () => {
    expect(AnalyticsEventType.PREVIEW_REQUESTED).toBe('preview_requested');
  });

  it('has preview_completed event type', () => {
    expect(AnalyticsEventType.PREVIEW_COMPLETED).toBe('preview_completed');
  });

  it('has barber_card_generated event type', () => {
    expect(AnalyticsEventType.BARBER_CARD_GENERATED).toBe('barber_card_generated');
  });

  it('has share_generated event type', () => {
    expect(AnalyticsEventType.SHARE_GENERATED).toBe('share_generated');
  });

  it('has results_rated event type', () => {
    expect(AnalyticsEventType.RESULTS_RATED).toBe('results_rated');
  });
});

describe('DeviceInfo interface', () => {
  it('can create a valid DeviceInfo object', () => {
    const deviceInfo: DeviceInfo = {
      browser: 'Chrome',
      browserVersion: '120.0',
      os: 'macOS',
      osVersion: '14.0',
      screenWidth: 1920,
      screenHeight: 1080,
      viewportWidth: 1440,
      viewportHeight: 900,
      isMobile: false,
    };
    expect(deviceInfo.browser).toBe('Chrome');
    expect(deviceInfo.isMobile).toBe(false);
    expect(deviceInfo.screenWidth).toBe(1920);
  });
});

describe('AnalyticsEventRecord interface', () => {
  it('can create a valid record', () => {
    const record: AnalyticsEventRecord = {
      id: 'test-uuid',
      session_id: 'session-uuid',
      user_id: null,
      event_type: 'gender_selected',
      event_data: { gender: 'male' },
      device_info: {},
      created_at: new Date().toISOString(),
    };
    expect(record.event_type).toBe('gender_selected');
    expect(record.user_id).toBeNull();
  });
});
