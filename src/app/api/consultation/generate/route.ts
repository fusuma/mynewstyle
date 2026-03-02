import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAIRouter, validateConsultation, logValidationFailure, getAICallLogs, persistAICallLog } from '@/lib/ai';
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

  // 2. Fetch consultation record — include photo_hash, questionnaire_hash, gender for cache lookup
  const { data: consultation, error: fetchError } = await supabase
    .from('consultations')
    .select('id, status, payment_status, face_analysis, questionnaire_responses, ai_cost_cents, photo_hash, questionnaire_hash, gender')
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

  // 5. Cache lookup — AFTER idempotency check, BEFORE AI call (AC5, AC6)
  // Only attempt if both hashes are available (backward compat with old consultations)
  if (consultation.photo_hash && consultation.questionnaire_hash) {
    try {
      const { data: cachedConsultation } = await supabase
        .from('consultations')
        .select('id')
        .eq('photo_hash', consultation.photo_hash)
        .eq('questionnaire_hash', consultation.questionnaire_hash)
        .eq('gender', consultation.gender)
        .eq('status', 'complete')
        .neq('id', consultationId)
        .limit(1)
        .maybeSingle();

      if (cachedConsultation) {
        // Verify it has recommendations (not just a status='complete' with no data)
        const { data: cachedRecs } = await supabase
          .from('recommendations')
          .select('id, rank, style_name, justification, match_score, difficulty_level')
          .eq('consultation_id', cachedConsultation.id)
          .order('rank');

        if (cachedRecs && cachedRecs.length > 0) {
          // Fetch styles_to_avoid and grooming_tips from cached consultation
          const { data: cachedStylesAvoidData } = await supabase
            .from('styles_to_avoid')
            .select('style_name, reason')
            .eq('consultation_id', cachedConsultation.id);

          const { data: cachedTipsData } = await supabase
            .from('grooming_tips')
            .select('category, tip_text, icon')
            .eq('consultation_id', cachedConsultation.id);

          const cachedStylesAvoid = cachedStylesAvoidData ?? [];
          const cachedTips = cachedTipsData ?? [];

          // Build ConsultationOutput shape for storeConsultationResults reuse
          const consultationOutput: ConsultationOutput = {
            recommendations: cachedRecs.map((r) => ({
              styleName: r.style_name,
              justification: r.justification,
              matchScore: r.match_score,
              difficultyLevel: r.difficulty_level,
            })),
            stylesToAvoid: cachedStylesAvoid.map((s) => ({
              styleName: s.style_name,
              reason: s.reason,
            })),
            groomingTips: cachedTips.map((t) => ({
              category: t.category,
              tipText: t.tip_text,
              icon: t.icon,
            })),
          };

          // Copy cached data into current consultation
          await storeConsultationResults(supabase, consultationId, consultationOutput);

          const { error: cacheStatusUpdateError } = await supabase
            .from('consultations')
            .update({ status: 'complete', completed_at: new Date().toISOString() })
            .eq('id', consultationId);
          if (cacheStatusUpdateError) {
            console.error('[POST /api/consultation/generate] Cache hit status update failed:', cacheStatusUpdateError);
            // Non-fatal: client receives correct cached data; consultation may not reflect complete status
          }

          return NextResponse.json(
            { consultation: consultationOutput, cached: true },
            { status: 200 }
          );
        }
      }
    } catch (cacheError) {
      console.error('[POST /api/consultation/generate] Cache lookup failed, falling through to AI:', cacheError);
      // Non-fatal: continue to AI call
    }
  }

  // 6. Extract analysis + questionnaire from DB (do NOT accept these in request body)
  const faceAnalysis = consultation.face_analysis as FaceAnalysis;
  const questionnaire = consultation.questionnaire_responses as QuestionnaireData;

  // 7. Run AI consultation generation with retry on validation failure
  try {
    const router = getAIRouter();

    // Snapshot log count before AI calls so we can attribute cost to this Step 2 call
    const logsBefore = getAICallLogs().length;

    // First attempt
    const rawResult = await router.execute((p: AIProvider) =>
      p.generateConsultation(faceAnalysis, questionnaire)
    );
    let validated = validateConsultation(rawResult);

    // Retry if validation fails — natural LLM variance may produce valid output on retry
    // NOTE: generateConsultation does not accept temperature param; just call it again
    if (!validated.valid) {
      const retryResult = await router.execute((p: AIProvider) =>
        p.generateConsultation(faceAnalysis, questionnaire)
      );
      validated = validateConsultation(retryResult);
    }

    // Compute cumulative Step 2 AI cost from all AI calls made during this request
    const logsAfter = getAICallLogs();
    const newLogs = logsAfter.slice(logsBefore);
    const step2CostCents = newLogs.reduce((sum, log) => sum + log.costCents, 0);
    const existingCostCents = (consultation.ai_cost_cents as number) ?? 0;
    const totalCostCents = existingCostCents + Math.round(step2CostCents);

    // Persist each new AI call log to ai_calls table (best-effort, non-fatal)
    for (const log of newLogs) {
      await persistAICallLog(supabase, consultationId, log);
    }

    // Both attempts failed validation
    if (!validated.valid) {
      await supabase
        .from('consultations')
        .update({ status: 'failed' })
        .eq('id', consultationId);

      logValidationFailure({
        context: 'generate',
        reason: validated.reason,
        details: validated.details,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json(
        { error: 'AI consultation failed validation', details: validated.details },
        { status: 422 }
      );
    }

    // 8. Store in normalized tables (best-effort)
    const consultationData = validated.data;
    await storeConsultationResults(supabase, consultationId, consultationData);

    // 9. Update consultation status to complete and persist Step 2 AI cost (AC9)
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
