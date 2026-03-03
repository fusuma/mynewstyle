import { GeminiProvider } from './gemini';
import { OpenAIProvider } from './openai';
import { AIRouter } from './provider';
import { getAIConfig } from './config';

// Re-export types
export type { AIProvider } from './provider';
export { AIRouter, isRetryable } from './provider';

// Kie.ai preview generation client (separate from text/vision AI providers)
export { KieClient, KieApiError } from './kie';
export type { KieJobRequest, KieJobResponse, KieTaskResult } from './kie';
export { logAICall, getAICallLogs, clearAICallLogs, calculateCost, persistAICallLog, KIE_COST_PER_IMAGE_CENTS, GEMINI_PRO_IMAGE_COST_PER_IMAGE_CENTS, GEMINI_PRO_IMAGE_OUTPUT_TOKENS } from './logger';

// Gemini Pro Image provider for synchronous preview fallback (Story 7-6)
export { GeminiProImageProvider } from './gemini-image';

// Preview router: Kie.ai primary + Gemini Pro fallback (Story 7-6)
export { PreviewRouter, BothProvidersFailedError } from './preview-router';
export type { PreviewResult } from './preview-router';
export { getAIConfig } from './config';
export { GeminiProvider } from './gemini';
export { OpenAIProvider } from './openai';

// Prompt system exports
export { getPrompt, CURRENT_PROMPT_VERSION } from './prompts';
export type { PromptContent, PromptTask, PromptVersion, PromptParams } from './prompts';

// Schema exports
export { FaceAnalysisSchema, ConsultationSchema } from './schemas';
export type { FaceAnalysisOutput, ConsultationOutput } from './schemas';

// Validation exports
export { validateFaceAnalysis, validateConsultation, logValidationFailure } from './validation';
export type { ValidationResult, ValidationFailureContext } from './validation';

// Face similarity exports (Story 7.3)
// NOTE: face-similarity uses canvas/@vladmandic/face-api which require native Node.js
// modules that fail during Next.js build-time page data collection. Import directly
// from '@/lib/ai/face-similarity' where needed, using dynamic imports for route handlers.
export type { FaceSimilarityResult, QualityGateLogEntry } from './face-similarity';

// Re-export AI types from types package
export type {
  FaceShape,
  FaceProportions,
  HairAssessment,
  FaceAnalysis,
  AnalysisOptions,
  QuestionnaireData,
  StyleRecommendation,
  StyleToAvoid,
  GroomingTip,
  Consultation,
  AICallLog,
  AIProviderConfig,
} from '@/types';

let _router: AIRouter | null = null;

/**
 * Create a new AIRouter instance using environment configuration.
 * Initializes Gemini as primary and OpenAI as fallback.
 */
export function createAIRouter(): AIRouter {
  const config = getAIConfig();

  const primary = config.gemini ? new GeminiProvider(config.gemini) : null;
  const fallback = config.openai ? new OpenAIProvider(config.openai) : null;

  return new AIRouter(primary, fallback);
}

/**
 * Get the singleton AIRouter instance, creating it if needed.
 */
export function getAIRouter(): AIRouter {
  if (!_router) {
    _router = createAIRouter();
  }
  return _router;
}

/**
 * Reset the singleton AIRouter instance (for testing).
 * Forces re-initialization on next getAIRouter() call.
 */
export function resetAIRouter(): void {
  _router = null;
}
