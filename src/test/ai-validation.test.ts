import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateFaceAnalysis, validateConsultation, logValidationFailure } from '../lib/ai/validation';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const validFaceAnalysis = {
  faceShape: 'oval' as const,
  confidence: 0.85,
  proportions: { foreheadRatio: 0.33, cheekboneRatio: 0.35, jawRatio: 0.32, faceLength: 1.5 },
  hairAssessment: { type: 'straight', texture: 'medium', density: 'medium', currentStyle: 'short' },
};

// Exactly 50 words (minimum boundary)
// "This style suits your oval face shape perfectly by adding structure around the sides and highlighting your strong cheekbones. The cut is easy to maintain and works well with your medium texture hair type and density, making it ideal."
// Count: This(1) style(2) suits(3) your(4) oval(5) face(6) shape(7) perfectly(8) by(9) adding(10) structure(11) around(12) the(13) sides(14) and(15) highlighting(16) your(17) strong(18) cheekbones(19) The(20) cut(21) is(22) easy(23) to(24) maintain(25) and(26) works(27) well(28) with(29) your(30) medium(31) texture(32) hair(33) type(34) and(35) density(36) making(37) it(38) ideal(39)
// That's only 39, so build a true 50-word string:
const fiftyWordJustification =
  'one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty twenty-one twenty-two twenty-three twenty-four twenty-five twenty-six twenty-seven twenty-eight twenty-nine thirty thirty-one thirty-two thirty-three thirty-four thirty-five thirty-six thirty-seven thirty-eight thirty-nine forty forty-one forty-two forty-three forty-four forty-five forty-six forty-seven forty-eight forty-nine fifty';

// Exactly 200 words — use single-char words to stay within schema's 500-char limit
// 200 * 1 char + 199 spaces = 399 chars (well within schema max of 500)
const twoHundredWordJustification = Array(200).fill('a').join(' ');

// 201 words — exceeds word-count maximum (401 chars, within schema max)
const twoHundredOneWordJustification = Array(201).fill('a').join(' ');

// 49 words — below minimum (also within schema min of 10 chars)
const fortyNineWordJustification = Array(49).fill('a').join(' ');

const validConsultation = {
  recommendations: [
    {
      styleName: 'Style A',
      justification: fiftyWordJustification,
      matchScore: 0.9,
      difficultyLevel: 'low' as const,
    },
    {
      styleName: 'Style B',
      justification: fiftyWordJustification,
      matchScore: 0.75,
      difficultyLevel: 'medium' as const,
    },
  ],
  stylesToAvoid: [
    { styleName: 'Avoid A', reason: 'Makes face appear wider.' },
    { styleName: 'Avoid B', reason: 'Elongates face unfavorably.' },
  ],
  groomingTips: [{ category: 'products' as const, tipText: 'Use matte pomade', icon: '💈' }],
};

// ---------------------------------------------------------------------------
// validateFaceAnalysis
// ---------------------------------------------------------------------------

describe('validateFaceAnalysis', () => {
  it('returns valid:true for valid input', () => {
    const result = validateFaceAnalysis(validFaceAnalysis);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data).toEqual(validFaceAnalysis);
    }
  });

  it('returns valid:false with reason schema_invalid for invalid faceShape', () => {
    const bad = { ...validFaceAnalysis, faceShape: 'not-a-shape' };
    const result = validateFaceAnalysis(bad);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe('schema_invalid');
      expect(result.details.length).toBeGreaterThan(0);
    }
  });

  it('returns valid:false with reason low_confidence when confidence < 0.6', () => {
    const lowConf = { ...validFaceAnalysis, confidence: 0.55 };
    const result = validateFaceAnalysis(lowConf);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe('low_confidence');
      expect(result.details).toEqual([]);
    }
  });

  it('returns valid:true when confidence is exactly 0.6 (boundary passes)', () => {
    const boundary = { ...validFaceAnalysis, confidence: 0.6 };
    const result = validateFaceAnalysis(boundary);
    expect(result.valid).toBe(true);
  });

  it('returns valid:false when confidence is 0.599 (just below boundary)', () => {
    const justBelow = { ...validFaceAnalysis, confidence: 0.599 };
    const result = validateFaceAnalysis(justBelow);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe('low_confidence');
    }
  });

  it('returns valid:false for missing required fields', () => {
    const result = validateFaceAnalysis({});
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe('schema_invalid');
    }
  });

  it('returns valid:false for null input', () => {
    const result = validateFaceAnalysis(null);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe('schema_invalid');
    }
  });
});

