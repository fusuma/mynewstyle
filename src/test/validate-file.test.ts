import { describe, it, expect } from "vitest";
import { validatePhotoFile } from "@/lib/photo/validate-file";

/**
 * Helper to create a mock File object with given properties.
 */
function createMockFile(
  name: string,
  size: number,
  type: string
): File {
  const content = new Uint8Array(size);
  const blob = new Blob([content], { type });
  return new File([blob], name, { type });
}

describe("validatePhotoFile", () => {
  // ============================================================
  // Valid file types
  // ============================================================
  it("accepts a valid JPEG file", () => {
    const file = createMockFile("photo.jpg", 1024 * 1024, "image/jpeg");
    const result = validatePhotoFile(file);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("accepts a valid PNG file", () => {
    const file = createMockFile("photo.png", 2 * 1024 * 1024, "image/png");
    const result = validatePhotoFile(file);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("accepts a valid HEIC file by MIME type", () => {
    const file = createMockFile("photo.heic", 3 * 1024 * 1024, "image/heic");
    const result = validatePhotoFile(file);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("accepts a valid HEIF file by MIME type", () => {
    const file = createMockFile("photo.heif", 3 * 1024 * 1024, "image/heif");
    const result = validatePhotoFile(file);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("accepts a HEIC file with empty MIME type (fallback to extension)", () => {
    const file = createMockFile("selfie.heic", 2 * 1024 * 1024, "");
    const result = validatePhotoFile(file);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("accepts a HEIC file with application/octet-stream MIME type (fallback to extension)", () => {
    const file = createMockFile(
      "selfie.heic",
      2 * 1024 * 1024,
      "application/octet-stream"
    );
    const result = validatePhotoFile(file);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("accepts a .heif file with empty MIME type (fallback to extension)", () => {
    const file = createMockFile("selfie.heif", 2 * 1024 * 1024, "");
    const result = validatePhotoFile(file);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("accepts a .jpeg extension file", () => {
    const file = createMockFile("photo.jpeg", 1024 * 1024, "image/jpeg");
    const result = validatePhotoFile(file);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  // ============================================================
  // Invalid file types
  // ============================================================
  it("rejects a GIF file", () => {
    const file = createMockFile("animation.gif", 500 * 1024, "image/gif");
    const result = validatePhotoFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toBe(
      "Formato não suportado. Use JPG, PNG ou HEIC."
    );
  });

  it("rejects a BMP file", () => {
    const file = createMockFile("image.bmp", 500 * 1024, "image/bmp");
    const result = validatePhotoFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toBe(
      "Formato não suportado. Use JPG, PNG ou HEIC."
    );
  });

  it("rejects a PDF file", () => {
    const file = createMockFile("document.pdf", 500 * 1024, "application/pdf");
    const result = validatePhotoFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toBe(
      "Formato não suportado. Use JPG, PNG ou HEIC."
    );
  });

  it("rejects a WebP file", () => {
    const file = createMockFile("image.webp", 500 * 1024, "image/webp");
    const result = validatePhotoFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toBe(
      "Formato não suportado. Use JPG, PNG ou HEIC."
    );
  });

  it("rejects an SVG file", () => {
    const file = createMockFile("image.svg", 500 * 1024, "image/svg+xml");
    const result = validatePhotoFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toBe(
      "Formato não suportado. Use JPG, PNG ou HEIC."
    );
  });

  // ============================================================
  // File size validation
  // ============================================================
  it("rejects files over 10MB", () => {
    const file = createMockFile(
      "huge.jpg",
      10 * 1024 * 1024 + 1,
      "image/jpeg"
    );
    const result = validatePhotoFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toBe(
      "Ficheiro demasiado grande. O tamanho máximo é 10MB."
    );
  });

  it("accepts files exactly at 10MB", () => {
    const file = createMockFile("exact.jpg", 10 * 1024 * 1024, "image/jpeg");
    const result = validatePhotoFile(file);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("accepts small files", () => {
    const file = createMockFile("tiny.png", 1024, "image/png");
    const result = validatePhotoFile(file);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  // ============================================================
  // Error messages are in Portuguese with correct diacritics
  // ============================================================
  it("returns Portuguese error message with diacritics for wrong type", () => {
    const file = createMockFile("test.txt", 1024, "text/plain");
    const result = validatePhotoFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("não");
    expect(result.error).toContain("suportado");
  });

  it("returns Portuguese error message with diacritics for too large", () => {
    const file = createMockFile(
      "big.jpg",
      11 * 1024 * 1024,
      "image/jpeg"
    );
    const result = validatePhotoFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("máximo");
    expect(result.error).toContain("10MB");
  });

  // ============================================================
  // Edge cases
  // ============================================================
  it("validates type before size (type error takes precedence for invalid type)", () => {
    const file = createMockFile(
      "huge.gif",
      11 * 1024 * 1024,
      "image/gif"
    );
    const result = validatePhotoFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toBe(
      "Formato não suportado. Use JPG, PNG ou HEIC."
    );
  });
});
