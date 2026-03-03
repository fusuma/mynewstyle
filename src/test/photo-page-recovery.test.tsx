import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// ============================================================
// Mock dependencies
// ============================================================
const mockCompressPhoto = vi.fn();
const mockValidatePhoto = vi.fn();
const mockDestroyFaceDetector = vi.fn();
const mockUploadPhoto = vi.fn();
const mockSaveSessionData = vi.fn();
const mockLoadSessionData = vi.fn();
const mockClearSessionData = vi.fn();

vi.mock("@/lib/photo/compress", () => ({
  compressPhoto: (...args: unknown[]) => mockCompressPhoto(...args),
}));

vi.mock("@/lib/photo/validate", () => ({
  validatePhoto: (...args: unknown[]) => mockValidatePhoto(...args),
  destroyFaceDetector: (...args: unknown[]) => mockDestroyFaceDetector(...args),
  initFaceDetector: vi.fn(),
}));

vi.mock("@/lib/photo/upload", () => ({
  uploadPhoto: (...args: unknown[]) => mockUploadPhoto(...args),
}));

vi.mock("@/lib/persistence/session-db", () => ({
  saveSessionData: (...args: unknown[]) => mockSaveSessionData(...args),
  loadSessionData: (...args: unknown[]) => mockLoadSessionData(...args),
  clearSessionData: (...args: unknown[]) => mockClearSessionData(...args),
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
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, transition, whileTap, ...htmlProps } = props;
      return <div {...htmlProps}>{children}</div>;
    },
  },
  useReducedMotion: () => false,
}));

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

function createRecoveredSessionData() {
  return {
    photo: new Blob(["recovered-photo-data"], { type: "image/jpeg" }),
    photoPreview: "data:image/jpeg;base64,recovered",
    gender: "male" as const,
    guestSessionId: "recovered-session-id",
    consultationId: "recovered-consultation-id",
    savedAt: Date.now(),
  };
}

async function switchToGalleryAndUpload() {
  // Wait for session recovery check to complete first
  await waitFor(() => {
    expect(screen.getByText("Prefiro enviar uma foto da galeria")).toBeInTheDocument();
  });

  fireEvent.click(screen.getByText("Prefiro enviar uma foto da galeria"));

  await waitFor(() => {
    expect(screen.getByText("Escolher foto da galeria")).toBeInTheDocument();
  });

  await uploadInGalleryMode();
}

async function uploadInGalleryMode() {
  await waitFor(() => {
    expect(screen.getByText("Escolher foto da galeria")).toBeInTheDocument();
  });

  // Ensure consent is checked (idempotent: only click if not already checked)
  const checkbox = screen.getByLabelText(/Consinto o processamento da minha foto para analise de visagismo/) as HTMLInputElement;
  if (!checkbox.checked) {
    fireEvent.click(checkbox);
  }

  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  const file = new File([new Uint8Array(1024)], "photo.jpg", {
    type: "image/jpeg",
  });
  fireEvent.change(input, { target: { files: [file] } });
}

async function navigateToReviewScreen() {
  await switchToGalleryAndUpload();

  await waitFor(() => {
    expect(screen.getByTestId("photo-review")).toBeInTheDocument();
  });

  expect(screen.getByRole("button", { name: /Usar esta foto/i })).toBeInTheDocument();
}

