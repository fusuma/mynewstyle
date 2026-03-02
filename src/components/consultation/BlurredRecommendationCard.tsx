'use client';

import React from 'react';

interface BlurredRecommendationCardProps {
  rank: number; // 1, 2, or 3
}

/**
 * Static placeholder card showing a blurred teaser of a recommendation.
 * SECURITY: This component contains NO real consultation data.
 * All content is generic placeholder text with CSS blur applied.
 * Real consultation data is only sent to the client after payment confirmation (Story 5.5).
 */
export function BlurredRecommendationCard({ rank }: BlurredRecommendationCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 relative overflow-hidden">
      {/* Card header - rank label (not blurred) */}
      <p className="text-sm font-semibold text-muted-foreground mb-3">
        Recomendacao #{rank}
      </p>

      {/* Blurred placeholder content - generic/fake, NO real data */}
      <div className="blur-sm select-none" aria-hidden="true">
        {/* Fake style name placeholder */}
        <div className="h-5 bg-muted rounded w-3/4 mb-2" />
        {/* Fake description lines */}
        <div className="h-3 bg-muted rounded w-full mb-1.5" />
        <div className="h-3 bg-muted rounded w-5/6 mb-1.5" />
        <div className="h-3 bg-muted rounded w-4/6 mb-3" />
        {/* Fake detail items */}
        <div className="h-3 bg-muted rounded w-2/3 mb-1.5" />
        <div className="h-3 bg-muted rounded w-1/2 mb-3" />
      </div>

      {/* Disabled preview button */}
      <button
        disabled
        className="mt-2 w-full rounded-lg border border-border bg-muted py-2 text-sm text-muted-foreground opacity-50 cursor-not-allowed"
        aria-label="Ver como fico"
      >
        Ver como fico
      </button>
    </div>
  );
}
