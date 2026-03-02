'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { trackShareEvent } from '@/lib/utils/analytics';

// Share URL for consultation results
const SHARE_URL = 'https://mynewstyle.com';
const SHARE_TITLE = 'Meu resultado mynewstyle';
const SHARE_TEXT = 'Descubra o seu estilo em mynewstyle.com';

// Download filename per format
const FORMAT_FILENAMES: Record<'story' | 'square', string> = {
  story: 'mynewstyle-share-story.png',
  square: 'mynewstyle-share-card.png',
};

export interface UseNativeShareParams {
  /** Consultation ID for share URL scoping */
  consultationId: string;
  /** Share card format: story (9:16) or square (1:1) */
  shareFormat: 'story' | 'square';
  /** Pre-generated share card image blob from stories 9-1/9-2. Pass null when not yet ready. */
  shareImageBlob: Blob | null;
}

export interface UseNativeShareReturn {
  /** Trigger the share action (must be called from a user gesture — button click) */
  share: () => Promise<void>;
  /** True while share is in progress */
  isSharing: boolean;
  /** True if navigator.canShare({ files }) returns true for a PNG file */
  canShareFiles: boolean;
  /** True if navigator.share exists (basic URL sharing supported) */
  canShareBasic: boolean;
}

/**
 * useNativeShare
 *
 * Manages native share sheet integration for a pre-generated share card blob.
 * Implements a progressive fallback strategy:
 *
 * 1. If navigator.canShare({ files }) → share with image File + URL
 * 2. If navigator.share exists but canShare({ files }) = false → URL-only share
 * 3. If no navigator.share (desktop) → download image as PNG + copy URL to clipboard
 *
 * IMPORTANT: `share()` must only be called from a direct button click handler
 * to satisfy the browser's transient user activation requirement.
 *
 * AbortError (user cancelled share sheet) is silently handled with no toast.
 */
export function useNativeShare({
  consultationId,
  shareFormat,
  shareImageBlob,
}: UseNativeShareParams): UseNativeShareReturn {
  const [isSharing, setIsSharing] = useState(false);
  // Use a ref to guard concurrent share calls without adding isSharing to useCallback deps
  const isSharingRef = useRef(false);

  // Detect if basic Web Share API is available
  const canShareBasic = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  // Detect if file sharing is supported: requires canShare + a test File from the current blob
  const canShareFiles = useMemo((): boolean => {
    if (typeof navigator === 'undefined') return false;
    if (typeof navigator.share !== 'function') return false;
    if (typeof navigator.canShare !== 'function') return false;
    try {
      // Test with a small dummy file to verify file share support
      const testFile = new File([new Blob([''], { type: 'image/png' })], 'test.png', {
        type: 'image/png',
      });
      return navigator.canShare({ files: [testFile] });
    } catch {
      return false;
    }
  }, []);

  const share = useCallback(async (): Promise<void> => {
    // Guard against concurrent share calls using ref (avoids adding isSharing to deps)
    if (isSharingRef.current) return;
    isSharingRef.current = true;
    setIsSharing(true);

    try {
      const filename = FORMAT_FILENAMES[shareFormat];
      const shareUrl = consultationId
        ? `${SHARE_URL}/results/${consultationId}`
        : SHARE_URL;

      // Strategy 1: File sharing (mobile Safari, Chrome Android)
      if (canShareBasic && shareImageBlob !== null) {
        const testFile = new File([shareImageBlob], filename, { type: 'image/png' });
        const hasFileSupport =
          typeof navigator.canShare === 'function' && navigator.canShare({ files: [testFile] });

        if (hasFileSupport) {
          try {
            await navigator.share({
              title: SHARE_TITLE,
              text: SHARE_TEXT,
              url: shareUrl,
              files: [testFile],
            });
            trackShareEvent({
              type: 'share_generated',
              format: shareFormat,
              method: 'native_share',
              success: true,
            });
            return;
          } catch (err) {
            const domErr = err as DOMException;
            // AbortError = user cancelled → silently do nothing (AC: 8)
            if (domErr?.name === 'AbortError') {
              return;
            }
            // NotAllowedError = not triggered by user gesture → log warning, attempt clipboard fallback (AC: task 5.2)
            if (domErr?.name === 'NotAllowedError') {
              console.warn('[useNativeShare] Share not allowed (user activation required). Falling back to clipboard.');
              await desktopFallback(shareImageBlob, filename, shareUrl, shareFormat);
              return;
            }
            // Other errors: fall through to URL-only strategy
            console.error('[useNativeShare] File share failed, trying URL-only:', err);
          }
        }
      }

      // Strategy 2: URL-only share (desktop Chrome, Firefox-unsupported skips here)
      if (canShareBasic) {
        try {
          await navigator.share({
            title: SHARE_TITLE,
            text: SHARE_TEXT,
            url: shareUrl,
          });
          trackShareEvent({
            type: 'share_generated',
            format: shareFormat,
            method: 'native_share',
            success: true,
          });
          return;
        } catch (err) {
          const domErr = err as DOMException;
          if (domErr?.name === 'AbortError') {
            return;
          }
          // NotAllowedError on URL-only share → fallback to clipboard (AC: task 5.2)
          if (domErr?.name === 'NotAllowedError') {
            console.warn('[useNativeShare] URL-only share not allowed. Falling back to clipboard.');
            await desktopFallback(shareImageBlob, filename, shareUrl, shareFormat);
            return;
          }
          // Log and fall through to desktop fallback
          console.error('[useNativeShare] URL-only share failed:', err);
          toast.error('Não foi possível partilhar. Tente descarregar a imagem.');
          return;
        }
      }

      // Strategy 3: Desktop fallback — download image + copy URL to clipboard
      await desktopFallback(shareImageBlob, filename, shareUrl, shareFormat);
    } catch (err) {
      console.error('[useNativeShare] Unexpected error:', err);
      toast.error('Não foi possível partilhar. Tente descarregar a imagem.');
    } finally {
      isSharingRef.current = false;
      setIsSharing(false);
    }
  }, [shareImageBlob, shareFormat, consultationId, canShareBasic]);

  return {
    share,
    isSharing,
    canShareFiles,
    canShareBasic,
  };
}

/**
 * Desktop fallback: download image as PNG + copy URL to clipboard.
 * Shows a success toast for clipboard copy. On clipboard failure, shows error toast.
 */
async function desktopFallback(
  blob: Blob | null,
  filename: string,
  shareUrl: string,
  format: 'story' | 'square'
): Promise<void> {
  // Download image if blob is available
  let downloadSucceeded = false;
  if (blob) {
    try {
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = filename;
      link.href = objectUrl;
      link.click();
      // Clean up object URL after a tick
      setTimeout(() => URL.revokeObjectURL(objectUrl), 100);
      downloadSucceeded = true;
    } catch (err) {
      console.error('[useNativeShare] Download failed:', err);
    }
  }

  // Copy URL to clipboard
  // Method: 'download' when image was downloaded, 'copy_link' when only link is copied (no blob)
  const analyticsMethod = downloadSucceeded ? 'download' : 'copy_link';
  try {
    await navigator.clipboard.writeText(shareUrl);
    toast.success('Link copiado!');
    trackShareEvent({
      type: 'share_generated',
      format,
      method: analyticsMethod,
      success: true,
    });
  } catch (err) {
    console.error('[useNativeShare] Clipboard copy failed:', err);
    toast.error('Não foi possível copiar o link. Tente novamente.');
    trackShareEvent({
      type: 'share_generated',
      format,
      method: analyticsMethod,
      success: false,
    });
  }
}
