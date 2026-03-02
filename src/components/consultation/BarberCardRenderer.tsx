'use client';

import React from 'react';
import type { FaceAnalysisOutput } from '@/lib/ai/schemas';
import type { StyleRecommendation, GroomingTip } from '@/types/index';
import { BarberCard } from './BarberCard';

interface BarberCardRendererProps {
  /** Ref forwarded to the hidden container div — used by html-to-image for capture */
  cardRef: React.RefObject<HTMLDivElement | null>;
  faceAnalysis: FaceAnalysisOutput | null;
  recommendation: StyleRecommendation | null;
  photoPreview: string | null;
  previewUrl: string | undefined;
  gender: 'male' | 'female' | null;
  groomingTips: GroomingTip[];
}

/**
 * BarberCardRenderer
 *
 * A hidden off-screen wrapper that mounts BarberCard for PNG capture by html-to-image.
 * This component is NOT visible to the user:
 * - position: absolute, off-screen (top: -9999px, left: -9999px)
 * - pointer-events: none (cannot be accidentally clicked)
 *
 * It should be mounted inside ResultsPageAnimatedReveal so it always has access
 * to the consultation data via the store and forwarded props.
 */
export function BarberCardRenderer({
  cardRef,
  faceAnalysis,
  recommendation,
  photoPreview,
  previewUrl,
  gender,
  groomingTips,
}: BarberCardRendererProps) {
  // Don't render if we lack the minimum required data
  if (!faceAnalysis || !recommendation || !photoPreview || !gender) {
    return null;
  }

  return (
    <div
      ref={cardRef as React.RefObject<HTMLDivElement>}
      aria-hidden="true"
      data-testid="barber-card-renderer"
      style={{
        position: 'absolute',
        top: '-9999px',
        left: '-9999px',
        pointerEvents: 'none',
        // Explicit dimensions so the container matches the card exactly
        width: '390px',
        height: '600px',
        overflow: 'hidden',
      }}
    >
      <BarberCard
        faceAnalysis={faceAnalysis}
        recommendation={recommendation}
        photoPreview={photoPreview}
        previewUrl={previewUrl}
        gender={gender}
        groomingTips={groomingTips}
      />
    </div>
  );
}
