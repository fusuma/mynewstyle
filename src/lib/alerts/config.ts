/**
 * Alert threshold configuration for Cost & Quality Alerts (Story 10.3).
 * All thresholds are read from environment variables with sensible defaults.
 * AC: #1, #2, #3, #4
 */

/** Enum of all supported alert types */
export enum AlertType {
  cost = 'cost',
  error_rate = 'error_rate',
  preview_quality = 'preview_quality',
  latency_p95 = 'latency_p95',
}

/** Configuration for a single alert type */
export interface AlertConfig {
  type: AlertType;
  /** Environment variable name for the threshold */
  thresholdEnvVar: string;
  /** Default threshold value if env var is not set */
  defaultThreshold: number;
  /** Rolling time window in milliseconds */
  windowMs: number;
  /** Human-readable time window label (e.g. '1 hour', '24 hours') — used in webhook payloads and API responses */
  windowDescription: string;
  /** Human-readable description of the alert */
  description: string;
}

const ONE_HOUR_MS = 60 * 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

/**
 * Complete configuration for all four alert types.
 * AC1: cost threshold 25 cents, 1-hour window
 * AC2: error rate 5%, 1-hour window
 * AC3: preview quality 20%, 24-hour window
 * AC4: p95 latency 45000ms, 1-hour window
 */
export const ALERT_CONFIGS: Record<AlertType, AlertConfig> = {
  [AlertType.cost]: {
    type: AlertType.cost,
    thresholdEnvVar: 'ALERT_COST_THRESHOLD_CENTS',
    defaultThreshold: 25,
    windowMs: ONE_HOUR_MS,
    windowDescription: '1 hour',
    description: 'Average AI cost per consultation (cents) over 1-hour rolling window',
  },
  [AlertType.error_rate]: {
    type: AlertType.error_rate,
    thresholdEnvVar: 'ALERT_ERROR_RATE_PERCENT',
    defaultThreshold: 5,
    windowMs: ONE_HOUR_MS,
    windowDescription: '1 hour',
    description: 'AI call error rate (%) over 1-hour rolling window',
  },
  [AlertType.preview_quality]: {
    type: AlertType.preview_quality,
    thresholdEnvVar: 'ALERT_PREVIEW_QUALITY_PERCENT',
    defaultThreshold: 20,
    windowMs: TWENTY_FOUR_HOURS_MS,
    windowDescription: '24 hours',
    description: 'Preview quality gate failure rate (%) over 24-hour rolling window',
  },
  [AlertType.latency_p95]: {
    type: AlertType.latency_p95,
    thresholdEnvVar: 'ALERT_LATENCY_P95_MS',
    defaultThreshold: 45000,
    windowMs: ONE_HOUR_MS,
    windowDescription: '1 hour',
    description: 'P95 latency for face-analysis AI calls (ms) over 1-hour rolling window',
  },
};

/**
 * Reads the threshold for a given alert type from env vars, falling back to the default.
 */
export function getAlertThreshold(type: AlertType): number {
  const config = ALERT_CONFIGS[type];
  const envValue = process.env[config.thresholdEnvVar];
  if (envValue !== undefined && envValue !== '') {
    const parsed = Number(envValue);
    if (!isNaN(parsed)) {
      return parsed;
    }
  }
  return config.defaultThreshold;
}
