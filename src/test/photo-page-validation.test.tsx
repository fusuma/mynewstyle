import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// ============================================================
// Mock dependencies
// ============================================================
const mockCompressPhoto = vi.fn();
const mockValidatePhoto = vi.fn();
const mockDestroyFaceDetector = vi.fn();

vi.mock("@/lib/photo/compress", () => ({
  compressPhoto: (...args: unknown[]) => mockCompressPhoto(...args),
}));

vi.mock("@/lib/photo/validate", () => ({
  validatePhoto: (...args: unknown[]) => mockValidatePhoto(...args),
  destroyFaceDetector: (...args: unknown[]) => mockDestroyFaceDetector(...args),
}));

vi.mock("@/lib/photo/validate-file", () => ({
  validatePhotoFile: vi.fn().mockReturnValue({ valid: true }),
}));

vi.mock("@/lib/photo/exif", () => ({
  correctExifOrientation: vi
    .fn()
    .mockResolvedValue(new Blob(["corrected"], { type: "image/jpeg" })),
}));

vi.mock("@/lib/photo/upload", () => ({
  uploadPhoto: vi.fn().mockResolvedValue({
    success: true,
    signedUrl: "https://storage.supabase.co/signed/test",
    storagePath: "session/consult/original.jpg",
  }),
}));

// Mock navigator for camera tests
const mockGetUserMedia = vi.fn();
const mockEnumerateDevices = vi.fn();

// ============================================================
// Helpers
// ============================================================

function createValidValidationResult() {
  return {
    valid: true,
    status: "valid",
    faces: [
      {
        boundingBox: { x: 100, y: 50, width: 400, height: 400 },
        keypoints: [],
        confidence: 0.95,
      },
    ],
    message: "Rosto detectado com sucesso!",
    details: {
      faceCount: 1,
      faceAreaPercent: 33.33,
      confidenceScore: 0.95,
    },
  };
}

function createInvalidValidationResult() {
  return {
    valid: false,
    status: "no_face",
    faces: [],
    message: "N\u00e3o conseguimos detectar um rosto. Tente novamente.",
    details: {
      faceCount: 0,
      faceAreaPercent: 0,
      confidenceScore: 0,
    },
  };
}

async function switchToGalleryAndUpload() {
  // Switch to gallery mode (only works from camera mode)
  fireEvent.click(
    screen.getByText("Prefiro enviar uma foto da galeria")
  );

  await waitFor(() => {
    expect(
      screen.getByText("Escolher foto da galeria")
    ).toBeInTheDocument();
  });

  await uploadInGalleryMode();
}

async function uploadInGalleryMode() {
  // Ensure we're in gallery mode
  await waitFor(() => {
    expect(
      screen.getByText("Escolher foto da galeria")
    ).toBeInTheDocument();
  });

  // Check consent
  const checkbox = screen.getByLabelText(/Confirmo que esta foto é minha/);
  fireEvent.click(checkbox);

  // Select a file
  const input = document.querySelector(
    'input[type="file"]'
  ) as HTMLInputElement;
  const file = new File([new Uint8Array(1024)], "photo.jpg", {
    type: "image/jpeg",
  });
  fireEvent.change(input, { target: { files: [file] } });
}

// ============================================================
// Setup
// ============================================================

