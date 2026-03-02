import { GoogleGenAI } from '@google/genai';
import type {
  FaceAnalysis,
  Consultation,
  AnalysisOptions,
  QuestionnaireData,
  AIProviderConfig,
} from '@/types';
import type { AIProvider } from './provider';
import { logAICall, calculateCost } from './logger';

/**
 * GeminiProvider implements the AIProvider interface using the @google/genai SDK.
 * Primary model: gemini-2.5-flash for both face analysis and consultation generation.
 */
export class GeminiProvider implements AIProvider {
  private client: GoogleGenAI;
  private config: AIProviderConfig;

  constructor(config: AIProviderConfig) {
    this.config = {
      ...config,
      model: config.model ?? 'gemini-2.5-flash',
    };
    this.client = new GoogleGenAI({ apiKey: this.config.apiKey });
  }

  async analyzeFace(photo: Buffer, options?: AnalysisOptions): Promise<FaceAnalysis> {
    const startTime = performance.now();
    const photoBase64 = photo.toString('base64');
    let inputTokens = 0;
    let outputTokens = 0;

    try {
      const response = await this.client.models.generateContent({
        model: this.config.model,
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: 'Analyze this face and return a JSON object with faceShape, confidence, proportions (foreheadRatio, cheekboneRatio, jawRatio, faceLength), and hairAssessment (type, texture, density, currentStyle).',
              },
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
          responseMimeType: 'application/json',
          ...(options?.temperature !== undefined && { temperature: options.temperature }),
        },
      });

      const latencyMs = performance.now() - startTime;
      inputTokens = response.usageMetadata?.promptTokenCount ?? 0;
      outputTokens = response.usageMetadata?.candidatesTokenCount ?? 0;
      const costCents = calculateCost(this.config.model, inputTokens, outputTokens);

      const responseText = response.text ?? '{}';
      let result: FaceAnalysis;
      try {
        result = JSON.parse(responseText) as FaceAnalysis;
      } catch {
        throw new Error(`Gemini: Invalid JSON response for face-analysis`);
      }

      logAICall({
        provider: 'gemini',
        model: this.config.model,
        task: 'face-analysis',
        inputTokens,
        outputTokens,
        costCents,
        latencyMs,
        success: true,
      });

      return result;
    } catch (error) {
      const latencyMs = performance.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Gemini: Unknown error';
      const prefixedMessage = errorMessage.startsWith('Gemini:')
        ? errorMessage
        : `Gemini: ${errorMessage}`;

      console.error('[AI] Gemini analyzeFace error:', prefixedMessage);

      logAICall({
        provider: 'gemini',
        model: this.config.model,
        task: 'face-analysis',
        inputTokens,
        outputTokens,
        costCents: 0,
        latencyMs,
        success: false,
        error: prefixedMessage,
      });

      if (error instanceof Error) {
        const alreadyWrapped = error.message.startsWith('Gemini:');
        if (alreadyWrapped) {
          throw error;
        }
        const wrappedError = new Error(prefixedMessage);
        (wrappedError as any).status = (error as any).status ?? (error as any).statusCode;
        throw wrappedError;
      }
      throw error;
    }
  }

  async generateConsultation(
    analysis: FaceAnalysis,
    questionnaire: QuestionnaireData
  ): Promise<Consultation> {
    const startTime = performance.now();
    let inputTokens = 0;
    let outputTokens = 0;

    try {
      const response = await this.client.models.generateContent({
        model: this.config.model,
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Based on this face analysis and questionnaire data, generate a hairstyle consultation as a JSON object with recommendations (styleName, justification, matchScore, difficultyLevel), stylesToAvoid (styleName, reason), and groomingTips (category, tipText, icon).\n\nFace Analysis: ${JSON.stringify(analysis)}\n\nQuestionnaire: ${JSON.stringify(questionnaire)}`,
              },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
        },
      });

      const latencyMs = performance.now() - startTime;
      inputTokens = response.usageMetadata?.promptTokenCount ?? 0;
      outputTokens = response.usageMetadata?.candidatesTokenCount ?? 0;
      const costCents = calculateCost(this.config.model, inputTokens, outputTokens);

      const responseText = response.text ?? '{}';
      let result: Consultation;
      try {
        result = JSON.parse(responseText) as Consultation;
      } catch {
        throw new Error(`Gemini: Invalid JSON response for consultation`);
      }

      logAICall({
        provider: 'gemini',
        model: this.config.model,
        task: 'consultation',
        inputTokens,
        outputTokens,
        costCents,
        latencyMs,
        success: true,
      });

      return result;
    } catch (error) {
      const latencyMs = performance.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Gemini: Unknown error';
      const prefixedMessage = errorMessage.startsWith('Gemini:')
        ? errorMessage
        : `Gemini: ${errorMessage}`;

      console.error('[AI] Gemini generateConsultation error:', prefixedMessage);

      logAICall({
        provider: 'gemini',
        model: this.config.model,
        task: 'consultation',
        inputTokens,
        outputTokens,
        costCents: 0,
        latencyMs,
        success: false,
        error: prefixedMessage,
      });

      if (error instanceof Error) {
        const alreadyWrapped = error.message.startsWith('Gemini:');
        if (alreadyWrapped) {
          throw error;
        }
        const wrappedError = new Error(prefixedMessage);
        (wrappedError as any).status = (error as any).status ?? (error as any).statusCode;
        throw wrappedError;
      }
      throw error;
    }
  }
}
