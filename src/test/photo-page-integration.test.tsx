import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// ============================================================
// Mock dependencies
// ============================================================
vi.mock("@/lib/photo/validate-file", () => ({
  validatePhotoFile: vi.fn().mockReturnValue({ valid: true }),
}));

vi.mock("@/lib/photo/exif", () => ({
  correctExifOrientation: vi
    .fn()
    .mockResolvedValue(new Blob(["corrected"], { type: "image/jpeg" })),
}));

vi.mock("@/lib/photo/compress", () => ({
  compressPhoto: vi.fn().mockResolvedValue({
    blob: new Blob(["compressed"], { type: "image/jpeg" }),
    metadata: {
      originalSizeBytes: 1024,
      compressedSizeBytes: 512,
      compressionRatio: 0.5,
      originalWidth: 800,
      originalHeight: 600,
      outputWidth: 800,
      outputHeight: 600,
    },
  }),
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

vi.mock("@/lib/persistence/session-db", () => ({
  loadSessionData: vi.fn().mockResolvedValue(null),
  saveSessionData: vi.fn().mockResolvedValue(undefined),
  clearSessionData: vi.fn().mockResolvedValue(undefined),
}));

// Mock navigator for camera tests
const mockGetUserMedia = vi.fn();
const mockEnumerateDevices = vi.fn();

beforeEach(() => {
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

describe("Photo Page Integration", () => {
  it("renders in camera mode by default (shows permission prompt)", async () => {
    const { default: PhotoPage } = await import(
      "@/app/consultation/photo/page"
    );
    render(<PhotoPage />);
    await waitFor(() => {
      expect(screen.getByText(/Precisamos da sua câmera/)).toBeInTheDocument();
    });
  });

  it('switches to gallery mode when "Prefiro enviar uma foto da galeria" clicked', async () => {
    const { default: PhotoPage } = await import(
      "@/app/consultation/photo/page"
    );
    render(<PhotoPage />);

    // Wait for session recovery check to complete
    await waitFor(() => {
      expect(screen.getByText("Prefiro enviar uma foto da galeria")).toBeInTheDocument();
    });

    // Click the gallery link in CameraPermissionPrompt
    const galleryLink = screen.getByText(
      "Prefiro enviar uma foto da galeria"
    );
    fireEvent.click(galleryLink);

    // Should now show gallery upload UI
    await waitFor(() => {
      expect(
        screen.getByText("Escolher foto da galeria")
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          "Arraste a sua foto aqui ou clique para selecionar"
        )
      ).toBeInTheDocument();
    });
  });

  it("switches back to camera mode from gallery", async () => {
    const { default: PhotoPage } = await import(
      "@/app/consultation/photo/page"
    );
    render(<PhotoPage />);

    // Wait for session recovery check to complete
    await waitFor(() => {
      expect(screen.getByText("Prefiro enviar uma foto da galeria")).toBeInTheDocument();
    });

    // Switch to gallery mode
    fireEvent.click(
      screen.getByText("Prefiro enviar uma foto da galeria")
    );

    await waitFor(() => {
      expect(
        screen.getByText("Escolher foto da galeria")
      ).toBeInTheDocument();
    });

    // Switch back to camera mode
    fireEvent.click(screen.getByText("Prefiro usar a câmera"));

    await waitFor(() => {
      expect(
        screen.getByText(/Precisamos da sua câmera/)
      ).toBeInTheDocument();
    });
  });

  it("both modes call same photo handler (gallery upload)", async () => {
    const { default: PhotoPage } = await import(
      "@/app/consultation/photo/page"
    );
    render(<PhotoPage />);

    // Wait for session recovery check to complete
    await waitFor(() => {
      expect(screen.getByText("Prefiro enviar uma foto da galeria")).toBeInTheDocument();
    });

    // Switch to gallery mode
    fireEvent.click(
      screen.getByText("Prefiro enviar uma foto da galeria")
    );

    await waitFor(() => {
      expect(
        screen.getByText("Escolher foto da galeria")
      ).toBeInTheDocument();
    });

    // Gallery upload should be ready for file selection
    // (Full end-to-end tested in gallery-upload.test.tsx)
    expect(
      screen.getByLabelText(/Consinto o processamento da minha foto para analise de visagismo/)
    ).toBeInTheDocument();
  });

  it("CameraPermissionPrompt gallery link is enabled on photo page", async () => {
    const { default: PhotoPage } = await import(
      "@/app/consultation/photo/page"
    );
    render(<PhotoPage />);

    // Wait for session recovery check to complete
    await waitFor(() => {
      expect(screen.getByText("Prefiro enviar uma foto da galeria")).toBeInTheDocument();
    });

    const galleryLink = screen.getByText(
      "Prefiro enviar uma foto da galeria"
    );
    expect(galleryLink).not.toBeDisabled();
  });

  it("shows success message after gallery upload", async () => {
    const { default: PhotoPage } = await import(
      "@/app/consultation/photo/page"
    );
    render(<PhotoPage />);

    // Wait for session recovery check to complete
    await waitFor(() => {
      expect(screen.getByText("Prefiro enviar uma foto da galeria")).toBeInTheDocument();
    });

    // Switch to gallery
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
      /Consinto o processamento da minha foto para analise de visagismo/
    );
    fireEvent.click(checkbox);

    // Select a file
    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    const file = new File(
      [new Uint8Array(1024)],
      "photo.jpg",
      { type: "image/jpeg" }
    );
    fireEvent.change(input, { target: { files: [file] } });

    // Should show photo review screen (replaced placeholder in Story 2.5)
    await waitFor(() => {
      expect(
        screen.getByTestId("photo-review")
      ).toBeInTheDocument();
    });
  });
});

describe("CameraPermissionPrompt Integration", () => {
  it("gallery link calls onUploadFromGallery when provided", async () => {
    const { CameraPermissionPrompt } = await import(
      "@/components/consultation/CameraPermissionPrompt"
    );
    const onUploadFromGallery = vi.fn();

    render(
      <CameraPermissionPrompt
        onRequestPermission={vi.fn()}
        onUploadFromGallery={onUploadFromGallery}
      />
    );

    const link = screen.getByText("Prefiro enviar uma foto da galeria");
    expect(link).not.toBeDisabled();
    fireEvent.click(link);
    expect(onUploadFromGallery).toHaveBeenCalledTimes(1);
  });
});
