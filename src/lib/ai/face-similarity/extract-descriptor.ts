/**
 * Face descriptor extraction from image Buffer.
 *
 * Extracts 128-dimensional face embedding from a given image buffer.
 * Used by compareFaces() to compute similarity between two face images.
 *
 * Strategy:
 *  - Detect all faces, select the largest (most prominent) face
 *  - Extract 128-d face recognition descriptor
 *  - Return null for: no face detected, image decode error, timeout
 *
 * Performance: ~500ms-1500ms per image (cold start adds ~2-3s for first invocation)
 */

import * as faceapi from '@vladmandic/face-api';
import { createCanvas, loadImage } from 'canvas';
import { loadFaceApiModels } from './model-loader';

/** Default timeout for face descriptor extraction (milliseconds). */
const DEFAULT_EXTRACTION_TIMEOUT_MS = 10_000;

/**
 * Extracts a 128-dimensional face descriptor from the given image buffer.
 *
 * @param imageBuffer - Raw image data (JPEG, PNG, etc.)
 * @param timeoutMs - Maximum time allowed for extraction (default: 10s)
 * @returns Float32Array of 128 dimensions, or null if no face detected / error
 */
export async function extractFaceDescriptor(
  imageBuffer: Buffer,
  timeoutMs: number = DEFAULT_EXTRACTION_TIMEOUT_MS
): Promise<Float32Array | null> {
  // Ensure models are loaded before extraction
  await loadFaceApiModels();

  // Load image from buffer using canvas
  let img: ReturnType<typeof createCanvas> | Awaited<ReturnType<typeof loadImage>>;
  try {
    img = await loadImage(imageBuffer);
  } catch (error) {
    console.error(
      '[face-similarity] Image decode failed:',
      error instanceof Error ? error.message : error
    );
    return null;
  }

  // Create canvas from image for face-api processing
  const canvas = createCanvas(img.width as number, img.height as number);
  const ctx = canvas.getContext('2d');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx.drawImage(img as any, 0, 0);

  // Apply timeout guard to prevent serverless function hangs
  const detectionPromise = faceapi
    .detectAllFaces(canvas as unknown as HTMLCanvasElement, new faceapi.SsdMobilenetv1Options())
    .withFaceLandmarks()
    .withFaceDescriptors();

  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(
      () => reject(new Error(`Face detection timed out after ${timeoutMs}ms`)),
      timeoutMs
    );
  });

  let detections: faceapi.WithFaceDescriptor<faceapi.WithFaceLandmarks<{
    detection: faceapi.FaceDetection;
  }>>[];

  try {
    detections = await Promise.race([detectionPromise, timeoutPromise]);
    // Clear the timeout to avoid a dangling timer when detection resolves first
    if (timeoutHandle !== null) clearTimeout(timeoutHandle);
  } catch (error) {
    if (timeoutHandle !== null) clearTimeout(timeoutHandle);
    console.error(
      '[face-similarity] Face detection failed or timed out:',
      error instanceof Error ? error.message : error
    );
    return null;
  }

  if (!detections || detections.length === 0) {
    return null;
  }

  // Select the largest face by bounding box area (most prominent face)
  const largestFace = detections.reduce((largest, current) => {
    const currentArea = current.detection.box.width * current.detection.box.height;
    const largestArea = largest.detection.box.width * largest.detection.box.height;
    return currentArea > largestArea ? current : largest;
  });

  return largestFace.descriptor;
}
