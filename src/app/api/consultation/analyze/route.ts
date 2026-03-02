import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAIRouter, validateFaceAnalysis, logValidationFailure } from '@/lib/ai';
import { createServerSupabaseClient } from '@/lib/supabase/server';

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
  const photoBuffer = Buffer.from(photoBase64, 'base64');
  const supabase = createServerSupabaseClient();

  // 2. Verify consultation exists in DB
  const { data: consultation, error: fetchError } = await supabase
    .from('consultations')
    .select('id, status')
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
    // Non-fatal: continue with AI analysis regardless
  }

  // 4. Run AI analysis with retry on validation failure
  try {
    const router = getAIRouter();

    // First attempt (no temperature override)
    const rawResult = await router.execute((p) => p.analyzeFace(photoBuffer));
    let validated = validateFaceAnalysis(rawResult);

    // Retry with lower temperature if validation fails
    if (!validated.valid) {
      const retryResult = await router.execute((p) =>
        p.analyzeFace(photoBuffer, { temperature: 0.2 })
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

    // 5. Store validated result in DB
    const { error: updateError } = await supabase
      .from('consultations')
      .update({ face_analysis: validated.data, status: 'complete' })
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
