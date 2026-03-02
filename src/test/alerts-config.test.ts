/**
 * Tests for src/lib/alerts/config.ts
 * Story 10.3 — Cost & Quality Alerts
 * AC: #1, #2, #3, #4
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('Alert Configuration', () => {
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    // Save current env vars
    savedEnv.ALERT_COST_THRESHOLD_CENTS = process.env.ALERT_COST_THRESHOLD_CENTS;
    savedEnv.ALERT_ERROR_RATE_PERCENT = process.env.ALERT_ERROR_RATE_PERCENT;
    savedEnv.ALERT_PREVIEW_QUALITY_PERCENT = process.env.ALERT_PREVIEW_QUALITY_PERCENT;
    savedEnv.ALERT_LATENCY_P95_MS = process.env.ALERT_LATENCY_P95_MS;

    // Clear env vars to test defaults
    delete process.env.ALERT_COST_THRESHOLD_CENTS;
    delete process.env.ALERT_ERROR_RATE_PERCENT;
    delete process.env.ALERT_PREVIEW_QUALITY_PERCENT;
    delete process.env.ALERT_LATENCY_P95_MS;
  });

  afterEach(() => {
    // Restore env vars
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  describe('AlertType enum', () => {
    it('defines all four alert types', async () => {
      const { AlertType } = await import('@/lib/alerts/config');
      expect(AlertType.cost).toBe('cost');
      expect(AlertType.error_rate).toBe('error_rate');
      expect(AlertType.preview_quality).toBe('preview_quality');
      expect(AlertType.latency_p95).toBe('latency_p95');
    });
  });

  describe('ALERT_CONFIGS', () => {
    it('defines configs for all four alert types', async () => {
      const { ALERT_CONFIGS, AlertType } = await import('@/lib/alerts/config');
      expect(ALERT_CONFIGS).toHaveProperty(AlertType.cost);
      expect(ALERT_CONFIGS).toHaveProperty(AlertType.error_rate);
      expect(ALERT_CONFIGS).toHaveProperty(AlertType.preview_quality);
      expect(ALERT_CONFIGS).toHaveProperty(AlertType.latency_p95);
    });

    it('cost config has correct defaults and window', async () => {
      const { ALERT_CONFIGS, AlertType } = await import('@/lib/alerts/config');
      const costConfig = ALERT_CONFIGS[AlertType.cost];
      expect(costConfig.defaultThreshold).toBe(25);
      expect(costConfig.windowMs).toBe(60 * 60 * 1000); // 1 hour
      expect(costConfig.windowDescription).toBe('1 hour');
      expect(costConfig.thresholdEnvVar).toBe('ALERT_COST_THRESHOLD_CENTS');
    });

    it('error_rate config has correct defaults and window', async () => {
      const { ALERT_CONFIGS, AlertType } = await import('@/lib/alerts/config');
      const config = ALERT_CONFIGS[AlertType.error_rate];
      expect(config.defaultThreshold).toBe(5);
      expect(config.windowMs).toBe(60 * 60 * 1000); // 1 hour
      expect(config.windowDescription).toBe('1 hour');
      expect(config.thresholdEnvVar).toBe('ALERT_ERROR_RATE_PERCENT');
    });

    it('preview_quality config has correct defaults and 24-hour window', async () => {
      const { ALERT_CONFIGS, AlertType } = await import('@/lib/alerts/config');
      const config = ALERT_CONFIGS[AlertType.preview_quality];
      expect(config.defaultThreshold).toBe(20);
      expect(config.windowMs).toBe(24 * 60 * 60 * 1000); // 24 hours
      expect(config.windowDescription).toBe('24 hours');
      expect(config.thresholdEnvVar).toBe('ALERT_PREVIEW_QUALITY_PERCENT');
    });

    it('latency_p95 config has correct defaults and window', async () => {
      const { ALERT_CONFIGS, AlertType } = await import('@/lib/alerts/config');
      const config = ALERT_CONFIGS[AlertType.latency_p95];
      expect(config.defaultThreshold).toBe(45000);
      expect(config.windowMs).toBe(60 * 60 * 1000); // 1 hour
      expect(config.windowDescription).toBe('1 hour');
      expect(config.thresholdEnvVar).toBe('ALERT_LATENCY_P95_MS');
    });
  });

  describe('getAlertThreshold', () => {
    it('returns default value when env var is not set', async () => {
      const { getAlertThreshold, AlertType } = await import('@/lib/alerts/config');
      expect(getAlertThreshold(AlertType.cost)).toBe(25);
      expect(getAlertThreshold(AlertType.error_rate)).toBe(5);
      expect(getAlertThreshold(AlertType.preview_quality)).toBe(20);
      expect(getAlertThreshold(AlertType.latency_p95)).toBe(45000);
    });

    it('returns env var value when ALERT_COST_THRESHOLD_CENTS is set', async () => {
      process.env.ALERT_COST_THRESHOLD_CENTS = '50';
      const { getAlertThreshold, AlertType } = await import('@/lib/alerts/config');
      expect(getAlertThreshold(AlertType.cost)).toBe(50);
    });

    it('returns env var value when ALERT_ERROR_RATE_PERCENT is set', async () => {
      process.env.ALERT_ERROR_RATE_PERCENT = '10';
      const { getAlertThreshold, AlertType } = await import('@/lib/alerts/config');
      expect(getAlertThreshold(AlertType.error_rate)).toBe(10);
    });

    it('returns env var value when ALERT_PREVIEW_QUALITY_PERCENT is set', async () => {
      process.env.ALERT_PREVIEW_QUALITY_PERCENT = '30';
      const { getAlertThreshold, AlertType } = await import('@/lib/alerts/config');
      expect(getAlertThreshold(AlertType.preview_quality)).toBe(30);
    });

    it('returns env var value when ALERT_LATENCY_P95_MS is set', async () => {
      process.env.ALERT_LATENCY_P95_MS = '60000';
      const { getAlertThreshold, AlertType } = await import('@/lib/alerts/config');
      expect(getAlertThreshold(AlertType.latency_p95)).toBe(60000);
    });
  });
});
