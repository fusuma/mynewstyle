"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { PhotoCapture } from "@/components/consultation/PhotoCapture";
import { GalleryUpload } from "@/components/consultation/GalleryUpload";
import { PhotoValidation } from "@/components/consultation/PhotoValidation";
import { compressPhoto } from "@/lib/photo/compress";
import { destroyFaceDetector } from "@/lib/photo/validate";
import type { PhotoValidationResult } from "@/lib/photo/validate";
import { uploadPhoto } from "@/lib/photo/upload";
import type { PhotoUploadResult } from "@/lib/photo/upload";
import { Loader2, CheckCircle2 } from "lucide-react";
import { PhotoReview } from "@/components/consultation/PhotoReview";
import { PhotoUpload } from "@/components/consultation/PhotoUpload";
import { useSessionRecovery } from "@/hooks/useSessionRecovery";
import { saveSessionData, clearSessionData } from "@/lib/persistence/session-db";
import { SessionRecoveryBanner } from "@/components/consultation/SessionRecoveryBanner";

type PhotoMode = "camera" | "gallery";
type CompressionState = "idle" | "compressing" | "done" | "error";
type ValidationState = "pending" | "validating" | "valid" | "invalid" | "overridden";
type UploadState = "idle" | "uploading" | "done" | "error";

const GUEST_SESSION_STORAGE_KEY = "mynewstyle_guest_session_id";

/**
 * Get or create a guest session ID persisted in localStorage.
 * Reused across page refreshes and for session recovery (Story 2.7).
 */
function getOrCreateGuestSessionId(): string {
  const existing = localStorage.getItem(GUEST_SESSION_STORAGE_KEY);
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(GUEST_SESSION_STORAGE_KEY, id);
  return id;
}

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
 * After confirmation, the photo is uploaded to Supabase Storage.
 *
 * Session Recovery (Story 2.7):
 * On mount, checks IndexedDB for a previously persisted session.
 * If found, shows recovery banner allowing user to continue or retake.
 * On photo confirm, saves session data to IndexedDB (fire-and-forget).
 * On successful upload + navigation, clears IndexedDB.
 */
