'use client';

import { useState, useRef, useCallback } from 'react';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';
import type { FaceAnalysisOutput } from '@/lib/ai/schemas';
import type { StyleRecommendation, GroomingTip } from '@/types/index';

interface UseBarberCardParams {
  faceAnalysis: FaceAnalysisOutput | null;
  recommendation: StyleRecommendation | null;
  photoPreview: string | null;
  previewUrl: string | undefined;
  gender: 'male' | 'female' | null;
  groomingTips: GroomingTip[];
}

interface UseBarberCardReturn {
  /** Call to generate and download the barber reference card as PNG */
  generateCard: () => Promise<void>;
  /** True while card is being generated */
  isGenerating: boolean;
  /** Ref to attach to the hidden BarberCardRenderer container for capture */
  cardRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Converts an external image URL to a base64 data URL.
 * Required to avoid CORS failures when html-to-image captures external images
 * (e.g. AI preview images stored in Supabase Storage).
 * Returns the original URL if fetch fails — html-to-image will attempt its own inline.
 */
async function toDataUrl(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) return url;
    const blob = await response.blob();
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(url); // fallback to original on error
      reader.readAsDataURL(blob);
    });
  } catch {
    return url; // fallback: let html-to-image try on its own
  }
}

/**
 * useBarberCard
 *
 * Manages barber reference card generation state.
 * - Renders BarberCard off-screen via a ref (attached to BarberCardRenderer)
 * - Uses html-to-image's toPng() to capture the hidden div as PNG
 * - Triggers browser download of PNG file: mynewstyle-barber-card.png
 * - Returns { generateCard, isGenerating, cardRef }
 *
 * CORS handling: Before capture, any external image URLs (Supabase Storage AI preview)
 * are pre-fetched and converted to base64 data URLs. This is necessary because
 * html-to-image's SVG foreignObject cannot load cross-origin images without CORS.
 */
export function useBarberCard({
  faceAnalysis,
  recommendation,
  photoPreview,
  previewUrl,
  gender,
}: UseBarberCardParams): UseBarberCardReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const generateCard = useCallback(async () => {
    if (isGenerating) return;
    if (!faceAnalysis || !recommendation || !photoPreview || !gender) {
      toast.error('Dados insuficientes para gerar o cartão do barbeiro.');
      return;
    }

    setIsGenerating(true);
    try {
      const targetNode = cardRef.current;
      if (!targetNode) {
        throw new Error('Card container not mounted');
      }

      // Pre-convert any external AI preview image to a data URL to avoid CORS issues.
      // The photoPreview is already a base64 data URL from the store, so no conversion needed.
      // Only previewUrl (Supabase Storage URL) needs conversion.
      if (previewUrl && !previewUrl.startsWith('data:')) {
        const dataUrl = await toDataUrl(previewUrl);
        // Patch the img src in the card DOM node before capture
        const previewImg = targetNode.querySelector<HTMLImageElement>(
          '[data-testid="barber-card-ai-preview"]'
        );
        if (previewImg && dataUrl !== previewUrl) {
          previewImg.src = dataUrl;
          // Allow a tick for the browser to process the new src
          await new Promise<void>((resolve) => setTimeout(resolve, 50));
        }
      }

      // Convert hidden DOM node to PNG data URL
      const pngDataUrl = await toPng(targetNode, {
        width: 390,
        height: 600,
        pixelRatio: 2, // Retina sharpness
        backgroundColor: '#FFFFFF',
      });

      // Trigger browser download
      const link = document.createElement('a');
      link.download = 'mynewstyle-barber-card.png';
      link.href = pngDataUrl;
      link.click();
    } catch (error) {
      console.error('[useBarberCard] PNG generation failed:', error);
      toast.error('Não foi possível gerar o cartão. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  }, [isGenerating, faceAnalysis, recommendation, photoPreview, gender, previewUrl]);

  return {
    generateCard,
    isGenerating,
    cardRef,
  };
}
