'use client';

import { useState, useRef, useCallback } from 'react';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';
import type { FaceAnalysisOutput } from '@/lib/ai/schemas';
import type { StyleRecommendation } from '@/types/index';
import { toDataUrl } from '@/lib/utils/image';

interface UseShareCardParams {
  faceAnalysis: FaceAnalysisOutput | null;
  recommendation: StyleRecommendation | null;
  photoPreview: string | null;
  previewUrl: string | undefined;
  gender: 'male' | 'female' | null;
  /** Consultation ID for share URL scoping */
  consultationId?: string;
}

interface UseShareCardReturn {
  /** Call to generate and share/download the share card PNG */
  generateShareCard: (format: 'story' | 'square') => Promise<void>;
  /** True while card is being generated */
  isGenerating: boolean;
  /** Ref to attach to the hidden ShareCardStoryRenderer container for capture (story format) */
  cardRef: React.RefObject<HTMLDivElement | null>;
  /** Ref to attach to the hidden ShareCardSquareRenderer container for capture (square format) */
  squareCardRef: React.RefObject<HTMLDivElement | null>;
  /** Generated story-format blob (available after generateShareCard('story') succeeds) */
  storyBlob: Blob | null;
  /** Generated square-format blob (available after generateShareCard('square') succeeds) */
  squareBlob: Blob | null;
}

// Gender-themed background colors for toPng capture
const BACKGROUND_COLORS = {
  male: '#1A1A2E',
  female: '#FFF8F0',
} as const;

// toPng dimensions per format
const FORMAT_DIMENSIONS = {
  story: { width: 540, height: 960 },
  square: { width: 540, height: 540 },
} as const;

// AI preview image data-testid per format (used for CORS pre-fetch patching)
const FORMAT_PREVIEW_TESTID = {
  story: 'share-card-story-preview',
  square: 'share-card-square-preview',
} as const;

/**
 * useShareCard
 *
 * Manages share card generation state for social media sharing.
 * Supports two formats:
 * - 'story': 9:16 (540x960 DOM → 1080x1920 at pixelRatio 2) — Instagram Stories / WhatsApp
 * - 'square': 1:1 (540x540 DOM → 1080x1080 at pixelRatio 2) — Instagram feed (AC: 1, 7)
 *
 * For each format:
 * - Renders the appropriate card off-screen via a ref
 * - Uses html-to-image's toPng() to capture the hidden div as PNG
 * - Story format: Attempts Web Share API with file on mobile via useNativeShare, falls back to download
 * - Square format: Downloads as mynewstyle-share-card.png (AC: 3, 4)
 *
 * CORS handling: Before capture, any external previewUrl (Supabase Storage AI preview)
 * is pre-fetched and converted to base64 data URL via the shared toDataUrl() utility.
 * (AC: 6 — client-side using html-to-image; AC: 7 — high-res PNG at 2x pixel ratio)
 */
