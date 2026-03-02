'use client';

import { Share2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNativeShare } from '@/hooks/useNativeShare';

interface ShareButtonProps {
  /** Pre-generated share card image blob. Pass null when not yet ready — button will be disabled. */
  shareImageBlob: Blob | null;
  /** Consultation ID used to construct the share URL */
  consultationId: string;
  /** Share card format */
  format: 'story' | 'square';
  /** Button visual variant (default: 'default') */
  variant?: 'default' | 'secondary' | 'ghost';
  /** Optional additional CSS classes */
  className?: string;
}

/**
 * ShareButton
 *
 * Self-contained share trigger button that uses the useNativeShare hook.
 * Handles:
 * - Disabled state when shareImageBlob is null (share card not yet generated)
 * - Loading spinner while share is in progress
 * - Accessible aria-label and aria-busy attributes
 * - User activation requirement (only triggers share on click)
 *
 * AC: 1, 2, 5, 7, 9, 10
 */
export function ShareButton({
  shareImageBlob,
  consultationId,
  format,
  variant = 'default',
  className,
}: ShareButtonProps) {
  const { share, isSharing } = useNativeShare({
    consultationId,
    shareFormat: format,
    shareImageBlob,
  });

  const isDisabled = shareImageBlob === null || isSharing;

  const ariaLabel = isSharing
    ? 'A partilhar resultado…'
    : shareImageBlob === null
      ? 'A preparar imagem…'
      : 'Partilhar resultado';

  return (
    <Button
      variant={variant}
      onClick={share}
      disabled={isDisabled}
      aria-label={ariaLabel}
      aria-busy={isSharing}
      className={className}
    >
      {isSharing ? (
        <Loader2 className="animate-spin" aria-hidden="true" />
      ) : (
        <Share2 aria-hidden="true" />
      )}
      Partilhar resultado
    </Button>
  );
}
