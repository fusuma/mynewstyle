/**
 * Face similarity comparison.
 *
 * Compares two face images using 128-d face descriptor embeddings
 * and Euclidean distance to produce a 0-1 similarity score.
 *
 * Threshold: similarity >= 0.7 = pass (conservative quality gate)
 * This equates to Euclidean distance <= 0.3, which means high confidence
 * that both images show the same person.
 *
 * Architecture reference: Section 4.4 (Output Validation) in architecture.md
 * Top 10 Insight #6: "Face similarity check prevents 'wrong person' previews"
 */

import * as faceapi from '@vladmandic/face-api';
import { extractFaceDescriptor } from './extract-descriptor';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Result of a face similarity comparison.
 * - similarity: 0-1 score (1 = identical, 0 = completely different or no face)
 * - passed: true if similarity >= 0.7 threshold
 * - reason: 'quality_gate' if failed threshold, 'face_not_detected' if no face found
 */
export interface FaceSimilarityResult {
  similarity: number;
  passed: boolean;
  reason?: 'quality_gate' | 'face_not_detected';
}

/** Quality gate for face similarity (threshold: 0.7) */
export const FACE_SIMILARITY_THRESHOLD = 0.7;

/**
 * Structured log entry for quality gate evaluation.
 * Fields align with architecture's monitoring requirements.
 */
export interface QualityGateLogEntry {
  consultation_id: string;
  recommendation_id: string;
  similarity_score: number;
  threshold: number;
  passed: boolean;
  provider: 'kie' | 'gemini';
  latency_ms: number;
  timestamp?: string;
}

// ---------------------------------------------------------------------------
// Exported functions
// ---------------------------------------------------------------------------

/**
 * Compares two face images and returns a similarity result.
 *
 * Algorithm:
 * 1. Extract 128-d face descriptors from both images
 * 2. Compute Euclidean distance between descriptors
 * 3. Convert distance to similarity score: max(0, 1 - distance)
 * 4. Apply threshold: similarity >= 0.7 = pass
 *
 * @param originalPhoto - Buffer of the original user photo
 * @param previewImage - Buffer of the AI-generated preview image
 * @returns FaceSimilarityResult with similarity score and pass/fail status
 */
export async function compareFaces(
  originalPhoto: Buffer,
  previewImage: Buffer
): Promise<FaceSimilarityResult> {
  // Extract descriptors from both images in parallel for performance
  const [originalDescriptor, previewDescriptor] = await Promise.all([
    extractFaceDescriptor(originalPhoto),
    extractFaceDescriptor(previewImage),
  ]);

  // Handle null descriptors (face not detected in either image)
  if (!originalDescriptor || !previewDescriptor) {
    return {
      similarity: 0,
      passed: false,
      reason: 'face_not_detected',
    };
  }

  // Compute Euclidean distance using face-api's built-in utility
  const distance = faceapi.euclideanDistance(originalDescriptor, previewDescriptor);

  // Convert distance to 0-1 similarity score, clamped to non-negative
  const similarity = Math.max(0, 1 - distance);

  if (similarity >= FACE_SIMILARITY_THRESHOLD) {
    return {
      similarity,
      passed: true,
    };
  }

  return {
    similarity,
    passed: false,
    reason: 'quality_gate',
  };
}

/**
 * Logs a structured quality gate evaluation event.
 * Uses the console.error pattern from src/lib/ai/validation.ts
 * for consistent structured logging with searchable field names.
 *
 * Called after every compareFaces() to enable model quality monitoring.
 * Fields: consultation_id, recommendation_id, similarity_score, threshold,
 *         passed, provider, latency_ms, timestamp (AC #5)
 */
export function logQualityGate(entry: QualityGateLogEntry): void {
  const logEntry = {
    ...entry,
    threshold: entry.threshold ?? FACE_SIMILARITY_THRESHOLD,
    timestamp: entry.timestamp ?? new Date().toISOString(),
  };
  console.error('[Quality Gate]', JSON.stringify(logEntry));
}
