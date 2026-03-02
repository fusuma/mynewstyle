import { describe, it, expect, vi, beforeEach } from 'vitest';
import { clearAICallLogs, getAICallLogs } from '../lib/ai/logger';
import type { FaceAnalysis, Consultation } from '../types';

// Mock the openai module
const mockCreate = vi.fn();
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(function () {
    return {
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    };
  }),
}));

// Import after mock
import { OpenAIProvider } from '../lib/ai/openai';

const mockFaceAnalysisResponse: FaceAnalysis = {
  faceShape: 'round',
  confidence: 0.88,
  proportions: {
    foreheadRatio: 0.30,
    cheekboneRatio: 0.40,
    jawRatio: 0.30,
    faceLength: 1.1,
  },
  hairAssessment: {
    type: 'wavy',
    texture: 'thick',
    density: 'high',
    currentStyle: 'medium length curly',
  },
};

const mockConsultationResponse: Consultation = {
  recommendations: [
    {
      styleName: 'Pompadour',
      justification: 'Adds height to balance round face',
      matchScore: 0.85,
      difficultyLevel: 'high',
    },
  ],
  stylesToAvoid: [
    {
      styleName: 'Buzz Cut',
      reason: 'Emphasizes roundness',
    },
  ],
  groomingTips: [
    {
      category: 'routine',
      tipText: 'Blow dry with volume for height',
      icon: 'hairdryer',
    },
  ],
};

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    clearAICallLogs();
    provider = new OpenAIProvider({ apiKey: 'test-key', model: 'gpt-4o' });
  });

  describe('analyzeFace', () => {
    it('sends photo as base64 data URL', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockFaceAnalysisResponse),
            },
          },
        ],
        usage: { prompt_tokens: 150, completion_tokens: 75 },
      });

      const photo = Buffer.from('fake-photo-data');
      await provider.analyzeFace(photo);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o',
          response_format: { type: 'json_object' },
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.arrayContaining([
                expect.objectContaining({
                  type: 'image_url',
                  image_url: expect.objectContaining({
                    url: `data:image/jpeg;base64,${photo.toString('base64')}`,
                  }),
                }),
              ]),
            }),
          ]),
        })
      );
    });

    it('returns parsed FaceAnalysis on success', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockFaceAnalysisResponse),
            },
          },
        ],
        usage: { prompt_tokens: 150, completion_tokens: 75 },
      });

      const photo = Buffer.from('fake-photo-data');
      const result = await provider.analyzeFace(photo);

      expect(result).toEqual(mockFaceAnalysisResponse);
      expect(result.faceShape).toBe('round');
      expect(result.confidence).toBe(0.88);
    });

    it('logs the call via logAICall with correct provider/model/task', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockFaceAnalysisResponse),
            },
          },
        ],
        usage: { prompt_tokens: 150, completion_tokens: 75 },
      });

      const photo = Buffer.from('fake-photo-data');
      await provider.analyzeFace(photo);

      const logs = getAICallLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].provider).toBe('openai');
      expect(logs[0].model).toBe('gpt-4o');
      expect(logs[0].task).toBe('face-analysis');
      expect(logs[0].success).toBe(true);
      expect(logs[0].inputTokens).toBe(150);
      expect(logs[0].outputTokens).toBe(75);
      expect(logs[0].latencyMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('generateConsultation', () => {
    it('sends analysis and questionnaire data', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockConsultationResponse),
            },
          },
        ],
        usage: { prompt_tokens: 300, completion_tokens: 200 },
      });

      const analysis = mockFaceAnalysisResponse;
      const questionnaire = { hairGoal: 'professional', budget: 'medium' };

      await provider.generateConsultation(analysis, questionnaire);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o',
          response_format: { type: 'json_object' },
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining(JSON.stringify(analysis)),
            }),
          ]),
        })
      );
    });

    it('returns parsed Consultation on success', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockConsultationResponse),
            },
          },
        ],
        usage: { prompt_tokens: 300, completion_tokens: 200 },
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
      const sdkError = new Error('OpenAI API error');
      (sdkError as any).status = 500;
      mockCreate.mockRejectedValue(sdkError);

      const photo = Buffer.from('fake-photo-data');

      await expect(provider.analyzeFace(photo)).rejects.toThrow();

      const logs = getAICallLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].success).toBe(false);
      expect(logs[0].error).toContain('OpenAI');
    });

    it('wraps SDK errors with provider context for generateConsultation', async () => {
      const sdkError = new Error('OpenAI rate limit exceeded');
      (sdkError as any).status = 429;
      mockCreate.mockRejectedValue(sdkError);

      await expect(
        provider.generateConsultation(mockFaceAnalysisResponse, { hairGoal: 'professional' })
      ).rejects.toThrow();

      const logs = getAICallLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].success).toBe(false);
      expect(logs[0].task).toBe('consultation');
      expect(logs[0].error).toContain('OpenAI');
    });

    it('throws with error message for invalid JSON response', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'not valid json {{{' } }],
        usage: { prompt_tokens: 100, completion_tokens: 50 },
      });

      const photo = Buffer.from('fake-photo-data');
      await expect(provider.analyzeFace(photo)).rejects.toThrow('Invalid JSON response');
    });
  });
});
