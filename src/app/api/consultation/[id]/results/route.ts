import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase/auth-server';
import type { FaceAnalysisOutput } from '@/lib/ai/schemas';

const ParamsSchema = z.object({
  id: z.string().uuid('Invalid consultation ID'),
});

/**
 * GET /api/consultation/[id]/results
 *
 * Fetches full consultation results by ID for authenticated users.
 * Used when navigating from the profile history ("Ver novamente") to hydrate
 * the consultation store on the results page, avoiding a redirect to /questionnaire.
 *
 * Respects RLS — uses the authenticated user's session (anon key + cookies).
 * Only returns consultations that belong to the authenticated user.
 *
 * Returns:
 *   200 - { consultation: ConsultationResultsPayload }
 *   400 - Invalid consultation UUID
 *   401 - User not authenticated
 *   404 - Consultation not found or does not belong to this user
 *   500 - Database error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const resolvedParams = await params;
  const parseResult = ParamsSchema.safeParse(resolvedParams);

  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid consultation ID' },
      { status: 400 }
    );
  }

  const supabase = createAuthenticatedSupabaseClient(request);

  // Verify authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json(
      { error: 'Não autenticado' },
      { status: 401 }
    );
  }

  const { id } = parseResult.data;

  // Fetch consultation with all results data
  // RLS ensures the user can only access their own consultations
  const { data: consultation, error: consultationError } = await supabase
    .from('consultations')
    .select('id, gender, face_analysis, status, payment_status, created_at, completed_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (consultationError) {
    if (consultationError.code === 'PGRST116') {
      return NextResponse.json(
        { error: 'Consultation not found' },
        { status: 404 }
      );
    }
    console.error('[GET /api/consultation/[id]/results] consultation fetch error:', consultationError);
    return NextResponse.json(
      { error: 'Erro ao carregar consultoria' },
      { status: 500 }
    );
  }

  if (!consultation) {
    return NextResponse.json(
      { error: 'Consultation not found' },
      { status: 404 }
    );
  }

  // Fetch recommendations
  const { data: recommendations, error: recError } = await supabase
    .from('recommendations')
    .select('id, rank, style_name, justification, match_score, difficulty_level')
    .eq('consultation_id', id)
    .order('rank', { ascending: true });

  if (recError) {
    console.error('[GET /api/consultation/[id]/results] recommendations fetch error:', recError);
    return NextResponse.json(
      { error: 'Erro ao carregar recomendações' },
      { status: 500 }
    );
  }

  // Fetch styles to avoid
  const { data: stylesToAvoid, error: avoidError } = await supabase
    .from('styles_to_avoid')
    .select('id, style_name, reason')
    .eq('consultation_id', id);

  if (avoidError) {
    console.error('[GET /api/consultation/[id]/results] styles_to_avoid fetch error:', avoidError);
  }

  // Fetch grooming tips
  const { data: groomingTips, error: tipsError } = await supabase
    .from('grooming_tips')
    .select('id, category, tip_text, icon')
    .eq('consultation_id', id);

  if (tipsError) {
    console.error('[GET /api/consultation/[id]/results] grooming_tips fetch error:', tipsError);
  }

  const faceAnalysis = consultation.face_analysis as FaceAnalysisOutput | null;

  return NextResponse.json({
    consultation: {
      id: consultation.id,
      gender: consultation.gender as 'male' | 'female',
      faceAnalysis,
      status: consultation.status,
      paymentStatus: consultation.payment_status,
      createdAt: consultation.created_at,
      completedAt: consultation.completed_at ?? null,
      recommendations: (recommendations ?? []).map((r) => ({
        id: r.id,
        rank: r.rank,
        styleName: r.style_name,
        justification: r.justification ?? '',
        matchScore: r.match_score,
        difficultyLevel: r.difficulty_level ?? 'medium',
      })),
      stylesToAvoid: (stylesToAvoid ?? []).map((s) => ({
        id: s.id,
        styleName: s.style_name,
        reason: s.reason,
      })),
      groomingTips: (groomingTips ?? []).map((t) => ({
        id: t.id,
        category: t.category,
        tipText: t.tip_text,
        icon: t.icon,
      })),
    },
  });
}
