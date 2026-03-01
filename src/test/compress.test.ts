import { describe, it, expect, vi, beforeEach } from "vitest";
import { compressPhoto } from "@/lib/photo/compress";
import type { CompressionOptions } from "@/lib/photo/compress";

// ============================================================
// Test helpers and mocks
// ============================================================

const mockDrawImage = vi.fn();
const mockGetContext = vi.fn();
const mockToBlob = vi.fn();
let mockBitmapClose: ReturnType<typeof vi.fn>;

/**
 * Helper: create a Blob of specified size (filled with zeros).
 */
function createBlob(sizeBytes: number, type = "image/jpeg"): Blob {
  return new Blob([new Uint8Array(sizeBytes)], { type });
}

/**
 * Helper: create a PNG Blob (simulates camera capture canvas.toBlob output).
 */
function createPngBlob(sizeBytes: number): Blob {
  return new Blob([new Uint8Array(sizeBytes)], { type: "image/png" });
}

/**
 * Configure mock createImageBitmap to return a bitmap with given dimensions.
 */
function mockBitmapWithDimensions(width: number, height: number) {
  mockBitmapClose = vi.fn();
  const mockBitmap = {
    width,
    height,
    close: mockBitmapClose,
  } as unknown as ImageBitmap;
  (globalThis.createImageBitmap as ReturnType<typeof vi.fn>).mockResolvedValue(
    mockBitmap
  );
  return mockBitmap;
}

/**
 * Configure mock canvas.toBlob to return a blob of given size.
 */
function mockToBlobWithSize(sizeBytes: number) {
  mockToBlob.mockImplementation(
    (callback: BlobCallback, _type?: string, _quality?: number) => {
      callback(new Blob([new Uint8Array(sizeBytes)], { type: "image/jpeg" }));
    }
  );
}

/**
 * Configure mock canvas.toBlob to return blobs of decreasing sizes on successive calls.
 * Simulates iterative quality reduction scenario.
 */
function mockToBlobWithDecreasingSize(sizes: number[]) {
  let callIndex = 0;
  mockToBlob.mockImplementation(
    (callback: BlobCallback, _type?: string, _quality?: number) => {
      const size = sizes[Math.min(callIndex, sizes.length - 1)];
      callIndex++;
      callback(new Blob([new Uint8Array(size)], { type: "image/jpeg" }));
    }
  );
}

beforeEach(() => {
  vi.restoreAllMocks();

  mockDrawImage.mockReset();
  mockGetContext.mockReset();
  mockToBlob.mockReset();

  // Set up createImageBitmap as a vi.fn() on globalThis BEFORE anything else
  globalThis.createImageBitmap = vi.fn();

  // Mock canvas context
  mockGetContext.mockReturnValue({
    drawImage: mockDrawImage,
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
  });

  // Default: toBlob returns a 100KB JPEG
  mockToBlobWithSize(100 * 1024);

  // Mock document.createElement for canvas
  const originalCreateElement = document.createElement.bind(document);
  vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
    if (tag === "canvas") {
      const canvas = originalCreateElement("canvas");
      Object.defineProperty(canvas, "getContext", {
        value: mockGetContext,
        writable: true,
      });
      Object.defineProperty(canvas, "toBlob", {
        value: mockToBlob,
        writable: true,
      });
      return canvas;
    }
    return originalCreateElement(tag);
  });

  // Default bitmap: 1200x900 (wider than 800px max)
  mockBitmapWithDimensions(1200, 900);
});

