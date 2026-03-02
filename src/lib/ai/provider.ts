import type {
  FaceAnalysis,
  Consultation,
  AnalysisOptions,
  QuestionnaireData,
} from '@/types';

/**
 * Provider-agnostic AI interface for face analysis and consultation generation.
 */
export interface AIProvider {
  analyzeFace(photo: Buffer, options?: AnalysisOptions): Promise<FaceAnalysis>;
  generateConsultation(
    analysis: FaceAnalysis,
    questionnaire: QuestionnaireData
  ): Promise<Consultation>;
}

/**
 * Determine if an error is retryable (transient) vs permanent.
 * Retryable: rate limits (429), server errors (5xx), timeouts, connection resets.
 * Non-retryable: auth errors (401/403), bad request (400), not found (404).
 */
export function isRetryable(error: unknown): boolean {
  if (error instanceof Error) {
    const status =
      (error as any).status ?? (error as any).statusCode;
    if (typeof status === 'number') {
      if (status === 429) return true;
      if (status >= 500) return true;
    }
    if (error.message?.includes('timeout')) return true;
    if (error.message?.includes('ECONNRESET')) return true;
  }
  return false;
}

/**
 * AIRouter executes AI tasks with automatic retry and fallback routing.
 * Strategy: try primary -> if retryable, retry primary once -> if fails again, try fallback -> throw.
 */
export class AIRouter {
  private primary: AIProvider | null;
  private fallback: AIProvider | null;

  constructor(primary: AIProvider | null, fallback: AIProvider | null) {
    this.primary = primary;
    this.fallback = fallback;
  }

  async execute<T>(task: (provider: AIProvider) => Promise<T>): Promise<T> {
    if (!this.primary && !this.fallback) {
      throw new Error(
        'No AI providers configured. Set GOOGLE_AI_API_KEY and/or OPENAI_API_KEY.'
      );
    }

    const primaryProvider = this.primary ?? this.fallback!;
    const fallbackProvider = this.primary ? this.fallback : null;

    try {
      return await task(primaryProvider);
    } catch (error) {
      if (isRetryable(error)) {
        // Retry once on primary
        try {
          return await task(primaryProvider);
        } catch (retryError) {
          // Fall back to fallback provider if available
          if (fallbackProvider) {
            return await task(fallbackProvider);
          }
          throw retryError;
        }
      }
      // Non-retryable error: throw immediately
      throw error;
    }
  }
}
