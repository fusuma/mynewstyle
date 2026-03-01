"use client";

import { useState, useCallback, useEffect } from "react";
import { PhotoCapture } from "@/components/consultation/PhotoCapture";
import { GalleryUpload } from "@/components/consultation/GalleryUpload";
import { PhotoValidation } from "@/components/consultation/PhotoValidation";
import { compressPhoto } from "@/lib/photo/compress";
import { destroyFaceDetector } from "@/lib/photo/validate";
import type { PhotoValidationResult } from "@/lib/photo/validate";
import { Loader2, CheckCircle2 } from "lucide-react";
import { PhotoReview } from "@/components/consultation/PhotoReview";

type PhotoMode = "camera" | "gallery";
type CompressionState = "idle" | "compressing" | "done" | "error";
type ValidationState =
  | "pending"
  | "validating"
  | "valid"
  | "invalid"
  | "overridden";

/**
 * Photo capture page route: /consultation/photo
 * Supports two modes:
 * - camera: Renders PhotoCapture for live camera capture (default)
 * - gallery: Renders GalleryUpload for file picker / drag-and-drop upload
 *
 * After capture/upload, photos are compressed client-side before storing.
 * Compression uses Canvas API to resize to max 800px width, JPEG 85% quality, <500KB.
 *
 * After compression, photos are validated for face detection using MediaPipe.
 * Validation checks: face presence, face size (>30%), lighting quality.
 * Users get 3 retry attempts before a manual override option appears.
 *
 * After validation, the photo review screen lets the user confirm or retake.
 */
export default function PhotoPage() {
  const [capturedPhoto, setCapturedPhoto] = useState<Blob | null>(null);
  const [mode, setMode] = useState<PhotoMode>("camera");
  const [compressionState, setCompressionState] =
    useState<CompressionState>("idle");
  const [rawBlob, setRawBlob] = useState<Blob | null>(null);
  const [validationState, setValidationState] =
    useState<ValidationState>("pending");
  const [validationRetryCount, setValidationRetryCount] = useState(0);
  const [validationResult, setValidationResult] =
    useState<PhotoValidationResult | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);

  // Clean up face detector when leaving the page
  useEffect(() => {
    return () => {
      destroyFaceDetector();
    };
  }, []);

  const handleCompressAndStore = useCallback(async (blob: Blob) => {
    setRawBlob(blob);
    setCompressionState("compressing");

    try {
      const result = await compressPhoto(blob);

      // Log metadata in development mode
      if (process.env.NODE_ENV === "development") {
        console.log("[Photo Compression]", {
          originalSize: `${(result.metadata.originalSizeBytes / 1024).toFixed(1)}KB`,
          compressedSize: `${(result.metadata.compressedSizeBytes / 1024).toFixed(1)}KB`,
          ratio: `${(result.metadata.compressionRatio * 100).toFixed(1)}%`,
          dimensions: `${result.metadata.originalWidth}x${result.metadata.originalHeight} -> ${result.metadata.outputWidth}x${result.metadata.outputHeight}`,
        });
      }

      setCapturedPhoto(result.blob);
      setCompressionState("done");
      // Trigger validation automatically after compression
      setValidationState("validating");
    } catch {
      setCompressionState("error");
    }
  }, []);

  const handleRetry = useCallback(() => {
    setCompressionState("idle");
    setCapturedPhoto(null);
    setRawBlob(null);
    setValidationState("pending");
  }, []);

  const handleRetryCompression = useCallback(() => {
    if (rawBlob) {
      handleCompressAndStore(rawBlob);
    } else {
      handleRetry();
    }
  }, [rawBlob, handleCompressAndStore, handleRetry]);

  const handleSwitchToGallery = useCallback(() => {
    setMode("gallery");
  }, []);

  const handleSwitchToCamera = useCallback(() => {
    setMode("camera");
  }, []);

  const handleValidationComplete = useCallback(
    (result: PhotoValidationResult) => {
      setValidationResult(result);
      if (result.valid) {
        setValidationState("valid");
      } else {
        setValidationState("invalid");
        setValidationRetryCount((prev) => prev + 1);
      }
    },
    []
  );

  const handlePhotoConfirm = useCallback(() => {
    setIsConfirmed(true);
    // Future: Navigate to questionnaire (Story 3.x)
  }, []);

  const handleValidationRetake = useCallback(() => {
    // Reset compression and validation state to go back to capture/upload
    setCompressionState("idle");
    setCapturedPhoto(null);
    setRawBlob(null);
    setValidationState("pending");
    // Do NOT reset retry count -- it persists across retakes
  }, []);

  const handleValidationOverride = useCallback(() => {
    setValidationState("overridden");
  }, []);

  // Compression loading state
  if (compressionState === "compressing") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
        <Loader2 className="mb-4 h-8 w-8 animate-spin text-accent" />
        <p className="text-muted-foreground">A otimizar a foto...</p>
      </div>
    );
  }

  // Compression error state
  if (compressionState === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
        <p className="mb-4 text-foreground">
          Erro ao processar a foto. Tente novamente.
        </p>
        <button
          onClick={handleRetryCompression}
          className="rounded-lg bg-accent px-6 py-3 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  // Validation states (after compression is done)
  if (capturedPhoto && compressionState === "done") {
    // Validating or invalid: show PhotoValidation component
    if (validationState === "validating" || validationState === "invalid") {
      return (
        <PhotoValidation
          photo={capturedPhoto}
          onValidationComplete={handleValidationComplete}
          onRetake={handleValidationRetake}
          onOverride={handleValidationOverride}
          retryCount={validationRetryCount}
        />
      );
    }

    // Valid or overridden: show photo review or confirmed state
    if (validationState === "valid" || validationState === "overridden") {
      if (isConfirmed) {
        return (
          <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
            <CheckCircle2 className="mb-4 h-12 w-12 text-green-500" />
            <p className="text-lg font-semibold text-foreground">Pronto!</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Foto selecionada com sucesso.
            </p>
          </div>
        );
      }

      return (
        <PhotoReview
          photo={capturedPhoto}
          validationResult={validationResult}
          isOverridden={validationState === "overridden"}
          onConfirm={handlePhotoConfirm}
          onRetake={handleRetry}
        />
      );
    }
  }

  if (mode === "gallery") {
    return (
      <GalleryUpload
        onUpload={handleCompressAndStore}
        onSwitchToCamera={handleSwitchToCamera}
      />
    );
  }

  return (
    <PhotoCapture
      onCapture={handleCompressAndStore}
      onSwitchToGallery={handleSwitchToGallery}
    />
  );
}
