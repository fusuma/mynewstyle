import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAIRouter, validateFaceAnalysis, logValidationFailure, getAICallLogs, persistAICallLog } from '@/lib/ai';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { computePhotoHash, computeQuestionnaireHash } from '@/lib/consultation';
import type { QuestionnaireData } from '@/types';

// Max base64 size: ~4MB input photo (base64 is ~33% larger than binary, so 4MB binary → ~5.4MB base64)
const MAX_PHOTO_BASE64_LENGTH = 6 * 1024 * 1024; // 6MB base64 characters

const AnalyzeRequestSchema = z.object({
  consultationId: z.string().uuid(),
  photoBase64: z.string().min(1).max(MAX_PHOTO_BASE64_LENGTH, 'Photo exceeds maximum allowed size'),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']).optional().default('image/jpeg'),
});

export async function POST(request: NextRequest) {
  // 1. Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = AnalyzeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(', ') },
      { status: 400 }
    );
  }

  // mimeType is validated but not forwarded to analyzeFace — the prompt hardcodes 'image/jpeg'
  // (see Dev Notes: "CRITICAL: Do NOT modify AnalysisOptions type")
  const { consultationId, photoBase64 } = parsed.data;
  const supabase = createServerSupabaseClient();

  // 2. Verify consultation exists in DB and fetch questionnaire_responses + gender for hash computation
  const { data: consultation, error: fetchError } = await supabase
    .from('consultations')
    .select('id, status, questionnaire_responses, gender')
    .eq('id', consultationId)
    .single();

  if (fetchError || !consultation) {
    return NextResponse.json({ error: 'Consultation not found' }, { status: 404 });
  }

  // 3. Mark as analyzing (best-effort — proceed even if this update fails)
  const { error: analyzingError } = await supabase
    .from('consultations')
    .update({ status: 'analyzing' })
    .eq('id', consultationId);

  if (analyzingError) {
    console.error('[POST /api/consultation/analyze] Failed to set status=analyzing:', analyzingError);
    // Non-fatal: continue with analysis regardless
  }

  // 4. Compute hashes for cache lookup (AC1, AC2)
  const photoHash = computePhotoHash(photoBase64);
  const questionnaireHash = computeQuestionnaireHash(
    consultation.questionnaire_responses as QuestionnaireData
  );

  // 5. Cache lookup — BEFORE AI call, AFTER status update to 'analyzing' (AC3)
  // Wrap in try/catch: cache is an optimization; fall through to AI call on DB error
  try {
    const { data: cached } = await supabase
      .from('consultations')
      .select('face_analysis')
      .eq('photo_hash', photoHash)
      .eq('questionnaire_hash', questionnaireHash)
      .eq('gender', consultation.gender)
      .eq('status', 'complete')
      .neq('id', consultationId)
      .limit(1)
      .maybeSingle();

    if (cached?.face_analysis) {
      // Cache HIT (AC4): update current consultation with cached data + hashes; no AI call
      const { error: cacheUpdateError } = await supabase
        .from('consultations')
        .update({
          face_analysis: cached.face_analysis,
          status: 'complete',
          photo_hash: photoHash,
          questionnaire_hash: questionnaireHash,
          // ai_cost_cents intentionally left at 0 (no AI call made)
        })
        .eq('id', consultationId);
      if (cacheUpdateError) {
        console.error('[POST /api/consultation/analyze] Cache hit DB update failed:', cacheUpdateError);
        // Non-fatal: client still receives correct cached data; consultation may remain in analyzing state
      }
      return NextResponse.json({ faceAnalysis: cached.face_analysis, cached: true }, { status: 200 });
    }
  } catch (cacheError) {
    console.error('[POST /api/consultation/analyze] Cache lookup failed, falling through to AI:', cacheError);
    // Non-fatal: continue to AI call
  }

  // 6. Run AI analysis with retry on validation failure (cache miss path)
  try {
    const router = getAIRouter();

    // Snapshot log count BEFORE AI calls to correctly attribute logs to this request
    // (same logsBefore/logsAfter pattern as generate route - prevents cross-request contamination)
    const logsBefore = getAICallLogs().length;

    // First attempt (no temperature override)
    const rawResult = await router.execute((p) => p.analyzeFace(Buffer.from(photoBase64, 'base64')));
    let validated = validateFaceAnalysis(rawResult);

    // Retry with lower temperature if validation fails
    if (!validated.valid) {
      const retryResult = await router.execute((p) =>
        p.analyzeFace(Buffer.from(photoBase64, 'base64'), { temperature: 0.2 })
      );
      validated = validateFaceAnalysis(retryResult);
    }

    // Both attempts failed validation
    if (!validated.valid) {
      await supabase
        .from('consultations')
        .update({ status: 'failed' })
        .eq('id', consultationId);

      logValidationFailure({
        context: 'analyze',
        reason: validated.reason,
        details: validated.details,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json(
        { error: 'AI analysis failed validation', details: validated.details },
        { status: 422 }
      );
    }

    // 7. Persist AI call cost to ai_calls table (best-effort) and accumulate Step 1 cost
    // Use logsBefore/logsAfter slice pattern to correctly attribute logs to this request,
    // handling retries (both initial + retry calls are persisted) and preventing cross-request
    // contamination in warm serverless invocations.
    const logsAfter = getAICallLogs();
    const newLogs = logsAfter.slice(logsBefore);
    const step1CostCents = newLogs.reduce((sum, log) => sum + log.costCents, 0);
    for (const log of newLogs) {
      await persistAICallLog(supabase, consultationId, log);
    }

    // 8. Store validated result in DB including photo_hash and questionnaire_hash (AC1, AC2)
    const { error: updateError } = await supabase
      .from('consultations')
      .update({
        face_analysis: validated.data,
        status: 'complete',
        ai_cost_cents: Math.round(step1CostCents),
        photo_hash: photoHash,
        questionnaire_hash: questionnaireHash,
      })
      .eq('id', consultationId);

    if (updateError) {
      console.error('[POST /api/consultation/analyze] DB update failed:', updateError);
      // Still return success to client — analysis succeeded even if DB write failed
    }

    return NextResponse.json({ faceAnalysis: validated.data }, { status: 200 });
  } catch (error) {
    await supabase
      .from('consultations')
      .update({ status: 'failed' })
      .eq('id', consultationId);

    console.error('[POST /api/consultation/analyze] AI error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
