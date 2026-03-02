/**
 * Kie.ai webhook verification and processing.
 *
 * This module handles the async callback from Kie.ai when a preview task completes.
 * It follows the same patterns as src/lib/stripe/webhooks.ts:
 * - Thin route handler, fat library functions
 * - Always return 200 to Kie.ai for verified callbacks (even on internal errors)
 * - Only 401 for signature failures
 * - Structured logging with [webhook/kie] prefix
 * - Idempotency check early, before any work
 */

import { createHmac, timingSafeEqual } from 'crypto';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { compareFaces, logQualityGate, FACE_SIMILARITY_THRESHOLD } from '@/lib/ai/face-similarity';
import { logAICall, persistAICallLog } from '@/lib/ai/logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface KieWebhookResult {
  status: 'ok' | 'error';
  message: string;
}

interface KieRecordInfoData {
  taskId: string;
  state: 'waiting' | 'queuing' | 'generating' | 'success' | 'fail';
  resultJson: string;
  failCode: string;
  failMsg: string;
  costTime: number;
}

interface KieRecordInfoResponse {
  code: number;
  data: KieRecordInfoData;
}

// ---------------------------------------------------------------------------
// verifyKieWebhook
// ---------------------------------------------------------------------------

/** Maximum age of a valid webhook timestamp in seconds (5 minutes). */
const WEBHOOK_TIMESTAMP_MAX_AGE_SECONDS = 300;

/** Trusted CDN hostname prefix for Kie.ai result image URLs. */
const KIE_CDN_HOSTNAME = 'cdn.kie.ai';

/**
 * Verifies the Kie.ai webhook HMAC-SHA256 signature and timestamp freshness.
 *
 * Algorithm: HMAC-SHA256(taskId + "." + timestamp, KIE_WEBHOOK_HMAC_KEY) then base64 encode
 * Uses crypto.timingSafeEqual to prevent timing attacks.
 * Rejects timestamps older than 5 minutes to prevent replay attacks.
 *
 * @param taskId - The task ID from the webhook payload
 * @param timestamp - The X-Webhook-Timestamp header value (unix seconds)
 * @param signature - The X-Webhook-Signature header value (base64-encoded HMAC)
 * @returns true if valid and fresh, false otherwise
 */
