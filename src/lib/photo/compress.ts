/**
 * Client-side photo compression utility.
 *
 * Uses the Canvas API and createImageBitmap to resize and compress photos
 * before upload. Outputs JPEG at configurable quality with a maximum width
 * constraint while preserving aspect ratio.
 *
 * No external dependencies -- uses only native browser APIs:
 * - createImageBitmap (Chrome 50+, Firefox 42+, Safari 15+, Edge 79+)
 * - canvas.toBlob (Chrome 50+, Firefox 19+, Safari 11+, Edge 79+)
 */

/**
 * Options for photo compression.
 */
export interface CompressionOptions {
  /** Maximum output width in pixels. Images narrower than this are not upscaled. Default: 800 */
  maxWidth?: number;
  /** JPEG quality (0 to 1). Default: 0.85 */
  quality?: number;
  /** Maximum output file size in KB. Quality is iteratively reduced if exceeded. Default: 500 */
  maxSizeKB?: number;
}

/**
 * Metadata about the compression operation, useful for analytics and debugging.
 */
export interface CompressionMetadata {
  originalSizeBytes: number;
  compressedSizeBytes: number;
  compressionRatio: number;
  originalWidth: number;
  originalHeight: number;
  outputWidth: number;
  outputHeight: number;
}

/**
 * Result of photo compression: the compressed blob and metadata.
 */
export interface CompressionResult {
  blob: Blob;
  metadata: CompressionMetadata;
}

/** Default compression settings */
const DEFAULT_MAX_WIDTH = 800;
const DEFAULT_QUALITY = 0.85;
const DEFAULT_MAX_SIZE_KB = 500;

/** Quality reduction step and floor for iterative compression */
const QUALITY_STEP = 0.05;
const QUALITY_FLOOR = 0.5;

/**
 * Compress a photo blob for upload.
 *
 * - Resizes to maxWidth (default 800px) preserving aspect ratio
 * - Does NOT upscale images already at or below maxWidth
 * - Outputs JPEG at specified quality (default 85%)
 * - Iteratively reduces quality if output exceeds maxSizeKB (default 500KB)
 * - Returns compressed blob and metadata for analytics
 *
 * @param blob - The input image blob (JPEG or PNG)
 * @param options - Optional compression configuration
 * @returns Promise resolving to CompressionResult with blob and metadata
 * @throws Error if the input cannot be decoded as an image or canvas context is unavailable
 */
export async function compressPhoto(
  blob: Blob,
  options?: CompressionOptions
): Promise<CompressionResult> {
  const maxWidth = options?.maxWidth ?? DEFAULT_MAX_WIDTH;
  const initialQuality = options?.quality ?? DEFAULT_QUALITY;
  const maxSizeKB = options?.maxSizeKB ?? DEFAULT_MAX_SIZE_KB;
  const maxSizeBytes = maxSizeKB * 1024;
  const originalSizeBytes = blob.size;

  // Decode the image blob into a bitmap
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(blob);
  } catch (error) {
    throw new Error(
      `Failed to decode image: ${error instanceof Error ? error.message : "unknown error"}`
    );
  }

  const originalWidth = bitmap.width;
  const originalHeight = bitmap.height;

  // Calculate target dimensions preserving aspect ratio (never upscale)
  let targetWidth: number;
  let targetHeight: number;

  if (originalWidth > maxWidth) {
    const scale = maxWidth / originalWidth;
    targetWidth = maxWidth;
    targetHeight = Math.round(originalHeight * scale);
  } else {
    targetWidth = originalWidth;
    targetHeight = originalHeight;
  }

  // Create canvas at target dimensions
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Failed to get canvas 2D context");
  }

  // Draw the bitmap scaled to target dimensions
  ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);

  // Release bitmap memory immediately
  bitmap.close();

  // Export as JPEG with iterative quality reduction if needed
  let quality = initialQuality;
  let outputBlob = await canvasToBlob(canvas, quality);

  while (outputBlob.size > maxSizeBytes && quality > QUALITY_FLOOR) {
    quality = Math.round(Math.max(quality - QUALITY_STEP, QUALITY_FLOOR) * 100) / 100;
    outputBlob = await canvasToBlob(canvas, quality);
  }

  const compressedSizeBytes = outputBlob.size;

  return {
    blob: outputBlob,
    metadata: {
      originalSizeBytes,
      compressedSizeBytes,
      compressionRatio: compressedSizeBytes / originalSizeBytes,
      originalWidth,
      originalHeight,
      outputWidth: targetWidth,
      outputHeight: targetHeight,
    },
  };
}

/**
 * Export a canvas as a JPEG Blob at the specified quality.
 */
function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("canvas.toBlob returned null"));
        }
      },
      "image/jpeg",
      quality
    );
  });
}
