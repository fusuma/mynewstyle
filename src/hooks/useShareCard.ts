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

// Download filename per format
const FORMAT_FILENAMES = {
  story: 'mynewstyle-share-story.png',
  square: 'mynewstyle-share-card.png',
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
 * - Story format: Attempts Web Share API with file on mobile, falls back to download
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
}: UseShareCardParams): UseShareCardReturn {
  const [isGenerating, setIsGenerating] = useState(false);
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
      let pngDataUrl: string | null = null;

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
        pngDataUrl = await toPng(targetNode, {
          width,
          height,
          pixelRatio: 2, // 2x for social media compression resilience — AC: 7
          backgroundColor,
        });

        // TODO(Epic 10): Fire analytics event { type: 'share_generated', format } when analytics system is built

        // Route to appropriate sharing/download strategy per format
        if (format === 'story') {
          // Story: attempt Web Share API (mobile), fall back to download
          await shareOrDownload(pngDataUrl);
        } else {
          // Square: direct download (AC: 3)
          triggerDownload(pngDataUrl, FORMAT_FILENAMES[format]);
        }
      } catch (error) {
        console.error('[useShareCard] Share card generation failed:', error);
        toast.error('Não foi possível gerar o cartão. Tente novamente.');
      } finally {
        setIsGenerating(false);
      }
    },
    [isGenerating, faceAnalysis, recommendation, photoPreview, gender, previewUrl]
  );

  return {
    generateShareCard,
    isGenerating,
    cardRef,
    squareCardRef,
  };
}

/**
 * Attempts to share the PNG via Web Share API (with file support) on mobile.
 * Falls back to browser download on desktop or unsupported browsers.
 * On AbortError (user cancelled), falls back to download silently.
 */
async function shareOrDownload(pngDataUrl: string): Promise<void> {
  const filename = FORMAT_FILENAMES.story;

  // Convert data URL to Blob and File for Web Share API
  let file: File | null = null;
  try {
    const response = await fetch(pngDataUrl);
    const blob = await response.blob();
    file = new File([blob], filename, { type: 'image/png' });
  } catch {
    // If we can't create a File, fall back to download
    triggerDownload(pngDataUrl, filename);
    return;
  }

  // Check if Web Share API supports file sharing
  const canShareFile =
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [file] });

  if (canShareFile && file) {
    try {
      await navigator.share({
        title: 'Meu resultado mynewstyle',
        text: 'Descubra o seu estilo em mynewstyle.com',
        files: [file],
      });
      return;
    } catch (error) {
      // AbortError = user cancelled → fall back to download silently
      if ((error as DOMException)?.name === 'AbortError') {
        triggerDownload(pngDataUrl, filename);
        return;
      }
      // Other share errors → also fall back to download
      triggerDownload(pngDataUrl, filename);
      return;
    }
  }

  // Fallback: browser download
  triggerDownload(pngDataUrl, filename);
}

function triggerDownload(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
}
