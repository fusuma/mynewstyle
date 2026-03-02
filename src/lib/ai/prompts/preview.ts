import { getMalePreviewPrompt } from './v1/preview-male';
import { getFemalePreviewPrompt } from './v1/preview-female';
import type { PreviewPromptParams } from './v1/preview-male';

export type { PreviewPromptParams };

/**
 * Build the style prompt for preview generation.
 *
 * Routes to the appropriate gender-specific prompt template.
 *
 * @param gender - 'male' or 'female'
 * @param styleName - The recommendation's style name (e.g., "Modern Undercut")
 * @param difficultyLevel - Style difficulty from the recommendation
 * @returns Formatted prompt string for Kie.ai Nano Banana 2
 */
export function buildPreviewPrompt(
  gender: 'male' | 'female',
  styleName: string,
  difficultyLevel: 'low' | 'medium' | 'high'
): string {
  const params: PreviewPromptParams = { styleName, difficultyLevel };
  return gender === 'female' ? getFemalePreviewPrompt(params) : getMalePreviewPrompt(params);
}
