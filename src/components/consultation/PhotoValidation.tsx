"use client";

import { useEffect, useState, useCallback } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Loader2 } from "lucide-react";
import {
  validatePhoto,
  type PhotoValidationResult,
  type ValidationStatus,
} from "@/lib/photo/validate";

// ============================================================
// Props
// ============================================================

interface PhotoValidationProps {
  /** The compressed photo blob to validate */
  photo: Blob;
  /** Called when validation completes (success or failure) */
  onValidationComplete: (result: PhotoValidationResult) => void;
  /** Called when user clicks "Tentar novamente" (retry / retake) */
  onRetake: () => void;
  /** Called when user clicks "Usar mesmo assim" (manual override) */
  onOverride: () => void;
  /** Current retry count (managed by parent) */
  retryCount?: number;
}

// ============================================================
// Border color + icon mapping per validation status
// ============================================================

const STATUS_STYLES: Record<
  ValidationStatus,
  { borderClass: string; icon: React.ReactNode; category: "success" | "warning" | "error" }
> = {
  valid: {
    borderClass: "border-green-500",
    icon: <CheckCircle2 className="h-6 w-6 text-green-500" />,
    category: "success",
  },
  poor_lighting: {
    borderClass: "border-yellow-500",
    icon: <AlertTriangle className="h-6 w-6 text-yellow-500" />,
    category: "warning",
  },
  sunglasses: {
    borderClass: "border-yellow-500",
    icon: <AlertTriangle className="h-6 w-6 text-yellow-500" />,
    category: "warning",
  },
  face_too_small: {
    borderClass: "border-yellow-500",
    icon: <AlertTriangle className="h-6 w-6 text-yellow-500" />,
    category: "warning",
  },
  no_face: {
    borderClass: "border-red-500",
    icon: <XCircle className="h-6 w-6 text-red-500" />,
    category: "error",
  },
  multiple_faces: {
    borderClass: "border-red-500",
    icon: <XCircle className="h-6 w-6 text-red-500" />,
    category: "error",
  },
  error: {
    borderClass: "border-red-500",
    icon: <XCircle className="h-6 w-6 text-red-500" />,
    category: "error",
  },
};

/** Maximum retries before manual override is shown */
const MAX_RETRIES = 3;

// ============================================================
// Component
// ============================================================

/**
 * PhotoValidation: Displays photo with validation feedback.
 *
 * - Runs face detection automatically when mounted
 * - Shows loading spinner during validation
 * - Displays colored border + icon + message based on result
 * - Retry button on failure; override button after MAX_RETRIES attempts
 *
 * Uses design system theme tokens -- no hardcoded hex colors.
 */
export function PhotoValidation({
  photo,
  onValidationComplete,
  onRetake,
  onOverride,
  retryCount = 0,
}: PhotoValidationProps) {
  const [result, setResult] = useState<PhotoValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(true);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  // Create object URL for photo preview
  useEffect(() => {
    const url = URL.createObjectURL(photo);
    setPhotoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  // Run validation automatically on mount
  const runValidation = useCallback(async () => {
    setIsValidating(true);
    setResult(null);

    try {
      const validationResult = await validatePhoto(photo);
      setResult(validationResult);
      onValidationComplete(validationResult);
    } catch {
      const errorResult: PhotoValidationResult = {
        valid: false,
        status: "error",
        faces: [],
        message: "Erro ao verificar a foto. Tente novamente.",
      };
      setResult(errorResult);
      onValidationComplete(errorResult);
    } finally {
      setIsValidating(false);
    }
  }, [photo, onValidationComplete]);

  useEffect(() => {
    runValidation();
  }, [runValidation]);

  // Loading state
  if (isValidating) {
    return (
      <div
        data-testid="photo-validation"
        className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center"
      >
        <Loader2 className="mb-4 h-8 w-8 animate-spin text-accent" />
        <p className="text-muted-foreground">A verificar a foto...</p>
      </div>
    );
  }

  // Validation result
  if (!result) return null;

  const style = STATUS_STYLES[result.status] ?? STATUS_STYLES.error;
  const showRetry = !result.valid;
  const showOverride = !result.valid && retryCount >= MAX_RETRIES;

  return (
    <div
      data-testid="photo-validation"
      className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center"
    >
      {/* Photo with validation border */}
      <div
        data-testid="validation-border"
        className={`mb-6 overflow-hidden rounded-[20px] border-4 ${style.borderClass}`}
      >
        {photoUrl && (
          <img
            src={photoUrl}
            alt="Foto para valida\u00e7\u00e3o"
            className="h-auto max-w-[300px]"
          />
        )}
      </div>

      {/* Status icon + message */}
      <div className="mb-6 flex items-center gap-2">
        {style.icon}
        <p className="text-foreground">{result.message}</p>
      </div>

      {/* Retry count */}
      {showRetry && retryCount > 0 && retryCount < MAX_RETRIES && (
        <p className="mb-4 text-sm text-muted-foreground">
          Tentativa {retryCount} de {MAX_RETRIES}
        </p>
      )}

      {/* Retry button */}
      {showRetry && (
        <button
          onClick={onRetake}
          className="rounded-lg bg-accent px-6 py-3 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
        >
          Tentar novamente
        </button>
      )}

      {/* Manual override button (after MAX_RETRIES) */}
      {showOverride && (
        <button
          onClick={onOverride}
          className="mt-3 rounded-lg border border-border px-6 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
        >
          Usar mesmo assim
        </button>
      )}
    </div>
  );
}
