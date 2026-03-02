import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { KieClient } from '@/lib/ai/kie';
import { logAICall, persistAICallLog, KIE_COST_PER_IMAGE_CENTS } from '@/lib/ai';
import { buildPreviewPrompt } from '@/lib/ai/prompts/preview';
import type { PreviewGenerationParams } from '@/types';

const GeneratePreviewRequestSchema = z.object({
  consultationId: z.string().uuid('consultationId must be a valid UUID'),
  recommendationId: z.string().uuid('recommendationId must be a valid UUID'),
});

/**
 * POST /api/preview/generate
 *
 * Triggers a Kie.ai Nano Banana 2 preview generation task for a recommendation.
 *
 * Flow:
 * 1. Validate request body (Zod)
 * 2. Verify consultation exists and payment_status === 'paid' (security gate)
 * 3. Check sequential queue: reject if another preview is already generating
 * 4. Fetch recommendation and verify it belongs to the consultation
 * 5. Generate Supabase Storage signed URL for the user's photo (15-min expiry)
 * 6. Build gender-specific style prompt
 * 7. Call Kie.ai createPreviewTask API
 * 8. Store taskId in recommendations.preview_generation_params
 * 9. Update preview_status to 'generating'
 * 10. Log AI call to ai_calls table
 * 11. Return { status: 'generating', estimatedSeconds: 30 }
 */
export async function POST(request: NextRequest) {
  // 1. Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = GeneratePreviewRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(', ') },
      { status: 400 }
    );
  }

  const { consultationId, recommendationId } = parsed.data;
  const supabase = createServerSupabaseClient();

  // 2. Fetch and validate consultation — payment gate (AC #10, #8)
  const { data: consultation, error: consultationError } = await supabase
    .from('consultations')
    .select('id, payment_status, gender, photo_url')
    .eq('id', consultationId)
    .single();

  if (consultationError || !consultation) {
    return NextResponse.json({ error: 'Consultation not found' }, { status: 404 });
  }

  if (consultation.payment_status !== 'paid') {
    return NextResponse.json({ error: 'Payment required to generate preview' }, { status: 403 });
  }

  // 3. Sequential queue check — only one preview generating per consultation at a time (AC #12)
  const { data: generatingPreview } = await supabase
    .from('recommendations')
    .select('id')
    .eq('consultation_id', consultationId)
    .eq('preview_status', 'generating')
    .maybeSingle();

  if (generatingPreview) {
    return NextResponse.json(
      {
        error: 'A preview is already generating for this consultation. Please wait for it to complete.',
      },
      { status: 409 }
    );
  }

  // 4. Fetch the target recommendation and verify it belongs to this consultation
  const { data: recommendation, error: recError } = await supabase
    .from('recommendations')
    .select('id, consultation_id, style_name, difficulty_level, preview_status')
    .eq('id', recommendationId)
    .eq('consultation_id', consultationId)
    .single();

  if (recError || !recommendation) {
    return NextResponse.json(
      { error: 'Recommendation not found for this consultation' },
      { status: 404 }
    );
  }

  // 5. Generate Supabase Storage signed URL for the user's photo (15-min expiry) (AC #3)
  // photo_url is the storage path (e.g., "consultation-photos/uuid/photo.jpg")
  const photoStoragePath = consultation.photo_url as string;
  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from('consultation-photos')
    .createSignedUrl(photoStoragePath, 900); // 900 seconds = 15 minutes

  if (signedUrlError || !signedUrlData?.signedUrl) {
    console.error('[POST /api/preview/generate] Failed to create signed URL:', signedUrlError);
    return NextResponse.json({ error: 'Failed to access photo for preview' }, { status: 500 });
  }

  const signedPhotoUrl = signedUrlData.signedUrl;

  // 6. Build gender-specific style prompt (AC #3)
  const gender = consultation.gender as 'male' | 'female';
  const styleName = recommendation.style_name as string;
  const difficultyLevel = recommendation.difficulty_level as 'low' | 'medium' | 'high';
  const stylePrompt = buildPreviewPrompt(gender, styleName, difficultyLevel);

  // 7. Construct callback URL from environment (AC #4)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    console.error('[POST /api/preview/generate] NEXT_PUBLIC_APP_URL is not set — cannot construct a valid callback URL for Kie.ai');
    return NextResponse.json(
      { error: 'Preview generation service is misconfigured. Please contact support.' },
      { status: 500 }
    );
  }
  const callbackUrl = `${appUrl}/api/webhook/kie`;

  // 8. Call Kie.ai API (AC #1, #2, #5, #6)
  const startTime = performance.now();
  try {
    const kieClient = new KieClient();
    const { taskId } = await kieClient.createPreviewTask(signedPhotoUrl, stylePrompt, callbackUrl);
    const latencyMs = performance.now() - startTime;

    // 9. Store taskId and update preview_status = 'generating' (AC #7, #9)
    const previewParams: PreviewGenerationParams = {
      taskId,
      model: 'nano-banana-2',
      callbackUrl,
      requestedAt: new Date().toISOString(),
      photoStoragePath,   // storage path, NOT the signed URL
      stylePrompt,
      styleName,
      gender,
    };

    const { error: updateError } = await supabase
      .from('recommendations')
      .update({
        preview_status: 'generating',
        preview_generation_params: previewParams,
      })
      .eq('id', recommendationId);

    if (updateError) {
      console.error('[POST /api/preview/generate] Failed to update recommendation:', updateError);
      // Non-fatal: task was created in Kie.ai, webhook will eventually resolve it
    }

    // 10. Log AI call to ai_calls table (AC #14)
    const aiLog = logAICall({
      provider: 'kie',
      model: 'nano-banana-2',
      task: 'preview',
      inputTokens: 0,    // image generation, no input tokens
      outputTokens: 0,   // image generation, no output tokens
      costCents: KIE_COST_PER_IMAGE_CENTS,
      latencyMs,
      success: true,
    });

    await persistAICallLog(supabase, consultationId, aiLog);

    // 11. Return success response (AC #10)
    return NextResponse.json({ status: 'generating', estimatedSeconds: 30 }, { status: 200 });
  } catch (error) {
    const latencyMs = performance.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Kie.ai: Unknown error';

    console.error('[POST /api/preview/generate] Kie.ai error:', errorMessage);

    // AC #13: Update preview_status to 'failed' on Kie.ai error
    await supabase
      .from('recommendations')
      .update({ preview_status: 'failed' })
      .eq('id', recommendationId);

    // Log failed AI call
    const aiLog = logAICall({
      provider: 'kie',
      model: 'nano-banana-2',
      task: 'preview',
      inputTokens: 0,
      outputTokens: 0,
      costCents: 0,
      latencyMs,
      success: false,
      error: errorMessage,
    });

    await persistAICallLog(supabase, consultationId, aiLog).catch(() => {
      // Best-effort logging — don't let logging failure mask the real error
    });

    return NextResponse.json(
      { error: 'Preview generation service unavailable. Please try again.' },
      { status: 502 }
    );
  }
}
