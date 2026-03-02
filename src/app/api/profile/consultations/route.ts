import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase/auth-server';
import type { ConsultationHistoryItem } from '@/types';

/**
 * GET /api/profile/consultations
 *
 * Returns the authenticated user's paid consultation history, sorted by date (newest first).
 * Respects RLS — uses the authenticated user's session, NOT the service role client.
 *
 * Returns:
 *   200 - { consultations: ConsultationHistoryItem[] }
 *   401 - User not authenticated
 *   500 - Database error
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = createAuthenticatedSupabaseClient(request);

  // Verify authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json(
      { error: 'Não autenticado' },
      { status: 401 }
    );
  }

  // Query consultations with top recommendation (rank = 1) joined.
  // Only fetch paid consultations — these are the ones the user has access to.
  // Use left join (recommendations) instead of !inner so consultations without
  // recommendations are still returned (they will have topRecommendation: null).
  // Filter rank=1 at the DB level to avoid over-fetching all recommendations.
  const { data, error } = await supabase
    .from('consultations')
    .select(`
      id,
      gender,
      face_analysis,
      status,
      payment_status,
      created_at,
      completed_at,
      recommendations!left(style_name, match_score, rank)
    `)
    .eq('user_id', user.id)
    .eq('payment_status', 'paid')
    .eq('recommendations.rank', 1)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('[GET /api/profile/consultations] DB error:', error);
    return NextResponse.json(
      { error: 'Erro ao carregar consultorias' },
      { status: 500 }
    );
  }

  // Map DB rows to ConsultationHistoryItem shape
  // Note: face_analysis is stored as JSONB with faceShape and confidence fields
  // recommendations is a left join filtered to rank=1, so it's either [] or [{...}]
  const consultations: ConsultationHistoryItem[] = (data ?? []).map((row) => {
    // With left join + rank=1 filter, array has 0 or 1 items
    const topRec = Array.isArray(row.recommendations) && row.recommendations.length > 0
      ? row.recommendations[0]
      : null;

    const faceAnalysis = row.face_analysis as { faceShape?: string; confidence?: number } | null;

    return {
      id: row.id,
      gender: row.gender,
      faceShape: (faceAnalysis?.faceShape ?? 'oval') as ConsultationHistoryItem['faceShape'],
      confidence: faceAnalysis?.confidence ?? 0,
      status: row.status,
      paymentStatus: row.payment_status,
      createdAt: row.created_at,
      completedAt: row.completed_at ?? null,
      topRecommendation: topRec
        ? { styleName: topRec.style_name, matchScore: topRec.match_score }
        : null,
    };
  });

  return NextResponse.json({ consultations });
}
