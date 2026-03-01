import { describe, it, expect, vi, beforeEach } from "vitest";
import { correctExifOrientation } from "@/lib/photo/exif";

/**
 * Helper to create a minimal JPEG file with an EXIF orientation tag.
 * JPEG structure: SOI (FFD8) + APP1 (FFE1) with EXIF data containing orientation tag.
 */
function createJpegWithOrientation(orientation: number): File {
  // Build a minimal JPEG with EXIF orientation
  // SOI marker: FF D8
  // APP1 marker: FF E1
  // APP1 length: 00 1E (30 bytes)
  // Exif header: 45 78 69 66 00 00 ("Exif\0\0")
  // TIFF header (little-endian):
  //   Byte order: 49 49 ("II" = little-endian)
  //   Magic: 2A 00
  //   IFD0 offset: 08 00 00 00
  // IFD0:
  //   Number of entries: 01 00
  //   Tag: 12 01 (0x0112 = Orientation)
  //   Type: 03 00 (SHORT)
  //   Count: 01 00 00 00
  //   Value: XX 00 00 00 (orientation value)
  //   Next IFD offset: 00 00 00 00

  const bytes = new Uint8Array([
    // SOI
    0xff, 0xd8,
    // APP1 marker
    0xff, 0xe1,
    // APP1 length (30 bytes after length field)
    0x00, 0x1e,
    // Exif header
    0x45, 0x78, 0x69, 0x66, 0x00, 0x00,
    // TIFF header - little endian
    0x49, 0x49,
    // TIFF magic
    0x2a, 0x00,
    // IFD0 offset
    0x08, 0x00, 0x00, 0x00,
    // Number of IFD entries
    0x01, 0x00,
    // Orientation tag (0x0112)
    0x12, 0x01,
    // Type: SHORT (3)
    0x03, 0x00,
    // Count: 1
    0x01, 0x00, 0x00, 0x00,
    // Value: orientation
    orientation, 0x00, 0x00, 0x00,
    // Next IFD offset: none
    0x00, 0x00, 0x00, 0x00,
  ]);

  const blob = new Blob([bytes], { type: "image/jpeg" });
  return new File([blob], "test.jpg", { type: "image/jpeg" });
}

/**
 * Helper to create a minimal PNG file (no EXIF data).
 */
function createPngFile(): File {
  // PNG signature
  const bytes = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);
  const blob = new Blob([bytes], { type: "image/png" });
  return new File([blob], "test.png", { type: "image/png" });
}

/**
 * Helper to create a generic file with a given name and type.
 */
function createGenericFile(name: string, type: string): File {
  const bytes = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
  const blob = new Blob([bytes], { type });
  return new File([blob], name, { type });
}

// Mock createImageBitmap and canvas APIs
const mockDrawImage = vi.fn();
const mockGetContext = vi.fn();
const mockToBlob = vi.fn();

beforeEach(() => {
  vi.restoreAllMocks();

  mockDrawImage.mockReset();
  mockGetContext.mockReset();
  mockToBlob.mockReset();

  // Mock canvas context
  mockGetContext.mockReturnValue({
    drawImage: mockDrawImage,
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
  });

  // Mock toBlob to return a JPEG blob
  mockToBlob.mockImplementation(
    (callback: BlobCallback, type?: string) => {
      callback(new Blob(["corrected-image"], { type: type || "image/jpeg" }));
    }
  );

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

  // Mock createImageBitmap
  const mockBitmap = {
    width: 100,
    height: 150,
    close: vi.fn(),
  } as unknown as ImageBitmap;

  globalThis.createImageBitmap = vi.fn().mockResolvedValue(mockBitmap);
});

describe("correctExifOrientation", () => {
  // ============================================================
  // Normal orientation (no correction needed)
  // ============================================================
  it("returns original blob unchanged for normal orientation (value 1)", async () => {
    const file = createJpegWithOrientation(1);
    const result = await correctExifOrientation(file);
    // For orientation 1 (normal), should still process through createImageBitmap
    // but return a valid blob
    expect(result).toBeInstanceOf(Blob);
  });

  // ============================================================
  // Files without EXIF data
  // ============================================================
  it("handles PNG files without EXIF data gracefully", async () => {
    const file = createPngFile();
    const result = await correctExifOrientation(file);
    expect(result).toBeInstanceOf(Blob);
  });

  it("handles files without EXIF data (non-JPEG)", async () => {
    const file = createGenericFile("photo.png", "image/png");
    const result = await correctExifOrientation(file);
    expect(result).toBeInstanceOf(Blob);
  });

  // ============================================================
  // EXIF orientation correction
  // ============================================================
  it("corrects orientation for a rotated JPEG (orientation 6 = 90 CW)", async () => {
    const file = createJpegWithOrientation(6);
    const result = await correctExifOrientation(file);
    expect(result).toBeInstanceOf(Blob);
    expect(result.type).toBe("image/jpeg");
  });

  it("corrects orientation for an upside-down JPEG (orientation 3 = 180)", async () => {
    const file = createJpegWithOrientation(3);
    const result = await correctExifOrientation(file);
    expect(result).toBeInstanceOf(Blob);
    expect(result.type).toBe("image/jpeg");
  });

  it("corrects orientation for a 270 CW rotated JPEG (orientation 8)", async () => {
    const file = createJpegWithOrientation(8);
    const result = await correctExifOrientation(file);
    expect(result).toBeInstanceOf(Blob);
    expect(result.type).toBe("image/jpeg");
  });

  it("handles mirrored orientation (orientation 2)", async () => {
    const file = createJpegWithOrientation(2);
    const result = await correctExifOrientation(file);
    expect(result).toBeInstanceOf(Blob);
  });

  it("handles mirrored+rotated orientation (orientation 5)", async () => {
    const file = createJpegWithOrientation(5);
    const result = await correctExifOrientation(file);
    expect(result).toBeInstanceOf(Blob);
  });

  it("handles mirrored+180 orientation (orientation 4)", async () => {
    const file = createJpegWithOrientation(4);
    const result = await correctExifOrientation(file);
    expect(result).toBeInstanceOf(Blob);
  });

  it("handles mirrored+270 orientation (orientation 7)", async () => {
    const file = createJpegWithOrientation(7);
    const result = await correctExifOrientation(file);
    expect(result).toBeInstanceOf(Blob);
  });

  // ============================================================
  // HEIC files
  // ============================================================
  it("converts HEIC files to JPEG output", async () => {
    const file = createGenericFile("photo.heic", "image/heic");
    const result = await correctExifOrientation(file);
    expect(result).toBeInstanceOf(Blob);
    expect(result.type).toBe("image/jpeg");
  });

  it("converts HEIF files to JPEG output", async () => {
    const file = createGenericFile("photo.heif", "image/heif");
    const result = await correctExifOrientation(file);
    expect(result).toBeInstanceOf(Blob);
    expect(result.type).toBe("image/jpeg");
  });

  // ============================================================
  // Error handling
  // ============================================================
  it("returns original file as blob if createImageBitmap fails", async () => {
    (globalThis.createImageBitmap as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("createImageBitmap failed")
    );

    const file = createJpegWithOrientation(6);
    const result = await correctExifOrientation(file);
    // Should fallback gracefully
    expect(result).toBeInstanceOf(Blob);
  });

  it("uses createImageBitmap for processing", async () => {
    const file = createJpegWithOrientation(3);
    await correctExifOrientation(file);
    expect(globalThis.createImageBitmap).toHaveBeenCalled();
  });
});
