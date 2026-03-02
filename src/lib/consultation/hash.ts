import { createHash } from 'crypto';
import type { QuestionnaireData } from '@/types';

/**
 * Compute SHA-256 hash of photo bytes from base64-encoded photo.
 * Used as cache key component for deterministic results.
 */
export function computePhotoHash(photoBase64: string): string {
  const photoBuffer = Buffer.from(photoBase64, 'base64');
  return createHash('sha256').update(photoBuffer).digest('hex');
}

/**
 * Compute SHA-256 hash of questionnaire data using canonical JSON serialization.
 * Sorted keys ensure stable hash regardless of property insertion order.
 */
export function computeQuestionnaireHash(questionnaire: QuestionnaireData): string {
  const canonical = JSON.stringify(questionnaire, Object.keys(questionnaire).sort());
  return createHash('sha256').update(canonical).digest('hex');
}
