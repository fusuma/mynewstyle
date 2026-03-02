import { z } from 'zod';
import { FaceAnalysisSchema, ConsultationSchema } from './schemas';
import type { FaceAnalysisOutput, ConsultationOutput } from './schemas';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ValidationResult<T> =
  | { valid: true; data: T }
  | { valid: false; reason: string; details: z.ZodIssue[] };

export interface ValidationFailureContext {
  context: string; // e.g. 'analyze' | 'generate'
  reason: string; // e.g. 'schema_invalid' | 'low_confidence' | 'match_scores_all_equal'
  details: z.ZodIssue[];
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CONFIDENCE_THRESHOLD = 0.6;
const JUSTIFICATION_MIN_WORDS = 50;
const JUSTIFICATION_MAX_WORDS = 200;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// ---------------------------------------------------------------------------
// Exported validation functions
// ---------------------------------------------------------------------------

/**
 * Validate face analysis AI output.
 * Runs schema validation first, then applies confidence threshold business rule.
 * Synchronous — no network or DB calls.
 */
export function validateFaceAnalysis(result: unknown): ValidationResult<FaceAnalysisOutput> {
  const parsed = FaceAnalysisSchema.safeParse(result);
  if (!parsed.success) {
    return { valid: false, reason: 'schema_invalid', details: parsed.error.issues };
  }
  if (parsed.data.confidence < CONFIDENCE_THRESHOLD) {
    return { valid: false, reason: 'low_confidence', details: [] };
  }
  return { valid: true, data: parsed.data };
}

/**
 * Validate consultation AI output.
 * Runs schema validation first, then applies:
 *   1. Sanity check: all matchScores must not be identical (degenerate AI output)
 *   2. Word count enforcement: each justification must be 50–200 words
 * Synchronous — no network or DB calls.
 */
export function validateConsultation(result: unknown): ValidationResult<ConsultationOutput> {
  const parsed = ConsultationSchema.safeParse(result);
  if (!parsed.success) {
    return { valid: false, reason: 'schema_invalid', details: parsed.error.issues };
  }

  const { recommendations } = parsed.data;

  // Sanity check: all match scores must not be identical (requires ≥2 recommendations)
  if (recommendations.length >= 2) {
    const scores = recommendations.map((r) => r.matchScore);
    const allEqual = scores.every((s) => s === scores[0]);
    if (allEqual) {
      return { valid: false, reason: 'match_scores_all_equal', details: [] };
    }
  }

  // Word count check on each justification
  for (const rec of recommendations) {
    const wordCount = countWords(rec.justification);
    if (wordCount < JUSTIFICATION_MIN_WORDS) {
      return { valid: false, reason: 'justification_too_short', details: [] };
    }
    if (wordCount > JUSTIFICATION_MAX_WORDS) {
      return { valid: false, reason: 'justification_too_long', details: [] };
    }
  }

  return { valid: true, data: parsed.data };
}

/**
 * Log a structured validation failure entry to console.error.
 * Uses consistent field names (context, reason, details, timestamp) for searchability.
 * Story 4.7 may extend this to DB persistence.
 */
export function logValidationFailure(ctx: ValidationFailureContext): void {
  console.error('[AI Validation Failure]', JSON.stringify(ctx));
}
