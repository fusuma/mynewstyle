/**
 * PreviewRouter - Routes preview generation requests to the appropriate provider.
 *
 * Primary: Kie.ai Nano Banana 2 (async, webhook-based)
 * Fallback: Gemini 3 Pro Image (synchronous, inline response)
 *
 * Strategy:
 * 1. Try Kie.ai primary with AbortController timeout (default: 90s)
 * 2. On any error or timeout: fall back to Gemini Pro Image
 * 3. If both fail: throw the fallback error (both-fail scenario)
 *
 * The two providers have fundamentally different interaction models:
 * - Kie.ai: returns a taskId; image is delivered later via webhook
 * - Gemini: returns the image buffer synchronously in the same request
 *
 * Architecture reference:
 * - Section 14: PreviewProvider interface, Kie.ai primary / Gemini Pro fallback
 * - Section 4.1: AI pipeline, Step 3 preview generation with fallback
 * - Section 4.2: Provider Abstraction Layer
 * - Section 8.3: 90s max per AI call timeout
 *
 * Story: 7.6 - Preview Fallback (Gemini Pro Direct)
 */

import { KieClient } from './kie';
import { GeminiProImageProvider } from './gemini-image';
import { isRetryable } from './provider';

/**
 * Error thrown when both Kie.ai and Gemini Pro Image fail.
 * Carries metadata about which providers were attempted so the route
 * can log accurate cost-tracking data (e.g., log Gemini failure rather
 * than attributing everything to Kie.ai).
 */
export class BothProvidersFailedError extends Error {
  /** The error thrown by the primary (Kie.ai) provider */
  public readonly primaryError: unknown;
  /** The error thrown by the fallback (Gemini) provider */
  public readonly fallbackError: unknown;
  /** true = Gemini fallback was attempted before both failed */
  public readonly geminiAttempted = true;

  constructor(primaryError: unknown, fallbackError: unknown) {
    const primaryMsg = primaryError instanceof Error ? primaryError.message : String(primaryError);
    const fallbackMsg = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
    super(`Both preview providers failed. Primary: ${primaryMsg}. Fallback: ${fallbackMsg}`);
    this.name = 'BothProvidersFailedError';
    this.primaryError = primaryError;
    this.fallbackError = fallbackError;
  }
}

/**
 * Result of a preview generation attempt.
 * isSync=false (Kie.ai): poll for status via webhook
 * isSync=true (Gemini): image is ready immediately in imageBuffer
 */
export interface PreviewResult {
  /** Task ID returned by Kie.ai async job (set when provider='kie') */
  taskId?: string;
  /** Generated image buffer (set when provider='gemini', isSync=true) */
  imageBuffer?: Buffer;
  /** Which provider generated the preview */
  provider: 'kie' | 'gemini';
  /** true = image available now in imageBuffer; false = poll for status */
  isSync: boolean;
  /**
   * Why the fallback was triggered (set when provider='gemini').
   * 'kie_timeout': Kie.ai AbortController timeout elapsed.
   * 'kie_error': Kie.ai returned a retryable error (5xx, 429, etc.).
   */
  fallbackReason?: 'kie_error' | 'kie_timeout';
}

export class PreviewRouter {
  private readonly kieClient: KieClient;
  private readonly geminiImage: GeminiProImageProvider;
  private readonly fallbackEnabled: boolean;
  private readonly timeoutMs: number;

  constructor() {
    this.kieClient = new KieClient();
    this.geminiImage = new GeminiProImageProvider();
    this.fallbackEnabled = process.env.PREVIEW_FALLBACK_ENABLED !== 'false';
    const parsedTimeout = parseInt(process.env.PREVIEW_PRIMARY_TIMEOUT_MS ?? '90000', 10);
    this.timeoutMs = Number.isNaN(parsedTimeout) || parsedTimeout <= 0 ? 90_000 : parsedTimeout;
  }

  /**
   * Generate a hairstyle preview using the best available provider.
   *
   * @param photoUrl - Publicly accessible signed URL for the user's photo
   * @param stylePrompt - Gender-specific style prompt
   * @param callbackUrl - Webhook URL for Kie.ai async callback
   * @returns PreviewResult describing the outcome and provider used
   */
  async generatePreview(
    photoUrl: string,
    stylePrompt: string,
    callbackUrl: string
  ): Promise<PreviewResult> {
    // Attempt primary provider (Kie.ai) with AbortController timeout
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const { taskId } = await this.kieClient.createPreviewTask(
        photoUrl,
        stylePrompt,
        callbackUrl,
        controller.signal
      );
      clearTimeout(timeoutHandle);
      return { taskId, provider: 'kie', isSync: false };
    } catch (primaryError) {
      clearTimeout(timeoutHandle);
      console.warn('[Preview] Kie.ai failed:', primaryError);

      // Determine if this is a timeout (AbortError) vs a retryable API error.
      // Non-retryable errors (401, 400, etc.) should NOT trigger an expensive fallback.
      const isTimeout =
        primaryError instanceof Error && primaryError.name === 'AbortError';
      const shouldFallback = isTimeout || isRetryable(primaryError);

      if (!this.fallbackEnabled || !shouldFallback) {
        throw primaryError;
      }

      const fallbackReason: 'kie_timeout' | 'kie_error' = isTimeout
        ? 'kie_timeout'
        : 'kie_error';

      // Attempt fallback provider (Gemini Pro Image)
      try {
        // Gemini requires base64 inlineData, not a URL — download the photo first
        const photoResponse = await fetch(photoUrl);
        if (!photoResponse.ok) {
          throw new Error(
            `Failed to download photo for Gemini fallback: HTTP ${photoResponse.status} ${photoResponse.statusText}`
          );
        }
        const photoBuffer = Buffer.from(await photoResponse.arrayBuffer());

        const imageBuffer = await this.geminiImage.generatePreview(photoBuffer, stylePrompt);
        return { imageBuffer, provider: 'gemini', isSync: true, fallbackReason };
      } catch (fallbackError) {
        const bothFailedError = new BothProvidersFailedError(primaryError, fallbackError);
        console.error('[Preview] Both providers failed:', {
          primary: primaryError,
          fallback: fallbackError,
        });
        throw bothFailedError;
      }
    }
  }
}
