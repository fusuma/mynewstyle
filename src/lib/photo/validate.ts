/**
 * Client-side photo validation utility using MediaPipe Face Detection.
 *
 * Validates photos for face presence, size, quality, and obstructions
 * before proceeding with AI analysis. Uses the MediaPipe Tasks Vision API
 * with WASM loaded from CDN to keep bundle size small.
 *
 * Dependencies:
 * - @mediapipe/tasks-vision (v0.10.x) loaded from CDN at runtime
 * - createImageBitmap (Chrome 50+, Firefox 42+, Safari 15+, Edge 79+)
 * - Canvas API for image processing
 */

import {
  FilesetResolver,
  FaceDetector,
  type Detection,
} from "@mediapipe/tasks-vision";

// ============================================================
// Types
// ============================================================

/**
 * Validation status codes for photo validation results.
 */
export type ValidationStatus =
  | "valid"
  | "no_face"
  | "multiple_faces"
  | "face_too_small"
  | "poor_lighting"
  | "sunglasses"
  | "error";

/**
 * Details about a detected face (bounding box, keypoints, confidence).
 */
export interface DetectedFace {
  boundingBox: { x: number; y: number; width: number; height: number };
  keypoints: FaceKeypoint[];
  confidence: number;
}

/**
 * A facial keypoint with normalized coordinates and name.
 */
export interface FaceKeypoint {
  x: number;
  y: number;
  name: string;
}

/**
 * Additional details from the validation analysis.
 */
export interface ValidationDetails {
  faceCount: number;
  faceAreaPercent: number;
  confidenceScore: number;
}

/**
 * Result of photo validation.
 */
export interface PhotoValidationResult {
  valid: boolean;
  status: ValidationStatus;
  faces: DetectedFace[];
  message: string;
  details?: ValidationDetails;
}

// ============================================================
// Portuguese messages (pt-BR) with correct diacritical marks
// ============================================================

const MESSAGES: Record<ValidationStatus, string> = {
  valid: "Rosto detectado com sucesso!",
  no_face: "N\u00e3o conseguimos detectar um rosto. Tente novamente.",
  multiple_faces: "Apenas um rosto, por favor.",
  face_too_small:
    "Aproxime-se mais da c\u00e2mera para melhor an\u00e1lise.",
  poor_lighting: "Tente com mais luz para melhor resultado.",
  sunglasses:
    "Remova os \u00f3culos de sol para melhor an\u00e1lise.",
  error: "Erro ao verificar a foto. Tente novamente.",
};

// ============================================================
// Validation thresholds
// ============================================================

/** Minimum face area as percentage of total image area */
const MIN_FACE_AREA_PERCENT = 30;

/** Confidence below this indicates poor lighting or obstructions */
const LOW_CONFIDENCE_THRESHOLD = 0.65;

/** MediaPipe minimum detection confidence */
const MIN_DETECTION_CONFIDENCE = 0.5;

// ============================================================
// CDN paths for MediaPipe WASM and model
// ============================================================

const MEDIAPIPE_WASM_CDN =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm";

const FACE_DETECTOR_MODEL =
  "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite";

// ============================================================
// Singleton face detector
// ============================================================

let detector: FaceDetector | null = null;

/**
 * Lazily initialize the MediaPipe Face Detector (singleton).
 * The detector is reused across multiple validations in the same session.
 *
 * @returns Promise resolving to the initialized FaceDetector
 * @throws Error if WASM or model loading fails
 */
export async function initFaceDetector(): Promise<FaceDetector> {
  if (detector) return detector;

  const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_CDN);
  detector = await FaceDetector.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: FACE_DETECTOR_MODEL,
      delegate: "GPU",
    },
    runningMode: "IMAGE",
    minDetectionConfidence: MIN_DETECTION_CONFIDENCE,
  });
  return detector;
}

/**
 * Destroy the singleton face detector to free memory.
 * Call when leaving the photo page.
 */
export function destroyFaceDetector(): void {
  if (detector) {
    detector.close();
    detector = null;
  }
}

// ============================================================
// Main validation function
// ============================================================

