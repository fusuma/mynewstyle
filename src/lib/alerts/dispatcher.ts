/**
 * Alert dispatcher for Cost & Quality Alerts (Story 10.3).
 * Handles alert delivery via webhook or console fallback, deduplication,
 * and recording alerts in the alert_history table.
 * AC: #5, #7
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { AlertType } from './config';

/** Payload for a triggered alert */
export interface AlertPayload {
  alertType: AlertType;
  metricValue: number;
  threshold: number;
  windowDescription: string;
  sampleSize: number;
  triggeredAt: string;
}

/**
 * AC7: Checks if an alert of the same type was already dispatched within the deduplication window.
 * Queries alert_history for recent alerts of the same type.
 */
export async function isAlertDuplicate(
  supabase: SupabaseClient,
  alertType: string,
  windowMs: number
): Promise<boolean> {
  const since = new Date(Date.now() - windowMs).toISOString();

  const { data, error } = await supabase
    .from('alert_history')
    .select('id, triggered_at')
    .eq('alert_type', alertType)
    .order('triggered_at', { ascending: false })
    .gte('triggered_at', since)
    .limit(1);

  if (error) {
    console.error('[Alert Dispatcher] isAlertDuplicate query failed:', error);
    // On DB error, be conservative — assume not duplicate to ensure delivery
    return false;
  }

  return (data ?? []).length > 0;
}

/**
 * AC7: Records an alert in the alert_history table for deduplication tracking.
 */
export async function recordAlert(
  supabase: SupabaseClient,
  payload: AlertPayload
): Promise<void> {
  const { error } = await supabase.from('alert_history').insert({
    alert_type: payload.alertType,
    metric_value: payload.metricValue,
    threshold: payload.threshold,
    sample_size: payload.sampleSize,
    triggered_at: payload.triggeredAt,
  });

  if (error) {
    console.error('[Alert Dispatcher] recordAlert insert failed:', error);
  }
}

/**
 * AC5: Dispatches an alert to the configured webhook URL.
 * Falls back to console.log with [ALERT] prefix if no webhook URL is configured.
 * Errors during dispatch are caught and logged — never propagated (best-effort).
 */
export async function dispatchAlert(payload: AlertPayload): Promise<void> {
  const webhookUrl = process.env.ALERT_WEBHOOK_URL;

  if (!webhookUrl) {
    // Fallback: log to console with [ALERT] prefix
    console.log('[ALERT]', payload);
    return;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alertType: payload.alertType,
        metricValue: payload.metricValue,
        threshold: payload.threshold,
        windowDescription: payload.windowDescription,
        sampleSize: payload.sampleSize,
        triggeredAt: payload.triggeredAt,
        project: 'mynewstyle',
        environment: process.env.NODE_ENV ?? 'production',
      }),
    });

    if (!response.ok) {
      console.error(
        `[Alert Dispatcher] Webhook POST failed: ${response.status} ${response.statusText}`
      );
    }
  } catch (error) {
    // Best-effort: log but never throw — alert delivery must not break the API route
    console.error('[Alert Dispatcher] dispatchAlert fetch error:', error);
  }
}

/**
 * Orchestrates the full alert flow:
 * 1. Check if duplicate (already sent within dedup window)
 * 2. If not duplicate: dispatch alert + record in history
 * 3. Return whether alert was actually dispatched
 */
export async function processAlert(
  supabase: SupabaseClient,
  payload: AlertPayload,
  windowMs: number
): Promise<{ dispatched: boolean }> {
  const duplicate = await isAlertDuplicate(supabase, payload.alertType, windowMs);

  if (duplicate) {
    return { dispatched: false };
  }

  // Dispatch and record concurrently — both are best-effort
  await dispatchAlert(payload);
  await recordAlert(supabase, payload);

  return { dispatched: true };
}
