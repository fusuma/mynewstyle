import type { PromptContent } from '../index';
import type { ConsultationPromptParams } from './consultation-male';

export type { ConsultationPromptParams };

export function getFemaleConsultationPrompt(params: ConsultationPromptParams): PromptContent {
  return {
    systemPrompt: `You are an expert women's hairstyle consultant. You provide personalized recommendations based on face shape analysis, hair type, and lifestyle. Consider feminine style terminology including layers, fringe, updos, and styling tools. Always return structured JSON. Be specific and practical.`,
    userPrompt: `Based on this female client's face analysis and questionnaire responses, provide a personalized hairstyle consultation.

Face Analysis: ${JSON.stringify(params.analysis)}

Questionnaire Responses: ${JSON.stringify(params.questionnaire)}

Return a JSON object with this exact structure:
{
  "recommendations": [
    {
      "styleName": "<specific style name>",
      "justification": "<50-200 word explanation referencing their face shape, hair type, and questionnaire answers>",
      "matchScore": <number 0.0 to 1.0>,
      "difficultyLevel": "<low|medium|high>"
    }
  ],
  "stylesToAvoid": [
    {
      "styleName": "<style to avoid>",
      "reason": "<why this style doesn't work for their face shape or hair type>"
    }
  ],
  "groomingTips": [
    {
      "category": "<products|routine|barber_tips (use 'barber_tips' for stylist visit tips)>",
      "tipText": "<specific actionable tip for women's hair care and styling>",
      "icon": "<emoji or icon name>"
    }
  ]
}

Rules:
- Provide exactly 2-3 recommendations
- Provide exactly 2-3 styles to avoid
- Provide at least 3 grooming tips covering all 3 categories
- Consider feminine styling options: layers, fringe, updos, braids, balayage
- Reference styling tools relevant to women's hair: diffuser, flat iron, curling wand
- Base recommendations on the face shape: ${params.analysis.faceShape}
- Match difficulty to lifestyle preferences from questionnaire
- Return ONLY the JSON object. No markdown, no explanation.`,
  };
}
