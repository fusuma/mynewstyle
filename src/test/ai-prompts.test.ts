import { describe, it, expect } from 'vitest';
import { getFaceAnalysisPrompt } from '../lib/ai/prompts/v1/face-analysis';
import { getMaleConsultationPrompt } from '../lib/ai/prompts/v1/consultation-male';
import { getFemaleConsultationPrompt } from '../lib/ai/prompts/v1/consultation-female';
import { getPrompt, CURRENT_PROMPT_VERSION } from '../lib/ai/prompts/index';
import type { FaceAnalysis, QuestionnaireData } from '../types';

const mockAnalysis: FaceAnalysis = {
  faceShape: 'oval',
  confidence: 0.9,
  proportions: {
    foreheadRatio: 0.33,
    cheekboneRatio: 0.35,
    jawRatio: 0.32,
    faceLength: 1.5,
  },
  hairAssessment: {
    type: 'straight',
    texture: 'medium',
    density: 'medium',
    currentStyle: 'short fade',
  },
};

const mockQuestionnaire: QuestionnaireData = {
  gender: 'male',
  ageRange: '25-34',
  lifestyle: 'casual',
  maintenanceLevel: 'low',
};

const mockFemaleQuestionnaire: QuestionnaireData = {
  gender: 'female',
  ageRange: '25-34',
  lifestyle: 'professional',
  maintenanceLevel: 'medium',
};

// ---------------------------------------------------------------------------
// getFaceAnalysisPrompt
// ---------------------------------------------------------------------------

describe('getFaceAnalysisPrompt', () => {
  const facePrompt = getFaceAnalysisPrompt({ photoBase64: 'base64string123', mimeType: 'image/jpeg' });

  it('should return an object with a userPrompt string', () => {
    expect(facePrompt).toHaveProperty('userPrompt');
    expect(typeof facePrompt.userPrompt).toBe('string');
  });

  it('should include imageData with base64 and mimeType', () => {
    expect(facePrompt).toHaveProperty('imageData');
    expect(facePrompt.imageData).toHaveProperty('base64', 'base64string123');
    expect(facePrompt.imageData).toHaveProperty('mimeType', 'image/jpeg');
  });

  it('should default mimeType to image/jpeg if not provided', () => {
    const p = getFaceAnalysisPrompt({ photoBase64: 'abc' });
    expect(p.imageData?.mimeType).toBe('image/jpeg');
  });

  it('userPrompt should contain all 7 face shape enum values', () => {
    const shapes = ['oval', 'round', 'square', 'oblong', 'heart', 'diamond', 'triangle'];
    for (const shape of shapes) {
      expect(facePrompt.userPrompt).toContain(shape);
    }
  });

  it('userPrompt should mention required JSON keys: faceShape, confidence, proportions, hairAssessment', () => {
    expect(facePrompt.userPrompt).toContain('faceShape');
    expect(facePrompt.userPrompt).toContain('confidence');
    expect(facePrompt.userPrompt).toContain('proportions');
    expect(facePrompt.userPrompt).toContain('hairAssessment');
  });

  it('should have a systemPrompt string', () => {
    expect(typeof facePrompt.systemPrompt).toBe('string');
    expect(facePrompt.systemPrompt!.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// getMaleConsultationPrompt
// ---------------------------------------------------------------------------

describe('getMaleConsultationPrompt', () => {
  const malePrompt = getMaleConsultationPrompt({ analysis: mockAnalysis, questionnaire: mockQuestionnaire });

  it('should return an object with a userPrompt string', () => {
    expect(malePrompt).toHaveProperty('userPrompt');
    expect(typeof malePrompt.userPrompt).toBe('string');
  });

  it('should include face analysis JSON in prompt', () => {
    expect(malePrompt.userPrompt).toContain(JSON.stringify(mockAnalysis));
  });

  it('should include questionnaire data in prompt', () => {
    expect(malePrompt.userPrompt).toContain(JSON.stringify(mockQuestionnaire));
  });

  it('should include "styles to avoid" reference in prompt', () => {
    const lowerPrompt = malePrompt.userPrompt.toLowerCase();
    expect(lowerPrompt).toContain('avoid');
  });

  it('should reference face shape from analysis', () => {
    expect(malePrompt.userPrompt).toContain(mockAnalysis.faceShape);
  });

  it('should have a systemPrompt string', () => {
    expect(typeof malePrompt.systemPrompt).toBe('string');
    expect(malePrompt.systemPrompt!.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// getFemaleConsultationPrompt
// ---------------------------------------------------------------------------

describe('getFemaleConsultationPrompt', () => {
  const femalePrompt = getFemaleConsultationPrompt({ analysis: mockAnalysis, questionnaire: mockFemaleQuestionnaire });

  it('should return an object with a userPrompt string', () => {
    expect(femalePrompt).toHaveProperty('userPrompt');
    expect(typeof femalePrompt.userPrompt).toBe('string');
  });

  it('should have different content from male prompt (gender-specific)', () => {
    const malePrompt = getMaleConsultationPrompt({ analysis: mockAnalysis, questionnaire: mockQuestionnaire });
    expect(femalePrompt.systemPrompt).not.toBe(malePrompt.systemPrompt);
  });

  it('should have a systemPrompt string', () => {
    expect(typeof femalePrompt.systemPrompt).toBe('string');
    expect(femalePrompt.systemPrompt!.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// getPrompt version router
// ---------------------------------------------------------------------------

describe('getPrompt', () => {
  it('should route face-analysis to getFaceAnalysisPrompt result', () => {
    const params = { photoBase64: 'testbase64', mimeType: 'image/jpeg' as const };
    const result = getPrompt('face-analysis', params);
    const direct = getFaceAnalysisPrompt(params);
    expect(result).toEqual(direct);
  });

  it('should route consultation-male to getMaleConsultationPrompt result', () => {
    const params = { analysis: mockAnalysis, questionnaire: mockQuestionnaire };
    const result = getPrompt('consultation-male', params);
    const direct = getMaleConsultationPrompt(params);
    expect(result).toEqual(direct);
  });

  it('should route consultation-female to getFemaleConsultationPrompt result', () => {
    const params = { analysis: mockAnalysis, questionnaire: mockFemaleQuestionnaire };
    const result = getPrompt('consultation-female', params);
    const direct = getFemaleConsultationPrompt(params);
    expect(result).toEqual(direct);
  });

  it('should work correctly with explicit version="v1"', () => {
    const params = { photoBase64: 'testbase64', mimeType: 'image/jpeg' as const };
    const result = getPrompt('face-analysis', params, 'v1');
    const direct = getFaceAnalysisPrompt(params);
    expect(result).toEqual(direct);
  });

  it('CURRENT_PROMPT_VERSION should equal "v1"', () => {
    expect(CURRENT_PROMPT_VERSION).toBe('v1');
  });

  it('should throw a descriptive error for an unknown version', () => {
    const params = { photoBase64: 'testbase64', mimeType: 'image/jpeg' as const };
    expect(() => getPrompt('face-analysis', params, 'v99' as any)).toThrow(
      /unknown prompt version.*v99/i
    );
  });
});