/**
 * Validate a photo blob for face detection, size, lighting, and obstructions.
 *
 * Flow:
 * 1. Decode blob to ImageBitmap
 * 2. Draw to canvas for MediaPipe input
 * 3. Run face detection
 * 4. Analyze results (face count, area, confidence)
 * 5. Return PhotoValidationResult
 *
 * @param blob - The compressed photo blob to validate
 * @returns Promise resolving to PhotoValidationResult
 */
export async function validatePhoto(
  blob: Blob
): Promise<PhotoValidationResult> {
  let bitmap: ImageBitmap | null = null;

  try {
    // Step 1: Decode image
    try {
      bitmap = await createImageBitmap(blob);
    } catch {
      return makeResult("error", []);
    }

    const imageWidth = bitmap.width;
    const imageHeight = bitmap.height;

    // Step 2: Create canvas and draw image
    const canvas = document.createElement("canvas");
    canvas.width = imageWidth;
    canvas.height = imageHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return makeResult("error", []);
    }
    ctx.drawImage(bitmap, 0, 0, imageWidth, imageHeight);

    // Step 3: Initialize detector and run detection
    let faceDetector: FaceDetector;
    try {
      faceDetector = await initFaceDetector();
    } catch {
      return makeResult("error", []);
    }

    let detectionResult;
    try {
      detectionResult = faceDetector.detect(canvas);
    } catch {
      return makeResult("error", []);
    }

    const detections = detectionResult.detections ?? [];

    // Step 4: Convert detections to our format
    const faces: DetectedFace[] = detections.map((d: Detection) => ({
      boundingBox: {
        x: d.boundingBox?.originX ?? 0,
        y: d.boundingBox?.originY ?? 0,
        width: d.boundingBox?.width ?? 0,
        height: d.boundingBox?.height ?? 0,
      },
      keypoints: (d.keypoints ?? []).map((kp) => ({
        x: kp.x,
        y: kp.y,
        name: kp.label ?? "",
      })),
      confidence: d.categories?.[0]?.score ?? 0,
    }));

    // Step 5: Analyze results
    const faceCount = faces.length;

    // No face detected
    if (faceCount === 0) {
      return makeResult("no_face", faces, {
        faceCount: 0,
        faceAreaPercent: 0,
        confidenceScore: 0,
      });
    }

    // Multiple faces detected
    if (faceCount > 1) {
      const bestFace = faces.reduce((best, f) =>
        f.confidence > best.confidence ? f : best
      );
      return makeResult("multiple_faces", faces, {
        faceCount,
        faceAreaPercent: calculateFaceAreaPercent(
          bestFace,
          imageWidth,
          imageHeight
        ),
        confidenceScore: bestFace.confidence,
      });
    }

    // Single face detected -- analyze quality
    const face = faces[0];
    const faceAreaPercent = calculateFaceAreaPercent(
      face,
      imageWidth,
      imageHeight
    );
    const confidence = face.confidence;

    const details: ValidationDetails = {
      faceCount: 1,
      faceAreaPercent,
      confidenceScore: confidence,
    };

    // Check face area
    if (faceAreaPercent < MIN_FACE_AREA_PERCENT) {
      return makeResult("face_too_small", faces, details);
    }

    // Check confidence -- low confidence indicates poor lighting or obstructions (incl. sunglasses)
    if (confidence < LOW_CONFIDENCE_THRESHOLD) {
      return makeResult("poor_lighting", faces, details);
    }

    // All checks passed
    return makeResult("valid", faces, details);
  } finally {
    // Always clean up bitmap memory
    if (bitmap) {
      bitmap.close();
    }
  }
}

// ============================================================
// Helpers
// ============================================================

/**
 * Calculate the face area as a percentage of the total image area.
 */
function calculateFaceAreaPercent(
  face: DetectedFace,
  imageWidth: number,
  imageHeight: number
): number {
  const faceArea = face.boundingBox.width * face.boundingBox.height;
  const imageArea = imageWidth * imageHeight;
  return (faceArea / imageArea) * 100;
}

/**
 * Create a PhotoValidationResult with the given status.
 */
function makeResult(
  status: ValidationStatus,
  faces: DetectedFace[],
  details?: ValidationDetails
): PhotoValidationResult {
  return {
    valid: status === "valid",
    status,
    faces,
    message: MESSAGES[status],
    details,
  };
}
