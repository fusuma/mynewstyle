import type { FaceAnalysis, QuestionnaireData } from '@/types';
import type { PromptContent } from '../index';

export interface ConsultationPromptParams {
  analysis: FaceAnalysis;
  questionnaire: QuestionnaireData;
}

export function getMaleConsultationPrompt(params: ConsultationPromptParams): PromptContent {
  return {
    systemPrompt: `You are an expert men's hairstyle consultant. You provide personalized recommendations based on face shape analysis and lifestyle. Always return structured JSON. Be specific and practical.`,
    userPrompt: `Based on this male client's face analysis and questionnaire responses, provide a personalized hairstyle consultation.

Face Analysis: ${JSON.stringify(params.analysis)}

Questionnaire Responses: ${JSON.stringify(params.questionnaire)}

Return a JSON object with this exact structure:
{
  "recommendations": [
    {
      "styleName": "<specific style name>",
      "justification": "<50-200 word explanation referencing their face shape and questionnaire answers>",
      "matchScore": <number 0.0 to 1.0>,
      "difficultyLevel": "<low|medium|high>"
    }
  ],
  "stylesToAvoid": [
    {
      "styleName": "<style to avoid>",
      "reason": "<why this style doesn't work for their face shape>"
    }
  ],
  "groomingTips": [
    {
      "category": "<products|routine|barber_tips>",
      "tipText": "<specific actionable tip>",
      "icon": "<emoji or icon name>"
    }
  ]
}

Rules:
- Provide exactly 2-3 recommendations
- Provide exactly 2-3 styles to avoid
- Provide at least 3 grooming tips covering all 3 categories
- Base recommendations on the face shape: ${params.analysis.faceShape}
- Match difficulty to lifestyle preferences from questionnaire
- Return ONLY the JSON object. No markdown, no explanation.`,
  };
}
