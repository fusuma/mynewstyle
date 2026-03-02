import { getFaceAnalysisPrompt } from './v1/face-analysis';
import { getMaleConsultationPrompt } from './v1/consultation-male';
import { getFemaleConsultationPrompt } from './v1/consultation-female';
import type { FaceAnalysisPromptParams } from './v1/face-analysis';
import type { ConsultationPromptParams } from './v1/consultation-male';

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

/** All supported prompt task types */
export type PromptTask = 'face-analysis' | 'consultation-male' | 'consultation-female';

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
 * @param task - The prompt task to generate (face-analysis, consultation-male, consultation-female)
 * @param params - Parameters for the prompt (photoBase64 for face-analysis, analysis+questionnaire for consultation)
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
