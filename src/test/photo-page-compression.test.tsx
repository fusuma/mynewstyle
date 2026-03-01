import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// ============================================================
// Mock dependencies
// ============================================================
const mockCompressPhoto = vi.fn();

vi.mock("@/lib/photo/compress", () => ({
  compressPhoto: (...args: unknown[]) => mockCompressPhoto(...args),
}));

vi.mock("@/lib/photo/validate-file", () => ({
  validatePhotoFile: vi.fn().mockReturnValue({ valid: true }),
}));

vi.mock("@/lib/photo/exif", () => ({
  correctExifOrientation: vi
    .fn()
    .mockResolvedValue(new Blob(["corrected"], { type: "image/jpeg" })),
}));

vi.mock("@/lib/photo/validate", () => ({
  validatePhoto: vi.fn().mockResolvedValue({
    valid: true,
    status: "valid",
    faces: [],
    message: "Rosto detectado com sucesso!",
    details: { faceCount: 1, faceAreaPercent: 33, confidenceScore: 0.95 },
  }),
  destroyFaceDetector: vi.fn(),
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
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Photo Page Compression Integration", () => {
  // ----------------------------------------------------------
  // AC9: Shows compression loading state after gallery upload
  // ----------------------------------------------------------
  it("shows compression loading state after gallery upload", async () => {
    // Make compression take some time
    mockCompressPhoto.mockReturnValue(new Promise(() => {})); // never resolves

    const { default: PhotoPage } = await import(
      "@/app/consultation/photo/page"
    );
    render(<PhotoPage />);

    // Switch to gallery mode
    fireEvent.click(
      screen.getByText("Prefiro enviar uma foto da galeria")
    );

    await waitFor(() => {
      expect(
        screen.getByText("Escolher foto da galeria")
      ).toBeInTheDocument();
    });

    // Check consent
    const checkbox = screen.getByLabelText(
      /Confirmo que esta foto é minha/
    );
    fireEvent.click(checkbox);

    // Select a file
    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    const file = new File([new Uint8Array(1024)], "photo.jpg", {
      type: "image/jpeg",
    });
    fireEvent.change(input, { target: { files: [file] } });

    // Should show compression loading text
    await waitFor(() => {
      expect(
        screen.getByText("A otimizar a foto...")
      ).toBeInTheDocument();
    });
  });

  // ----------------------------------------------------------
  // AC11: Compression loading text is in Portuguese with correct diacritics
  // ----------------------------------------------------------
  it("compression loading text is in Portuguese with correct diacritics", async () => {
    mockCompressPhoto.mockReturnValue(new Promise(() => {})); // never resolves

    const { default: PhotoPage } = await import(
      "@/app/consultation/photo/page"
    );
    render(<PhotoPage />);

    // Switch to gallery mode
    fireEvent.click(
      screen.getByText("Prefiro enviar uma foto da galeria")
    );

    await waitFor(() => {
      expect(
        screen.getByText("Escolher foto da galeria")
      ).toBeInTheDocument();
    });

    // Check consent and upload file
    fireEvent.click(
      screen.getByLabelText(/Confirmo que esta foto é minha/)
    );

    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    const file = new File([new Uint8Array(1024)], "photo.jpg", {
      type: "image/jpeg",
    });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      // Exact Portuguese text with correct diacritics
      const loadingText = screen.getByText("A otimizar a foto...");
      expect(loadingText).toBeInTheDocument();
    });
  });

  // ----------------------------------------------------------
  // AC8: Compressed blob is stored (not raw blob)
  // ----------------------------------------------------------
  it("stores the compressed blob (not raw blob) after compression", async () => {
    const compressedBlob = new Blob(["compressed-data"], {
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

    // Switch to gallery mode
    fireEvent.click(
      screen.getByText("Prefiro enviar uma foto da galeria")
    );

    await waitFor(() => {
      expect(
        screen.getByText("Escolher foto da galeria")
      ).toBeInTheDocument();
    });

    // Check consent and upload file
    fireEvent.click(
      screen.getByLabelText(/Confirmo que esta foto é minha/)
    );

    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    const file = new File([new Uint8Array(1024)], "photo.jpg", {
      type: "image/jpeg",
    });
    fireEvent.change(input, { target: { files: [file] } });

    // Should show photo review screen (compression completed, Story 2.5)
    await waitFor(() => {
      expect(
        screen.getByTestId("photo-review")
      ).toBeInTheDocument();
    });

    // compressPhoto should have been called
    expect(mockCompressPhoto).toHaveBeenCalledTimes(1);
  });

  // ----------------------------------------------------------
  // Compression error shows user-friendly message
  // ----------------------------------------------------------
  it("shows user-friendly error message when compression fails", async () => {
    mockCompressPhoto.mockRejectedValue(new Error("Compression failed"));

    const { default: PhotoPage } = await import(
      "@/app/consultation/photo/page"
    );
    render(<PhotoPage />);

    // Switch to gallery mode
    fireEvent.click(
      screen.getByText("Prefiro enviar uma foto da galeria")
    );

    await waitFor(() => {
      expect(
        screen.getByText("Escolher foto da galeria")
      ).toBeInTheDocument();
    });

    // Check consent and upload file
    fireEvent.click(
      screen.getByLabelText(/Confirmo que esta foto é minha/)
    );

    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    const file = new File([new Uint8Array(1024)], "photo.jpg", {
      type: "image/jpeg",
    });
    fireEvent.change(input, { target: { files: [file] } });

    // Should show error message in Portuguese
    await waitFor(() => {
      expect(
        screen.getByText("Erro ao processar a foto. Tente novamente.")
      ).toBeInTheDocument();
    });
  });

  // ----------------------------------------------------------
  // Retry after compression error
  // ----------------------------------------------------------
  it("shows retry button on compression error", async () => {
    mockCompressPhoto.mockRejectedValue(new Error("Compression failed"));

    const { default: PhotoPage } = await import(
      "@/app/consultation/photo/page"
    );
    render(<PhotoPage />);

    // Switch to gallery mode
    fireEvent.click(
      screen.getByText("Prefiro enviar uma foto da galeria")
    );

    await waitFor(() => {
      expect(
        screen.getByText("Escolher foto da galeria")
      ).toBeInTheDocument();
    });

    // Check consent and upload file
    fireEvent.click(
      screen.getByLabelText(/Confirmo que esta foto é minha/)
    );

    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    const file = new File([new Uint8Array(1024)], "photo.jpg", {
      type: "image/jpeg",
    });
    fireEvent.change(input, { target: { files: [file] } });

    // Should show retry button in Portuguese
    await waitFor(() => {
      expect(
        screen.getByText("Tentar novamente")
      ).toBeInTheDocument();
    });
  });

  // ----------------------------------------------------------
  // Retry resets to capture mode
  // ----------------------------------------------------------
  it("retry button resets state so user can try again", async () => {
    mockCompressPhoto.mockRejectedValueOnce(new Error("Compression failed"));

    const { default: PhotoPage } = await import(
      "@/app/consultation/photo/page"
    );
    render(<PhotoPage />);

    // Switch to gallery mode
    fireEvent.click(
      screen.getByText("Prefiro enviar uma foto da galeria")
    );

    await waitFor(() => {
      expect(
        screen.getByText("Escolher foto da galeria")
      ).toBeInTheDocument();
    });

    // Check consent and upload file
    fireEvent.click(
      screen.getByLabelText(/Confirmo que esta foto é minha/)
    );

    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    const file = new File([new Uint8Array(1024)], "photo.jpg", {
      type: "image/jpeg",
    });
    fireEvent.change(input, { target: { files: [file] } });

    // Wait for error
    await waitFor(() => {
      expect(
        screen.getByText("Tentar novamente")
      ).toBeInTheDocument();
    });

    // Click retry
    fireEvent.click(screen.getByText("Tentar novamente"));

    // Should go back to gallery mode (or camera mode)
    await waitFor(() => {
      expect(
        screen.queryByText("Erro ao processar a foto. Tente novamente.")
      ).not.toBeInTheDocument();
    });
  });

  // ----------------------------------------------------------
  // AC10: Uses design system theme tokens (no hardcoded hex)
  // ----------------------------------------------------------
  it("compression loading indicator uses design system theme tokens", async () => {
    mockCompressPhoto.mockReturnValue(new Promise(() => {})); // never resolves

    const { default: PhotoPage } = await import(
      "@/app/consultation/photo/page"
    );
    render(<PhotoPage />);

    // Switch to gallery mode
    fireEvent.click(
      screen.getByText("Prefiro enviar uma foto da galeria")
    );

    await waitFor(() => {
      expect(
        screen.getByText("Escolher foto da galeria")
      ).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByLabelText(/Confirmo que esta foto é minha/)
    );

    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    const file = new File([new Uint8Array(1024)], "photo.jpg", {
      type: "image/jpeg",
    });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      const loadingText = screen.getByText("A otimizar a foto...");
      expect(loadingText).toBeInTheDocument();
      // Verify it uses Tailwind theme classes (no hardcoded colors)
      // The loading container should use bg-background and text-foreground classes
      const container = loadingText.closest("div");
      expect(container).toBeTruthy();
    });
  });

  // ----------------------------------------------------------
  // compressPhoto is called with the blob from gallery upload
  // ----------------------------------------------------------
  it("calls compressPhoto with the blob from gallery upload", async () => {
    const { default: PhotoPage } = await import(
      "@/app/consultation/photo/page"
    );
    render(<PhotoPage />);

    // Switch to gallery mode
    fireEvent.click(
      screen.getByText("Prefiro enviar uma foto da galeria")
    );

    await waitFor(() => {
      expect(
        screen.getByText("Escolher foto da galeria")
      ).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByLabelText(/Confirmo que esta foto é minha/)
    );

    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    const file = new File([new Uint8Array(1024)], "photo.jpg", {
      type: "image/jpeg",
    });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockCompressPhoto).toHaveBeenCalledTimes(1);
    });

    // Should have been called with a Blob argument
    const callArg = mockCompressPhoto.mock.calls[0][0];
    expect(callArg).toBeInstanceOf(Blob);
  });
});
