'use client';

import React from 'react';
import type { StyleRecommendation } from '@/types/index';
import { AlternativeRecommendationCard } from './AlternativeRecommendationCard';

// 150ms stagger between cards as per AC7 and ux-design.md#1.6 Motion spec
const STAGGER_DELAY = 0.15;

interface AlternativeRecommendationsSectionProps {
  /**
   * Array of alternative recommendations (items at index 1 and 2 from consultation.recommendations).
   * The hero card uses index 0; this section handles index 1 and 2.
   */
  recommendations: StyleRecommendation[];
  /**
   * Base delay for staggered entrance animation (seconds).
   * Each card gets baseDelay + (index * 0.15).
   */
  baseDelay?: number;
  /**
   * Optional callback for Epic 7 preview generation.
   * Passed through to each AlternativeRecommendationCard.
   */
  onPreviewRequest?: (styleName: string) => void;
}

/**
 * AlternativeRecommendationsSection — Container for recommendation cards #2 and #3.
 *
 * - 2-column grid on tablet/desktop, 1-column on mobile (pure CSS via Tailwind)
 * - Staggered animation: 150ms delay between cards
 * - Handles 0, 1, or 2 recommendation items
 * - AC: 1, 5, 7 (Story 6.3)
 */
export function AlternativeRecommendationsSection({
  recommendations,
  baseDelay = 0,
  onPreviewRequest,
}: AlternativeRecommendationsSectionProps) {
  // Ranks start at 2 (hero card holds rank 1)

  return (
    <section
      role="region"
      aria-label="Recomendacoes alternativas de corte de cabelo"
      className="w-full"
    >
      {recommendations.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recommendations.map((recommendation, index) => {
            const rank = (index + 2) as 2 | 3;
            const delay = baseDelay + index * STAGGER_DELAY;
            return (
              <AlternativeRecommendationCard
                key={`rank-${rank}-${recommendation.styleName}`}
                rank={rank}
                styleName={recommendation.styleName}
                justification={recommendation.justification}
                matchScore={recommendation.matchScore}
                difficultyLevel={recommendation.difficultyLevel}
                delay={delay}
                onPreviewRequest={onPreviewRequest}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
