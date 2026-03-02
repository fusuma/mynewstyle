'use client';

import { useCallback } from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { StyleRecommendation } from '@/types/index';
import { usePreviewGeneration } from '@/hooks/usePreviewGeneration';
import { useConsultationStore } from '@/stores/consultation';
import { PreviewLoadingOverlay } from '@/components/consultation/PreviewLoadingOverlay';
import { PreviewStatusText } from '@/components/consultation/PreviewStatusText';
import { PreviewUnavailable } from '@/components/consultation/PreviewUnavailable';
import { PreviewError } from '@/components/consultation/PreviewError';

interface HeroRecommendationCardProps {
  recommendation: StyleRecommendation;
  /** Optional stagger delay in seconds for parent orchestration */
  delay?: number;
}

const DIFFICULTY_LABELS: Record<StyleRecommendation['difficultyLevel'], string> = {
  low: 'Baixa',
  medium: 'Media',
  high: 'Alta',
};

/**
 * HeroRecommendationCard — Displays the #1 ranked hairstyle recommendation
 * prominently as a hero card on the results page.
 *
 * Story 7.4 updates:
 * - Replaced placeholder handleVerComoFico with actual preview generation (Task 4.1)
 * - Shows PreviewLoadingOverlay when generating (Task 4.2)
 * - Disables button when another preview is generating (Task 4.3)
 * - Visual disabled state with opacity/cursor (Task 4.4)
 *
 * AC: 1-12 (Story 6.2), AC: 1, 6 (Story 7.4)
 */
export function HeroRecommendationCard({
  recommendation,
  delay = 0,
}: HeroRecommendationCardProps) {
  const shouldReduceMotion = useReducedMotion();
  const photoPreview = useConsultationStore((s) => s.photoPreview);

  const { isAnyGenerating, triggerPreview, getPreviewStatus } = usePreviewGeneration();

  // Use styleName as the recommendationId key (stable identifier)
  const recommendationId = recommendation.styleName;
  const previewStatus = getPreviewStatus(recommendationId);

  const matchPercent = Math.round(recommendation.matchScore * 100);
  const difficultyLabel = DIFFICULTY_LABELS[recommendation.difficultyLevel];

  const isGenerating = previewStatus.status === 'generating';
  const isReady = previewStatus.status === 'ready';
  const isFailed = previewStatus.status === 'failed';
  const isUnavailable = previewStatus.status === 'unavailable';

  // Framer Motion variants — respects prefers-reduced-motion (AC: 10)
  const cardVariants: Variants = shouldReduceMotion
    ? { hidden: {}, visible: {} }
    : {
        hidden: { opacity: 0, y: 20 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.4, delay },
        },
      };

  const handleVerComoFico = useCallback(() => {
    if (isAnyGenerating) return;
    void triggerPreview(recommendationId, recommendation.styleName);
  }, [isAnyGenerating, triggerPreview, recommendationId, recommendation.styleName]);

  const handleRetry = useCallback(() => {
    void triggerPreview(recommendationId, recommendation.styleName);
  }, [triggerPreview, recommendationId, recommendation.styleName]);

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
    >
      <Card
        className={cn(
          'w-full border-2 border-primary/60 shadow-elevated'
        )}
        role="article"
        aria-label="Recomendacao principal de corte de cabelo"
      >
        <CardContent className="pb-6 pt-2">
          {/* #1 Badge (AC: 1) */}
          <div className="mb-4 flex items-center justify-start">
            <Badge
              variant="default"
              aria-label="Recomendacao principal — melhor corte para o seu rosto"
            >
              #1 Recomendacao Principal
            </Badge>
          </div>

          {/* Style Name (AC: 2) */}
          <h2
            className={cn(
              'font-display font-semibold text-foreground mb-3',
              'text-2xl md:text-3xl'
            )}
          >
            {recommendation.styleName}
          </h2>

          {/* Justification text (AC: 3) */}
          <p className="text-base leading-relaxed text-muted-foreground mb-4">
            {recommendation.justification}
          </p>

          {/* Match Score (AC: 4) */}
          <div
            className="mb-3"
            aria-label={`Compatibilidade: ${matchPercent}% compativel com o seu rosto`}
          >
            <span className="text-lg font-semibold text-foreground">
              {matchPercent}% compativel com o seu rosto
            </span>
          </div>

          {/* Difficulty Badge (AC: 5) */}
          <div className="mb-6">
            <Badge
              variant="outline"
              aria-label={`Dificuldade de manutencao: ${difficultyLabel}`}
            >
              Manutencao: {difficultyLabel}
            </Badge>
          </div>

          {/* Preview area: shows loading overlay / ready state / error states */}
          {isGenerating && (
            <div className="mb-4 space-y-3">
              {photoPreview && (
                <PreviewLoadingOverlay
                  photoSrc={photoPreview}
                  className="h-64 w-full"
                />
              )}
              {/* PreviewStatusText is always shown while generating (AC: 5, 10) — even when photo is unavailable */}
              <PreviewStatusText />
            </div>
          )}

          {isReady && previewStatus.previewUrl && (
            <div className="mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewStatus.previewUrl}
                alt={`Preview do estilo ${recommendation.styleName}`}
                className="w-full rounded-xl object-cover"
              />
            </div>
          )}

          {isFailed && (
            <div className="mb-4">
              <PreviewError onRetry={handleRetry} />
            </div>
          )}

          {isUnavailable && (
            <div className="mb-4">
              <PreviewUnavailable />
            </div>
          )}

          {/* "Ver como fico" button (Task 4.2, 4.3, 4.4) */}
          {!isReady && !isUnavailable && (
            <Button
              variant="default"
              size="default"
              className={cn(
                'w-full text-base font-semibold',
                isAnyGenerating && 'opacity-50 cursor-not-allowed'
              )}
              onClick={handleVerComoFico}
              disabled={isAnyGenerating}
              aria-label={
                isAnyGenerating
                  ? 'Aguarde a geracao atual terminar'
                  : 'Ver como fico — visualizar o corte no meu rosto'
              }
              aria-disabled={isAnyGenerating}
            >
              {isGenerating ? 'A gerar...' : 'Ver como fico'}
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