export function useShareCard({
  faceAnalysis,
  recommendation,
  photoPreview,
  previewUrl,
  gender,
  consultationId = '',
}: UseShareCardParams): UseShareCardReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [storyBlob, setStoryBlob] = useState<Blob | null>(null);
  const [squareBlob, setSquareBlob] = useState<Blob | null>(null);

  // Story format ref (9:16 — attached to ShareCardStoryRenderer)
  const cardRef = useRef<HTMLDivElement | null>(null);
  // Square format ref (1:1 — attached to ShareCardSquareRenderer)
  const squareCardRef = useRef<HTMLDivElement | null>(null);

  const generateShareCard = useCallback(
    async (format: 'story' | 'square') => {
      if (isGenerating) return;
      if (!faceAnalysis || !recommendation || !photoPreview || !gender) {
        toast.error('Não foi possível gerar o cartão. Tente novamente.');
        return;
      }

      setIsGenerating(true);
      let generatedBlob: Blob | null = null;

      try {
        // Select the appropriate ref based on format
        const targetNode = format === 'square' ? squareCardRef.current : cardRef.current;
        if (!targetNode) {
          throw new Error('Card container not mounted');
        }

        // Pre-convert any external AI preview image to a data URL to avoid CORS issues.
        // photoPreview is already a base64 data URL, so only previewUrl needs conversion.
        if (previewUrl && !previewUrl.startsWith('data:')) {
          const dataUrl = await toDataUrl(previewUrl);
          const previewTestId = FORMAT_PREVIEW_TESTID[format];
          const previewImg = targetNode.querySelector<HTMLImageElement>(
            `[data-testid="${previewTestId}"]`
          );
          if (previewImg && dataUrl !== previewUrl) {
            previewImg.src = dataUrl;
            // Allow a tick for the browser to process the new src
            await new Promise<void>((resolve) => setTimeout(resolve, 50));
          }
        }

        const backgroundColor = BACKGROUND_COLORS[gender];
        const { width, height } = FORMAT_DIMENSIONS[format];

        // Convert hidden DOM node to PNG data URL at 2x pixel ratio
        // Story:  540x960  → 1080x1920 (9:16)
        // Square: 540x540  → 1080x1080 (1:1) — AC: 1 (1:1 aspect ratio, 1080x1080px output)
        const pngDataUrl = await toPng(targetNode, {
          width,
          height,
          pixelRatio: 2, // 2x for social media compression resilience — AC: 7
          backgroundColor,
        });

        // Convert data URL to Blob for native share API
        const response = await fetch(pngDataUrl);
        generatedBlob = await response.blob();

        // Store blob in state for ShareButton wiring
        if (format === 'story') {
          setStoryBlob(generatedBlob);
        } else {
          setSquareBlob(generatedBlob);
        }
      } catch (error) {
        console.error('[useShareCard] Share card generation failed:', error);
        toast.error('Não foi possível gerar o cartão. Tente novamente.');
        setIsGenerating(false);
        return;
      }

      setIsGenerating(false);

      // Route to appropriate sharing/download strategy per format
      if (format === 'story' && generatedBlob) {
        // Story: attempt Web Share API via useNativeShare (already has storyBlob set)
        // Use a temporary inline native share call since hook state may not be updated yet
        await shareWithBlob(generatedBlob, 'story', consultationId);
      } else if (format === 'square' && generatedBlob) {
        // Square: download via native share
        await shareWithBlob(generatedBlob, 'square', consultationId);
      }
    },
    [isGenerating, faceAnalysis, recommendation, photoPreview, gender, previewUrl, consultationId]
  );

  return {
    generateShareCard,
    isGenerating,
    cardRef,
    squareCardRef,
    storyBlob,
    squareBlob,
  };
}

// Share URL base
const SHARE_URL = 'https://mynewstyle.com';
const SHARE_TITLE = 'Meu resultado mynewstyle';
const SHARE_TEXT = 'Descubra o seu estilo em mynewstyle.com';

const FORMAT_FILENAMES_MAP = {
  story: 'mynewstyle-share-story.png',
  square: 'mynewstyle-share-card.png',
} as const;

/**
 * Inline share helper — used after blob is freshly generated.
 * Mirrors the progressive fallback from useNativeShare, called with the fresh blob.
 * This avoids React state timing issues (storyBlob state may not reflect new value in same tick).
 */
async function shareWithBlob(
  blob: Blob,
  format: 'story' | 'square',
  consultationId: string
): Promise<void> {
  const { toast: toastFn } = await import('sonner');
  const { trackShareEvent } = await import('@/lib/utils/analytics');

  const filename = FORMAT_FILENAMES_MAP[format];
  const shareUrl = consultationId ? `${SHARE_URL}/results/${consultationId}` : SHARE_URL;
  const file = new File([blob], filename, { type: 'image/png' });

  // Strategy 1: Native share with file
  if (typeof navigator.share === 'function') {
    const hasFileSupport =
      typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });

    if (hasFileSupport) {
      try {
        await navigator.share({ title: SHARE_TITLE, text: SHARE_TEXT, url: shareUrl, files: [file] });
        trackShareEvent({ type: 'share_generated', format, method: 'native_share', success: true });
        return;
      } catch (err) {
        if ((err as DOMException)?.name === 'AbortError') {
          return; // User cancelled silently
        }
        console.error('[useShareCard] File share failed, trying URL-only:', err);
      }
    }

    // Strategy 2: URL-only share
    try {
      await navigator.share({ title: SHARE_TITLE, text: SHARE_TEXT, url: shareUrl });
      trackShareEvent({ type: 'share_generated', format, method: 'native_share', success: true });
      return;
    } catch (err) {
      if ((err as DOMException)?.name === 'AbortError') {
        return;
      }
      console.error('[useShareCard] URL-only share failed:', err);
      toastFn.error('Não foi possível partilhar. Tente descarregar a imagem.');
      return;
    }
  }

  // Strategy 3: Desktop fallback — download + clipboard
  try {
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = filename;
    link.href = objectUrl;
    link.click();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 100);
  } catch (err) {
    console.error('[useShareCard] Download failed:', err);
  }

  try {
    await navigator.clipboard.writeText(shareUrl);
    toastFn.success('Link copiado!');
    trackShareEvent({ type: 'share_generated', format, method: 'download', success: true });
  } catch (err) {
    console.error('[useShareCard] Clipboard copy failed:', err);
    toastFn.error('Não foi possível copiar o link. Tente novamente.');
    trackShareEvent({ type: 'share_generated', format, method: 'download', success: false });
  }
}
