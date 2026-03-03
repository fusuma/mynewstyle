import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logAICall, persistAICallLog, KIE_COST_PER_IMAGE_CENTS, GEMINI_PRO_IMAGE_COST_PER_IMAGE_CENTS, GEMINI_PRO_IMAGE_OUTPUT_TOKENS } from '@/lib/ai';
import { buildPreviewPrompt } from '@/lib/ai/prompts/preview';
import { PreviewRouter, BothProvidersFailedError } from '@/lib/ai/preview-router';
// Dynamic import to avoid build-time TextEncoder errors from canvas/tensorflow
const getFaceSimilarity = () => import('@/lib/ai/face-similarity');
import type { PreviewGenerationParams } from '@/types';

const GeneratePreviewRequestSchema = z.object({
  consultationId: z.string().uuid('consultationId must be a valid UUID'),
  recommendationId: z.string().uuid('recommendationId must be a valid UUID'),
});

/**
 * POST /api/preview/generate
 *
 * Triggers a preview generation task for a recommendation.
 * Primary path: Kie.ai Nano Banana 2 (async, webhook-based)
 * Fallback path: Gemini 3 Pro Image (synchronous, inline response) — Story 7-6
 *
 * Flow (primary - Kie.ai):
 * 1. Validate request body (Zod)
 * 2. Verify consultation exists and payment_status === 'paid' (security gate)
 * 3. Check sequential queue: reject if another preview is already generating
 * 4. Fetch recommendation and verify it belongs to the consultation
 * 5. Generate Supabase Storage signed URL for the user's photo (15-min expiry)
 * 6. Build gender-specific style prompt
 * 7. Call PreviewRouter.generatePreview() (tries Kie.ai, falls back to Gemini Pro if needed)
 * 8a. Async (Kie.ai success): store taskId, set preview_status='generating', return { status: 'generating' }
 * 8b. Sync (Gemini fallback): run face similarity check, upload to storage, return { status: 'ready' | 'unavailable' }
 * 9. Log AI call to ai_calls table
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

  // 2. Fetch and validate consultation — payment gate
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

  // 3. Sequential queue check — only one preview generating per consultation at a time
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

  // 5. Generate Supabase Storage signed URL for the user's photo (15-min expiry)
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

  // 6. Build gender-specific style prompt
  const gender = consultation.gender as 'male' | 'female';
  const styleName = recommendation.style_name as string;
  const difficultyLevel = recommendation.difficulty_level as 'low' | 'medium' | 'high';
  const stylePrompt = buildPreviewPrompt(gender, styleName, difficultyLevel);

  // 7. Construct callback URL from environment
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    console.error('[POST /api/preview/generate] NEXT_PUBLIC_APP_URL is not set — cannot construct a valid callback URL for Kie.ai');
    return NextResponse.json(
      { error: 'Preview generation service is misconfigured. Please contact support.' },
      { status: 500 }
    );
  }
  const callbackUrl = `${appUrl}/api/webhook/kie`;

  // 8. Call PreviewRouter — handles Kie.ai primary and Gemini Pro fallback (Story 7-6)
  const startTime = performance.now();
  try {
    const previewRouter = new PreviewRouter();
    const result = await previewRouter.generatePreview(signedPhotoUrl, stylePrompt, callbackUrl);
    const latencyMs = performance.now() - startTime;

    if (result.isSync && result.imageBuffer) {
      // ---- FALLBACK PATH: Gemini Pro Image (synchronous) ----
      console.warn('[Preview] Primary provider (Kie.ai) failed, falling back to Gemini Pro Image');

      // Download original photo from Supabase Storage for face similarity comparison
      const { data: photoData, error: photoDownloadError } = await supabase.storage
        .from('consultation-photos')
        .download(photoStoragePath);

      if (photoDownloadError || !photoData) {
        console.error('[POST /api/preview/generate] Failed to download original photo for face similarity:', photoDownloadError);
        // Cannot run quality gate without original photo — fail gracefully
        await supabase
          .from('recommendations')
          .update({ preview_status: 'failed' })
          .eq('id', recommendationId);

        return NextResponse.json(
          { error: 'Preview generation service unavailable. Please try again.' },
          { status: 502 }
        );
      }

      const originalPhotoBuffer = Buffer.from(await photoData.arrayBuffer());

      // Run face similarity quality gate (AC #5 — same threshold as Kie.ai path)
      const { compareFaces, logQualityGate } = await getFaceSimilarity();
      const similarity = await compareFaces(originalPhotoBuffer, result.imageBuffer);

      logQualityGate({
        consultation_id: consultationId,
        recommendation_id: recommendationId,
        similarity_score: similarity.similarity,
        threshold: 0.7,
        passed: similarity.passed,
        provider: 'gemini',
        latency_ms: performance.now() - startTime,
      });

      if (!similarity.passed) {
        const fallbackParams: Partial<PreviewGenerationParams> = {
          model: 'gemini-3-pro-image-preview',
          requestedAt: new Date().toISOString(),
          photoStoragePath,
          stylePrompt,
          styleName,
          gender,
          provider: 'gemini-pro-image',
          fallbackReason: result.fallbackReason ?? 'kie_error',
          quality_gate_reason: similarity.reason,
          similarity_score: similarity.similarity,
        };

        await supabase
          .from('recommendations')
          .update({
            preview_status: 'unavailable',
            preview_generation_params: fallbackParams,
          })
          .eq('id', recommendationId);

        // Log AI call for cost tracking (AC #4)
        const aiLog = logAICall({
          provider: 'gemini',
          model: 'gemini-3-pro-image-preview',
          task: 'preview',
          inputTokens: 0,
          outputTokens: GEMINI_PRO_IMAGE_OUTPUT_TOKENS,
          costCents: GEMINI_PRO_IMAGE_COST_PER_IMAGE_CENTS,
          latencyMs,
          success: true,
        });
        await persistAICallLog(supabase, consultationId, aiLog).catch(() => {});

        return NextResponse.json({ status: 'unavailable' });
      }

      // Face similarity passed — upload generated image to Supabase Storage (AC #7)
      const storagePath = `previews/${consultationId}/${recommendationId}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('preview-images')
        .upload(storagePath, result.imageBuffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) {
        console.error('[POST /api/preview/generate] Failed to upload Gemini preview to storage:', uploadError);
        await supabase
          .from('recommendations')
          .update({ preview_status: 'failed' })
          .eq('id', recommendationId);
        return NextResponse.json(
          { error: 'Preview generation service unavailable. Please try again.' },
          { status: 502 }
        );
      }

      // Update recommendation with preview URL and fallback metadata (AC #3, #7)
      const fallbackParams: PreviewGenerationParams = {
        model: 'gemini-3-pro-image-preview',
        requestedAt: new Date().toISOString(),
        photoStoragePath,
        stylePrompt,
        styleName,
        gender,
        provider: 'gemini-pro-image',
        fallbackReason: result.fallbackReason ?? 'kie_error',
        completedAt: new Date().toISOString(),
      };

      await supabase
        .from('recommendations')
        .update({
          preview_url: storagePath,
          preview_status: 'ready',
          preview_generation_params: fallbackParams,
        })
        .eq('id', recommendationId);

      // Log AI call to ai_calls table with Gemini provider info (AC #4)
      const aiLog = logAICall({
        provider: 'gemini',
        model: 'gemini-3-pro-image-preview',
        task: 'preview',
        inputTokens: 0,
        outputTokens: GEMINI_PRO_IMAGE_OUTPUT_TOKENS,
        costCents: GEMINI_PRO_IMAGE_COST_PER_IMAGE_CENTS,
        latencyMs,
        success: true,
      });
      await persistAICallLog(supabase, consultationId, aiLog).catch(() => {});

      return NextResponse.json({ status: 'ready', previewUrl: storagePath }, { status: 200 });

    } else {
      // ---- PRIMARY PATH: Kie.ai (async) ----
      // Store taskId and update preview_status = 'generating'
      const previewParams: PreviewGenerationParams = {
        taskId: result.taskId,
        model: 'nano-banana-2',
        callbackUrl,
        requestedAt: new Date().toISOString(),
        photoStoragePath,
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

      // Log AI call to ai_calls table
      const aiLog = logAICall({
        provider: 'kie',
        model: 'nano-banana-2',
        task: 'preview',
        inputTokens: 0,
        outputTokens: 0,
        costCents: KIE_COST_PER_IMAGE_CENTS,
        latencyMs,
        success: true,
      });

      await persistAICallLog(supabase, consultationId, aiLog);

      return NextResponse.json({ status: 'generating', estimatedSeconds: 30 }, { status: 200 });
    }
  } catch (error) {
    const latencyMs = performance.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Preview: Unknown error';

    console.error('[POST /api/preview/generate] Both providers failed:', errorMessage);

    // AC #8: Both providers failed — set preview_status to 'failed'
    await supabase
      .from('recommendations')
      .update({ preview_status: 'failed' })
      .eq('id', recommendationId);

    // Log failed attempt — attribute to the last provider that was tried.
    // BothProvidersFailedError means Gemini was the last to fail; otherwise it was Kie.ai only.
    const geminiAttempted = error instanceof BothProvidersFailedError && error.geminiAttempted;
    const aiLog = logAICall({
      provider: geminiAttempted ? 'gemini' : 'kie',
      model: geminiAttempted ? 'gemini-3-pro-image-preview' : 'nano-banana-2',
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