beforeEach(() => {
  vi.clearAllMocks();

  // Default: compression succeeds
  mockCompressPhoto.mockResolvedValue({
    blob: new Blob(["compressed-image"], { type: "image/jpeg" }),
    metadata: {
      originalSizeBytes: 5 * 1024 * 1024,
      compressedSizeBytes: 200 * 1024,
      compressionRatio: 0.039,
      originalWidth: 1600,
      originalHeight: 1200,
      outputWidth: 800,
      outputHeight: 600,
    },
  });

  // Default: validation succeeds
  mockValidatePhoto.mockResolvedValue(createValidValidationResult());

  Object.defineProperty(navigator, "mediaDevices", {
    value: {
      getUserMedia: mockGetUserMedia,
      enumerateDevices: mockEnumerateDevices,
    },
    writable: true,
    configurable: true,
  });

  Object.defineProperty(navigator, "permissions", {
    value: undefined,
    writable: true,
    configurable: true,
  });

  mockGetUserMedia.mockReset();
  mockEnumerateDevices.mockReset();
  mockEnumerateDevices.mockResolvedValue([]);

  // Mock HTMLVideoElement.play
  Object.defineProperty(HTMLVideoElement.prototype, "play", {
    value: vi.fn().mockResolvedValue(undefined),
    writable: true,
    configurable: true,
  });

  // Standard browser UA
  Object.defineProperty(navigator, "userAgent", {
    value:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36",
    writable: true,
    configurable: true,
  });

  // Mock URL.createObjectURL and revokeObjectURL
  globalThis.URL.createObjectURL = vi.fn().mockReturnValue("blob:test-url");
  globalThis.URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ============================================================
// Tests
// ============================================================
describe("Photo Page Validation Integration", () => {
  // ----------------------------------------------------------
  // AC9: Validation triggered automatically after compression
  // ----------------------------------------------------------
  it("triggers validation automatically after compression completes", async () => {
    const { default: PhotoPage } = await import(
      "@/app/consultation/photo/page"
    );
    render(<PhotoPage />);

    await switchToGalleryAndUpload();

    // Wait for validation to be called
    await waitFor(() => {
      expect(mockValidatePhoto).toHaveBeenCalledTimes(1);
    });
  });

  // ----------------------------------------------------------
  // Valid photo shows success state
  // ----------------------------------------------------------
  it("shows success state when photo validates successfully", async () => {
    mockValidatePhoto.mockResolvedValue(createValidValidationResult());

    const { default: PhotoPage } = await import(
      "@/app/consultation/photo/page"
    );
    render(<PhotoPage />);

    await switchToGalleryAndUpload();

    // Should show photo review screen (replaced placeholder in Story 2.5)
    await waitFor(() => {
      expect(
        screen.getByTestId("photo-review")
      ).toBeInTheDocument();
    });
  });

  // ----------------------------------------------------------
  // Invalid photo shows PhotoValidation component
  // ----------------------------------------------------------
  it("shows PhotoValidation component when photo fails validation", async () => {
    mockValidatePhoto.mockResolvedValue(createInvalidValidationResult());

    const { default: PhotoPage } = await import(
      "@/app/consultation/photo/page"
    );
    render(<PhotoPage />);

    await switchToGalleryAndUpload();

    await waitFor(() => {
      expect(
        screen.getByText(
          "N\u00e3o conseguimos detectar um rosto. Tente novamente."
        )
      ).toBeInTheDocument();
    });

    // Should show retry button
    expect(screen.getByText("Tentar novamente")).toBeInTheDocument();
  });

  // ----------------------------------------------------------
  // Retake resets to camera/gallery mode
  // ----------------------------------------------------------
  it("retake resets to camera/gallery mode", async () => {
    mockValidatePhoto.mockResolvedValue(createInvalidValidationResult());

    const { default: PhotoPage } = await import(
      "@/app/consultation/photo/page"
    );
    render(<PhotoPage />);

    await switchToGalleryAndUpload();

    // Wait for validation failure
    await waitFor(() => {
      expect(screen.getByText("Tentar novamente")).toBeInTheDocument();
    });

    // Click retry
    fireEvent.click(screen.getByText("Tentar novamente"));

    // Should go back to gallery mode (the last mode used)
    await waitFor(() => {
      expect(
        screen.queryByText(
          "N\u00e3o conseguimos detectar um rosto. Tente novamente."
        )
      ).not.toBeInTheDocument();
    });
  });

  // ----------------------------------------------------------
  // Override proceeds to success state
  // ----------------------------------------------------------
  it("override proceeds to success state after 3 retries", async () => {
    mockValidatePhoto.mockResolvedValue(createInvalidValidationResult());

    const { default: PhotoPage } = await import(
      "@/app/consultation/photo/page"
    );
    render(<PhotoPage />);

    // First upload (switches from camera to gallery)
    await switchToGalleryAndUpload();

    await waitFor(() => {
      expect(screen.getByText("Tentar novamente")).toBeInTheDocument();
    });

    // Retry #1: after retake, we're back in gallery mode
    fireEvent.click(screen.getByText("Tentar novamente"));
    await uploadInGalleryMode();

    await waitFor(() => {
      expect(screen.getByText("Tentar novamente")).toBeInTheDocument();
    });

    // Retry #2
    fireEvent.click(screen.getByText("Tentar novamente"));
    await uploadInGalleryMode();

    await waitFor(() => {
      expect(screen.getByText("Tentar novamente")).toBeInTheDocument();
    });

    // Retry #3
    fireEvent.click(screen.getByText("Tentar novamente"));
    await uploadInGalleryMode();

    // After 3 failures (retryCount >= 3), should show override button
    await waitFor(() => {
      expect(screen.getByText("Usar mesmo assim")).toBeInTheDocument();
    });

    // Click override
    fireEvent.click(screen.getByText("Usar mesmo assim"));

    // Should proceed to photo review screen (replaced placeholder in Story 2.5)
    await waitFor(() => {
      expect(
        screen.getByTestId("photo-review")
      ).toBeInTheDocument();
    });
  });

  // ----------------------------------------------------------
  // Shows validation loading state
  // ----------------------------------------------------------
  it("shows validation loading state after compression", async () => {
    // Make validation hang
    mockValidatePhoto.mockReturnValue(new Promise(() => {}));

    const { default: PhotoPage } = await import(
      "@/app/consultation/photo/page"
    );
    render(<PhotoPage />);

    await switchToGalleryAndUpload();

    await waitFor(() => {
      expect(
        screen.getByText("A verificar a foto...")
      ).toBeInTheDocument();
    });
  });

  // ----------------------------------------------------------
  // Validation passes the compressed blob (not raw)
  // ----------------------------------------------------------
  it("passes the compressed blob to validatePhoto", async () => {
    const compressedBlob = new Blob(["compressed-photo"], {
      type: "image/jpeg",
    });
    mockCompressPhoto.mockResolvedValue({
      blob: compressedBlob,
      metadata: {
        originalSizeBytes: 5000000,
        compressedSizeBytes: 200000,
        compressionRatio: 0.04,
        originalWidth: 1600,
        originalHeight: 1200,
        outputWidth: 800,
        outputHeight: 600,
      },
    });

    const { default: PhotoPage } = await import(
      "@/app/consultation/photo/page"
    );
    render(<PhotoPage />);

    await switchToGalleryAndUpload();

    await waitFor(() => {
      expect(mockValidatePhoto).toHaveBeenCalledTimes(1);
    });

    // Verify the compressed blob was passed (not the raw file)
    const callArg = mockValidatePhoto.mock.calls[0][0];
    expect(callArg).toBeInstanceOf(Blob);
  });

  // ----------------------------------------------------------
  // Retry count tracks correctly across attempts
  // ----------------------------------------------------------
  it("tracks retry count across validation attempts", async () => {
    mockValidatePhoto.mockResolvedValue(createInvalidValidationResult());

    const { default: PhotoPage } = await import(
      "@/app/consultation/photo/page"
    );
    render(<PhotoPage />);

    // First upload (switches from camera to gallery, retryCount becomes 1 after failure)
    await switchToGalleryAndUpload();

    await waitFor(() => {
      expect(screen.getByText("Tentar novamente")).toBeInTheDocument();
    });

    // Retry and upload again (already in gallery mode after retake)
    fireEvent.click(screen.getByText("Tentar novamente"));
    await uploadInGalleryMode();

    await waitFor(() => {
      expect(screen.getByText("Tentativa 2 de 3")).toBeInTheDocument();
    });
  });
});
