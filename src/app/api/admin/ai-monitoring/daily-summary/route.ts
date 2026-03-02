import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * Verifies the request carries a valid admin secret.
 * Expects header: Authorization: Bearer <ADMIN_SECRET>
 * Falls back to ADMIN_SECRET query param for dashboard tools that can't set headers.
 */
function isAuthorized(request: NextRequest): boolean {
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    return false;
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7) === adminSecret;
  }

  const querySecret = request.nextUrl.searchParams.get('secret');
  if (querySecret) {
    return querySecret === adminSecret;
  }

  return false;
}

interface AICallRow {
  task: 'face-analysis' | 'consultation' | 'preview' | 'face-similarity';
  provider: 'gemini' | 'openai' | 'kie';
  cost_cents: number;
  latency_ms: number;
  success: boolean;
}

/**
 * Computes statistics for a given set of AI call rows for a specific task.
 * avgLatencyMs includes all calls (success + failed) so that timeout-induced failures
 * are reflected in the metric — a rising average may indicate provider degradation.
 */
function computeTaskStats(calls: AICallRow[], task: 'face-analysis' | 'consultation' | 'preview') {
  const taskCalls = calls.filter((c) => c.task === task);
  if (taskCalls.length === 0) {
    return { avgLatencyMs: null, successRate: null, fallbackRate: null };
  }

  const avgLatencyMs =
    taskCalls.reduce((sum, c) => sum + (c.latency_ms ?? 0), 0) / taskCalls.length;

  const successRate =
    taskCalls.filter((c) => c.success).length / taskCalls.length;

  // Fallback logic:
  //   face-analysis / consultation: fallback = provider 'openai' (primary is 'gemini')
  //   preview: fallback = provider 'gemini' (primary is 'kie')
  const fallbackCount = taskCalls.filter((c) => {
    if (task === 'face-analysis' || task === 'consultation') {
      return c.provider === 'openai';
    }
    if (task === 'preview') {
      return c.provider === 'gemini';
    }
    return false;
  }).length;

  const fallbackRate = fallbackCount / taskCalls.length;

  return { avgLatencyMs, successRate, fallbackRate };
}

/**
 * POST /api/admin/ai-monitoring/daily-summary
 *
 * Computes yesterday's AI pipeline summary from the ai_calls and consultations tables,
 * then upserts the result into monitoring_daily_summaries for historical trending.
 *
 * Protected by ADMIN_SECRET auth.
 * Idempotent — safe to re-run; upserts by summary_date.
 */
export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createServiceRoleClient();

    // Determine the target summary date.
    // Accepts optional ?date=YYYY-MM-DD query param for backfilling historical summaries.
    // Defaults to yesterday (UTC). All boundaries are aligned to UTC midnight to match
    // the TIMESTAMPTZ values stored in ai_calls.timestamp and consultations.created_at.
    const dateParam = request.nextUrl.searchParams.get('date');
    let summaryDate: string;

    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      // Validate it is a parseable date
      const parsed = new Date(`${dateParam}T00:00:00.000Z`);
      if (isNaN(parsed.getTime())) {
        return NextResponse.json({ error: 'Invalid date parameter. Use YYYY-MM-DD format.' }, { status: 400 });
      }
      summaryDate = dateParam;
    } else {
      // Default: yesterday in UTC (toISOString is always UTC, so slicing is safe)
      const now = new Date();
      const yesterdayMs = now.getTime() - 24 * 60 * 60 * 1000;
      summaryDate = new Date(yesterdayMs).toISOString().slice(0, 10);
    }

    // UTC midnight boundaries for the target date
    const startOfDay = `${summaryDate}T00:00:00.000Z`;
    const endOfDay = new Date(new Date(`${summaryDate}T00:00:00.000Z`).getTime() + 24 * 60 * 60 * 1000)
      .toISOString()
      .replace(/\.\d{3}Z$/, '.000Z');

    // Query 1: Count completed consultations for the target date
    const { count: totalConsultations, error: consultationError } = await supabase
      .from('consultations')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startOfDay)
      .lt('created_at', endOfDay);

    if (consultationError) {
      console.error('[POST /api/admin/ai-monitoring/daily-summary] consultations count failed:', consultationError);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    // Query 2: Fetch all AI calls for the target date
    const { data: aiCalls, error: aiCallsError } = await supabase
      .from('ai_calls')
      .select('task, provider, cost_cents, latency_ms, success')
      .gte('timestamp', startOfDay)
      .lt('timestamp', endOfDay);

    if (aiCallsError) {
      console.error('[POST /api/admin/ai-monitoring/daily-summary] ai_calls fetch failed:', aiCallsError);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    const calls = (aiCalls ?? []) as AICallRow[];
    const totalAICalls = calls.length;
    const totalAICostCents = calls.reduce((sum, c) => sum + (c.cost_cents ?? 0), 0);
    const consultationCount = totalConsultations ?? 0;
    const avgCostCentsPerConsultation =
      consultationCount > 0 ? totalAICostCents / consultationCount : 0;

    // Compute per-step metrics
    const faceAnalysisStats = computeTaskStats(calls, 'face-analysis');
    const consultationStats = computeTaskStats(calls, 'consultation');
    const previewStats = computeTaskStats(calls, 'preview');

    const summaryRow = {
      summary_date: summaryDate,
      total_consultations: consultationCount,
      total_ai_calls: totalAICalls,
      total_ai_cost_cents: totalAICostCents,
      avg_cost_cents_per_consultation: avgCostCentsPerConsultation,
      avg_latency_face_analysis_ms: faceAnalysisStats.avgLatencyMs,
      avg_latency_consultation_ms: consultationStats.avgLatencyMs,
      avg_latency_preview_ms: previewStats.avgLatencyMs,
      success_rate_face_analysis: faceAnalysisStats.successRate,
      success_rate_consultation: consultationStats.successRate,
      success_rate_preview: previewStats.successRate,
      fallback_rate_face_analysis: faceAnalysisStats.fallbackRate,
      fallback_rate_consultation: consultationStats.fallbackRate,
      fallback_rate_preview: previewStats.fallbackRate,
      // updated_at is refreshed on every upsert so re-runs are trackable
      updated_at: new Date().toISOString(),
    };

    // Upsert by summary_date (idempotent re-runs)
    const { data: upserted, error: upsertError } = await supabase
      .from('monitoring_daily_summaries')
      .upsert(summaryRow, { onConflict: 'summary_date' })
      .select();

    if (upsertError) {
      console.error('[POST /api/admin/ai-monitoring/daily-summary] upsert failed:', upsertError);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    // Return the computed summary (use first row from upsert result if available, else the computed row)
    const result = upserted && upserted.length > 0 ? { ...summaryRow, ...upserted[0] } : summaryRow;

    return NextResponse.json(result);
  } catch (error) {
    console.error('[POST /api/admin/ai-monitoring/daily-summary] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
