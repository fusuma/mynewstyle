'use client';

import React from 'react';
import type { FaceAnalysisOutput } from '@/lib/ai/schemas';
import type { StyleRecommendation } from '@/types/index';
import { ShareCardSquare } from './ShareCardSquare';

interface ShareCardSquareRendererProps {
  /** Ref forwarded to the hidden container div — used by html-to-image for capture */
  cardRef: React.RefObject<HTMLDivElement | null>;
  faceAnalysis: FaceAnalysisOutput | null;
  recommendation: StyleRecommendation | null;
  photoPreview: string | null;
  previewUrl: string | undefined;
  gender: 'male' | 'female' | null;
}

/**
 * ShareCardSquareRenderer
 *
 * A hidden off-screen wrapper that mounts ShareCardSquare for PNG capture by html-to-image.
 * This component is NOT visible to the user:
 * - position: absolute, off-screen (top: -9999px, left: -9999px)
 * - pointer-events: none (cannot be accidentally clicked)
 * - aria-hidden: true (excluded from accessibility tree)
 *
 * Container dimensions are 540x540px (half of 1080x1080).
 * Captured at pixelRatio: 2 → produces 1080x1080 PNG (1:1 for Instagram feed).
 *
 * Based on the BarberCardRenderer / ShareCardStoryRenderer pattern from stories 7-7 and 9-1.
 */
export function ShareCardSquareRenderer({
  cardRef,
  faceAnalysis,
  recommendation,
  photoPreview,
  previewUrl,
  gender,
}: ShareCardSquareRendererProps) {
  // Don't render if we lack the minimum required data
  if (!faceAnalysis || !recommendation || !photoPreview || !gender) {
    return null;
  }

  return (
    <div
      ref={cardRef as React.RefObject<HTMLDivElement>}
      aria-hidden="true"
      data-testid="share-card-square-renderer"
      style={{
        position: 'absolute',
        top: '-9999px',
        left: '-9999px',
        pointerEvents: 'none',
        // Explicit square dimensions so the container matches the card exactly
        width: '540px',
        height: '540px',
        overflow: 'hidden',
      }}
    >
      <ShareCardSquare
        faceAnalysis={faceAnalysis}
        recommendation={recommendation}
        photoPreview={photoPreview}
        previewUrl={previewUrl}
        gender={gender}
      />
    </div>
  );
}
