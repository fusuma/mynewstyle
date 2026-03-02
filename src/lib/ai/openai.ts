import OpenAI from 'openai';
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
 * OpenAIProvider implements the AIProvider interface using the openai SDK.
 * Fallback model: gpt-4o for both face analysis and consultation generation.
 */
export class OpenAIProvider implements AIProvider {
  private client: OpenAI;
  private config: AIProviderConfig;

  constructor(config: AIProviderConfig) {
    this.config = {
      ...config,
      model: config.model ?? 'gpt-4o',
    };
    this.client = new OpenAI({ apiKey: this.config.apiKey });
  }

  async analyzeFace(photo: Buffer, options?: AnalysisOptions): Promise<FaceAnalysis> {
    const startTime = performance.now();
    const photoBase64 = photo.toString('base64');
    let inputTokens = 0;
    let outputTokens = 0;

    try {
      const response = await this.client.chat.completions.create({
        model: this.config.model,
        response_format: { type: 'json_object' },
        ...(options?.temperature !== undefined && { temperature: options.temperature }),
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this face and return a JSON object with faceShape, confidence, proportions (foreheadRatio, cheekboneRatio, jawRatio, faceLength), and hairAssessment (type, texture, density, currentStyle).',
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${photoBase64}`,
                },
              },
            ],
          },
        ],
      });

      const latencyMs = performance.now() - startTime;
      inputTokens = response.usage?.prompt_tokens ?? 0;
      outputTokens = response.usage?.completion_tokens ?? 0;
      const costCents = calculateCost(this.config.model, inputTokens, outputTokens);

      const content = response.choices[0]?.message?.content ?? '{}';
      let result: FaceAnalysis;
      try {
        result = JSON.parse(content) as FaceAnalysis;
      } catch {
        throw new Error(`OpenAI: Invalid JSON response for face-analysis`);
      }

      logAICall({
        provider: 'openai',
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
      const errorMessage = error instanceof Error ? error.message : 'OpenAI: Unknown error';
      const prefixedMessage = errorMessage.startsWith('OpenAI:')
        ? errorMessage
        : `OpenAI: ${errorMessage}`;

      console.error('[AI] OpenAI analyzeFace error:', prefixedMessage);

      logAICall({
        provider: 'openai',
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
        const alreadyWrapped = error.message.startsWith('OpenAI:');
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
      const response = await this.client.chat.completions.create({
        model: this.config.model,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'user',
            content: `Based on this face analysis and questionnaire data, generate a hairstyle consultation as a JSON object with recommendations (styleName, justification, matchScore, difficultyLevel), stylesToAvoid (styleName, reason), and groomingTips (category, tipText, icon).\n\nFace Analysis: ${JSON.stringify(analysis)}\n\nQuestionnaire: ${JSON.stringify(questionnaire)}`,
          },
        ],
      });

      const latencyMs = performance.now() - startTime;
      inputTokens = response.usage?.prompt_tokens ?? 0;
      outputTokens = response.usage?.completion_tokens ?? 0;
      const costCents = calculateCost(this.config.model, inputTokens, outputTokens);

      const content = response.choices[0]?.message?.content ?? '{}';
      let result: Consultation;
      try {
        result = JSON.parse(content) as Consultation;
      } catch {
        throw new Error(`OpenAI: Invalid JSON response for consultation`);
      }

      logAICall({
        provider: 'openai',
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
      const errorMessage = error instanceof Error ? error.message : 'OpenAI: Unknown error';
      const prefixedMessage = errorMessage.startsWith('OpenAI:')
        ? errorMessage
        : `OpenAI: ${errorMessage}`;

      console.error('[AI] OpenAI generateConsultation error:', prefixedMessage);

      logAICall({
        provider: 'openai',
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
        const alreadyWrapped = error.message.startsWith('OpenAI:');
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
