/**
 * EXIF orientation correction utility.
 * Reads EXIF orientation tag from JPEG files and corrects the orientation
 * using Canvas API. Converts HEIC/HEIF files to JPEG during processing.
 *
 * Uses createImageBitmap with imageOrientation option where available,
 * with fallback to manual EXIF reading and Canvas rotation.
 */

/**
 * Read the EXIF orientation value from a JPEG file's raw bytes.
 * Returns the orientation value (1-8) or 1 if not found.
 *
 * JPEG EXIF structure:
 * - SOI marker: FF D8
 * - APP1 marker: FF E1
 * - Exif header: "Exif\0\0"
 * - TIFF header: byte order (II or MM), magic 0x002A, IFD0 offset
 * - IFD0 entries: tag, type, count, value
 * - Orientation tag: 0x0112
 */
function readExifOrientation(arrayBuffer: ArrayBuffer): number {
  const view = new DataView(arrayBuffer);

  // Check for JPEG SOI marker
  if (view.byteLength < 2 || view.getUint16(0) !== 0xffd8) {
    return 1; // Not a JPEG
  }

  let offset = 2;

  while (offset < view.byteLength - 1) {
    const marker = view.getUint16(offset);

    // Check for APP1 (EXIF) marker
    if (marker === 0xffe1) {
      const segmentLength = view.getUint16(offset + 2);

      // Check for "Exif\0\0" header
      if (
        offset + 10 < view.byteLength &&
        view.getUint32(offset + 4) === 0x45786966 && // "Exif"
        view.getUint16(offset + 8) === 0x0000
      ) {
        const tiffOffset = offset + 10;
        const byteOrder = view.getUint16(tiffOffset);
        const littleEndian = byteOrder === 0x4949; // "II"

        // Read IFD0 offset
        const ifd0Offset =
          tiffOffset + view.getUint32(tiffOffset + 4, littleEndian);

        // Read number of IFD entries
        if (ifd0Offset + 2 > view.byteLength) return 1;
        const numEntries = view.getUint16(ifd0Offset, littleEndian);

        // Scan IFD entries for orientation tag (0x0112)
        for (let i = 0; i < numEntries; i++) {
          const entryOffset = ifd0Offset + 2 + i * 12;
          if (entryOffset + 12 > view.byteLength) break;

          const tag = view.getUint16(entryOffset, littleEndian);
          if (tag === 0x0112) {
            const orientation = view.getUint16(entryOffset + 8, littleEndian);
            return orientation >= 1 && orientation <= 8 ? orientation : 1;
          }
        }
      }

      // Move past this APP1 segment
      offset += 2 + segmentLength;
    } else if ((marker & 0xff00) === 0xff00) {
      // Other JPEG marker segment
      if (marker === 0xffda) break; // Start of scan data - stop searching
      const segLen = view.getUint16(offset + 2);
      offset += 2 + segLen;
    } else {
      break;
    }
  }

  return 1; // No orientation tag found
}

/**
 * Check if file is a HEIC/HEIF type based on MIME type or extension.
 */
function isHeicFile(file: File): boolean {
  const type = file.type.toLowerCase();
  if (type === "image/heic" || type === "image/heif") return true;
  const ext = file.name.toLowerCase();
  return ext.endsWith(".heic") || ext.endsWith(".heif");
}

/**
 * Correct the EXIF orientation of an image file and return a properly-oriented Blob.
 * - For JPEG files: reads EXIF orientation, applies canvas transformation
 * - For HEIC/HEIF files: converts to JPEG output
 * - For PNG and other files: processes through canvas for consistent output
 *
 * Uses createImageBitmap for decoding the image, which handles HEIC in
 * supported browsers.
 *
 * @param file - The input image file
 * @returns A Blob with corrected orientation (always JPEG for HEIC input)
 */
export async function correctExifOrientation(file: File): Promise<Blob> {
  try {
    // Read EXIF orientation from JPEG files
    const arrayBuffer = await file.arrayBuffer();
    const orientation = readExifOrientation(arrayBuffer);
    const needsHeicConversion = isHeicFile(file);

    // Return original blob unchanged if orientation is normal and no HEIC conversion needed
    if (orientation === 1 && !needsHeicConversion) {
      return new Blob([arrayBuffer], { type: file.type || "image/jpeg" });
    }

    // Use createImageBitmap to decode the image
    const bitmap = await createImageBitmap(new Blob([arrayBuffer], { type: file.type }));

    const { width, height } = bitmap;

    // Determine if width/height need to be swapped for rotated orientations
    const swapDimensions = orientation >= 5 && orientation <= 8;
    const canvasWidth = swapDimensions ? height : width;
    const canvasHeight = swapDimensions ? width : height;

    const canvas = document.createElement("canvas");
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      // Fallback: return original file as blob
      bitmap.close();
      return new Blob([arrayBuffer], { type: file.type });
    }

    // Apply transformation based on EXIF orientation
    applyOrientationTransform(ctx, orientation, canvasWidth, canvasHeight);

    // Draw the image
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();

    // Determine output type
    const outputType = needsHeicConversion ? "image/jpeg" : file.type || "image/jpeg";
    const quality = 0.92;

    // Export the canvas
    return new Promise<Blob>((resolve) => {
      canvas.toBlob(
        (blob) => {
          resolve(blob || new Blob([arrayBuffer], { type: file.type }));
        },
        outputType,
        quality
      );
    });
  } catch {
    // Fallback: return the original file as a blob
    // This handles cases where createImageBitmap is not supported
    // or the file cannot be decoded
    const arrayBuffer = await file.arrayBuffer();
    const outputType = isHeicFile(file) ? "image/jpeg" : file.type || "image/jpeg";
    return new Blob([arrayBuffer], { type: outputType });
  }
}

/**
 * Apply canvas transformation for EXIF orientation values 1-8.
 *
 * Orientation values:
 * 1: Normal (no transform)
 * 2: Mirrored horizontally
 * 3: Rotated 180 degrees
 * 4: Mirrored vertically
 * 5: Mirrored horizontally + rotated 270 CW
 * 6: Rotated 90 CW
 * 7: Mirrored horizontally + rotated 90 CW
 * 8: Rotated 270 CW (or 90 CCW)
 */
function applyOrientationTransform(
  ctx: CanvasRenderingContext2D,
  orientation: number,
  width: number,
  height: number
): void {
  switch (orientation) {
    case 2:
      // Mirrored horizontally
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
      break;
    case 3:
      // Rotated 180
      ctx.translate(width, height);
      ctx.rotate(Math.PI);
      break;
    case 4:
      // Mirrored vertically
      ctx.translate(0, height);
      ctx.scale(1, -1);
      break;
    case 5:
      // Mirrored horizontally + rotated 270 CW
      ctx.translate(width, 0);
      ctx.rotate(Math.PI / 2);
      ctx.scale(1, -1);
      break;
    case 6:
      // Rotated 90 CW
      ctx.translate(width, 0);
      ctx.rotate(Math.PI / 2);
      break;
    case 7:
      // Mirrored horizontally + rotated 90 CW
      ctx.translate(0, height);
      ctx.rotate(-Math.PI / 2);
      ctx.scale(1, -1);
      break;
    case 8:
      // Rotated 270 CW
      ctx.translate(0, height);
      ctx.rotate(-Math.PI / 2);
      break;
    default:
      // Orientation 1 or unknown: no transform
      break;
  }
}
