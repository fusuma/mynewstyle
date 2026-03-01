"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { pageTransition } from "@/lib/motion";
import type { PhotoValidationResult } from "@/lib/photo/validate";

// ============================================================
// Props
// ============================================================

interface PhotoReviewProps {
  /** The compressed photo blob to display */
  photo: Blob;
  /** Validation result from face detection (null if overridden without result) */
  validationResult: PhotoValidationResult | null;
  /** Whether the validation was overridden by the user */
  isOverridden: boolean;
  /** Called when user confirms the photo ("Usar esta foto") */
  onConfirm: () => void;
  /** Called when user wants to retake ("Tirar outra") */
  onRetake: () => void;
}

// ============================================================
// Helpers
// ============================================================

/**
 * Map confidence score to a human-readable quality label (Portuguese).
 */
function getQualityLabel(confidenceScore: number): string {
  if (confidenceScore >= 0.8) return "Alta";
  if (confidenceScore >= 0.65) return "M\u00e9dia";
  return "Baixa";
}

// ============================================================
// Component
// ============================================================

/**
 * PhotoReview: Displays the captured/uploaded photo for user review.
 *
 * - Shows photo at high resolution with 20px border radius
 * - Displays validation result badge (face detected / overridden warning)
 * - Shows confidence quality indicator
 * - Bottom-anchored buttons: "Usar esta foto" (primary) and "Tirar outra" (secondary)
 * - All text in Portuguese (pt-BR) with correct diacritical marks
 * - Accessible: ARIA labels, keyboard navigation
 *
 * Uses design system theme tokens -- no hardcoded hex colors.
 */
export function PhotoReview({
  photo,
  validationResult,
  isOverridden,
  onConfirm,
  onRetake,
}: PhotoReviewProps) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const prefersReducedMotion = useReducedMotion();

  // Create object URL for photo preview with cleanup
  useEffect(() => {
    const url = URL.createObjectURL(photo);
    setPhotoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const animationProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: pageTransition,
      };

  return (
    <motion.div
      data-testid="photo-review"
      className="flex min-h-screen flex-col items-center bg-background px-6 pb-48 pt-8"
      {...animationProps}
    >
      {/* Photo frame with 20px border radius */}
      <div className="w-full max-w-sm overflow-hidden rounded-[20px]">
        {photoUrl && (
          <img
            src={photoUrl}
            alt="Foto para revisão"
            className="h-auto w-full object-cover"
          />
        )}
      </div>

      {/* Validation result badge */}
      <div
        className="mt-4 flex flex-col items-center gap-2"
        role="status"
        aria-live="polite"
      >
        {/* Valid result: green badge */}
        {validationResult && validationResult.valid && !isOverridden && (
          <>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium text-foreground">
                Rosto detectado
              </span>
            </div>
            {validationResult.details && (
              <>
                <span className="text-xs text-muted-foreground">
                  Qualidade: {getQualityLabel(validationResult.details.confidenceScore)}
                </span>
                {validationResult.details.faceAreaPercent > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {"\u00c1"}rea do rosto: {validationResult.details.faceAreaPercent.toFixed(0)}%
                  </span>
                )}
              </>
            )}
          </>
        )}

        {/* Overridden: amber warning badge */}
        {isOverridden && (
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <span className="text-sm font-medium text-foreground">
              {"Valida\u00e7\u00e3o ignorada"}
            </span>
          </div>
        )}
      </div>

      {/* Bottom-anchored button group with iOS safe area */}
      <div className="fixed bottom-0 left-0 right-0 bg-background px-6 pb-8 pt-4 safe-area-bottom">
        <button
          onClick={onConfirm}
          aria-label="Usar esta foto"
          className="min-h-[48px] w-full rounded-xl bg-accent py-4 text-base font-semibold text-accent-foreground transition-colors hover:bg-accent/90"
        >
          Usar esta foto
        </button>
        <button
          onClick={onRetake}
          aria-label="Tirar outra foto"
          className="mt-3 min-h-[48px] w-full rounded-xl border border-border py-4 text-base font-medium text-muted-foreground transition-colors hover:bg-muted"
        >
          Tirar outra
        </button>
      </div>
    </motion.div>
  );
}
