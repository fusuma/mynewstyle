import { describe, it, expect, vi, beforeEach } from 'vitest';
import { clearAICallLogs, getAICallLogs } from '../lib/ai/logger';
import type { FaceAnalysis, Consultation } from '../types';

// Mock the @google/genai module
const mockGenerateContent = vi.fn();
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(function () {
    return {
      models: {
        generateContent: mockGenerateContent,
      },
    };
  }),
}));

// Import after mock
import { GeminiProvider } from '../lib/ai/gemini';

const mockFaceAnalysisResponse: FaceAnalysis = {
  faceShape: 'oval',
  confidence: 0.92,
  proportions: {
    foreheadRatio: 0.33,
    cheekboneRatio: 0.35,
    jawRatio: 0.32,
    faceLength: 1.4,
  },
  hairAssessment: {
    type: 'straight',
    texture: 'fine',
    density: 'medium',
    currentStyle: 'short sides long top',
  },
};

const mockConsultationResponse: Consultation = {
  recommendations: [
    {
      styleName: 'Textured Quiff',
      justification: 'Complements oval face shape',
      matchScore: 0.9,
      difficultyLevel: 'medium',
    },
  ],
  stylesToAvoid: [
    {
      styleName: 'Long Straight',
      reason: 'Elongates the face',
    },
  ],
  groomingTips: [
    {
      category: 'products',
      tipText: 'Use a matte clay for texture',
      icon: 'jar',
    },
  ],
};

describe('GeminiProvider', () => {
  let provider: GeminiProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    clearAICallLogs();
    provider = new GeminiProvider({ apiKey: 'test-key', model: 'gemini-2.5-flash' });
  });

  describe('analyzeFace', () => {
    it('sends photo as inline data with correct MIME type', async () => {
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify(mockFaceAnalysisResponse),
        usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 50 },
      });

      const photo = Buffer.from('fake-photo-data');
      await provider.analyzeFace(photo);

      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gemini-2.5-flash',
          contents: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              parts: expect.arrayContaining([
                expect.objectContaining({
                  inlineData: expect.objectContaining({
                    mimeType: 'image/jpeg',
                    data: photo.toString('base64'),
                  }),
                }),
              ]),
            }),
          ]),
        })
      );
    });

    it('returns parsed FaceAnalysis on success', async () => {
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify(mockFaceAnalysisResponse),
        usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 50 },
      });

      const photo = Buffer.from('fake-photo-data');
      const result = await provider.analyzeFace(photo);

      expect(result).toEqual(mockFaceAnalysisResponse);
      expect(result.faceShape).toBe('oval');
      expect(result.confidence).toBe(0.92);
      expect(result.proportions).toBeDefined();
      expect(result.hairAssessment).toBeDefined();
    });

    it('logs the call via logAICall with correct provider/model/task', async () => {
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify(mockFaceAnalysisResponse),
        usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 50 },
      });

      const photo = Buffer.from('fake-photo-data');
      await provider.analyzeFace(photo);

      const logs = getAICallLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].provider).toBe('gemini');
      expect(logs[0].model).toBe('gemini-2.5-flash');
      expect(logs[0].task).toBe('face-analysis');
      expect(logs[0].success).toBe(true);
      expect(logs[0].inputTokens).toBe(100);
      expect(logs[0].outputTokens).toBe(50);
      expect(logs[0].latencyMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('generateConsultation', () => {
    it('sends analysis and questionnaire as text content', async () => {
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify(mockConsultationResponse),
        usageMetadata: { promptTokenCount: 200, candidatesTokenCount: 150 },
      });

      const analysis = mockFaceAnalysisResponse;
      const questionnaire = { hairGoal: 'professional', budget: 'medium' };

      await provider.generateConsultation(analysis, questionnaire);

      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gemini-2.5-flash',
          contents: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              parts: expect.arrayContaining([
                expect.objectContaining({
                  text: expect.stringContaining(JSON.stringify(analysis)),
                }),
              ]),
            }),
          ]),
        })
      );
    });

    it('returns parsed Consultation on success', async () => {
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify(mockConsultationResponse),
        usageMetadata: { promptTokenCount: 200, candidatesTokenCount: 150 },
      });

      const result = await provider.generateConsultation(
        mockFaceAnalysisResponse,
        { hairGoal: 'professional' }
      );

      expect(result).toEqual(mockConsultationResponse);
      expect(result.recommendations).toHaveLength(1);
      expect(result.stylesToAvoid).toHaveLength(1);
      expect(result.groomingTips).toHaveLength(1);
    });
  });

  describe('error handling', () => {
    it('wraps SDK errors with provider context for analyzeFace', async () => {
      const sdkError = new Error('Gemini API error');
      (sdkError as any).status = 500;
      mockGenerateContent.mockRejectedValue(sdkError);

      const photo = Buffer.from('fake-photo-data');

      await expect(provider.analyzeFace(photo)).rejects.toThrow();

      const logs = getAICallLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].success).toBe(false);
      expect(logs[0].error).toContain('Gemini');
    });

    it('wraps SDK errors with provider context for generateConsultation', async () => {
      const sdkError = new Error('Gemini quota exceeded');
      (sdkError as any).status = 429;
      mockGenerateContent.mockRejectedValue(sdkError);

      await expect(
        provider.generateConsultation(mockFaceAnalysisResponse, { hairGoal: 'professional' })
      ).rejects.toThrow();

      const logs = getAICallLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].success).toBe(false);
      expect(logs[0].task).toBe('consultation');
      expect(logs[0].error).toContain('Gemini');
    });

    it('throws immediately with error message for invalid JSON response', async () => {
      mockGenerateContent.mockResolvedValue({
        text: 'this is not json',
        usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 50 },
      });

      const photo = Buffer.from('fake-photo-data');
      await expect(provider.analyzeFace(photo)).rejects.toThrow('Invalid JSON response');
    });
  });
});
