import { useState, useCallback, useRef, useEffect, type RefObject } from "react";

export type CameraError =
  | "permission-denied"
  | "not-found"
  | "not-readable"
  | "overconstrained"
  | "unknown"
  | null;

export type FacingMode = "user" | "environment";

export interface UseCameraReturn {
  stream: MediaStream | null;
  error: CameraError;
  isLoading: boolean;
  facingMode: FacingMode;
  isPermissionGranted: boolean;
  startCamera: (facingMode?: FacingMode) => Promise<void>;
  stopCamera: () => void;
  switchCamera: () => Promise<void>;
  capturePhoto: (videoRef: RefObject<HTMLVideoElement | null>) => Promise<Blob | null>;
}

/**
 * Hook for managing camera access via MediaDevices.getUserMedia.
 * Handles permission flow, camera switching, photo capture, and cleanup.
 */
export function useCamera(): UseCameraReturn {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<CameraError>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [facingMode, setFacingMode] = useState<FacingMode>("user");
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);

  // Use ref to track current stream for cleanup
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setStream(null);
  }, []);

  const startCamera = useCallback(
    async (mode?: FacingMode) => {
      const targetMode = mode || "user";
      setIsLoading(true);
      setError(null);

      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: targetMode },
            width: { ideal: 1280 },
            height: { ideal: 1280 },
          },
          audio: false,
        });

        streamRef.current = mediaStream;
        setStream(mediaStream);
        setFacingMode(targetMode);
        setIsPermissionGranted(true);
      } catch (err) {
        if (err instanceof DOMException) {
          switch (err.name) {
            case "NotAllowedError":
              setError("permission-denied");
              break;
            case "NotFoundError":
              setError("not-found");
              break;
            case "NotReadableError":
              setError("not-readable");
              break;
            case "OverconstrainedError":
              setError("overconstrained");
              break;
            default:
              setError("unknown");
          }
        } else {
          setError("unknown");
        }
        setStream(null);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const switchCamera = useCallback(async () => {
    // Stop current stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    const newMode: FacingMode = facingMode === "user" ? "environment" : "user";
    await startCamera(newMode);
  }, [facingMode, startCamera]);

  const capturePhoto = useCallback(
    async (videoRef: RefObject<HTMLVideoElement | null>): Promise<Blob | null> => {
      const video = videoRef.current;
      if (!video) return null;

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      ctx.drawImage(video, 0, 0);

      return new Promise<Blob | null>((resolve) => {
        canvas.toBlob(
          (blob) => {
            resolve(blob);
          },
          "image/jpeg",
          0.92
        );
      });
    },
    []
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return {
    stream,
    error,
    isLoading,
    facingMode,
    isPermissionGranted,
    startCamera,
    stopCamera,
    switchCamera,
    capturePhoto,
  };
}
