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
export { logAICall, getAICallLogs, clearAICallLogs, calculateCost, persistAICallLog, KIE_COST_PER_IMAGE_CENTS } from './logger';
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
export { compareFaces, logQualityGate, FACE_SIMILARITY_THRESHOLD } from './face-similarity';
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
