import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ============================================================
// Mock @mediapipe/tasks-vision
// ============================================================
const mockDetect = vi.fn();
const mockDetectorClose = vi.fn();
const mockCreateFromOptions = vi.fn();
const mockForVisionTasks = vi.fn();

vi.mock("@mediapipe/tasks-vision", () => ({
  FilesetResolver: {
    forVisionTasks: (...args: unknown[]) => mockForVisionTasks(...args),
  },
  FaceDetector: {
    createFromOptions: (...args: unknown[]) => mockCreateFromOptions(...args),
  },
}));

// ============================================================
// Mock canvas and ImageBitmap
// ============================================================
let mockBitmapClose: ReturnType<typeof vi.fn>;
const mockDrawImage = vi.fn();
const mockGetContext = vi.fn();
const mockGetImageData = vi.fn();

function setupDefaultMocks(
  width = 800,
  height = 600,
  pixelBrightness = 128
) {
  mockBitmapClose = vi.fn();
  const mockBitmap = {
    width,
    height,
    close: mockBitmapClose,
  } as unknown as ImageBitmap;
  (globalThis.createImageBitmap as ReturnType<typeof vi.fn>).mockResolvedValue(
    mockBitmap
  );

  // Mock canvas getImageData for brightness analysis
  const pixelCount = 100; // sample size
  const data = new Uint8ClampedArray(pixelCount * 4);
  for (let i = 0; i < pixelCount; i++) {
    data[i * 4] = pixelBrightness; // R
    data[i * 4 + 1] = pixelBrightness; // G
    data[i * 4 + 2] = pixelBrightness; // B
    data[i * 4 + 3] = 255; // A
  }
  mockGetImageData.mockReturnValue({ data, width: 10, height: 10 });

  mockGetContext.mockReturnValue({
    drawImage: mockDrawImage,
    getImageData: mockGetImageData,
  });

  return mockBitmap;
}

/**
 * Helper: create a valid detection result (single face, large area, high confidence).
 */
function createValidDetection(options?: {
  originX?: number;
  originY?: number;
  width?: number;
  height?: number;
  confidence?: number;
  keypoints?: Array<{ x: number; y: number; name: string }>;
}) {
  const {
    originX = 100,
    originY = 50,
    width = 400,
    height = 400,
    confidence = 0.95,
    keypoints = [
      { x: 0.35, y: 0.35, name: "leftEye" },
      { x: 0.65, y: 0.35, name: "rightEye" },
      { x: 0.5, y: 0.55, name: "noseTip" },
      { x: 0.5, y: 0.7, name: "mouthCenter" },
      { x: 0.2, y: 0.4, name: "leftEarTragion" },
      { x: 0.8, y: 0.4, name: "rightEarTragion" },
    ],
  } = options ?? {};
  return {
    boundingBox: {
      originX,
      originY,
      width,
      height,
    },
    categories: [{ score: confidence }],
    keypoints,
  };
}

beforeEach(() => {
  vi.restoreAllMocks();

  globalThis.createImageBitmap = vi.fn();

  setupDefaultMocks();

  // Mock document.createElement for canvas
  const originalCreateElement = document.createElement.bind(document);
  vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
    if (tag === "canvas") {
      const canvas = originalCreateElement("canvas");
      Object.defineProperty(canvas, "getContext", {
        value: mockGetContext,
        writable: true,
      });
      return canvas;
    }
    return originalCreateElement(tag);
  });

  // Default: MediaPipe initializes successfully
  mockForVisionTasks.mockResolvedValue({});
  mockCreateFromOptions.mockResolvedValue({
    detect: mockDetect,
    close: mockDetectorClose,
  });

  // Default: one valid face detected
  mockDetect.mockReturnValue({
    detections: [createValidDetection()],
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  // Reset the module so the singleton detector is cleared between tests
  vi.resetModules();
});

