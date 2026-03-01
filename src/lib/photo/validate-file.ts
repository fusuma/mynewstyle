/**
 * File validation utility for gallery photo uploads.
 * Validates file type and size with Portuguese (pt-BR) error messages.
 */

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
]);

const ALLOWED_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".heic",
  ".heif",
]);

/**
 * Extract the file extension from a filename, lowercased.
 */
function getFileExtension(filename: string): string {
  const dotIndex = filename.lastIndexOf(".");
  if (dotIndex === -1) return "";
  return filename.slice(dotIndex).toLowerCase();
}

/**
 * Check if a file has a valid type based on MIME type or extension fallback.
 * Some browsers report HEIC files as application/octet-stream or empty string,
 * so we fall back to checking the file extension.
 */
function isValidFileType(file: File): boolean {
  if (ALLOWED_MIME_TYPES.has(file.type)) {
    return true;
  }

  // Fallback: check extension for browsers that don't report correct MIME type
  const extension = getFileExtension(file.name);
  return ALLOWED_EXTENSIONS.has(extension);
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates a photo file for gallery upload.
 * Checks file type (JPEG, PNG, HEIC/HEIF) and size (max 10MB).
 * Returns Portuguese error messages with correct diacritical marks.
 *
 * Type validation runs before size validation so that unsupported
 * formats are rejected regardless of file size.
 */
export function validatePhotoFile(file: File): FileValidationResult {
  // Validate type first
  if (!isValidFileType(file)) {
    return {
      valid: false,
      error: "Formato não suportado. Use JPG, PNG ou HEIC.",
    };
  }

  // Validate size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: "Ficheiro demasiado grande. O tamanho máximo é 10MB.",
    };
  }

  return { valid: true };
}
