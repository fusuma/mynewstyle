/**
 * Alert metric query functions for Cost & Quality Alerts (Story 10.3).
 * Each function queries the appropriate Supabase table and returns
 * { value: number, sampleSize: number }.
 *
 * If sampleSize is 0 (no data in window), value is 0 and alert MUST NOT be triggered.
 * AC: #1, #2, #3, #4
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface MetricResult {
  value: number;
  sampleSize: number;
}

/**
 * Converts a window in milliseconds to a PostgreSQL interval string (e.g. '01:00:00').
 */
function msToPostgresInterval(windowMs: number): string {
  const totalSeconds = Math.floor(windowMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [
    String(hours).padStart(2, '0'),
    String(minutes).padStart(2, '0'),
    String(seconds).padStart(2, '0'),
  ].join(':');
}

/**
 * Returns the ISO timestamp for the start of the rolling window.
 */
function windowStartISO(windowMs: number): string {
  return new Date(Date.now() - windowMs).toISOString();
}

/**
 * AC1: Average AI cost per consultation (cents) over a rolling time window.
 * Queries the `consultations` table for completed consultations within the window.
 */
export async function getAvgCostPerConsultation(
  supabase: SupabaseClient,
  windowMs: number
): Promise<MetricResult> {
  const since = windowStartISO(windowMs);

  const { data, error } = await supabase
    .from('consultations')
    .select('ai_cost_cents')
    .eq('status', 'complete')
    .gte('completed_at', since);

  if (error) {
    console.error('[Alert Metrics] getAvgCostPerConsultation query failed:', error);
    return { value: 0, sampleSize: 0 };
  }

  const rows = (data ?? []) as { ai_cost_cents: number | null }[];
  const withCost = rows.filter((r) => r.ai_cost_cents != null);

  if (withCost.length === 0) {
    return { value: 0, sampleSize: 0 };
  }

  const avg = withCost.reduce((sum, r) => sum + (r.ai_cost_cents ?? 0), 0) / withCost.length;
  return { value: avg, sampleSize: withCost.length };
}

/**
 * AC2: AI error rate (failed / total * 100%) over a rolling time window.
 * Queries the `ai_calls` table for all calls within the window.
 */
export async function getErrorRate(
  supabase: SupabaseClient,
  windowMs: number
): Promise<MetricResult> {
  const since = windowStartISO(windowMs);

  const { data, error } = await supabase
    .from('ai_calls')
    .select('success')
    .gte('timestamp', since);

  if (error) {
    console.error('[Alert Metrics] getErrorRate query failed:', error);
    return { value: 0, sampleSize: 0 };
  }

  const rows = (data ?? []) as { success: boolean }[];
  const total = rows.length;

  if (total === 0) {
    return { value: 0, sampleSize: 0 };
  }

  const failedCount = rows.filter((r) => r.success === false).length;
  const errorRate = (failedCount / total) * 100;
  return { value: errorRate, sampleSize: total };
}

/**
 * AC3: Preview quality gate failure rate over a rolling time window.
 * Queries the `recommendations` table for previews with status 'ready' or 'unavailable'.
 * Returns: unavailable / (ready + unavailable) * 100%
 */
export async function getPreviewQualityFailureRate(
  supabase: SupabaseClient,
  windowMs: number
): Promise<MetricResult> {
  const since = windowStartISO(windowMs);

  const { data, error } = await supabase
    .from('recommendations')
    .select('preview_status')
    .gte('created_at', since);

  if (error) {
    console.error('[Alert Metrics] getPreviewQualityFailureRate query failed:', error);
    return { value: 0, sampleSize: 0 };
  }

  const rows = (data ?? []) as { preview_status: string }[];
  // Only count completed previews (ready or unavailable = quality gate failure)
  const completed = rows.filter(
    (r) => r.preview_status === 'ready' || r.preview_status === 'unavailable'
  );
  const sampleSize = completed.length;

  if (sampleSize === 0) {
    return { value: 0, sampleSize: 0 };
  }

  const unavailableCount = completed.filter((r) => r.preview_status === 'unavailable').length;
  const failureRate = (unavailableCount / sampleSize) * 100;
  return { value: failureRate, sampleSize };
}

/**
 * AC4: P95 latency for face-analysis AI calls over a rolling time window.
 * Uses the Supabase RPC function `get_face_analysis_p95_latency` since PERCENTILE_CONT
 * is not directly supported by the Supabase JS client.
 */
export async function getLatencyP95(
  supabase: SupabaseClient,
  windowMs: number
): Promise<MetricResult> {
  const windowInterval = msToPostgresInterval(windowMs);

  const { data, error } = await supabase.rpc('get_face_analysis_p95_latency', {
    window_interval: windowInterval,
  });

  if (error) {
    console.error('[Alert Metrics] getLatencyP95 RPC failed:', error);
    return { value: 0, sampleSize: 0 };
  }

  const rows = (data ?? []) as { p95_ms: number | null; sample_size: number | null }[];
  if (rows.length === 0 || rows[0].p95_ms == null || rows[0].sample_size == null) {
    return { value: 0, sampleSize: 0 };
  }

  return {
    value: Number(rows[0].p95_ms),
    sampleSize: Number(rows[0].sample_size),
  };
}
