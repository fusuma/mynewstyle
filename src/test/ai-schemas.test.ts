import { describe, it, expect } from 'vitest';
import { FaceAnalysisSchema } from '../lib/ai/schemas/face-analysis.schema';
import { ConsultationSchema } from '../lib/ai/schemas/consultation.schema';
import type { FaceAnalysis } from '../types';
import type { FaceAnalysisOutput } from '../lib/ai/schemas/face-analysis.schema';

// ---------------------------------------------------------------------------
// FaceAnalysisSchema
// ---------------------------------------------------------------------------

const validFaceAnalysis = {
  faceShape: 'oval',
  confidence: 0.85,
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

describe('FaceAnalysisSchema', () => {
  it('should pass validation for a valid full object', () => {
    const result = FaceAnalysisSchema.safeParse(validFaceAnalysis);
    expect(result.success).toBe(true);
  });

  it('should fail validation for an invalid faceShape enum value', () => {
    const invalid = { ...validFaceAnalysis, faceShape: 'hexagonal' };
    const result = FaceAnalysisSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should fail validation for confidence out of range (1.5)', () => {
    const invalid = { ...validFaceAnalysis, confidence: 1.5 };
    const result = FaceAnalysisSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should fail validation for confidence below range (-0.1)', () => {
    const invalid = { ...validFaceAnalysis, confidence: -0.1 };
    const result = FaceAnalysisSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should fail validation when proportions field is missing', () => {
    const { proportions: _proportions, ...invalid } = validFaceAnalysis;
    const result = FaceAnalysisSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should fail validation when hairAssessment.type field is missing', () => {
    const invalid = {
      ...validFaceAnalysis,
      hairAssessment: { texture: 'medium', density: 'medium', currentStyle: 'short fade' },
    };
    const result = FaceAnalysisSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should pass validation for confidence exactly 0', () => {
    const valid = { ...validFaceAnalysis, confidence: 0 };
    const result = FaceAnalysisSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('should pass validation for confidence exactly 1', () => {
    const valid = { ...validFaceAnalysis, confidence: 1 };
    const result = FaceAnalysisSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('should accept all 7 valid faceShape enum values', () => {
    const shapes = ['oval', 'round', 'square', 'oblong', 'heart', 'diamond', 'triangle'];
    for (const shape of shapes) {
      const result = FaceAnalysisSchema.safeParse({ ...validFaceAnalysis, faceShape: shape });
      expect(result.success).toBe(true);
    }
  });

  it('should return { success: false } not throw on invalid input', () => {
    expect(() => {
      const result = FaceAnalysisSchema.safeParse({ faceShape: 'bad' });
      expect(result.success).toBe(false);
    }).not.toThrow();
  });

  it('FaceAnalysisOutput type should be assignable to FaceAnalysis TypeScript type', () => {
    // Compile-time assignability check — if this compiles, the types are compatible
    const output: FaceAnalysisOutput = validFaceAnalysis as FaceAnalysisOutput;
    const asInterface: FaceAnalysis = output;
    expect(asInterface.faceShape).toBe('oval');
  });
});

// ---------------------------------------------------------------------------
// ConsultationSchema
// ---------------------------------------------------------------------------

const validConsultation = {
  recommendations: [
    {
      styleName: 'Classic Taper',
      justification: 'This style suits your oval face shape perfectly and works well with your medium density hair.',
      matchScore: 0.9,
      difficultyLevel: 'low',
    },
    {
      styleName: 'Textured Quiff',
      justification: 'The quiff adds height that complements your oval face shape and your medium texture hair handles it well.',
      matchScore: 0.75,
      difficultyLevel: 'medium',
    },
  ],
  stylesToAvoid: [
    {
      styleName: 'Bowl Cut',
      reason: 'This style would make your face appear wider than it is.',
    },
    {
      styleName: 'Very Long Side Parts',
      reason: 'This would elongate your face shape unfavorably.',
    },
  ],
  groomingTips: [
    {
      category: 'products',
      tipText: 'Use a matte pomade for hold',
      icon: '💈',
    },
    {
      category: 'routine',
      tipText: 'Wash hair every other day',
      icon: '🚿',
    },
    {
      category: 'barber_tips',
      tipText: 'Ask for a scissor-cut finish on the sides',
      icon: '✂️',
    },
  ],
};

describe('ConsultationSchema', () => {
  it('should pass validation for a valid full object', () => {
    const result = ConsultationSchema.safeParse(validConsultation);
    expect(result.success).toBe(true);
  });

  it('should fail validation when recommendations has fewer than 2 items', () => {
    const invalid = { ...validConsultation, recommendations: [validConsultation.recommendations[0]] };
    const result = ConsultationSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should fail validation when recommendations has more than 3 items', () => {
    const invalid = {
      ...validConsultation,
      recommendations: [
        ...validConsultation.recommendations,
        { styleName: 'Extra', justification: 'Extra style justification text that is long enough.', matchScore: 0.5, difficultyLevel: 'low' },
        { styleName: 'TooMany', justification: 'Another extra style justification text that is long enough.', matchScore: 0.4, difficultyLevel: 'low' },
      ],
    };
    const result = ConsultationSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should fail validation for invalid difficultyLevel enum', () => {
    const invalid = {
      ...validConsultation,
      recommendations: [
        { ...validConsultation.recommendations[0], difficultyLevel: 'extreme' },
        validConsultation.recommendations[1],
      ],
    };
    const result = ConsultationSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should fail validation for invalid grooming tip category', () => {
    const invalid = {
      ...validConsultation,
      groomingTips: [
        { category: 'invalid_category', tipText: 'Some tip', icon: '💈' },
      ],
    };
    const result = ConsultationSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should fail validation when justification is shorter than 10 chars', () => {
    const invalid = {
      ...validConsultation,
      recommendations: [
        { ...validConsultation.recommendations[0], justification: 'Short' },
        validConsultation.recommendations[1],
      ],
    };
    const result = ConsultationSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should fail validation when stylesToAvoid has fewer than 2 items', () => {
    const invalid = { ...validConsultation, stylesToAvoid: [validConsultation.stylesToAvoid[0]] };
    const result = ConsultationSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should fail validation when stylesToAvoid has more than 3 items', () => {
    const invalid = {
      ...validConsultation,
      stylesToAvoid: [
        ...validConsultation.stylesToAvoid,
        { styleName: 'Extra1', reason: 'Reason one is valid' },
        { styleName: 'Extra2', reason: 'Reason two is valid' },
      ],
    };
    const result = ConsultationSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('ConsultationSchema.safeParse() should return { success: false } not throw on invalid input', () => {
    expect(() => {
      const result = ConsultationSchema.safeParse({ recommendations: [] });
      expect(result.success).toBe(false);
    }).not.toThrow();
  });

  it('should fail validation when justification exceeds 500 characters', () => {
    const invalid = {
      ...validConsultation,
      recommendations: [
        { ...validConsultation.recommendations[0], justification: 'A'.repeat(501) },
        validConsultation.recommendations[1],
      ],
    };
    const result = ConsultationSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should pass validation with exactly 3 recommendations', () => {
    const threeRecs = {
      ...validConsultation,
      recommendations: [
        ...validConsultation.recommendations,
        { styleName: 'Third Style', justification: 'Third style is valid and complements your face shape.', matchScore: 0.6, difficultyLevel: 'high' },
      ],
    };
    const result = ConsultationSchema.safeParse(threeRecs);
    expect(result.success).toBe(true);
  });
});
