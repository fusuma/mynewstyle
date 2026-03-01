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
  destroyFaceDetector: (...args: unknown[]) =>
    mockDestroyFaceDetector(...args),
}));

vi.mock("@/lib/photo/validate-file", () => ({
  validatePhotoFile: vi.fn().mockReturnValue({ valid: true }),
}));

vi.mock("@/lib/photo/exif", () => ({
  correctExifOrientation: vi
    .fn()
    .mockResolvedValue(new Blob(["corrected"], { type: "image/jpeg" })),
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) => {
      const {
        initial,
        animate,
        transition,
        whileTap,
        ...htmlProps
      } = props;
      return <div {...htmlProps}>{children}</div>;
    },
  },
  useReducedMotion: () => false,
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
  // Switch to gallery mode
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

describe("Photo Page Review Integration", () => {
  // ----------------------------------------------------------
  // AC11: After validation success, PhotoReview is rendered
  // ----------------------------------------------------------
  it("renders PhotoReview component after validation success", async () => {
    mockValidatePhoto.mockResolvedValue(createValidValidationResult());

    const { default: PhotoPage } = await import(
      "@/app/consultation/photo/page"
    );
    render(<PhotoPage />);

    await switchToGalleryAndUpload();

    // Should show the PhotoReview component (not the old placeholder)
    await waitFor(() => {
      expect(screen.getByTestId("photo-review")).toBeInTheDocument();
    });

    // Should show primary and secondary buttons
    expect(
      screen.getByRole("button", { name: /Usar esta foto/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Tirar outra/i })
    ).toBeInTheDocument();
  });

  // ----------------------------------------------------------
  // AC12: After validation override, PhotoReview with warning
  // ----------------------------------------------------------
  it("renders PhotoReview with warning badge after validation override", async () => {
    mockValidatePhoto.mockResolvedValue(createInvalidValidationResult());

    const { default: PhotoPage } = await import(
      "@/app/consultation/photo/page"
    );
    render(<PhotoPage />);

    // Upload, fail 3 times, then override
    await switchToGalleryAndUpload();

    await waitFor(() => {
      expect(screen.getByText("Tentar novamente")).toBeInTheDocument();
    });

    // Retry #1
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

    // Retry #3 -- override button should now appear
    fireEvent.click(screen.getByText("Tentar novamente"));
    await uploadInGalleryMode();

    await waitFor(() => {
      expect(screen.getByText("Usar mesmo assim")).toBeInTheDocument();
    });

    // Click override
    fireEvent.click(screen.getByText("Usar mesmo assim"));

    // PhotoReview should render with override warning
    await waitFor(() => {
      expect(screen.getByTestId("photo-review")).toBeInTheDocument();
    });

    expect(
      screen.getByText("Valida\u00e7\u00e3o ignorada")
    ).toBeInTheDocument();
  });

  // ----------------------------------------------------------
  // AC2: Confirm action shows confirmed state
  // ----------------------------------------------------------
  it("shows confirmed state when user clicks Usar esta foto", async () => {
    mockValidatePhoto.mockResolvedValue(createValidValidationResult());

    const { default: PhotoPage } = await import(
      "@/app/consultation/photo/page"
    );
    render(<PhotoPage />);

    await switchToGalleryAndUpload();

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Usar esta foto/i })
      ).toBeInTheDocument();
    });

    // Click confirm
    fireEvent.click(
      screen.getByRole("button", { name: /Usar esta foto/i })
    );

    // Should show confirmed state
    await waitFor(() => {
      expect(screen.getByText("Pronto!")).toBeInTheDocument();
    });

    expect(
      screen.getByText("Foto selecionada com sucesso.")
    ).toBeInTheDocument();
  });

  // ----------------------------------------------------------
  // AC3: Retake action returns to camera/gallery mode
  // ----------------------------------------------------------
  it("returns to capture mode when user clicks Tirar outra", async () => {
    mockValidatePhoto.mockResolvedValue(createValidValidationResult());

    const { default: PhotoPage } = await import(
      "@/app/consultation/photo/page"
    );
    render(<PhotoPage />);

    await switchToGalleryAndUpload();

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Tirar outra/i })
      ).toBeInTheDocument();
    });

    // Click retake
    fireEvent.click(
      screen.getByRole("button", { name: /Tirar outra/i })
    );

    // Should go back to gallery/camera mode
    await waitFor(() => {
      expect(screen.queryByTestId("photo-review")).not.toBeInTheDocument();
    });
  });

  // ----------------------------------------------------------
  // Validation result with details is passed to PhotoReview
  // ----------------------------------------------------------
  it("passes validation result with quality indicator to PhotoReview", async () => {
    const resultWithHighConfidence = createValidValidationResult();
    mockValidatePhoto.mockResolvedValue(resultWithHighConfidence);

    const { default: PhotoPage } = await import(
      "@/app/consultation/photo/page"
    );
    render(<PhotoPage />);

    await switchToGalleryAndUpload();

    // Should show validation badge and quality indicator
    await waitFor(() => {
      expect(screen.getByText("Rosto detectado")).toBeInTheDocument();
    });

    expect(screen.getByText(/Qualidade: Alta/)).toBeInTheDocument();
  });
});
