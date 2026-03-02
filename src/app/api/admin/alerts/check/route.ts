/**
 * GET /api/admin/alerts/check
 *
 * Runs all four alert metric checks and returns a JSON summary.
 * Triggers and deduplicates alerts as needed.
 *
 * Authentication: ADMIN_SECRET (manual checks) or CRON_SECRET (Vercel Cron automated calls).
 * Designed to be called every 10-15 minutes via Vercel Cron or external monitoring service.
 *
 * AC: #6, #8, #9
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { isAuthorized } from '@/lib/admin/auth';
import { AlertType, ALERT_CONFIGS, getAlertThreshold } from '@/lib/alerts/config';
import {
  getAvgCostPerConsultation,
  getErrorRate,
  getPreviewQualityFailureRate,
  getLatencyP95,
} from '@/lib/alerts/metrics';
import { processAlert } from '@/lib/alerts/dispatcher';
import type { AlertPayload } from '@/lib/alerts/dispatcher';

interface CheckResult {
  value: number;
  threshold: number;
  triggered: boolean;
  sampleSize: number;
  dispatched: boolean;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createServiceRoleClient();
    const now = new Date().toISOString();
    const checks: Record<string, CheckResult> = {};
    let alertsTriggered = 0;

    // --- Check 1: Cost Alert ---
    const costConfig = ALERT_CONFIGS[AlertType.cost];
    const costThreshold = getAlertThreshold(AlertType.cost);
    const costMetric = await getAvgCostPerConsultation(supabase, costConfig.windowMs);
    const costTriggered = costMetric.sampleSize > 0 && costMetric.value > costThreshold;

    let costDispatched = false;
    if (costTriggered) {
      alertsTriggered++;
      const payload: AlertPayload = {
        alertType: AlertType.cost,
        metricValue: costMetric.value,
        threshold: costThreshold,
        windowDescription: '1 hour',
        sampleSize: costMetric.sampleSize,
        triggeredAt: now,
      };
      const result = await processAlert(supabase, payload, costConfig.windowMs);
      costDispatched = result.dispatched;
    }

    checks.cost = {
      value: costMetric.value,
      threshold: costThreshold,
      triggered: costTriggered,
      sampleSize: costMetric.sampleSize,
      dispatched: costDispatched,
    };

    // --- Check 2: Error Rate Alert ---
    const errorConfig = ALERT_CONFIGS[AlertType.error_rate];
    const errorThreshold = getAlertThreshold(AlertType.error_rate);
    const errorMetric = await getErrorRate(supabase, errorConfig.windowMs);
    const errorTriggered = errorMetric.sampleSize > 0 && errorMetric.value > errorThreshold;

    let errorDispatched = false;
    if (errorTriggered) {
      alertsTriggered++;
      const payload: AlertPayload = {
        alertType: AlertType.error_rate,
        metricValue: errorMetric.value,
        threshold: errorThreshold,
        windowDescription: '1 hour',
        sampleSize: errorMetric.sampleSize,
        triggeredAt: now,
      };
      const result = await processAlert(supabase, payload, errorConfig.windowMs);
      errorDispatched = result.dispatched;
    }

    checks.error_rate = {
      value: errorMetric.value,
      threshold: errorThreshold,
      triggered: errorTriggered,
      sampleSize: errorMetric.sampleSize,
      dispatched: errorDispatched,
    };

    // --- Check 3: Preview Quality Alert ---
    const previewConfig = ALERT_CONFIGS[AlertType.preview_quality];
    const previewThreshold = getAlertThreshold(AlertType.preview_quality);
    const previewMetric = await getPreviewQualityFailureRate(supabase, previewConfig.windowMs);
    const previewTriggered = previewMetric.sampleSize > 0 && previewMetric.value > previewThreshold;

    let previewDispatched = false;
    if (previewTriggered) {
      alertsTriggered++;
      const payload: AlertPayload = {
        alertType: AlertType.preview_quality,
        metricValue: previewMetric.value,
        threshold: previewThreshold,
        windowDescription: '24 hours',
        sampleSize: previewMetric.sampleSize,
        triggeredAt: now,
      };
      const result = await processAlert(supabase, payload, previewConfig.windowMs);
      previewDispatched = result.dispatched;
    }

    checks.preview_quality = {
      value: previewMetric.value,
      threshold: previewThreshold,
      triggered: previewTriggered,
      sampleSize: previewMetric.sampleSize,
      dispatched: previewDispatched,
    };

    // --- Check 4: Latency P95 Alert ---
    const latencyConfig = ALERT_CONFIGS[AlertType.latency_p95];
    const latencyThreshold = getAlertThreshold(AlertType.latency_p95);
    const latencyMetric = await getLatencyP95(supabase, latencyConfig.windowMs);
    const latencyTriggered = latencyMetric.sampleSize > 0 && latencyMetric.value > latencyThreshold;

    let latencyDispatched = false;
    if (latencyTriggered) {
      alertsTriggered++;
      const payload: AlertPayload = {
        alertType: AlertType.latency_p95,
        metricValue: latencyMetric.value,
        threshold: latencyThreshold,
        windowDescription: '1 hour',
        sampleSize: latencyMetric.sampleSize,
        triggeredAt: now,
      };
      const result = await processAlert(supabase, payload, latencyConfig.windowMs);
      latencyDispatched = result.dispatched;
    }

    checks.latency_p95 = {
      value: latencyMetric.value,
      threshold: latencyThreshold,
      triggered: latencyTriggered,
      sampleSize: latencyMetric.sampleSize,
      dispatched: latencyDispatched,
    };

    return NextResponse.json({
      timestamp: now,
      alertsTriggered,
      checks,
    });
  } catch (error) {
    console.error('[GET /api/admin/alerts/check] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