export default function PhotoPage() {
  const [capturedPhoto, setCapturedPhoto] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [mode, setMode] = useState<PhotoMode>("camera");
  const [compressionState, setCompressionState] = useState<CompressionState>("idle");
  const [rawBlob, setRawBlob] = useState<Blob | null>(null);
  const [validationState, setValidationState] = useState<ValidationState>("pending");
  const [validationRetryCount, setValidationRetryCount] = useState(0);
  const [validationResult, setValidationResult] = useState<PhotoValidationResult | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);

  // Upload state
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [uploadResult, setUploadResult] = useState<PhotoUploadResult | null>(null);
  const consultationIdRef = useRef<string | null>(null);

  // Session recovery state (Story 2.7)
  const { recoveredSession, isChecking, clearRecovery } = useSessionRecovery();
  const [showRecoveryBanner, setShowRecoveryBanner] = useState(false);

  // Show recovery banner when a session is found
  useEffect(() => {
    if (recoveredSession && !isChecking) {
      setShowRecoveryBanner(true);
    }
  }, [recoveredSession, isChecking]);

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
    setPhotoPreview(null);
    setRawBlob(null);
    setValidationState("pending");
    setUploadState("idle");
    setUploadResult(null);
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

  const handleValidationComplete = useCallback((result: PhotoValidationResult) => {
    setValidationResult(result);
    if (result.valid) {
      setValidationState("valid");
    } else {
      setValidationState("invalid");
      setValidationRetryCount((prev) => prev + 1);
    }
  }, []);

  const performUpload = useCallback(async () => {
    if (!capturedPhoto) return;

    setUploadState("uploading");
    const sessionId = getOrCreateGuestSessionId();
    const consId = consultationIdRef.current || crypto.randomUUID();
    if (!consultationIdRef.current) {
      consultationIdRef.current = consId;
    }

    // Save session data to IndexedDB (fire-and-forget, non-blocking).
    // Generate a base64 data URL for the preview so it survives page reloads
    // (object URLs are revoked on navigation and cannot be recovered).
    const persistPreview = (blob: Blob): Promise<string> =>
      new Promise((resolve) => {
        if (photoPreview && photoPreview.startsWith("data:")) {
          resolve(photoPreview);
          return;
        }
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(""); // Best-effort
        reader.readAsDataURL(blob);
      });

    persistPreview(capturedPhoto)
      .then((dataUrl) =>
        saveSessionData({
          photo: capturedPhoto,
          photoPreview: dataUrl,
          gender: "male", // Default; will be extended in Epic 3 with gender selection
          guestSessionId: sessionId,
          consultationId: consId,
          savedAt: Date.now(),
        })
      )
      .catch(() => {
        // Silently fail -- persistence is best-effort
      });

    const result = await uploadPhoto(capturedPhoto, sessionId, consId);
    setUploadResult(result);

    if (result.success) {
      setUploadState("done");
      setIsConfirmed(true);
      // Clear session data from IndexedDB after successful upload
      clearSessionData().catch(() => {
        // Silently fail
      });
    } else {
      setUploadState("error");
    }
  }, [capturedPhoto, photoPreview]);

  const handlePhotoConfirm = useCallback(() => {
    performUpload();
  }, [performUpload]);

  const handleUploadRetry = useCallback(() => {
    performUpload();
  }, [performUpload]);

  const handleUploadCancel = useCallback(() => {
    // Return to review screen
    setUploadState("idle");
    setUploadResult(null);
  }, []);

  const handleValidationRetake = useCallback(() => {
    // Reset compression and validation state to go back to capture/upload
    setCompressionState("idle");
    setCapturedPhoto(null);
    setPhotoPreview(null);
    setRawBlob(null);
    setValidationState("pending");
    setUploadState("idle");
    setUploadResult(null);
    // Do NOT reset retry count -- it persists across retakes
  }, []);

  const handleValidationOverride = useCallback(() => {
    setValidationState("overridden");
  }, []);

  // --- Session Recovery Handlers (Story 2.7) ---

  const handleRecoveryContinue = useCallback(() => {
    if (!recoveredSession) return;

    // Set recovered photo into the page state
    setCapturedPhoto(recoveredSession.photo);
    setPhotoPreview(recoveredSession.photoPreview);
    setCompressionState("done");
    setValidationState("valid"); // Skip validation -- already validated before save
    setShowRecoveryBanner(false);

    // Restore consultation context
    if (recoveredSession.guestSessionId) {
      // Ensure localStorage also has the session ID
      localStorage.setItem(GUEST_SESSION_STORAGE_KEY, recoveredSession.guestSessionId);
    }
    if (recoveredSession.consultationId) {
      consultationIdRef.current = recoveredSession.consultationId;
    }
  }, [recoveredSession]);

  const handleRecoveryRetake = useCallback(async () => {
    await clearRecovery();
    setShowRecoveryBanner(false);
    // Reset to capture mode
    handleRetry();
  }, [clearRecovery, handleRetry]);

  // --- Recovery banner ---
  if (showRecoveryBanner && recoveredSession) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
        <SessionRecoveryBanner
          onUseRecovered={handleRecoveryContinue}
          onRetake={handleRecoveryRetake}
        />
      </div>
    );
  }

  // --- Loading state while checking IndexedDB ---
  if (isChecking) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
        <Loader2 className="mb-4 h-8 w-8 animate-spin text-accent" />
        <p className="text-muted-foreground">A verificar sess\u00e3o anterior...</p>
      </div>
    );
  }

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
        <p className="mb-4 text-foreground">Erro ao processar a foto. Tente novamente.</p>
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

    // Valid or overridden: show upload, review, or confirmed state
    if (validationState === "valid" || validationState === "overridden") {
      // Upload in progress
      if (uploadState === "uploading") {
        return (
          <PhotoUpload
            isUploading={true}
            onRetry={handleUploadRetry}
            onCancel={handleUploadCancel}
          />
        );
      }

      // Upload error
      if (uploadState === "error") {
        return (
          <PhotoUpload
            isUploading={false}
            error={uploadResult?.error}
            onRetry={handleUploadRetry}
            onCancel={handleUploadCancel}
          />
        );
      }

      // Upload done / confirmed
      if (isConfirmed) {
        return (
          <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
            <CheckCircle2 className="mb-4 h-12 w-12 text-green-500" />
            <p className="text-lg font-semibold text-foreground">Pronto!</p>
            <p className="mt-2 text-sm text-muted-foreground">Foto selecionada com sucesso.</p>
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
      <GalleryUpload onUpload={handleCompressAndStore} onSwitchToCamera={handleSwitchToCamera} />
    );
  }

  return (
    <PhotoCapture onCapture={handleCompressAndStore} onSwitchToGallery={handleSwitchToGallery} />
  );
}
