import { getFaceAnalysisPrompt } from './v1/face-analysis';
import { getMaleConsultationPrompt } from './v1/consultation-male';
import { getFemaleConsultationPrompt } from './v1/consultation-female';
import type { FaceAnalysisPromptParams } from './v1/face-analysis';
import type { ConsultationPromptParams } from './v1/consultation-male';

// Preview prompt exports (Kie.ai image generation — separate from text/vision AI prompts)
// Preview tasks use buildPreviewPrompt() directly — NOT getPrompt() — because they return
// a plain string for Kie.ai, not a PromptContent object for Gemini/OpenAI.
export { buildPreviewPrompt } from './preview';
export { getMalePreviewPrompt } from './v1/preview-male';
export { getFemalePreviewPrompt } from './v1/preview-female';
export type { PreviewPromptParams } from './v1/preview-male';

/**
 * The content structure returned by all prompt functions.
 * Used by AI providers to construct their API calls.
 */
export interface PromptContent {
  systemPrompt?: string;  // Optional system-level instruction
  userPrompt: string;     // Main user message
  imageData?: {           // For vision tasks (face analysis)
    base64: string;
    mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  };
}

/**
 * Prompt tasks for text/vision AI providers (Gemini, OpenAI).
 * These tasks are routed through getPrompt() and return PromptContent.
 *
 * NOTE: Preview tasks ('preview-male', 'preview-female') are intentionally
 * excluded here because Kie.ai is an image-generation API that accepts a
 * plain string prompt — not the PromptContent structure used by text/vision
 * providers. Use buildPreviewPrompt() from './preview' for those tasks.
 */
export type PromptTask =
  | 'face-analysis'
  | 'consultation-male'
  | 'consultation-female';

/** Supported prompt versions — extend as: 'v1' | 'v2' */
export type PromptVersion = 'v1';

/** Current default prompt version for all tasks */
export const CURRENT_PROMPT_VERSION: PromptVersion = 'v1';

/** Union of all valid prompt parameter types */
export type PromptParams = FaceAnalysisPromptParams | ConsultationPromptParams;

/**
 * Version routing map — add new version entries here when creating v2, v3, etc.
 * Each version maps task names to prompt generator functions.
 */
const PROMPT_VERSION_MAP: Record<PromptVersion, Record<PromptTask, (params: PromptParams) => PromptContent>> = {
  v1: {
    'face-analysis': (params) => getFaceAnalysisPrompt(params as FaceAnalysisPromptParams),
    'consultation-male': (params) => getMaleConsultationPrompt(params as ConsultationPromptParams),
    'consultation-female': (params) => getFemaleConsultationPrompt(params as ConsultationPromptParams),
  },
};

/**
 * Get a prompt by task and version.
 *
 * For text/vision AI tasks: face-analysis, consultation-male, consultation-female.
 * For Kie.ai image generation tasks, use buildPreviewPrompt() instead.
 *
 * @param task - The prompt task to generate
 * @param params - Parameters for the prompt
 * @param version - Prompt version to use (defaults to CURRENT_PROMPT_VERSION = 'v1')
 * @returns PromptContent with systemPrompt, userPrompt, and optional imageData
 * @throws Error if the requested version does not exist
 */
export function getPrompt(
  task: PromptTask,
  params: PromptParams,
  version: PromptVersion = CURRENT_PROMPT_VERSION
): PromptContent {
  const versionPrompts = PROMPT_VERSION_MAP[version];
  if (!versionPrompts) {
    throw new Error(
      `Unknown prompt version: "${version}". Available versions: ${Object.keys(PROMPT_VERSION_MAP).join(', ')}`
    );
  }

  const promptFn = versionPrompts[task];
  return promptFn(params);
}

// Re-export param types for convenience
export type { FaceAnalysisPromptParams, ConsultationPromptParams };
