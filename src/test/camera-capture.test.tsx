import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CameraPermissionPrompt } from "@/components/consultation/CameraPermissionPrompt";
import { WebViewBlocker } from "@/components/consultation/WebViewBlocker";
import { FaceOvalOverlay } from "@/components/consultation/FaceOvalOverlay";
import { CameraGuidanceTips } from "@/components/consultation/CameraGuidanceTips";
import { PhotoCapture } from "@/components/consultation/PhotoCapture";

// ============================================================
// Mock navigator.mediaDevices
// ============================================================
function createMockStream() {
  const tracks = [
    {
      stop: vi.fn(),
      kind: "video" as const,
      enabled: true,
      id: "mock-track-1",
    },
  ];
  return {
    getTracks: vi.fn(() => tracks),
    getVideoTracks: vi.fn(() => tracks),
    getAudioTracks: vi.fn(() => []),
    tracks,
  } as unknown as MediaStream & {
    tracks: Array<{ stop: ReturnType<typeof vi.fn> }>;
  };
}

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

  // Reset userAgent to standard browser
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

// ============================================================
// CameraPermissionPrompt Tests
// ============================================================
describe("CameraPermissionPrompt", () => {
  it("renders explanation text in Portuguese", () => {
    render(<CameraPermissionPrompt onRequestPermission={vi.fn()} />);
    expect(screen.getByText(/Precisamos da sua câmera/)).toBeInTheDocument();
    expect(
      screen.getByText(/A sua foto é processada com segurança/)
    ).toBeInTheDocument();
  });

  it('renders "Permitir Câmera" button', () => {
    render(<CameraPermissionPrompt onRequestPermission={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: /Permitir Câmera/ })
    ).toBeInTheDocument();
  });

  it("calls onRequestPermission when button clicked", () => {
    const onRequestPermission = vi.fn();
    render(
      <CameraPermissionPrompt onRequestPermission={onRequestPermission} />
    );
    fireEvent.click(screen.getByRole("button", { name: /Permitir Câmera/ }));
    expect(onRequestPermission).toHaveBeenCalledTimes(1);
  });

  it('renders "Prefiro enviar uma foto da galeria" secondary link', () => {
    render(<CameraPermissionPrompt onRequestPermission={vi.fn()} />);
    expect(
      screen.getByText(/Prefiro enviar uma foto da galeria/)
    ).toBeInTheDocument();
  });

  it("gallery link is disabled when no handler provided", () => {
    render(<CameraPermissionPrompt onRequestPermission={vi.fn()} />);
    const link = screen.getByText(/Prefiro enviar uma foto da galeria/);
    expect(link).toBeDisabled();
  });
});

// ============================================================
// WebViewBlocker Tests
// ============================================================
describe("WebViewBlocker", () => {
  it("renders warning message in Portuguese", () => {
    render(<WebViewBlocker />);
    expect(
      screen.getByText(/Abra no seu navegador/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Navegadores integrados/)
    ).toBeInTheDocument();
  });

  it('renders "Abrir no Navegador" button', () => {
    render(<WebViewBlocker />);
    expect(
      screen.getByRole("button", { name: /Abrir no Navegador/ })
    ).toBeInTheDocument();
  });

  it('renders "Copiar Link" button', () => {
    render(<WebViewBlocker />);
    expect(
      screen.getByRole("button", { name: /Copiar Link/ })
    ).toBeInTheDocument();
  });

  it("opens external browser on CTA click", () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    render(<WebViewBlocker />);
    fireEvent.click(
      screen.getByRole("button", { name: /Abrir no Navegador/ })
    );
    expect(openSpy).toHaveBeenCalledWith(expect.any(String), "_blank");
  });
});

// ============================================================
// FaceOvalOverlay Tests
// ============================================================
describe("FaceOvalOverlay", () => {
  it("renders the SVG overlay", () => {
    render(<FaceOvalOverlay />);
    const overlay = screen.getByTestId("face-oval-overlay");
    expect(overlay).toBeInTheDocument();
    expect(overlay.querySelector("svg")).toBeInTheDocument();
  });

  it("is aria-hidden to screen readers", () => {
    render(<FaceOvalOverlay />);
    const overlay = screen.getByTestId("face-oval-overlay");
    expect(overlay).toHaveAttribute("aria-hidden", "true");
  });
});

