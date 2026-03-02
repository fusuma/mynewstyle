/**
 * GeminiProImageProvider - Synchronous image generation via Gemini 3 Pro Image.
 *
 * This is a SEPARATE standalone class (NOT an AIProvider implementation).
 * It is used as the fallback for hairstyle preview generation when Kie.ai
 * (Nano Banana 2) is unavailable.
 *
 * Interaction model: synchronous request-response (vs. Kie.ai's async webhook).
 * The image is returned inline in the API response as base64.
 *
 * Architecture reference:
 * - Section 2.3: Gemini 3 Pro Image as preview fallback
 * - Section 14: PreviewProvider interface, Kie.ai primary + Gemini Pro fallback
 *
 * Story: 7.6 - Preview Fallback (Gemini Pro Direct)
 */

import { GoogleGenAI, type Part } from '@google/genai';

/**
 * GeminiProImageProvider generates hairstyle preview images synchronously
 * using the Gemini 3 Pro Image model via the @google/genai SDK.
 *
 * NOTE: Gemini 3 Pro Preview is deprecated and shuts down March 9, 2026.
 * Monitor Google's deprecation timeline. May need to switch to
 * gemini-3.1-flash-image-preview in the near future.
 */
export class GeminiProImageProvider {
  private readonly client: GoogleGenAI;
  private readonly model = 'gemini-3-pro-image-preview';

  constructor() {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'GOOGLE_AI_API_KEY environment variable is required but not set. ' +
          'Add GOOGLE_AI_API_KEY to your .env.local file (server-side only).'
      );
    }
    this.client = new GoogleGenAI({ apiKey });
  }

  /**
   * Generate a hairstyle preview image synchronously.
   *
   * Sends the user's photo as base64 inlineData alongside the style prompt.
   * Returns the generated image as a Buffer.
   *
   * @param photoBuffer - Buffer containing the user's original photo (JPEG)
   * @param stylePrompt - Gender-specific style prompt (same as Kie.ai path)
   * @returns Buffer containing the generated preview image (JPEG)
   * @throws Error if the API returns no image, or on API errors
   */
  async generatePreview(photoBuffer: Buffer, stylePrompt: string): Promise<Buffer> {
    const photoBase64 = photoBuffer.toString('base64');

    const response = await this.client.models.generateContent({
      model: this.model,
      contents: [
        {
          role: 'user',
          parts: [
            { text: stylePrompt },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: photoBase64,
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['IMAGE'],
        imageConfig: {
          aspectRatio: '3:4',
        },
      },
    });

    // Parse response: find the first image part in candidates[0].content.parts
    const parts: Part[] = response.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find(
      (p) => p.inlineData?.mimeType?.startsWith('image/')
    );

    if (!imagePart?.inlineData?.data) {
      throw new Error('Gemini: No image in response');
    }

    return Buffer.from(imagePart.inlineData.data, 'base64');
  }
}
