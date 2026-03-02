import type { PromptContent } from '../index';

export interface FaceAnalysisPromptParams {
  photoBase64: string;
  mimeType?: 'image/jpeg' | 'image/png' | 'image/webp';
}

export function getFaceAnalysisPrompt(params: FaceAnalysisPromptParams): PromptContent {
  return {
    systemPrompt: `You are an expert facial analysis AI. Analyze faces with scientific precision and return structured JSON only. Never include explanatory text outside the JSON structure.`,
    userPrompt: `Analyze this facial photograph and return a JSON object with this exact structure:
{
  "faceShape": "<one of: oval, round, square, oblong, heart, diamond, triangle>",
  "confidence": <number between 0.0 and 1.0>,
  "proportions": {
    "foreheadRatio": <number, forehead width relative to cheekbones>,
    "cheekboneRatio": <number, widest point ratio>,
    "jawRatio": <number, jaw width relative to cheekbones>,
    "faceLength": <number, length-to-width ratio>
  },
  "hairAssessment": {
    "type": "<straight|wavy|curly|coily>",
    "texture": "<fine|medium|coarse>",
    "density": "<thin|medium|thick>",
    "currentStyle": "<brief description of current style>"
  }
}

Return ONLY the JSON object. No markdown, no explanation.`,
    imageData: {
      base64: params.photoBase64,
      mimeType: params.mimeType ?? 'image/jpeg',
    },
  };
}