// ============================================================
// CameraGuidanceTips Tests
// ============================================================
describe("CameraGuidanceTips", () => {
  it("renders guidance tips container", () => {
    render(<CameraGuidanceTips />);
    expect(screen.getByTestId("camera-guidance-tips")).toBeInTheDocument();
  });

  it("displays at least one tip text", () => {
    render(<CameraGuidanceTips />);
    // At least one tip should be visible (first one initially)
    expect(screen.getByText(/Boa iluminação/)).toBeInTheDocument();
  });

  it("has aria-live for accessibility", () => {
    render(<CameraGuidanceTips />);
    const container = screen.getByTestId("camera-guidance-tips");
    expect(container).toHaveAttribute("aria-live", "polite");
  });
});

// ============================================================
// PhotoCapture Integration Tests
// ============================================================
describe("PhotoCapture", () => {
  it("shows WebView blocker when in-app browser detected", () => {
    Object.defineProperty(navigator, "userAgent", {
      value:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Instagram 275.0",
      writable: true,
      configurable: true,
    });

    render(<PhotoCapture />);
    expect(screen.getByText(/Abra no seu navegador/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Abrir no Navegador/ })
    ).toBeInTheDocument();
  });

  it("shows permission prompt initially in normal browser", () => {
    render(<PhotoCapture />);
    expect(screen.getByText(/Precisamos da sua câmera/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Permitir Câmera/ })
    ).toBeInTheDocument();
  });

  it("shows camera viewfinder after permission granted", async () => {
    const mockStream = createMockStream();
    mockGetUserMedia.mockResolvedValue(mockStream);

    render(<PhotoCapture />);

    fireEvent.click(screen.getByRole("button", { name: /Permitir Câmera/ }));

    await waitFor(() => {
      expect(screen.getByTestId("camera-viewfinder")).toBeInTheDocument();
    });
  });

  it("renders face oval overlay when camera is active", async () => {
    const mockStream = createMockStream();
    mockGetUserMedia.mockResolvedValue(mockStream);

    render(<PhotoCapture />);
    fireEvent.click(screen.getByRole("button", { name: /Permitir Câmera/ }));

    await waitFor(() => {
      expect(screen.getByTestId("face-oval-overlay")).toBeInTheDocument();
    });
  });

  it('renders capture button with correct aria-label "Capturar foto"', async () => {
    const mockStream = createMockStream();
    mockGetUserMedia.mockResolvedValue(mockStream);

    render(<PhotoCapture />);
    fireEvent.click(screen.getByRole("button", { name: /Permitir Câmera/ }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Capturar foto/ })
      ).toBeInTheDocument();
    });
  });

  it("renders camera switch button when multiple cameras available", async () => {
    const mockStream = createMockStream();
    mockGetUserMedia.mockResolvedValue(mockStream);
    mockEnumerateDevices.mockResolvedValue([
      { kind: "videoinput", deviceId: "cam1", label: "Front" },
      { kind: "videoinput", deviceId: "cam2", label: "Back" },
    ]);

    render(<PhotoCapture />);
    fireEvent.click(screen.getByRole("button", { name: /Permitir Câmera/ }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Alternar câmera/ })
      ).toBeInTheDocument();
    });
  });

  it("does not render camera switch button when only one camera", async () => {
    const mockStream = createMockStream();
    mockGetUserMedia.mockResolvedValue(mockStream);
    mockEnumerateDevices.mockResolvedValue([
      { kind: "videoinput", deviceId: "cam1", label: "Front" },
    ]);

    render(<PhotoCapture />);
    fireEvent.click(screen.getByRole("button", { name: /Permitir Câmera/ }));

    await waitFor(() => {
      expect(screen.getByTestId("camera-viewfinder")).toBeInTheDocument();
    });

    expect(
      screen.queryByRole("button", { name: /Alternar câmera/ })
    ).not.toBeInTheDocument();
  });

  it("calls onCapture with photo blob when capture button clicked", async () => {
    const mockStream = createMockStream();
    mockGetUserMedia.mockResolvedValue(mockStream);
    const onCapture = vi.fn();

    // Mock canvas for photo capture
    const drawImage = vi.fn();
    const mockContext = { drawImage };
    const toBlobMock = vi.fn((callback: BlobCallback) => {
      callback(new Blob(["photo-data"], { type: "image/jpeg" }));
    });

    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "canvas") {
        const canvas = originalCreateElement("canvas");
        Object.defineProperty(canvas, "getContext", {
          value: () => mockContext,
        });
        Object.defineProperty(canvas, "toBlob", {
          value: toBlobMock,
        });
        return canvas;
      }
      return originalCreateElement(tag);
    });

    render(<PhotoCapture onCapture={onCapture} />);
    fireEvent.click(screen.getByRole("button", { name: /Permitir Câmera/ }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Capturar foto/ })
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Capturar foto/ }));

    await waitFor(() => {
      expect(onCapture).toHaveBeenCalledWith(expect.any(Blob));
    });
  });

  it("shows error state when camera permission is denied", async () => {
    const error = new DOMException("Permission denied", "NotAllowedError");
    mockGetUserMedia.mockRejectedValue(error);

    render(<PhotoCapture />);
    fireEvent.click(screen.getByRole("button", { name: /Permitir Câmera/ }));

    await waitFor(() => {
      expect(
        screen.getByText(/Acesso à câmera foi negado/)
      ).toBeInTheDocument();
    });
  });

  it("shows error with retry button when camera fails", async () => {
    const error = new DOMException("Not found", "NotFoundError");
    mockGetUserMedia.mockRejectedValue(error);

    render(<PhotoCapture />);
    fireEvent.click(screen.getByRole("button", { name: /Permitir Câmera/ }));

    await waitFor(() => {
      expect(
        screen.getByText(/Nenhuma câmera encontrada/)
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Tentar novamente/ })
      ).toBeInTheDocument();
    });
  });

  it("retries camera when retry button is clicked after error", async () => {
    const error = new DOMException("Not found", "NotFoundError");
    mockGetUserMedia.mockRejectedValueOnce(error);

    const mockStream = createMockStream();
    mockGetUserMedia.mockResolvedValueOnce(mockStream);

    render(<PhotoCapture />);
    fireEvent.click(screen.getByRole("button", { name: /Permitir Câmera/ }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Tentar novamente/ })
      ).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole("button", { name: /Tentar novamente/ })
    );

    await waitFor(() => {
      expect(screen.getByTestId("camera-viewfinder")).toBeInTheDocument();
    });
  });

  it("renders video element with required attributes for iOS", async () => {
    const mockStream = createMockStream();
    mockGetUserMedia.mockResolvedValue(mockStream);

    render(<PhotoCapture />);
    fireEvent.click(screen.getByRole("button", { name: /Permitir Câmera/ }));

    await waitFor(() => {
      const video = screen.getByTestId("camera-video") as HTMLVideoElement;
      expect(video).toHaveAttribute("autoplay");
      // React boolean props: muted and playsInline are set as DOM properties, not HTML attributes
      expect(video.muted).toBe(true);
      expect(video.playsInline).toBe(true);
    });
  });

  it("mirrors video for front camera", async () => {
    const mockStream = createMockStream();
    mockGetUserMedia.mockResolvedValue(mockStream);

    render(<PhotoCapture />);
    fireEvent.click(screen.getByRole("button", { name: /Permitir Câmera/ }));

    await waitFor(() => {
      const video = screen.getByTestId("camera-video");
      expect(video.style.transform).toBe("scaleX(-1)");
    });
  });

  it("renders guidance tips when camera is active", async () => {
    const mockStream = createMockStream();
    mockGetUserMedia.mockResolvedValue(mockStream);

    render(<PhotoCapture />);
    fireEvent.click(screen.getByRole("button", { name: /Permitir Câmera/ }));

    await waitFor(() => {
      expect(screen.getByTestId("camera-guidance-tips")).toBeInTheDocument();
    });
  });

  it("renders camera-in-use error message", async () => {
    const error = new DOMException("Camera in use", "NotReadableError");
    mockGetUserMedia.mockRejectedValue(error);

    render(<PhotoCapture />);
    fireEvent.click(screen.getByRole("button", { name: /Permitir Câmera/ }));

    await waitFor(() => {
      expect(
        screen.getByText(/A câmera está sendo usada por outro aplicativo/)
      ).toBeInTheDocument();
    });
  });
});

// ============================================================
// Photo Page Route Tests
// ============================================================
describe("PhotoPage", () => {
  it("renders the PhotoCapture component", async () => {
    const { default: PhotoPage } = await import(
      "@/app/consultation/photo/page"
    );
    render(<PhotoPage />);
    // Should show permission prompt initially
    expect(screen.getByText(/Precisamos da sua câmera/)).toBeInTheDocument();
  });
});