export function verifyKieWebhook(
  taskId: string,
  timestamp: string,
  signature: string
): boolean {
  const hmacKey = process.env.KIE_WEBHOOK_HMAC_KEY;

  if (!hmacKey) {
    console.error(
      '[webhook/kie] KIE_WEBHOOK_HMAC_KEY is not set — cannot verify webhook signature'
    );
    return false;
  }

  if (!signature) {
    return false;
  }

  // Replay attack prevention: reject stale timestamps
  const timestampSeconds = parseInt(timestamp, 10);
  if (isNaN(timestampSeconds)) {
    console.error('[webhook/kie] X-Webhook-Timestamp is not a valid integer');
    return false;
  }
  const nowSeconds = Math.floor(Date.now() / 1000);
  const ageSeconds = Math.abs(nowSeconds - timestampSeconds);
  if (ageSeconds > WEBHOOK_TIMESTAMP_MAX_AGE_SECONDS) {
    console.error(
      `[webhook/kie] Webhook timestamp is too old (age: ${ageSeconds}s, max: ${WEBHOOK_TIMESTAMP_MAX_AGE_SECONDS}s) — possible replay attack`
    );
    return false;
  }

  try {
    const data = `${taskId}.${timestamp}`;
    const expectedSignature = createHmac('sha256', hmacKey)
      .update(data)
      .digest('base64');

    // Use Buffer.from to ensure equal-length buffers for timingSafeEqual.
    // If lengths differ, return false immediately to avoid TypeError.
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const receivedBuffer = Buffer.from(signature, 'utf8');

    if (expectedBuffer.length !== receivedBuffer.length) {
      return false;
    }

    return timingSafeEqual(expectedBuffer, receivedBuffer);
  } catch (error) {
    console.error('[webhook/kie] Signature verification error:', error);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Fetches task result details from Kie.ai recordInfo API.
 * The webhook callback payload only contains taskId — the actual result URLs
 * are fetched from this endpoint.
 */
async function fetchRecordInfo(taskId: string): Promise<KieRecordInfoData> {
  const apiKey = process.env.KIE_API_KEY;
  if (!apiKey) {
    throw new Error('KIE_API_KEY is not set');
  }

  const response = await fetch(
    `https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Kie.ai recordInfo API error: ${response.status} ${response.statusText}`
    );
  }

  const responseData = (await response.json()) as KieRecordInfoResponse;
  return responseData.data;
}

/**
 * Validates that a CDN URL is a safe HTTPS URL from the trusted Kie.ai CDN hostname.
 * Prevents SSRF by rejecting non-HTTPS schemes and untrusted hosts.
 */
function validateCdnUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid CDN URL (cannot parse): ${url}`);
  }
  if (parsed.protocol !== 'https:') {
    throw new Error(`CDN URL must use HTTPS, got: ${parsed.protocol}`);
  }
  if (!parsed.hostname.endsWith(KIE_CDN_HOSTNAME)) {
    throw new Error(
      `CDN URL hostname '${parsed.hostname}' is not a trusted Kie.ai CDN domain (expected *.${KIE_CDN_HOSTNAME})`
    );
  }
}

/**
 * Downloads an image from Kie.ai CDN.
 * CDN URLs expire after 24 hours — download immediately and re-upload to Supabase Storage.
 * Validates the URL is a trusted HTTPS Kie.ai CDN source before fetching (SSRF prevention).
 */
async function downloadImage(url: string): Promise<Buffer> {
  // Validate URL is safe before fetching — prevents SSRF via malicious resultUrls
  validateCdnUrl(url);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Failed to download image from CDN: ${response.status} ${response.statusText}`
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Sets preview_status to 'failed' with error details in preview_generation_params.
 */
async function markPreviewFailed(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  recommendationId: string,
  existingParams: Record<string, unknown>,
  errorDetails: { failCode?: string; failMsg?: string; error?: string }
): Promise<void> {
  const { error: updateError } = await supabase
    .from('recommendations')
    .update({
      preview_status: 'failed',
      preview_generation_params: {
        ...existingParams,
        ...errorDetails,
      },
    })
    .eq('id', recommendationId);

  if (updateError) {
    console.error(
      '[webhook/kie] Failed to update preview_status to failed:',
      updateError
    );
  }
}

// ---------------------------------------------------------------------------
// processKieCallback
// ---------------------------------------------------------------------------

/**
 * Processes a verified Kie.ai webhook callback.
 *
 * Flow:
 * 1. Look up recommendation by taskId stored in preview_generation_params
 * 2. Idempotency check: if already processed (preview_status = "ready"), return immediately
 * 3. Fetch task result details from Kie.ai recordInfo API
 * 4. On success: download image, upload to Supabase Storage, update recommendation
 * 5. On failure: update preview_status to "failed" with error details
 *
 * Returns KieWebhookResult with status 'error' when an internal processing error occurs.
 * The route handler MUST return 200 to Kie.ai regardless — errors are logged, not propagated
 * to Kie.ai. The 'error' status is used only for internal logging differentiation.
 */
export async function processKieCallback(taskId: string): Promise<KieWebhookResult> {
  const supabase = createServerSupabaseClient();

  // ---------------------------------------------------------------------------
  // Step 1: Look up recommendation by taskId
  // ---------------------------------------------------------------------------
  const { data: recommendation, error: fetchError } = await supabase
    .from('recommendations')
    .select('id, consultation_id, preview_status, preview_generation_params')
    .filter('preview_generation_params->>taskId', 'eq', taskId)
    .single();

  if (fetchError || !recommendation) {
    // Orphaned task (no matching recommendation) — log warning, return 200
    console.warn(
      `[webhook/kie] Recommendation not found for taskId: ${taskId} (may be orphaned)`
    );
    return { status: 'ok', message: 'Recommendation not found for taskId' };
  }

  // ---------------------------------------------------------------------------
  // Step 2: Idempotency check
  // ---------------------------------------------------------------------------
  if (recommendation.preview_status === 'ready') {
    console.log(
      `[webhook/kie] Duplicate callback for taskId: ${taskId} — already processed (idempotent no-op)`
    );
    return { status: 'ok', message: 'duplicate callback — already processed' };
  }

  const existingParams =
    (recommendation.preview_generation_params as Record<string, unknown>) ?? {};
  const recommendationId = recommendation.id as string;
  const consultationId = recommendation.consultation_id as string;
  const storagePath = `previews/${consultationId}/${recommendationId}.jpg`;

  // ---------------------------------------------------------------------------
  // Step 3: Fetch task details from Kie.ai recordInfo
  // ---------------------------------------------------------------------------
  let recordInfo: KieRecordInfoData;
  try {
    recordInfo = await fetchRecordInfo(taskId);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(
      `[webhook/kie] Failed to fetch recordInfo for taskId: ${taskId}:`,
      errorMessage
    );
    await markPreviewFailed(supabase, recommendationId, existingParams, {
      error: `recordInfo fetch failed: ${errorMessage}`,
    });
    return { status: 'error', message: `recordInfo fetch failed: ${errorMessage}` };
  }

  // ---------------------------------------------------------------------------
  // Step 4: Handle task state
  // ---------------------------------------------------------------------------
  if (recordInfo.state === 'fail') {
    console.warn(
      `[webhook/kie] Kie.ai task ${taskId} failed: ${recordInfo.failCode} — ${recordInfo.failMsg}`
    );
    await markPreviewFailed(supabase, recommendationId, existingParams, {
      failCode: recordInfo.failCode,
      failMsg: recordInfo.failMsg,
    });
    return { status: 'ok', message: 'Kie.ai task failed — marked as failed' };
  }

  if (recordInfo.state !== 'success') {
    // Unexpected state (e.g., still queuing) — log and return ok
    console.warn(
      `[webhook/kie] Unexpected task state: ${recordInfo.state} for taskId: ${taskId}`
    );
    return { status: 'ok', message: `Unexpected task state: ${recordInfo.state}` };
  }

  // ---------------------------------------------------------------------------
  // Step 5: Parse resultUrls from resultJson
  // ---------------------------------------------------------------------------
  let resultUrls: string[];
  try {
    const parsedResult = JSON.parse(recordInfo.resultJson) as { resultUrls: string[] };
    resultUrls = parsedResult.resultUrls;
    if (!resultUrls?.length) {
      throw new Error('No resultUrls in resultJson');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[webhook/kie] Failed to parse resultJson for taskId: ${taskId}:`, errorMessage);
    await markPreviewFailed(supabase, recommendationId, existingParams, {
      error: `resultJson parse failed: ${errorMessage}`,
    });
    return { status: 'error', message: `resultJson parse failed: ${errorMessage}` };
  }

  // ---------------------------------------------------------------------------
  // Step 6: Download image from Kie.ai CDN
  // CDN URLs expire after 24h — download immediately
  // ---------------------------------------------------------------------------
  let imageBuffer: Buffer;
  try {
    imageBuffer = await downloadImage(resultUrls[0]);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(
      `[webhook/kie] Image download failed for taskId: ${taskId}:`,
      errorMessage
    );
    await markPreviewFailed(supabase, recommendationId, existingParams, {
      error: `image download failed: ${errorMessage}`,
    });
    return { status: 'error', message: `image download failed: ${errorMessage}` };
  }

  // ---------------------------------------------------------------------------
  // Step 7: Face similarity quality gate (AC #1, #2, #4)
  // Runs BEFORE uploading to Supabase Storage to avoid storing rejected previews.
  // Downloads the original user photo and compares face embeddings.
  // ---------------------------------------------------------------------------
  const photoStoragePath = (existingParams.photoStoragePath as string) ?? null;
  const qualityGateStart = Date.now();

  if (photoStoragePath) {
    // Download the original user photo from Supabase Storage for comparison
    const { data: originalPhotoBlob, error: photoDownloadError } = await supabase.storage
      .from('user-photos')
      .download(photoStoragePath);

    if (photoDownloadError || !originalPhotoBlob) {
      console.warn(
        `[webhook/kie] Could not download original photo for quality gate check (taskId: ${taskId}): ${
          photoDownloadError?.message ?? 'unknown'
        } — skipping quality gate`
      );
      // Non-fatal: proceed with upload if original photo is unavailable
    } else {
      // Convert Blob to Buffer for comparison
      const originalPhotoBuffer = Buffer.from(await originalPhotoBlob.arrayBuffer());

      try {
        const similarityResult = await compareFaces(originalPhotoBuffer, imageBuffer);
        const latencyMs = Date.now() - qualityGateStart;

        // Log the quality gate evaluation (AC #5) — structured console log
        logQualityGate({
          consultation_id: consultationId,
          recommendation_id: recommendationId,
          similarity_score: similarityResult.similarity,
          threshold: FACE_SIMILARITY_THRESHOLD,
          passed: similarityResult.passed,
          provider: 'kie',
          latency_ms: latencyMs,
        });

        // Persist quality gate result to ai_calls table (AC #5)
        // success=true means the face comparison itself completed without error;
        // passed/failed is recorded via logQualityGate and in preview_generation_params.
        const aiCallEntry = logAICall({
          provider: 'kie',
          model: 'face-api/ssd-mobilenetv1',
          task: 'face-similarity',
          inputTokens: 0,
          outputTokens: 0,
          costCents: 0,
          latencyMs,
          success: similarityResult.passed,
        });
        // Best-effort persistence — errors are logged but not thrown
        persistAICallLog(supabase, consultationId, aiCallEntry).catch((err: unknown) => {
          console.error('[webhook/kie] Failed to persist face-similarity AI call log:', err);
        });

        if (!similarityResult.passed) {
          // Quality gate failed: do NOT upload, set preview_status=unavailable (AC #2, #4)
          console.warn(
            `[webhook/kie] Quality gate FAILED for taskId: ${taskId} — similarity: ${similarityResult.similarity.toFixed(3)} (threshold: ${FACE_SIMILARITY_THRESHOLD})`
          );

          const { error: unavailableError } = await supabase
            .from('recommendations')
            .update({
              preview_status: 'unavailable',
              preview_generation_params: {
                ...existingParams,
                quality_gate_reason: 'face_similarity_below_threshold',
                quality_gate_similarity_score: similarityResult.similarity,
              },
            })
            .eq('id', recommendationId);

          if (unavailableError) {
            console.error(
              `[webhook/kie] Failed to update preview_status to unavailable for taskId: ${taskId}:`,
              unavailableError
            );
          }

          return { status: 'ok', message: `Quality gate failed — preview unavailable (similarity: ${similarityResult.similarity.toFixed(3)})` };
        }

        console.log(
          `[webhook/kie] Quality gate PASSED for taskId: ${taskId} — similarity: ${similarityResult.similarity.toFixed(3)}`
        );
      } catch (similarityError) {
        // Non-fatal: log and proceed if similarity check itself errors
        console.error(
          `[webhook/kie] Face similarity check error for taskId: ${taskId}:`,
          similarityError instanceof Error ? similarityError.message : similarityError
        );
        // Fall through to upload — we prefer showing the preview over blocking on check errors
      }
    }
  } else {
    console.warn(
      `[webhook/kie] No photoStoragePath in preview_generation_params for taskId: ${taskId} — skipping quality gate`
    );
  }

  // ---------------------------------------------------------------------------
  // Step 8: Upload image to Supabase Storage
  // upsert: true ensures idempotency — second upload overwrites harmlessly
  // Only reached if quality gate passed (or was skipped due to missing original photo)
  // ---------------------------------------------------------------------------
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('preview-images')
    .upload(storagePath, imageBuffer, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (uploadError || !uploadData) {
    console.error(
      `[webhook/kie] Supabase storage upload failed for taskId: ${taskId}:`,
      uploadError
    );
    await markPreviewFailed(supabase, recommendationId, existingParams, {
      error: `storage upload failed: ${uploadError?.message ?? 'unknown'}`,
    });
    return { status: 'error', message: `storage upload failed: ${uploadError?.message ?? 'unknown'}` };
  }

  // ---------------------------------------------------------------------------
  // Step 9: Update recommendation record with preview_url and preview_status=ready
  // ---------------------------------------------------------------------------
  const { error: updateError } = await supabase
    .from('recommendations')
    .update({
      preview_url: storagePath,
      preview_status: 'ready',
    })
    .eq('id', recommendationId);

  if (updateError) {
    // Image is stored in Supabase Storage but the DB record was not updated.
    // Mark preview_status='failed' so the recommendation is not stuck in 'generating'
    // indefinitely. Manual reconciliation can re-trigger the webhook or copy the URL.
    console.error(
      `[webhook/kie] DB update failed after successful upload for taskId: ${taskId}:`,
      updateError
    );
    await markPreviewFailed(supabase, recommendationId, existingParams, {
      error: `DB update failed after upload: ${updateError.message} — image stored at ${storagePath}`,
    });
    return {
      status: 'error',
      message: `Upload succeeded but DB update failed — preview_status set to failed (image at ${storagePath})`,
    };
  }

  console.log(
    `[webhook/kie] Preview ready for taskId: ${taskId} — stored at ${storagePath}`
  );
  return { status: 'ok', message: `Preview ready — ${storagePath}` };
}
