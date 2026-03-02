'use client';

import { Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PreviewStatus } from '@/types/index';
import { trackEvent } from '@/lib/utils/analytics';

interface PreviewShareButtonProps {
  /** The AI-generated preview URL (signed Supabase Storage HTTPS URL) */
  previewUrl: string;
  /** Current preview generation status */
  previewStatus: PreviewStatus['status'];
  /** Style name for file naming and analytics */
  styleName: string;
  /** Recommendation rank for analytics (1 = top recommendation) */
  recommendationRank: number;
  /** Optional className */
  className?: string;
}

/**
 * Slugify a style name for use in a filename.
 * Example: "Textured Crop" -> "textured-crop"
 */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

/**
 * PreviewShareButton — Allows sharing or downloading the AI preview image individually.
 *
 * Features:
 * - Visible only when previewStatus === 'ready' and previewUrl is truthy (AC: 4, 6)
 * - Hidden for 'idle' and 'unavailable' states (AC: 6)
 * - Disabled for 'generating' state (AC: 6)
 * - Attempts Web Share API with file sharing on click (AC: 5)
 * - Falls back to programmatic download via anchor element (AC: 5)
 * - Emits `preview_shared` analytics event (AC: 7)
 * - Graceful error handling via Sonner toast (AC: 5)
 *
 * Story 9.4
 */
export function PreviewShareButton({
  previewUrl,
  previewStatus,
  styleName,
  recommendationRank,
  className,
}: PreviewShareButtonProps) {
  // AC: 6 — Hidden for idle/unavailable; not rendered at all
  if (previewStatus === 'idle' || previewStatus === 'unavailable') {
    return null;
  }

  // AC: 6 — Hidden if previewUrl is missing in 'ready' state
  if (previewStatus === 'ready' && !previewUrl) {
    return null;
  }

  const isGenerating = previewStatus === 'generating';

  const slugifiedName = slugify(styleName);
  const downloadFilename = `mynewstyle-preview-${slugifiedName}.jpg`;

  /**
   * Fetch the preview image and return it as a Blob.
   */
  const fetchImageBlob = async (url: string): Promise<Blob> => {
    const response = await fetch(url);
    return response.blob();
  };

  /**
   * Download fallback: use a pre-fetched blob (or re-fetch if not provided), create
   * an object URL, and trigger an anchor click.
   * Required for cross-origin Supabase Storage URLs (direct <a download> won't work).
   */
  const triggerDownload = async (blob?: Blob): Promise<void> => {
    const imageBlob = blob ?? (await fetchImageBlob(previewUrl));
    const objectUrl = URL.createObjectURL(imageBlob);

    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = downloadFilename;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    // Revoke after a short delay to allow browser to initiate download
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  };

  const handleClick = async () => {
    try {
      const blob = await fetchImageBlob(previewUrl);
      const imageFile = new File([blob], downloadFilename, { type: 'image/jpeg' });

      let method: 'share' | 'download' = 'download';

      // Attempt Web Share API with file sharing
      const supportsFileShare =
        typeof navigator !== 'undefined' &&
        typeof navigator.share === 'function' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [imageFile] });

      if (supportsFileShare) {
        try {
          await navigator.share({ files: [imageFile] });
          method = 'share';
        } catch (shareError) {
          // If user cancelled (AbortError), silently ignore — no fallback, no analytics
          if (shareError instanceof Error && shareError.name === 'AbortError') {
            return;
          }
          // Other share errors → fall back to download using the already-fetched blob
          await triggerDownload(blob);
          method = 'download';
        }
      } else {
        // Web Share API unavailable or file sharing not supported → download
        await triggerDownload(blob);
        method = 'download';
      }

      // AC: 7 — Emit analytics event
      trackEvent({
        type: 'preview_shared',
        recommendationRank,
        method,
        styleName,
      });
    } catch (err) {
      console.error('[PreviewShareButton] share/download failed:', err);
      toast.error('Nao foi possivel partilhar a imagem. Tente novamente.');
    }
  };

  const ariaLabel = isGenerating
    ? 'A preparar partilha…'
    : 'Partilhar ou guardar pre-visualizacao';

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={handleClick}
      disabled={isGenerating}
      aria-label={ariaLabel}
      aria-busy={isGenerating}
      className={cn('gap-1.5', className)}
    >
      <Share2 aria-hidden="true" />
      <span className="sr-only">Partilhar pre-visualizacao</span>
    </Button>
  );
}
