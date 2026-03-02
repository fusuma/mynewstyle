import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const ALERT_THRESHOLD_CENTS = 25; // €0.25

/**
 * Verifies the request carries a valid admin secret.
 * Expects header: Authorization: Bearer <ADMIN_SECRET>
 * Falls back to ADMIN_SECRET query param for dashboard tools that can't set headers.
 */
function isAuthorized(request: NextRequest): boolean {
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    // If no secret is configured, deny all access to prevent accidental exposure
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

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createServerSupabaseClient();

    // Query 1: avg cost per consultation from consultations table (completed ones only)
    const { data: consultationCost, error: consultationCostError } = await supabase
      .from('consultations')
      .select('ai_cost_cents')
      .eq('status', 'complete');

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

    // Query 2a: avg cost per face-analysis step from ai_calls table
    const { data: faceAnalysisLogs, error: faceAnalysisError } = await supabase
      .from('ai_calls')
      .select('cost_cents')
      .eq('task', 'face-analysis')
      .eq('success', true);

    if (faceAnalysisError) {
      console.error('[GET /api/admin/ai-cost-summary] face-analysis ai_calls query failed:', faceAnalysisError);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    // Query 2b: avg cost per consultation step from ai_calls table
    const { data: consultationLogs, error: consultationLogsError } = await supabase
      .from('ai_calls')
      .select('cost_cents')
      .eq('task', 'consultation')
      .eq('success', true);

    if (consultationLogsError) {
      console.error('[GET /api/admin/ai-cost-summary] consultation ai_calls query failed:', consultationLogsError);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    const avgFaceAnalysisCents =
      faceAnalysisLogs && faceAnalysisLogs.length > 0
        ? faceAnalysisLogs.reduce((sum, l) => sum + (l.cost_cents ?? 0), 0) / faceAnalysisLogs.length
        : 0;

    const avgConsultationCents =
      consultationLogs && consultationLogs.length > 0
        ? consultationLogs.reduce((sum, l) => sum + (l.cost_cents ?? 0), 0) / consultationLogs.length
        : 0;

    // Query 3: total completed consultations count
    const { count: totalConsultations, error: countError } = await supabase
      .from('consultations')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'complete');

    if (countError) {
      console.error('[GET /api/admin/ai-cost-summary] consultations count query failed:', countError);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    return NextResponse.json({
      avgCostCentsPerConsultation,
      avgCostCentsPerStep: {
        faceAnalysis: avgFaceAnalysisCents,
        consultation: avgConsultationCents,
      },
      totalConsultations: totalConsultations ?? 0,
      alertTriggered: avgCostCentsPerConsultation > ALERT_THRESHOLD_CENTS,
    });
  } catch (error) {
    console.error('[GET /api/admin/ai-cost-summary] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
