/**
 * Lazy model loader for @vladmandic/face-api.
 *
 * Models are loaded once per serverless cold start and cached in module scope.
 * Required models:
 *   - ssd_mobilenetv1: face detection (locates face bounding boxes)
 *   - face_landmark_68: face landmarks (required by faceRecognitionNet)
 *   - face_recognition: 128-d face descriptor extraction
 *
 * Models must be stored in public/models/face-api/ directory.
 * Total model size: ~6-7MB loaded into memory on first invocation.
 */

import * as faceapi from '@vladmandic/face-api';
import path from 'path';

/** Cached promise to prevent concurrent parallel loads on multiple requests during cold start. */
let modelsLoadedPromise: Promise<void> | null = null;

/**
 * Resolves the path to the face-api model weights directory.
 * In Next.js, process.cwd() resolves to the project root where 'public/' lives.
 */
function getModelsPath(): string {
  return path.join(process.cwd(), 'public', 'models', 'face-api');
}

/**
 * Lazily loads all required face-api model weights.
 * Cached after first call — subsequent calls return immediately.
 *
 * @throws Error if model files are not found at the expected path
 */
export async function loadFaceApiModels(): Promise<void> {
  if (modelsLoadedPromise) {
    return modelsLoadedPromise;
  }

  modelsLoadedPromise = (async () => {
    const modelsPath = getModelsPath();

    try {
      // Load models in parallel for faster cold start
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromDisk(modelsPath),
        faceapi.nets.faceLandmark68Net.loadFromDisk(modelsPath),
        faceapi.nets.faceRecognitionNet.loadFromDisk(modelsPath),
      ]);
    } catch (error) {
      // Reset cache on failure so next call retries
      modelsLoadedPromise = null;
      throw new Error(
        `[face-similarity] Failed to load face-api models from ${modelsPath}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  })();

  return modelsLoadedPromise;
}

/**
 * Resets the model cache (for testing only).
 * Forces re-initialization on next loadFaceApiModels() call.
 */
export function resetModelCache(): void {
  modelsLoadedPromise = null;
}
