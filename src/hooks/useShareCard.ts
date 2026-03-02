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
  generateShareCard: (format: 'story') => Promise<void>;
  /** True while card is being generated */
  isGenerating: boolean;
  /** Ref to attach to the hidden ShareCardStoryRenderer container for capture */
  cardRef: React.RefObject<HTMLDivElement | null>;
}

// Gender-themed background colors for toPng capture
const BACKGROUND_COLORS = {
  male: '#1A1A2E',
  female: '#FFF8F0',
} as const;

/**
 * useShareCard
 *
 * Manages share card generation state for social story sharing.
 * - Renders ShareCardStory off-screen via a ref (attached to ShareCardStoryRenderer)
 * - Uses html-to-image's toPng() to capture the hidden div as PNG (1080x1920 at pixelRatio 2)
 * - Attempts Web Share API with file on mobile (navigator.share + canShare with files)
 * - Falls back to browser download as mynewstyle-share-story.png
 * - Emits analytics placeholder console.log on success
 *
 * CORS handling: Before capture, any external previewUrl (Supabase Storage AI preview)
 * is pre-fetched and converted to base64 data URL via the shared toDataUrl() utility.
 */
export function useShareCard({
  faceAnalysis,
  recommendation,
  photoPreview,
  previewUrl,
  gender,
}: UseShareCardParams): UseShareCardReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const generateShareCard = useCallback(
    async (format: 'story') => {
      if (isGenerating) return;
      if (!faceAnalysis || !recommendation || !photoPreview || !gender) {
        toast.error('Não foi possível gerar o cartão. Tente novamente.');
        return;
      }

      setIsGenerating(true);
      let pngDataUrl: string | null = null;

      try {
        const targetNode = cardRef.current;
        if (!targetNode) {
          throw new Error('Card container not mounted');
        }

        // Pre-convert any external AI preview image to a data URL to avoid CORS issues.
        // photoPreview is already a base64 data URL, so only previewUrl needs conversion.
        if (previewUrl && !previewUrl.startsWith('data:')) {
          const dataUrl = await toDataUrl(previewUrl);
          const previewImg = targetNode.querySelector<HTMLImageElement>(
            '[data-testid="share-card-story-preview"]'
          );
          if (previewImg && dataUrl !== previewUrl) {
            previewImg.src = dataUrl;
            // Allow a tick for the browser to process the new src
            await new Promise<void>((resolve) => setTimeout(resolve, 50));
          }
        }

        const backgroundColor = BACKGROUND_COLORS[gender];

        // Convert hidden DOM node to PNG data URL (540x960 → 1080x1920 at pixelRatio 2)
        pngDataUrl = await toPng(targetNode, {
          width: 540,
          height: 960,
          pixelRatio: 2,
          backgroundColor,
        });

        // Analytics placeholder (Epic 10 not yet built)
        console.log('[analytics] share_generated', { format });

        // Attempt Web Share API with file (mobile)
        await shareOrDownload(pngDataUrl);
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
  };
}

/**
 * Attempts to share the PNG via Web Share API (with file support) on mobile.
 * Falls back to browser download on desktop or unsupported browsers.
 * On AbortError (user cancelled), falls back to download silently.
 */
async function shareOrDownload(pngDataUrl: string): Promise<void> {
  const filename = 'mynewstyle-share-story.png';

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
