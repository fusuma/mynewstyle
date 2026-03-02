'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { StarRating } from '@/components/consultation/StarRating';
import { trackEvent } from '@/lib/utils/analytics';
import { useConsultationStore } from '@/stores/consultation';
import type { RatingDetails } from '@/types/index';

type PromptState = 'rating' | 'details' | 'submitting' | 'success' | 'dismissed';

interface ConsultationRatingPromptProps {
  consultationId: string;
  existingRating?: number | null;
  existingDetails?: RatingDetails | null;
  hasGeneratedPreviews: boolean;
}

/**
 * ConsultationRatingPrompt — Post-consultation rating UI.
 * Story 10.5: Post-Consultation Rating — AC #1, #2, #5, #6, #9
 *
 * State machine: rating → details → submitting → success → dismissed
 * Appears inline between StylingTipsSection and ResultsActionsFooter.
 * Non-blocking: does not interfere with results browsing.
 */
export function ConsultationRatingPrompt({
  consultationId,
  existingRating,
  existingDetails,
  hasGeneratedPreviews,
}: ConsultationRatingPromptProps) {
  const shouldReduceMotion = useReducedMotion();
  const setRatingSubmitted = useConsultationStore((state) => state.setRatingSubmitted);

  const [promptState, setPromptState] = useState<PromptState>('rating');
  const [overallRating, setOverallRating] = useState<number | null>(existingRating ?? null);
  const [faceShapeAccuracy, setFaceShapeAccuracy] = useState<number | null>(
    existingDetails?.faceShapeAccuracy ?? null
  );
  const [recommendationQuality, setRecommendationQuality] = useState<number | null>(
    existingDetails?.recommendationQuality ?? null
  );
  const [previewRealism, setPreviewRealism] = useState<number | null>(
    existingDetails?.previewRealism ?? null
  );

  // Auto-dismiss after 3 seconds in success state
  useEffect(() => {
    if (promptState === 'success') {
      const timer = setTimeout(() => {
        setPromptState('dismissed');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [promptState]);

  const submitRating = useCallback(
    async (rating: number, details?: { faceShapeAccuracy?: number; recommendationQuality?: number; previewRealism?: number }) => {
      setPromptState('submitting');
      try {
        const body: { rating: number; details?: typeof details } = { rating };
        if (details && Object.values(details).some((v) => v !== undefined && v !== null)) {
          body.details = details;
        }

        const res = await fetch(`/api/consultation/${consultationId}/rate`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          throw new Error('Failed to submit rating');
        }

        const hasDetails = !!(
          details?.faceShapeAccuracy ||
          details?.recommendationQuality ||
          details?.previewRealism
        );

        trackEvent({
          type: 'results_rated',
          rating,
          hasDetails,
          consultationId,
        });

        setRatingSubmitted(true);
        setPromptState('success');
      } catch {
        // On error, go back to rating state
        setPromptState('rating');
      }
    },
    [consultationId, setRatingSubmitted]
  );

  const handleOverallRatingChange = useCallback(
    async (value: number) => {
      setOverallRating(value);
      // Submit the overall rating immediately, then show decomposed ratings
      // Analytics event is emitted later (on final submission via submitRating), not here,
      // to avoid double-firing when the user also submits decomposed details.
      setPromptState('submitting');
      try {
        const res = await fetch(`/api/consultation/${consultationId}/rate`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ rating: value }),
        });

        if (!res.ok) {
          throw new Error('Failed to submit rating');
        }

        // Move to decomposed ratings (final analytics event emitted at handleSkipDetails or submitRating)
        setPromptState('details');
      } catch {
        setPromptState('rating');
      }
    },
    [consultationId]
  );

  const handleSubmitDetails = useCallback(async () => {
    if (overallRating === null) return; // Guard: should never be null in details state
    const details = {
      faceShapeAccuracy: faceShapeAccuracy ?? undefined,
      recommendationQuality: recommendationQuality ?? undefined,
      previewRealism: hasGeneratedPreviews ? (previewRealism ?? undefined) : undefined,
    };
    await submitRating(overallRating, details);
  }, [faceShapeAccuracy, recommendationQuality, previewRealism, hasGeneratedPreviews, overallRating, submitRating]);

  const handleSkipDetails = useCallback(() => {
    // Emit final analytics event when user skips decomposed ratings
    if (overallRating !== null) {
      trackEvent({
        type: 'results_rated',
        rating: overallRating,
        hasDetails: false,
        consultationId,
      });
    }
    setRatingSubmitted(true);
    setPromptState('success');
  }, [overallRating, consultationId, setRatingSubmitted]);

  const handleDismiss = useCallback(() => {
    setPromptState('dismissed');
  }, []);

  const handleUpdate = useCallback(() => {
    if (overallRating === null) return; // Guard: button is disabled when overallRating is null
    handleOverallRatingChange(overallRating);
  }, [overallRating, handleOverallRatingChange]);

  const motionProps = shouldReduceMotion
    ? {}
    : {
        initial: { y: 40, opacity: 0 },
        animate: { y: 0, opacity: 1 },
        transition: { duration: 0.2, ease: 'easeOut' as const },
      };

  if (promptState === 'dismissed') {
    return null;
  }

  if (promptState === 'success') {
    return (
      <motion.div
        {...motionProps}
        data-testid="rating-prompt-success"
        className="w-full px-4 py-3 mx-auto max-w-lg"
      >
        <div className="rounded-lg border bg-card px-4 py-3 text-center text-sm text-muted-foreground">
          <span>Obrigado!</span>
          {overallRating && (
            <span className="ml-2">
              {'★'.repeat(overallRating)}{'☆'.repeat(5 - overallRating)}
            </span>
          )}
        </div>
      </motion.div>
    );
  }

  if (promptState === 'details') {
    return (
      <motion.div
        {...motionProps}
        data-testid="rating-prompt-details"
        className="w-full px-4 py-3 mx-auto max-w-lg"
      >
        <div className="rounded-lg border bg-card px-4 py-4 space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Precisao do formato do rosto</span>
              <StarRating
                value={faceShapeAccuracy}
                onChange={setFaceShapeAccuracy}
                size="sm"
                label="Precisao do formato do rosto"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Qualidade das recomendacoes</span>
              <StarRating
                value={recommendationQuality}
                onChange={setRecommendationQuality}
                size="sm"
                label="Qualidade das recomendacoes"
              />
            </div>
            {hasGeneratedPreviews && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Realismo da pre-visualizacao</span>
                <StarRating
                  value={previewRealism}
                  onChange={setPreviewRealism}
                  size="sm"
                  label="Realismo da pre-visualizacao"
                />
              </div>
            )}
          </div>
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleSkipDetails}
              className="text-sm text-muted-foreground hover:underline"
            >
              Saltar
            </button>
            <button
              type="button"
              onClick={handleSubmitDetails}
              className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground"
            >
              Enviar
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // 'rating' or 'submitting' state
  const isEditing = existingRating !== null && existingRating !== undefined;

  return (
    <motion.div
      {...motionProps}
      data-testid="rating-prompt"
      className="w-full px-4 py-3 mx-auto max-w-lg"
    >
      <div className="rounded-lg border bg-card px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-medium">Como avalia esta consultoria?</span>
          <StarRating
            value={overallRating}
            onChange={handleOverallRatingChange}
            size="md"
            label="Avaliacao da consultoria"
            disabled={promptState === 'submitting'}
          />
        </div>
        <div className="mt-2 flex items-center justify-end gap-3">
          {isEditing ? (
            <button
              type="button"
              onClick={handleUpdate}
              disabled={overallRating === null || promptState === 'submitting'}
              className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
            >
              Atualizar
            </button>
          ) : (
            <button
              type="button"
              onClick={handleDismiss}
              className="text-sm text-muted-foreground hover:underline"
            >
              Agora nao
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
