import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCamera } from "@/hooks/useCamera";

// Mock MediaStream
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
  } as unknown as MediaStream & { tracks: Array<{ stop: ReturnType<typeof vi.fn> }> };
}

// Mock navigator.mediaDevices
const mockGetUserMedia = vi.fn();
const mockEnumerateDevices = vi.fn();

beforeEach(() => {
  // Set up navigator.mediaDevices mock
  Object.defineProperty(navigator, "mediaDevices", {
    value: {
      getUserMedia: mockGetUserMedia,
      enumerateDevices: mockEnumerateDevices,
    },
    writable: true,
    configurable: true,
  });

  // Default: no permissions API
  Object.defineProperty(navigator, "permissions", {
    value: undefined,
    writable: true,
    configurable: true,
  });

  mockGetUserMedia.mockReset();
  mockEnumerateDevices.mockReset();
  mockEnumerateDevices.mockResolvedValue([]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useCamera", () => {
  it("initializes with correct default state", () => {
    const { result } = renderHook(() => useCamera());

    expect(result.current.stream).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.facingMode).toBe("user");
    expect(result.current.isPermissionGranted).toBe(false);
  });

  it("calls getUserMedia with front camera constraints on startCamera", async () => {
    const mockStream = createMockStream();
    mockGetUserMedia.mockResolvedValue(mockStream);

    const { result } = renderHook(() => useCamera());

    await act(async () => {
      await result.current.startCamera();
    });

    expect(mockGetUserMedia).toHaveBeenCalledWith({
      video: {
        facingMode: { ideal: "user" },
        width: { ideal: 1280 },
        height: { ideal: 1280 },
      },
      audio: false,
    });
    expect(result.current.stream).toBe(mockStream);
    expect(result.current.isPermissionGranted).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("calls getUserMedia with rear camera constraints when specified", async () => {
    const mockStream = createMockStream();
    mockGetUserMedia.mockResolvedValue(mockStream);

    const { result } = renderHook(() => useCamera());

    await act(async () => {
      await result.current.startCamera("environment");
    });

    expect(mockGetUserMedia).toHaveBeenCalledWith({
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 1280 },
      },
      audio: false,
    });
  });

  it("sets isLoading to true while requesting camera", async () => {
    let resolveGetUserMedia: (stream: MediaStream) => void;
    const pendingPromise = new Promise<MediaStream>((resolve) => {
      resolveGetUserMedia = resolve;
    });
    mockGetUserMedia.mockReturnValue(pendingPromise);

    const { result } = renderHook(() => useCamera());

    let startPromise: Promise<void>;
    act(() => {
      startPromise = result.current.startCamera();
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveGetUserMedia!(createMockStream());
      await startPromise;
    });

    expect(result.current.isLoading).toBe(false);
  });

  it("handles NotAllowedError (permission denied)", async () => {
    const error = new DOMException("Permission denied", "NotAllowedError");
    mockGetUserMedia.mockRejectedValue(error);

    const { result } = renderHook(() => useCamera());

    await act(async () => {
      await result.current.startCamera();
    });

    expect(result.current.error).toBe("permission-denied");
    expect(result.current.stream).toBeNull();
    expect(result.current.isPermissionGranted).toBe(false);
  });

  it("handles NotFoundError (no camera found)", async () => {
    const error = new DOMException("No camera", "NotFoundError");
    mockGetUserMedia.mockRejectedValue(error);

    const { result } = renderHook(() => useCamera());

    await act(async () => {
      await result.current.startCamera();
    });

    expect(result.current.error).toBe("not-found");
  });

  it("handles NotReadableError (camera in use)", async () => {
    const error = new DOMException("Camera in use", "NotReadableError");
    mockGetUserMedia.mockRejectedValue(error);

    const { result } = renderHook(() => useCamera());

    await act(async () => {
      await result.current.startCamera();
    });

    expect(result.current.error).toBe("not-readable");
  });

  it("handles OverconstrainedError", async () => {
    const error = new DOMException("Overconstrained", "OverconstrainedError");
    mockGetUserMedia.mockRejectedValue(error);

    const { result } = renderHook(() => useCamera());

    await act(async () => {
      await result.current.startCamera();
    });

    expect(result.current.error).toBe("overconstrained");
  });

  it("handles generic error", async () => {
    mockGetUserMedia.mockRejectedValue(new Error("Unknown"));

    const { result } = renderHook(() => useCamera());

    await act(async () => {
      await result.current.startCamera();
    });

    expect(result.current.error).toBe("unknown");
  });

  it("stops all tracks on stopCamera", async () => {
    const mockStream = createMockStream();
    mockGetUserMedia.mockResolvedValue(mockStream);

    const { result } = renderHook(() => useCamera());

    await act(async () => {
      await result.current.startCamera();
    });

    act(() => {
      result.current.stopCamera();
    });

    expect(mockStream.tracks[0].stop).toHaveBeenCalled();
    expect(result.current.stream).toBeNull();
  });

  it("switches between front and rear camera", async () => {
    const mockStream1 = createMockStream();
    const mockStream2 = createMockStream();
    mockGetUserMedia
      .mockResolvedValueOnce(mockStream1)
      .mockResolvedValueOnce(mockStream2);

    const { result } = renderHook(() => useCamera());

    await act(async () => {
      await result.current.startCamera();
    });

    expect(result.current.facingMode).toBe("user");

    await act(async () => {
      await result.current.switchCamera();
    });

    // Old stream stopped
    expect(mockStream1.tracks[0].stop).toHaveBeenCalled();
    // New facingMode is environment
    expect(result.current.facingMode).toBe("environment");
    expect(result.current.stream).toBe(mockStream2);
  });

  it("stops tracks on unmount (cleanup)", async () => {
    const mockStream = createMockStream();
    mockGetUserMedia.mockResolvedValue(mockStream);

    const { result, unmount } = renderHook(() => useCamera());

    await act(async () => {
      await result.current.startCamera();
    });

    unmount();

    expect(mockStream.tracks[0].stop).toHaveBeenCalled();
  });

  it("capturePhoto returns a Blob from video element", async () => {
    const mockStream = createMockStream();
    mockGetUserMedia.mockResolvedValue(mockStream);

    // Mock canvas context
    const drawImage = vi.fn();
    const mockContext = { drawImage };
    const toBlobMock = vi.fn((callback: BlobCallback) => {
      callback(new Blob(["photo-data"], { type: "image/jpeg" }));
    });

    // We'll create a mock video ref
    const mockVideoRef = {
      current: {
        videoWidth: 1280,
        videoHeight: 1280,
      } as unknown as HTMLVideoElement,
    };

    // Mock canvas creation
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

    const { result } = renderHook(() => useCamera());

    await act(async () => {
      await result.current.startCamera();
    });

    let blob: Blob | null = null;
    await act(async () => {
      blob = await result.current.capturePhoto(mockVideoRef as React.RefObject<HTMLVideoElement>);
    });

    expect(blob).toBeInstanceOf(Blob);
    expect(drawImage).toHaveBeenCalledWith(mockVideoRef.current, 0, 0);
    expect(toBlobMock).toHaveBeenCalled();

    vi.restoreAllMocks();
  });
});