// ============================================================
// Setup
// ============================================================
beforeEach(() => {
  vi.clearAllMocks();

  // Default: no recovered session
  mockLoadSessionData.mockResolvedValue(null);
  mockSaveSessionData.mockResolvedValue(undefined);
  mockClearSessionData.mockResolvedValue(undefined);

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

  // Default: upload succeeds
  mockUploadPhoto.mockResolvedValue({
    success: true,
    signedUrl: "https://storage.supabase.co/signed/test",
    storagePath: "session-id/consult-id/original.jpg",
  });

  // Mock navigator
  const mockGetUserMedia = vi.fn();
  const mockEnumerateDevices = vi.fn().mockResolvedValue([]);

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

  Object.defineProperty(HTMLVideoElement.prototype, "play", {
    value: vi.fn().mockResolvedValue(undefined),
    writable: true,
    configurable: true,
  });

  Object.defineProperty(navigator, "userAgent", {
    value:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36",
    writable: true,
    configurable: true,
  });

  globalThis.URL.createObjectURL = vi.fn().mockReturnValue("blob:test-url");
  globalThis.URL.revokeObjectURL = vi.fn();

  // Mock localStorage for guest session ID
  const localStorageMock = {
    getItem: vi.fn().mockReturnValue(null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(),
  };
  Object.defineProperty(window, "localStorage", {
    value: localStorageMock,
    writable: true,
    configurable: true,
  });

  // Mock crypto.randomUUID
  Object.defineProperty(globalThis, "crypto", {
    value: {
      randomUUID: vi.fn().mockReturnValue("mock-uuid-12345"),
      getRandomValues: vi.fn(),
    },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ============================================================
// Tests
// ============================================================
describe("Photo Page Recovery Integration", () => {
  // ----------------------------------------------------------
  // 1. On mount with no saved session, shows normal capture flow
  // ----------------------------------------------------------
  it("on mount with no saved session, shows normal capture flow", async () => {
    mockLoadSessionData.mockResolvedValue(null);

    const { default: PhotoPage } = await import("@/app/consultation/photo/page");
    render(<PhotoPage />);

    // Wait for recovery check to complete
    await waitFor(() => {
      expect(mockLoadSessionData).toHaveBeenCalledTimes(1);
    });

    // Should show normal camera capture (no recovery banner)
    expect(screen.queryByText("Encontramos a sua foto anterior")).not.toBeInTheDocument();
  });

  // ----------------------------------------------------------
  // 2. On mount with saved session, shows PhotoReview with recovered photo
  // ----------------------------------------------------------
  it("on mount with saved session, shows PhotoReview with recovered photo", async () => {
    const recoveredData = createRecoveredSessionData();
    mockLoadSessionData.mockResolvedValue(recoveredData);

    const { default: PhotoPage } = await import("@/app/consultation/photo/page");
    render(<PhotoPage />);

    // Should show recovery banner
    await waitFor(() => {
      expect(screen.getByText("Encontramos a sua foto anterior")).toBeInTheDocument();
    });

    expect(screen.getByText("Deseja continuar com esta foto?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Continuar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tirar outra foto/i })).toBeInTheDocument();
  });

  // ----------------------------------------------------------
  // 3. On mount with expired session, shows normal capture flow
  // ----------------------------------------------------------
  it("on mount with expired session, shows normal capture flow", async () => {
    // loadSessionData returns null for expired data
    mockLoadSessionData.mockResolvedValue(null);

    const { default: PhotoPage } = await import("@/app/consultation/photo/page");
    render(<PhotoPage />);

    await waitFor(() => {
      expect(mockLoadSessionData).toHaveBeenCalledTimes(1);
    });

    expect(screen.queryByText("Encontramos a sua foto anterior")).not.toBeInTheDocument();
  });

  // ----------------------------------------------------------
  // 4. Recovery "Continuar" triggers the photo review flow
  // ----------------------------------------------------------
  it('recovery "Continuar" shows PhotoReview with recovered photo', async () => {
    const recoveredData = createRecoveredSessionData();
    mockLoadSessionData.mockResolvedValue(recoveredData);

    const { default: PhotoPage } = await import("@/app/consultation/photo/page");
    render(<PhotoPage />);

    await waitFor(() => {
      expect(screen.getByText("Encontramos a sua foto anterior")).toBeInTheDocument();
    });

    // Click "Continuar"
    fireEvent.click(screen.getByRole("button", { name: /Continuar/i }));

    // Should show PhotoReview with the recovered photo
    await waitFor(() => {
      expect(screen.getByTestId("photo-review")).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /Usar esta foto/i })).toBeInTheDocument();
  });

  // ----------------------------------------------------------
  // 5. Recovery "Tirar outra foto" clears session and shows capture
  // ----------------------------------------------------------
  it('recovery "Tirar outra foto" clears session and shows capture', async () => {
    const recoveredData = createRecoveredSessionData();
    mockLoadSessionData.mockResolvedValue(recoveredData);

    const { default: PhotoPage } = await import("@/app/consultation/photo/page");
    render(<PhotoPage />);

    await waitFor(() => {
      expect(screen.getByText("Encontramos a sua foto anterior")).toBeInTheDocument();
    });

    // Click "Tirar outra foto"
    fireEvent.click(screen.getByRole("button", { name: /Tirar outra foto/i }));

    // Should clear IndexedDB
    await waitFor(() => {
      expect(mockClearSessionData).toHaveBeenCalledTimes(1);
    });

    // Should show normal capture flow (no recovery banner)
    expect(screen.queryByText("Encontramos a sua foto anterior")).not.toBeInTheDocument();
  });

  // ----------------------------------------------------------
  // 6. Photo confirm saves to IndexedDB before/during upload
  // ----------------------------------------------------------
  it("photo confirm saves to IndexedDB before/during upload", async () => {
    mockLoadSessionData.mockResolvedValue(null);

    const { default: PhotoPage } = await import("@/app/consultation/photo/page");
    render(<PhotoPage />);

    await navigateToReviewScreen();

    // Click "Usar esta foto" to confirm
    fireEvent.click(screen.getByRole("button", { name: /Usar esta foto/i }));

    // saveSessionData should have been called
    await waitFor(() => {
      expect(mockSaveSessionData).toHaveBeenCalledTimes(1);
    });

    // Should include photo blob and metadata
    const savedData = mockSaveSessionData.mock.calls[0][0];
    expect(savedData.photo).toBeInstanceOf(Blob);
    expect(savedData.guestSessionId).toBeTruthy();
    expect(savedData.consultationId).toBeTruthy();
    expect(savedData.savedAt).toBeGreaterThan(0);
  });

  // ----------------------------------------------------------
  // 7. Successful upload clears IndexedDB
  // ----------------------------------------------------------
  it("successful upload clears IndexedDB", async () => {
    mockLoadSessionData.mockResolvedValue(null);
    mockUploadPhoto.mockResolvedValue({
      success: true,
      signedUrl: "https://storage.supabase.co/signed/test",
      storagePath: "session/consult/original.jpg",
    });

    const { default: PhotoPage } = await import("@/app/consultation/photo/page");
    render(<PhotoPage />);

    await navigateToReviewScreen();

    // Click confirm to trigger upload
    fireEvent.click(screen.getByRole("button", { name: /Usar esta foto/i }));

    // After successful upload, clearSessionData should be called
    await waitFor(() => {
      expect(screen.getByText("Pronto!")).toBeInTheDocument();
    });

    expect(mockClearSessionData).toHaveBeenCalled();
  });

  // ----------------------------------------------------------
  // 8. IndexedDB failure on mount does not crash page
  // ----------------------------------------------------------
  it("IndexedDB failure on mount does not crash page", async () => {
    mockLoadSessionData.mockRejectedValue(new Error("IndexedDB unavailable"));

    const { default: PhotoPage } = await import("@/app/consultation/photo/page");

    // Should not throw
    render(<PhotoPage />);

    // Page should still render (camera capture)
    await waitFor(() => {
      expect(mockLoadSessionData).toHaveBeenCalledTimes(1);
    });

    // No crash, no error banner
    expect(screen.queryByText("Encontramos a sua foto anterior")).not.toBeInTheDocument();
  });

  // ----------------------------------------------------------
  // 9. IndexedDB failure on save does not block upload
  // ----------------------------------------------------------
  it("IndexedDB failure on save does not block upload", async () => {
    mockLoadSessionData.mockResolvedValue(null);
    mockSaveSessionData.mockRejectedValue(new Error("IndexedDB write failed"));

    const { default: PhotoPage } = await import("@/app/consultation/photo/page");
    render(<PhotoPage />);

    await navigateToReviewScreen();

    // Click confirm -- save fails but upload should still proceed
    fireEvent.click(screen.getByRole("button", { name: /Usar esta foto/i }));

    // Upload should still complete successfully
    await waitFor(() => {
      expect(screen.getByText("Pronto!")).toBeInTheDocument();
    });

    expect(mockUploadPhoto).toHaveBeenCalledTimes(1);
  });

  // ----------------------------------------------------------
  // 10. All recovery text in Portuguese
  // ----------------------------------------------------------
  it("all recovery text in Portuguese", async () => {
    const recoveredData = createRecoveredSessionData();
    mockLoadSessionData.mockResolvedValue(recoveredData);

    const { default: PhotoPage } = await import("@/app/consultation/photo/page");
    render(<PhotoPage />);

    await waitFor(() => {
      expect(screen.getByText("Encontramos a sua foto anterior")).toBeInTheDocument();
    });

    expect(screen.getByText("Deseja continuar com esta foto?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Continuar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tirar outra foto/i })).toBeInTheDocument();
  });
});
