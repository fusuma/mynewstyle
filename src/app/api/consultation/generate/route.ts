import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAIRouter, ConsultationSchema, getAICallLogs } from '@/lib/ai';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { FaceAnalysis, QuestionnaireData } from '@/types';
import type { ConsultationOutput, AIProvider } from '@/lib/ai';

const GenerateRequestSchema = z.object({
  consultationId: z.string().uuid(),
});

/**
 * Stores consultation results in normalized Supabase tables (best-effort).
 * Logs errors but does not throw — user receives consultation even if partial DB write fails.
 */
async function storeConsultationResults(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  consultationId: string,
  data: ConsultationOutput
): Promise<void> {
  // Insert recommendations (ranked 1, 2, 3)
  const recsToInsert = data.recommendations.map((rec, index) => ({
    consultation_id: consultationId,
    rank: index + 1,
    style_name: rec.styleName,
    justification: rec.justification,
    match_score: rec.matchScore,
    difficulty_level: rec.difficultyLevel,
    preview_status: 'none', // Story 7.1 will populate this
  }));
  const { error: recError } = await supabase.from('recommendations').insert(recsToInsert);
  if (recError) console.error('[generate] recommendations insert failed:', recError);

  // Insert styles to avoid
  const avoidsToInsert = data.stylesToAvoid.map((s) => ({
    consultation_id: consultationId,
    style_name: s.styleName,
    reason: s.reason,
  }));
  const { error: avoidError } = await supabase.from('styles_to_avoid').insert(avoidsToInsert);
  if (avoidError) console.error('[generate] styles_to_avoid insert failed:', avoidError);

  // Insert grooming tips
  const tipsToInsert = data.groomingTips.map((tip) => ({
    consultation_id: consultationId,
    category: tip.category,
    tip_text: tip.tipText,
    icon: tip.icon,
  }));
  const { error: tipError } = await supabase.from('grooming_tips').insert(tipsToInsert);
  if (tipError) console.error('[generate] grooming_tips insert failed:', tipError);
}

export async function POST(request: NextRequest) {
  // 1. Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = GenerateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(', ') },
      { status: 400 }
    );
  }

  const { consultationId } = parsed.data;
  const supabase = createServerSupabaseClient();

  // 2. Fetch consultation record
  const { data: consultation, error: fetchError } = await supabase
    .from('consultations')
    .select('id, status, payment_status, face_analysis, questionnaire_responses, ai_cost_cents')
    .eq('id', consultationId)
    .single();

  if (fetchError || !consultation) {
    return NextResponse.json({ error: 'Consultation not found' }, { status: 404 });
  }

  // 3. Payment gate — critical security boundary
  if (consultation.payment_status !== 'paid') {
    return NextResponse.json({ error: 'Payment required' }, { status: 403 });
  }

  // 4. Idempotency check — Stripe webhook may deliver same event multiple times
  // Verify both status=complete AND that normalized table data exists to avoid false positives
  if (consultation.status === 'complete') {
    const { data: existingRecs } = await supabase
      .from('recommendations')
      .select('id')
      .eq('consultation_id', consultationId)
      .limit(1);

    if (existingRecs && existingRecs.length > 0) {
      return NextResponse.json({ status: 'already_complete' }, { status: 200 });
    }
    // Status is complete but no recommendations found — fall through to re-generate
  }

  // 5. Extract analysis + questionnaire from DB (do NOT accept these in request body)
  const faceAnalysis = consultation.face_analysis as FaceAnalysis;
  const questionnaire = consultation.questionnaire_responses as QuestionnaireData;

  // 6. Run AI consultation generation with retry on validation failure
  try {
    const router = getAIRouter();

    // Snapshot log count before AI calls so we can attribute cost to this Step 2 call
    const logsBefore = getAICallLogs().length;

    // First attempt
    const rawResult = await router.execute((p: AIProvider) =>
      p.generateConsultation(faceAnalysis, questionnaire)
    );
    let validated = ConsultationSchema.safeParse(rawResult);

    // Retry if validation fails — natural LLM variance may produce valid output on retry
    // NOTE: generateConsultation does not accept temperature param; just call it again
    if (!validated.success) {
      const retryResult = await router.execute((p: AIProvider) =>
        p.generateConsultation(faceAnalysis, questionnaire)
      );
      validated = ConsultationSchema.safeParse(retryResult);
    }

    // Compute cumulative Step 2 AI cost from all AI calls made during this request
    const logsAfter = getAICallLogs();
    const step2CostCents = logsAfter
      .slice(logsBefore)
      .reduce((sum, log) => sum + log.costCents, 0);
    const existingCostCents = (consultation.ai_cost_cents as number) ?? 0;
    const totalCostCents = existingCostCents + Math.round(step2CostCents);

    // Both attempts failed schema validation
    if (!validated.success) {
      await supabase
        .from('consultations')
        .update({ status: 'failed' })
        .eq('id', consultationId);
      return NextResponse.json(
        { error: 'AI consultation failed validation', details: validated.error.issues },
        { status: 422 }
      );
    }

    // 7. Store in normalized tables (best-effort)
    const consultationData = validated.data;
    await storeConsultationResults(supabase, consultationId, consultationData);

    // 8. Update consultation status to complete and persist Step 2 AI cost (AC9)
    const { error: updateError } = await supabase
      .from('consultations')
      .update({
        status: 'complete',
        completed_at: new Date().toISOString(),
        ai_cost_cents: totalCostCents,
      })
      .eq('id', consultationId);

    if (updateError) {
      console.error('[POST /api/consultation/generate] Status update failed:', updateError);
    }

    return NextResponse.json({ consultation: consultationData }, { status: 200 });
  } catch (error) {
    await supabase
      .from('consultations')
      .update({ status: 'failed' })
      .eq('id', consultationId);
    console.error('[POST /api/consultation/generate] AI error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