// ============================================================
// Tests
// ============================================================
describe("validatePhoto", () => {
  async function importValidate() {
    return await import("@/lib/photo/validate");
  }

  // ----------------------------------------------------------
  // AC1: Detects a single face and returns valid status
  // ----------------------------------------------------------
  it("detects a single face and returns valid status", async () => {
    // Face occupies >30% of frame: 400*400 / (800*600) = 33.3%
    mockDetect.mockReturnValue({
      detections: [
        createValidDetection({
          originX: 200,
          originY: 100,
          width: 400,
          height: 400,
          confidence: 0.95,
        }),
      ],
    });

    const { validatePhoto } = await importValidate();
    const blob = new Blob(["fake-image"], { type: "image/jpeg" });
    const result = await validatePhoto(blob);

    expect(result.valid).toBe(true);
    expect(result.status).toBe("valid");
    expect(result.message).toBe("Rosto detectado com sucesso!");
  });

  // ----------------------------------------------------------
  // AC4: Returns no_face when no faces detected
  // ----------------------------------------------------------
  it("returns no_face when no faces detected", async () => {
    mockDetect.mockReturnValue({ detections: [] });

    const { validatePhoto } = await importValidate();
    const blob = new Blob(["fake-image"], { type: "image/jpeg" });
    const result = await validatePhoto(blob);

    expect(result.valid).toBe(false);
    expect(result.status).toBe("no_face");
    expect(result.message).toBe(
      "N\u00e3o conseguimos detectar um rosto. Tente novamente."
    );
  });

  // ----------------------------------------------------------
  // AC3: Returns multiple_faces when >1 faces detected
  // ----------------------------------------------------------
  it("returns multiple_faces when more than one face detected", async () => {
    mockDetect.mockReturnValue({
      detections: [
        createValidDetection({ confidence: 0.9 }),
        createValidDetection({
          originX: 500,
          originY: 100,
          width: 200,
          height: 200,
          confidence: 0.85,
        }),
      ],
    });

    const { validatePhoto } = await importValidate();
    const blob = new Blob(["fake-image"], { type: "image/jpeg" });
    const result = await validatePhoto(blob);

    expect(result.valid).toBe(false);
    expect(result.status).toBe("multiple_faces");
    expect(result.message).toBe("Apenas um rosto, por favor.");
  });

  // ----------------------------------------------------------
  // AC6: Returns face_too_small when face area < 30%
  // ----------------------------------------------------------
  it("returns face_too_small when face area < 30%", async () => {
    // Small face: 100*100 / (800*600) = 2.08%
    mockDetect.mockReturnValue({
      detections: [
        createValidDetection({
          originX: 350,
          originY: 250,
          width: 100,
          height: 100,
          confidence: 0.9,
        }),
      ],
    });

    const { validatePhoto } = await importValidate();
    const blob = new Blob(["fake-image"], { type: "image/jpeg" });
    const result = await validatePhoto(blob);

    expect(result.valid).toBe(false);
    expect(result.status).toBe("face_too_small");
    expect(result.message).toBe(
      "Aproxime-se mais da c\u00e2mera para melhor an\u00e1lise."
    );
  });

  // ----------------------------------------------------------
  // AC2: Returns poor_lighting when confidence is low
  // ----------------------------------------------------------
  it("returns poor_lighting when detection confidence is low (between 0.5 and 0.65)", async () => {
    mockDetect.mockReturnValue({
      detections: [
        createValidDetection({
          width: 400,
          height: 400,
          confidence: 0.55,
        }),
      ],
    });

    const { validatePhoto } = await importValidate();
    const blob = new Blob(["fake-image"], { type: "image/jpeg" });
    const result = await validatePhoto(blob);

    expect(result.valid).toBe(false);
    expect(result.status).toBe("poor_lighting");
    expect(result.message).toBe(
      "Tente com mais luz para melhor resultado."
    );
  });

  // ----------------------------------------------------------
  // AC5: Low confidence covers sunglasses scenario (returns poor_lighting)
  // Per dev notes: confidence 0.5-0.65 returns poor_lighting which covers
  // the sunglasses case. Dedicated sunglasses detection deferred to
  // MediaPipe Face Landmarker upgrade post-MVP.
  // ----------------------------------------------------------
  it("returns poor_lighting for marginal confidence (covers sunglasses scenario)", async () => {
    mockDetect.mockReturnValue({
      detections: [
        createValidDetection({
          width: 400,
          height: 400,
          confidence: 0.58,
        }),
      ],
    });

    const { validatePhoto } = await importValidate();
    const blob = new Blob(["fake-image"], { type: "image/jpeg" });
    const result = await validatePhoto(blob);

    expect(result.valid).toBe(false);
    expect(result.status).toBe("poor_lighting");
  });

  // ----------------------------------------------------------
  // Returns correct Portuguese messages for each status
  // ----------------------------------------------------------
  it("returns correct Portuguese messages with diacritical marks for valid", async () => {
    mockDetect.mockReturnValue({
      detections: [createValidDetection({ width: 400, height: 400, confidence: 0.95 })],
    });

    const { validatePhoto } = await importValidate();
    const blob = new Blob(["fake-image"], { type: "image/jpeg" });
    const result = await validatePhoto(blob);

    expect(result.message).toBe("Rosto detectado com sucesso!");
  });

  it("returns correct Portuguese messages for no_face", async () => {
    mockDetect.mockReturnValue({ detections: [] });

    const { validatePhoto } = await importValidate();
    const blob = new Blob(["fake-image"], { type: "image/jpeg" });
    const result = await validatePhoto(blob);

    expect(result.message).toContain("N\u00e3o conseguimos detectar");
  });

  it("returns correct Portuguese messages for face_too_small with diacritics", async () => {
    mockDetect.mockReturnValue({
      detections: [
        createValidDetection({ width: 50, height: 50, confidence: 0.9 }),
      ],
    });

    const { validatePhoto } = await importValidate();
    const blob = new Blob(["fake-image"], { type: "image/jpeg" });
    const result = await validatePhoto(blob);

    // Must contain correct diacritical marks
    expect(result.message).toContain("c\u00e2mera");
    expect(result.message).toContain("an\u00e1lise");
  });

  // ----------------------------------------------------------
  // Handles invalid/corrupt blob input gracefully
  // ----------------------------------------------------------
  it("handles invalid/corrupt blob input gracefully (returns error status)", async () => {
    (
      globalThis.createImageBitmap as ReturnType<typeof vi.fn>
    ).mockRejectedValue(new Error("Could not decode image"));

    const { validatePhoto } = await importValidate();
    const blob = new Blob(["not-an-image"], { type: "text/plain" });
    const result = await validatePhoto(blob);

    expect(result.valid).toBe(false);
    expect(result.status).toBe("error");
    expect(result.message).toContain("Erro");
  });

  // ----------------------------------------------------------
  // Cleans up ImageBitmap after processing
  // ----------------------------------------------------------
  it("cleans up ImageBitmap after processing", async () => {
    mockDetect.mockReturnValue({
      detections: [createValidDetection({ width: 400, height: 400, confidence: 0.95 })],
    });

    const { validatePhoto } = await importValidate();
    const blob = new Blob(["fake-image"], { type: "image/jpeg" });
    await validatePhoto(blob);

    expect(mockBitmapClose).toHaveBeenCalledTimes(1);
  });

  // ----------------------------------------------------------
  // Returns ValidationDetails with face count, area percent, confidence
  // ----------------------------------------------------------
  it("returns ValidationDetails with face count, area percent, and confidence", async () => {
    // Face: 400*400 / (800*600) = 33.33%
    mockDetect.mockReturnValue({
      detections: [
        createValidDetection({
          originX: 200,
          originY: 100,
          width: 400,
          height: 400,
          confidence: 0.92,
        }),
      ],
    });

    const { validatePhoto } = await importValidate();
    const blob = new Blob(["fake-image"], { type: "image/jpeg" });
    const result = await validatePhoto(blob);

    expect(result.details).toBeDefined();
    expect(result.details!.faceCount).toBe(1);
    expect(result.details!.faceAreaPercent).toBeCloseTo(33.33, 0);
    expect(result.details!.confidenceScore).toBeCloseTo(0.92, 2);
  });

  // ----------------------------------------------------------
  // Handles MediaPipe initialization failure gracefully
  // ----------------------------------------------------------
  it("handles MediaPipe initialization failure gracefully", async () => {
    mockForVisionTasks.mockRejectedValue(new Error("CDN unavailable"));

    const { validatePhoto } = await importValidate();
    const blob = new Blob(["fake-image"], { type: "image/jpeg" });
    const result = await validatePhoto(blob);

    expect(result.valid).toBe(false);
    expect(result.status).toBe("error");
    expect(result.message).toContain("Erro");
  });

  // ----------------------------------------------------------
  // Handles detector.detect() failure gracefully
  // ----------------------------------------------------------
  it("handles detector.detect() failure gracefully", async () => {
    mockDetect.mockImplementation(() => {
      throw new Error("Inference failed");
    });

    const { validatePhoto } = await importValidate();
    const blob = new Blob(["fake-image"], { type: "image/jpeg" });
    const result = await validatePhoto(blob);

    expect(result.valid).toBe(false);
    expect(result.status).toBe("error");
  });

  // ----------------------------------------------------------
  // Face at exactly 30% passes validation
  // ----------------------------------------------------------
  it("face at exactly 30% area passes validation", async () => {
    // 800*600 = 480000 total. 30% = 144000. sqrt(144000) ~= 379.47
    // Use 380*379 = 144020 which is ~30.004%
    mockDetect.mockReturnValue({
      detections: [
        createValidDetection({
          originX: 200,
          originY: 100,
          width: 380,
          height: 379,
          confidence: 0.9,
        }),
      ],
    });

    const { validatePhoto } = await importValidate();
    const blob = new Blob(["fake-image"], { type: "image/jpeg" });
    const result = await validatePhoto(blob);

    expect(result.valid).toBe(true);
    expect(result.status).toBe("valid");
  });

  // ----------------------------------------------------------
  // Cleans up ImageBitmap even on error
  // ----------------------------------------------------------
  it("cleans up ImageBitmap even when detection throws", async () => {
    mockDetect.mockImplementation(() => {
      throw new Error("Detection failed");
    });

    const { validatePhoto } = await importValidate();
    const blob = new Blob(["fake-image"], { type: "image/jpeg" });
    await validatePhoto(blob);

    expect(mockBitmapClose).toHaveBeenCalledTimes(1);
  });
});

describe("initFaceDetector", () => {
  it("initializes the detector lazily on first call", async () => {
    // Clear accumulated calls from previous validatePhoto tests
    mockForVisionTasks.mockClear();
    mockCreateFromOptions.mockClear();

    const { initFaceDetector } = await import("@/lib/photo/validate");
    await initFaceDetector();

    expect(mockForVisionTasks).toHaveBeenCalledTimes(1);
    expect(mockCreateFromOptions).toHaveBeenCalledTimes(1);
  });
});

describe("destroyFaceDetector", () => {
  it("cleans up the detector when called", async () => {
    const { initFaceDetector, destroyFaceDetector } = await import(
      "@/lib/photo/validate"
    );
    await initFaceDetector();
    destroyFaceDetector();

    expect(mockDetectorClose).toHaveBeenCalledTimes(1);
  });
});
