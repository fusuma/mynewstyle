/**
 * Unit tests for GeminiProImageProvider (Story 7.6)
 *
 * Tests the synchronous image generation via Gemini 3 Pro Image.
 * Mocks @google/genai SDK -- no real API calls.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Shared mock function for models.generateContent
const mockGenerateContent = vi.fn();

// Must mock before importing the module under test
vi.mock('@google/genai', () => {
  class GoogleGenAI {
    models = { generateContent: mockGenerateContent };
    constructor(_opts: { apiKey: string }) {}
  }
  return { GoogleGenAI };
});

import { GeminiProImageProvider } from '@/lib/ai/gemini-image';

const FAKE_PHOTO_BUFFER = Buffer.from('fake-photo-data');
const FAKE_STYLE_PROMPT = 'Transform the hairstyle to Modern Undercut, preserve face';
const FAKE_IMAGE_BASE64 = Buffer.from('fake-generated-image').toString('base64');

function makeFakeGeminiResponse(imageBase64: string) {
  return {
    candidates: [
      {
        content: {
          parts: [
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: imageBase64,
              },
            },
          ],
        },
      },
    ],
  };
}

describe('GeminiProImageProvider', () => {
  let provider: GeminiProImageProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GOOGLE_AI_API_KEY = 'test-google-api-key';
    provider = new GeminiProImageProvider();
  });

  describe('constructor', () => {
    it('creates provider successfully when GOOGLE_AI_API_KEY is set', () => {
      // If constructor didn't throw, it initialized correctly
      expect(provider).toBeInstanceOf(GeminiProImageProvider);
    });

    it('throws if GOOGLE_AI_API_KEY is not set', () => {
      const original = process.env.GOOGLE_AI_API_KEY;
      delete process.env.GOOGLE_AI_API_KEY;
      expect(() => new GeminiProImageProvider()).toThrow(/GOOGLE_AI_API_KEY/);
      process.env.GOOGLE_AI_API_KEY = original;
    });
  });

  describe('generatePreview()', () => {
    it('calls generateContent with correct model ID', async () => {
      mockGenerateContent.mockResolvedValueOnce(makeFakeGeminiResponse(FAKE_IMAGE_BASE64));

      await provider.generatePreview(FAKE_PHOTO_BUFFER, FAKE_STYLE_PROMPT);

      expect(mockGenerateContent).toHaveBeenCalledOnce();
      const call = mockGenerateContent.mock.calls[0][0];
      expect(call.model).toBe('gemini-3-pro-image-preview');
    });

    it('sends user photo as inlineData base64 alongside the style prompt', async () => {
      mockGenerateContent.mockResolvedValueOnce(makeFakeGeminiResponse(FAKE_IMAGE_BASE64));

      await provider.generatePreview(FAKE_PHOTO_BUFFER, FAKE_STYLE_PROMPT);

      const call = mockGenerateContent.mock.calls[0][0];
      const parts = call.contents[0].parts;

      const textPart = parts.find((p: any) => p.text !== undefined);
      const imagePart = parts.find((p: any) => p.inlineData !== undefined);

      expect(textPart).toBeDefined();
      expect(textPart.text).toBe(FAKE_STYLE_PROMPT);
      expect(imagePart).toBeDefined();
      expect(imagePart.inlineData.mimeType).toBe('image/jpeg');
      expect(imagePart.inlineData.data).toBe(FAKE_PHOTO_BUFFER.toString('base64'));
    });

    it('sets responseModalities to IMAGE', async () => {
      mockGenerateContent.mockResolvedValueOnce(makeFakeGeminiResponse(FAKE_IMAGE_BASE64));

      await provider.generatePreview(FAKE_PHOTO_BUFFER, FAKE_STYLE_PROMPT);

      const call = mockGenerateContent.mock.calls[0][0];
      expect(call.config.responseModalities).toEqual(['IMAGE']);
    });

    it('sets imageConfig aspectRatio to 3:4', async () => {
      mockGenerateContent.mockResolvedValueOnce(makeFakeGeminiResponse(FAKE_IMAGE_BASE64));

      await provider.generatePreview(FAKE_PHOTO_BUFFER, FAKE_STYLE_PROMPT);

      const call = mockGenerateContent.mock.calls[0][0];
      expect(call.config.imageConfig.aspectRatio).toBe('3:4');
    });

    it('returns a Buffer decoded from the base64 image in the response', async () => {
      mockGenerateContent.mockResolvedValueOnce(makeFakeGeminiResponse(FAKE_IMAGE_BASE64));

      const result = await provider.generatePreview(FAKE_PHOTO_BUFFER, FAKE_STYLE_PROMPT);

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result).toEqual(Buffer.from(FAKE_IMAGE_BASE64, 'base64'));
    });

    it('parses image from the first matching image part in candidates[0].content.parts', async () => {
      // Response with multiple parts — only the image part matters
      const response = {
        candidates: [
          {
            content: {
              parts: [
                { text: 'some text part' },
                { inlineData: { mimeType: 'image/jpeg', data: FAKE_IMAGE_BASE64 } },
              ],
            },
          },
        ],
      };
      mockGenerateContent.mockResolvedValueOnce(response);

      const result = await provider.generatePreview(FAKE_PHOTO_BUFFER, FAKE_STYLE_PROMPT);

      expect(result).toEqual(Buffer.from(FAKE_IMAGE_BASE64, 'base64'));
    });

    it('throws if no image part found in response', async () => {
      const response = {
        candidates: [
          {
            content: {
              parts: [{ text: 'just text, no image' }],
            },
          },
        ],
      };
      mockGenerateContent.mockResolvedValueOnce(response);

      await expect(provider.generatePreview(FAKE_PHOTO_BUFFER, FAKE_STYLE_PROMPT)).rejects.toThrow(
        /No image in response/
      );
    });

    it('throws if candidates array is empty', async () => {
      mockGenerateContent.mockResolvedValueOnce({ candidates: [] });

      await expect(provider.generatePreview(FAKE_PHOTO_BUFFER, FAKE_STYLE_PROMPT)).rejects.toThrow(
        /No image in response/
      );
    });

    it('throws if candidates is undefined', async () => {
      mockGenerateContent.mockResolvedValueOnce({});

      await expect(provider.generatePreview(FAKE_PHOTO_BUFFER, FAKE_STYLE_PROMPT)).rejects.toThrow(
        /No image in response/
      );
    });

    it('propagates API errors with status code attached', async () => {
      const apiError = new Error('Gemini API quota exceeded');
      (apiError as any).status = 429;
      mockGenerateContent.mockRejectedValueOnce(apiError);

      const thrownError = await provider
        .generatePreview(FAKE_PHOTO_BUFFER, FAKE_STYLE_PROMPT)
        .catch((e) => e);

      expect(thrownError).toBeInstanceOf(Error);
      expect((thrownError as any).status).toBe(429);
    });

    it('sends contents with role user', async () => {
      mockGenerateContent.mockResolvedValueOnce(makeFakeGeminiResponse(FAKE_IMAGE_BASE64));

      await provider.generatePreview(FAKE_PHOTO_BUFFER, FAKE_STYLE_PROMPT);

      const call = mockGenerateContent.mock.calls[0][0];
      expect(call.contents[0].role).toBe('user');
    });
  });
});
