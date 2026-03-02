import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { isAuthorized } from '@/lib/admin/auth';

const ALERT_THRESHOLD_CENTS = 25; // €0.25

type Period = '24h' | '7d' | '30d' | 'all';

/**
 * Resolves the period query parameter to a Date cutoff.
 * Returns null for 'all' (no date filter).
 */
function resolvePeriodCutoff(period: Period): Date | null {
  const now = new Date();
  switch (period) {
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case 'all':
    default:
      return null;
  }
}

interface AICallRow {
  cost_cents: number;
  latency_ms: number;
  success: boolean;
  provider: string;
}

/**
 * Computes average latency from a list of AI call rows.
 * Includes all calls (both successful and failed) so that timeout-induced failures
 * are reflected in the latency metric — a rising average may indicate provider issues.
 * To compute success-only latency, filter calls before passing to this function.
 */
function computeAvgLatency(calls: AICallRow[]): number {
  if (calls.length === 0) return 0;
  return calls.reduce((sum, c) => sum + (c.latency_ms ?? 0), 0) / calls.length;
}

/**
 * Computes success rate (0.0–1.0) from a list of AI call rows.
 */
function computeSuccessRate(calls: AICallRow[]): number {
  if (calls.length === 0) return 0;
  return calls.filter((c) => c.success).length / calls.length;
}

/**
 * Computes fallback rate (0.0–1.0) for a given task.
 * face-analysis / consultation: fallback = provider 'openai'
 * preview: fallback = provider 'gemini' (primary is 'kie')
 */
function computeFallbackRate(
  calls: AICallRow[],
  task: 'face-analysis' | 'consultation' | 'preview'
): number {
  if (calls.length === 0) return 0;
  const fallbackCount = calls.filter((c) => {
    if (task === 'face-analysis' || task === 'consultation') {
      return c.provider === 'openai';
    }
    if (task === 'preview') {
      return c.provider === 'gemini';
    }
    return false;
  }).length;
  return fallbackCount / calls.length;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Parse optional period query parameter (default: 'all' for backward compatibility)
    const periodParam = request.nextUrl.searchParams.get('period');
    const period: Period =
      periodParam === '24h' || periodParam === '7d' || periodParam === '30d'
        ? periodParam
        : 'all';

    const cutoff = resolvePeriodCutoff(period);
    const cutoffISO = cutoff ? cutoff.toISOString() : null;

    const supabase = createServiceRoleClient();

    // Query 1: avg cost per consultation from consultations table (completed ones only)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const consultationCostBase: any = supabase
      .from('consultations')
      .select('ai_cost_cents')
      .eq('status', 'complete');

    const { data: consultationCost, error: consultationCostError } = await (
      cutoffISO ? consultationCostBase.gte('created_at', cutoffISO) : consultationCostBase
    );

    if (consultationCostError) {
      console.error('[GET /api/admin/ai-cost-summary] consultations query failed:', consultationCostError);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    const completedWithCost = consultationCost?.filter((c) => c.ai_cost_cents != null) ?? [];
    const avgCostCentsPerConsultation =
      completedWithCost.length > 0
        ? completedWithCost.reduce((sum, c) => sum + (c.ai_cost_cents ?? 0), 0) /
          completedWithCost.length
        : 0;

    // Helper to fetch ai_calls for a given task with optional period filtering
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async function fetchAICalls(task: string): Promise<{ data: AICallRow[] | null; error: any }> {
      // Build the base query (select + eq on task)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const baseQuery: any = supabase
        .from('ai_calls')
        .select('cost_cents, latency_ms, success, provider')
        .eq('task', task);

      // Optionally add date filter
      if (cutoffISO) {
        return baseQuery.gte('timestamp', cutoffISO);
      }

      return baseQuery;
    }

    // Query 2a: face-analysis step from ai_calls table
    const { data: faceAnalysisLogs, error: faceAnalysisError } = await fetchAICalls('face-analysis');

    if (faceAnalysisError) {
      console.error('[GET /api/admin/ai-cost-summary] face-analysis ai_calls query failed:', faceAnalysisError);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    // Query 2b: consultation step from ai_calls table
    const { data: consultationLogs, error: consultationLogsError } = await fetchAICalls('consultation');

    if (consultationLogsError) {
      console.error('[GET /api/admin/ai-cost-summary] consultation ai_calls query failed:', consultationLogsError);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    // Query 2c: preview step from ai_calls table
    const { data: previewLogs, error: previewLogsError } = await fetchAICalls('preview');

    if (previewLogsError) {
      console.error('[GET /api/admin/ai-cost-summary] preview ai_calls query failed:', previewLogsError);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    const faceAnalysisCalls = (faceAnalysisLogs ?? []) as AICallRow[];
    const consultationCalls = (consultationLogs ?? []) as AICallRow[];
    const previewCalls = (previewLogs ?? []) as AICallRow[];

    // Backward-compatible cost averages (success-only, matching original behavior)
    const successfulFaceAnalysisCalls = faceAnalysisCalls.filter((c) => c.success);
    const successfulConsultationCalls = consultationCalls.filter((c) => c.success);

    const avgFaceAnalysisCents =
      successfulFaceAnalysisCalls.length > 0
        ? successfulFaceAnalysisCalls.reduce((sum, l) => sum + (l.cost_cents ?? 0), 0) /
          successfulFaceAnalysisCalls.length
        : 0;

    const avgConsultationCents =
      successfulConsultationCalls.length > 0
        ? successfulConsultationCalls.reduce((sum, l) => sum + (l.cost_cents ?? 0), 0) /
          successfulConsultationCalls.length
        : 0;

    // Query 3: total completed consultations count
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const countBase: any = supabase
      .from('consultations')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'complete');

    const { count: totalConsultations, error: countError } = await (
      cutoffISO ? countBase.gte('created_at', cutoffISO) : countBase
    );

    if (countError) {
      console.error('[GET /api/admin/ai-cost-summary] consultations count query failed:', countError);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    // New metrics: latency, success rate, fallback rate
    const avgLatencyMsPerStep = {
      faceAnalysis: computeAvgLatency(faceAnalysisCalls),
      consultation: computeAvgLatency(consultationCalls),
      preview: computeAvgLatency(previewCalls),
    };

    const successRatePerStep = {
      faceAnalysis: computeSuccessRate(faceAnalysisCalls),
      consultation: computeSuccessRate(consultationCalls),
      preview: computeSuccessRate(previewCalls),
    };

    const fallbackRatePerStep = {
      faceAnalysis: computeFallbackRate(faceAnalysisCalls, 'face-analysis'),
      consultation: computeFallbackRate(consultationCalls, 'consultation'),
      preview: computeFallbackRate(previewCalls, 'preview'),
    };

    return NextResponse.json({
      // Existing fields (backward compatible — unchanged)
      avgCostCentsPerConsultation,
      avgCostCentsPerStep: {
        faceAnalysis: avgFaceAnalysisCents,
        consultation: avgConsultationCents,
      },
      totalConsultations: totalConsultations ?? 0,
      alertTriggered: avgCostCentsPerConsultation > ALERT_THRESHOLD_CENTS,
      // New fields (additive)
      avgLatencyMsPerStep,
      successRatePerStep,
      fallbackRatePerStep,
      period,
    });
  } catch (error) {
    console.error('[GET /api/admin/ai-cost-summary] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