// ---------------------------------------------------------------------------
// validateConsultation
// ---------------------------------------------------------------------------

describe('validateConsultation', () => {
  it('returns valid:true for valid consultation with varying match scores', () => {
    const result = validateConsultation(validConsultation);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data).toEqual(validConsultation);
    }
  });

  it('returns valid:false with reason schema_invalid for invalid schema', () => {
    const bad = { ...validConsultation, recommendations: 'not-an-array' };
    const result = validateConsultation(bad);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe('schema_invalid');
      expect(result.details.length).toBeGreaterThan(0);
    }
  });

  it('returns valid:false when all matchScores are equal', () => {
    const equalScores = {
      ...validConsultation,
      recommendations: [
        { ...validConsultation.recommendations[0], matchScore: 0.8 },
        { ...validConsultation.recommendations[1], matchScore: 0.8 },
      ],
    };
    const result = validateConsultation(equalScores);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe('match_scores_all_equal');
      expect(result.details).toEqual([]);
    }
  });

  it('returns valid:true when matchScores are varying', () => {
    const varyingScores = {
      ...validConsultation,
      recommendations: [
        { ...validConsultation.recommendations[0], matchScore: 0.9 },
        { ...validConsultation.recommendations[1], matchScore: 0.7 },
      ],
    };
    const result = validateConsultation(varyingScores);
    expect(result.valid).toBe(true);
  });

  it('returns valid:false when justification is under 50 words', () => {
    const shortJustification = {
      ...validConsultation,
      recommendations: [
        { ...validConsultation.recommendations[0], justification: fortyNineWordJustification },
        { ...validConsultation.recommendations[1] },
      ],
    };
    const result = validateConsultation(shortJustification);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe('justification_too_short');
    }
  });

  it('returns valid:false when justification is over 200 words', () => {
    const longJustification = {
      ...validConsultation,
      recommendations: [
        { ...validConsultation.recommendations[0], justification: twoHundredOneWordJustification },
        { ...validConsultation.recommendations[1] },
      ],
    };
    const result = validateConsultation(longJustification);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe('justification_too_long');
    }
  });

  it('returns valid:true when justification is exactly 50 words (boundary passes)', () => {
    const exactMin = {
      ...validConsultation,
      recommendations: [
        { ...validConsultation.recommendations[0], justification: fiftyWordJustification },
        { ...validConsultation.recommendations[1], justification: fiftyWordJustification },
      ],
    };
    const result = validateConsultation(exactMin);
    expect(result.valid).toBe(true);
  });

  it('returns valid:true when justification is exactly 200 words (boundary passes)', () => {
    const exactMax = {
      ...validConsultation,
      recommendations: [
        { ...validConsultation.recommendations[0], justification: twoHundredWordJustification },
        { ...validConsultation.recommendations[1], justification: twoHundredWordJustification },
      ],
    };
    const result = validateConsultation(exactMax);
    expect(result.valid).toBe(true);
  });

  it('returns valid:false for null input', () => {
    const result = validateConsultation(null);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe('schema_invalid');
    }
  });

  it('returns valid:false with reason schema_invalid for single recommendation (schema requires min 2)', () => {
    const singleRec = {
      ...validConsultation,
      recommendations: [
        { ...validConsultation.recommendations[0] },
      ],
    };
    const result = validateConsultation(singleRec);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe('schema_invalid');
      expect(result.details.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// logValidationFailure
// ---------------------------------------------------------------------------

describe('logValidationFailure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('calls console.error with [AI Validation Failure] prefix and structured JSON', () => {
    const ctx = {
      context: 'analyze',
      reason: 'low_confidence',
      details: [],
      timestamp: '2026-03-02T00:00:00.000Z',
    };
    logValidationFailure(ctx);
    expect(console.error).toHaveBeenCalledWith(
      '[AI Validation Failure]',
      JSON.stringify(ctx)
    );
  });

  it('includes all required fields in the logged JSON', () => {
    const ctx = {
      context: 'generate',
      reason: 'schema_invalid',
      details: [{ code: 'invalid_type', message: 'expected string', path: ['field'] } as never],
      timestamp: '2026-03-02T12:00:00.000Z',
    };
    logValidationFailure(ctx);
    const callArg = (console.error as ReturnType<typeof vi.spyOn>).mock.calls[0][1] as string;
    const parsed = JSON.parse(callArg) as typeof ctx;
    expect(parsed.context).toBe('generate');
    expect(parsed.reason).toBe('schema_invalid');
    expect(parsed.timestamp).toBe('2026-03-02T12:00:00.000Z');
  });
});
