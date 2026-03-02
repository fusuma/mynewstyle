import { GeminiProvider } from './gemini';
import { OpenAIProvider } from './openai';
import { AIRouter } from './provider';
import { getAIConfig } from './config';

// Re-export types
export type { AIProvider } from './provider';
export { AIRouter, isRetryable } from './provider';
export { logAICall, getAICallLogs, clearAICallLogs, calculateCost } from './logger';
export { getAIConfig } from './config';
export { GeminiProvider } from './gemini';
export { OpenAIProvider } from './openai';

// Prompt system exports
export { getPrompt, CURRENT_PROMPT_VERSION } from './prompts';
export type { PromptContent, PromptTask, PromptVersion, PromptParams } from './prompts';

// Schema exports
export { FaceAnalysisSchema, ConsultationSchema } from './schemas';
export type { FaceAnalysisOutput, ConsultationOutput } from './schemas';

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
