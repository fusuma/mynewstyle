/**
 * Public API barrel for the face-similarity module.
 *
 * Usage:
 *   import { compareFaces, FaceSimilarityResult } from '@/lib/ai/face-similarity';
 *   import { compareFaces, FaceSimilarityResult } from '@/lib/ai'; // via main barrel
 */

export { compareFaces, logQualityGate, FACE_SIMILARITY_THRESHOLD } from './compare';
export type { FaceSimilarityResult, QualityGateLogEntry } from './compare';
export { extractFaceDescriptor } from './extract-descriptor';
export { loadFaceApiModels, resetModelCache } from './model-loader';
