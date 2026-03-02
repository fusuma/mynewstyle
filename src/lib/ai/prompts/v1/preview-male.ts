export interface PreviewPromptParams {
  styleName: string;
  difficultyLevel: 'low' | 'medium' | 'high';
}

/**
 * Generates a Kie.ai Nano Banana 2 style prompt for male hairstyle preview.
 *
 * Critical requirements:
 * - MUST instruct AI to preserve face, skin tone, facial features, and expression
 * - MUST only change the hairstyle
 * - MUST produce photorealistic result
 * - Includes style name and difficulty context for quality output
 */
export function getMalePreviewPrompt(params: PreviewPromptParams): string {
  const { styleName, difficultyLevel } = params;

  const difficultyContext = {
    low: 'a low-maintenance',
    medium: 'a medium-maintenance',
    high: 'a high-maintenance, styled',
  }[difficultyLevel];

  return (
    `Edit this person's hairstyle to show them with ${difficultyContext} men's hairstyle called "${styleName}". ` +
    `Keep the person's face, skin tone, facial features, and expression exactly the same — do not alter any facial characteristics. ` +
    `Only change the hairstyle. Apply the "${styleName}" style precisely, including appropriate length, texture, and cut characteristics typical of this men's hairstyle. ` +
    `Photorealistic result. The hair change should look natural and believable on this specific person.`
  );
}