// ============================================================
// compressPhoto utility tests
// ============================================================
describe("compressPhoto", () => {
  // ----------------------------------------------------------
  // AC1: Resizes to max 800px width
  // ----------------------------------------------------------
  it("resizes image wider than 800px to exactly 800px width", async () => {
    mockBitmapWithDimensions(1600, 1200);
    mockToBlobWithSize(200 * 1024);

    const input = createBlob(5 * 1024 * 1024);
    const result = await compressPhoto(input);

    expect(result.metadata.outputWidth).toBe(800);
  });

  // ----------------------------------------------------------
  // AC4: Preserves aspect ratio
  // ----------------------------------------------------------
  it("preserves aspect ratio during resize", async () => {
    mockBitmapWithDimensions(1600, 1200);
    mockToBlobWithSize(200 * 1024);

    const input = createBlob(5 * 1024 * 1024);
    const result = await compressPhoto(input);

    expect(result.metadata.outputWidth).toBe(800);
    expect(result.metadata.outputHeight).toBe(600);
    // 1600:1200 = 4:3, so 800:600 = 4:3 (aspect ratio preserved)
  });

  // ----------------------------------------------------------
  // AC6: No upscaling for images already at/below 800px
  // ----------------------------------------------------------
  it("does not upscale images already at or below 800px width", async () => {
    mockBitmapWithDimensions(640, 480);
    mockToBlobWithSize(50 * 1024);

    const input = createBlob(200 * 1024);
    const result = await compressPhoto(input);

    expect(result.metadata.outputWidth).toBe(640);
    expect(result.metadata.outputHeight).toBe(480);
  });

  it("does not upscale an image at exactly 800px width", async () => {
    mockBitmapWithDimensions(800, 600);
    mockToBlobWithSize(100 * 1024);

    const input = createBlob(300 * 1024);
    const result = await compressPhoto(input);

    expect(result.metadata.outputWidth).toBe(800);
    expect(result.metadata.outputHeight).toBe(600);
  });

  // ----------------------------------------------------------
  // AC2: Output format is JPEG at 85% quality
  // ----------------------------------------------------------
  it("outputs JPEG format (blob.type === 'image/jpeg')", async () => {
    mockToBlobWithSize(100 * 1024);

    const input = createBlob(3 * 1024 * 1024);
    const result = await compressPhoto(input);

    expect(result.blob.type).toBe("image/jpeg");
  });

  // ----------------------------------------------------------
  // AC3: Compressed output under 500KB
  // ----------------------------------------------------------
  it("compresses a large image blob to under 500KB", async () => {
    mockToBlobWithSize(400 * 1024); // 400KB result

    const input = createBlob(10 * 1024 * 1024); // 10MB input
    const result = await compressPhoto(input);

    expect(result.blob.size).toBeLessThanOrEqual(500 * 1024);
  });

  // ----------------------------------------------------------
  // AC13: Handles PNG input blobs (from camera capture canvas)
  // ----------------------------------------------------------
  it("handles PNG input blobs and converts to JPEG", async () => {
    mockBitmapWithDimensions(1024, 768);
    mockToBlobWithSize(150 * 1024);

    const input = createPngBlob(2 * 1024 * 1024);
    const result = await compressPhoto(input);

    expect(result.blob.type).toBe("image/jpeg");
    expect(result.metadata.outputWidth).toBe(800);
  });

  // ----------------------------------------------------------
  // AC13: Handles very small images (< 100px)
  // ----------------------------------------------------------
  it("handles very small images (< 100px) without error", async () => {
    mockBitmapWithDimensions(50, 40);
    mockToBlobWithSize(5 * 1024);

    const input = createBlob(10 * 1024);
    const result = await compressPhoto(input);

    expect(result.metadata.outputWidth).toBe(50);
    expect(result.metadata.outputHeight).toBe(40);
    expect(result.blob).toBeInstanceOf(Blob);
  });

  // ----------------------------------------------------------
  // AC13: Handles very large images (> 4000px)
  // ----------------------------------------------------------
  it("handles very large images (> 4000px width) correctly", async () => {
    mockBitmapWithDimensions(5000, 3750);
    mockToBlobWithSize(300 * 1024);

    const input = createBlob(15 * 1024 * 1024);
    const result = await compressPhoto(input);

    expect(result.metadata.outputWidth).toBe(800);
    expect(result.metadata.outputHeight).toBe(600);
  });

  // ----------------------------------------------------------
  // AC14: Returns correct metadata
  // ----------------------------------------------------------
  it("returns correct metadata: original and compressed sizes, dimensions, ratio", async () => {
    mockBitmapWithDimensions(2000, 1500);
    const compressedSize = 200 * 1024;
    mockToBlobWithSize(compressedSize);

    const originalSize = 5 * 1024 * 1024;
    const input = createBlob(originalSize);
    const result = await compressPhoto(input);

    expect(result.metadata.originalSizeBytes).toBe(originalSize);
    expect(result.metadata.compressedSizeBytes).toBe(compressedSize);
    expect(result.metadata.compressionRatio).toBeCloseTo(
      compressedSize / originalSize,
      4
    );
    expect(result.metadata.originalWidth).toBe(2000);
    expect(result.metadata.originalHeight).toBe(1500);
    expect(result.metadata.outputWidth).toBe(800);
    expect(result.metadata.outputHeight).toBe(600);
  });

  // ----------------------------------------------------------
  // Iterative quality reduction when output exceeds maxSizeKB
  // ----------------------------------------------------------
  it("iteratively reduces quality if initial compression exceeds maxSizeKB", async () => {
    mockBitmapWithDimensions(1200, 900);
    // First call: 600KB (over 500KB), second call: 450KB (under 500KB)
    mockToBlobWithDecreasingSize([600 * 1024, 450 * 1024]);

    const input = createBlob(8 * 1024 * 1024);
    const result = await compressPhoto(input);

    expect(result.blob.size).toBeLessThanOrEqual(500 * 1024);
    // toBlob should have been called at least twice
    expect(mockToBlob).toHaveBeenCalledTimes(2);
  });

  // ----------------------------------------------------------
  // Custom options
  // ----------------------------------------------------------
  it("respects custom options (maxWidth, quality, maxSizeKB)", async () => {
    mockBitmapWithDimensions(2000, 1000);
    mockToBlobWithSize(80 * 1024);

    const input = createBlob(3 * 1024 * 1024);
    const options: CompressionOptions = {
      maxWidth: 400,
      quality: 0.7,
      maxSizeKB: 200,
    };
    const result = await compressPhoto(input, options);

    expect(result.metadata.outputWidth).toBe(400);
    expect(result.metadata.outputHeight).toBe(200);
    expect(result.blob.size).toBeLessThanOrEqual(200 * 1024);
  });

  // ----------------------------------------------------------
  // Default options
  // ----------------------------------------------------------
  it("default options produce expected results (800px, 85% quality, 500KB)", async () => {
    mockBitmapWithDimensions(3000, 2000);
    mockToBlobWithSize(350 * 1024);

    const input = createBlob(8 * 1024 * 1024);
    const result = await compressPhoto(input);

    // Default maxWidth is 800
    expect(result.metadata.outputWidth).toBe(800);
    // Default output should be JPEG
    expect(result.blob.type).toBe("image/jpeg");
  });

  // ----------------------------------------------------------
  // Non-image input throws descriptive error
  // ----------------------------------------------------------
  it("throws on non-image input", async () => {
    (
      globalThis.createImageBitmap as ReturnType<typeof vi.fn>
    ).mockRejectedValue(new Error("Could not decode image"));

    const input = new Blob(["not-an-image"], { type: "text/plain" });

    await expect(compressPhoto(input)).rejects.toThrow();
  });

  // ----------------------------------------------------------
  // Memory management: closes ImageBitmap
  // ----------------------------------------------------------
  it("closes ImageBitmap after processing (no memory leak)", async () => {
    const bitmap = mockBitmapWithDimensions(1200, 900);
    mockToBlobWithSize(100 * 1024);

    const input = createBlob(3 * 1024 * 1024);
    await compressPhoto(input);

    expect(bitmap.close).toHaveBeenCalledTimes(1);
  });

  // ----------------------------------------------------------
  // AC7: Accepts Blob input and returns Promise<CompressionResult>
  // ----------------------------------------------------------
  it("accepts a Blob input and returns a Promise<CompressionResult>", async () => {
    mockToBlobWithSize(100 * 1024);

    const input = createBlob(1 * 1024 * 1024);
    const result = await compressPhoto(input);

    expect(result).toHaveProperty("blob");
    expect(result).toHaveProperty("metadata");
    expect(result.blob).toBeInstanceOf(Blob);
    expect(result.metadata).toHaveProperty("originalSizeBytes");
    expect(result.metadata).toHaveProperty("compressedSizeBytes");
    expect(result.metadata).toHaveProperty("compressionRatio");
    expect(result.metadata).toHaveProperty("originalWidth");
    expect(result.metadata).toHaveProperty("originalHeight");
    expect(result.metadata).toHaveProperty("outputWidth");
    expect(result.metadata).toHaveProperty("outputHeight");
  });

  // ----------------------------------------------------------
  // Quality floor: stops reducing at 0.5 minimum
  // ----------------------------------------------------------
  it("stops reducing quality at 0.5 minimum floor", async () => {
    mockBitmapWithDimensions(1200, 900);
    // Always returns oversized blob - quality reduction should stop at floor
    mockToBlob.mockImplementation(
      (callback: BlobCallback, _type?: string, _quality?: number) => {
        callback(
          new Blob([new Uint8Array(600 * 1024)], { type: "image/jpeg" })
        );
      }
    );

    const input = createBlob(8 * 1024 * 1024);
    const result = await compressPhoto(input);

    // Should still return a result (even if over target)
    expect(result.blob).toBeInstanceOf(Blob);
    // Quality stepped from 0.85 down to 0.50 = 8 calls (0.85, 0.80, 0.75, 0.70, 0.65, 0.60, 0.55, 0.50)
    expect(mockToBlob.mock.calls.length).toBe(8);
  });

  // ----------------------------------------------------------
  // Canvas getContext null fallback
  // ----------------------------------------------------------
  it("throws an error when canvas getContext returns null", async () => {
    mockBitmapWithDimensions(1200, 900);
    mockGetContext.mockReturnValue(null);

    const input = createBlob(3 * 1024 * 1024);

    await expect(compressPhoto(input)).rejects.toThrow();
  });

  // ----------------------------------------------------------
  // Handles portrait orientation (height > width)
  // ----------------------------------------------------------
  it("correctly resizes portrait orientation images", async () => {
    mockBitmapWithDimensions(900, 1600);
    mockToBlobWithSize(150 * 1024);

    const input = createBlob(4 * 1024 * 1024);
    const result = await compressPhoto(input);

    // 900 > 800, so scale: 800/900 = 0.888...
    expect(result.metadata.outputWidth).toBe(800);
    expect(result.metadata.outputHeight).toBe(Math.round(1600 * (800 / 900)));
  });
});
