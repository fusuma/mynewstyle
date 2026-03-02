'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PreviewStatus } from '@/types/index';
import { BeforeAfterSlider } from '@/components/consultation/BeforeAfterSlider';
import { PreviewToggleButtons } from '@/components/consultation/PreviewToggleButtons';
import { PreviewError } from '@/components/consultation/PreviewError';

interface PreviewDisplayProps {
  /** The user's original photo URL (from consultation store photoPreview) */
  originalPhoto: string;
  /** The AI-generated preview URL (null when not yet available) */
  previewUrl: string | null;
  /** Current preview generation status */
  previewStatus: PreviewStatus['status'];
  /** Style name for alt text */
  styleName: string;
  /** Optional retry callback for failed state */
  onRetry?: () => void;
  /** Optional className */
  className?: string;
}

/**
 * PreviewDisplay — Orchestrator component for showing AI preview comparison.
 *
 * Features:
 * - Crossfade transition from loading to preview (500ms ease-out) via Framer Motion (AC: 1, 9)
 * - BeforeAfterSlider on screens >=375px (using Tailwind min-[375px]: classes) (AC: 2)
 * - PreviewToggleButtons on screens <375px (using Tailwind block/min-[375px]:hidden) (AC: 3)
 * - Expectation framing text below preview (AC: 4)
 * - Watermark "mynewstyle.com" bottom-right, low opacity (AC: 5)
 * - Unavailable state message (AC: 8)
 * - Respects prefers-reduced-motion (AC: 10)
 * - Theme-aware design tokens (AC: 11)
 * - Accessible alt text for preview image (AC: 12)
 *
 * Story 7.5, Task 3
 */
export function PreviewDisplay({
  originalPhoto,
  previewUrl,
  previewStatus,
  styleName,
  onRetry,
  className,
}: PreviewDisplayProps) {
  const shouldReduceMotion = useReducedMotion();

  const previewAlt = `Visualizacao IA: ${styleName} aplicado ao seu rosto`;

  // Motion variants for crossfade (AC: 9)
  const fadeVariants = shouldReduceMotion
    ? {
        initial: { opacity: 1 },
        animate: { opacity: 1 },
        exit: { opacity: 1 },
      }
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: { duration: 0.5, ease: 'easeOut' as const } },
        exit: { opacity: 0, transition: { duration: 0.5 } },
      };

  if (previewStatus === 'failed') {
    return (
      <div className={cn('w-full', className)}>
        <PreviewError onRetry={onRetry ?? (() => {})} />
      </div>
    );
  }

  if (previewStatus === 'unavailable') {
    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-xl border border-border bg-muted/30 p-4',
          className
        )}
        role="status"
        aria-label="Visualizacao indisponivel para este estilo"
        data-testid="preview-unavailable-message"
      >
        <Info className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">
          Visualizacao indisponivel para este estilo — veja as recomendacoes escritas
        </p>
      </div>
    );
  }

  if (previewStatus === 'ready' && previewUrl) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="preview-ready"
          initial={fadeVariants.initial}
          animate={fadeVariants.animate}
          exit={fadeVariants.exit}
          className={cn('w-full space-y-3', className)}
        >
          {/* Preview comparison area with watermark */}
          <div className="relative">
            {/* Slider — hidden on smallest screens (<375px), shown on >=375px */}
            <div
              data-testid="slider-wrapper"
              className="hidden min-[375px]:block"
            >
              <BeforeAfterSlider
                originalSrc={originalPhoto}
                previewSrc={previewUrl}
                previewAlt={previewAlt}
              />
            </div>

            {/* Toggle buttons — shown on smallest screens (<375px), hidden on >=375px */}
            <div
              data-testid="toggle-wrapper"
              className="block min-[375px]:hidden"
            >
              <PreviewToggleButtons
                originalSrc={originalPhoto}
                previewSrc={previewUrl}
                previewAlt={previewAlt}
              />
            </div>

            {/* Watermark (AC: 5) — absolutely positioned over the slider container (>=375px only) */}
            <span
              className={cn(
                'absolute bottom-2 right-2',
                'text-xs font-medium text-foreground/30',
                'select-none pointer-events-none',
                'hidden min-[375px]:block'
              )}
              aria-hidden="true"
            >
              mynewstyle.com
            </span>
          </div>

          {/* Expectation framing text (AC: 4) */}
          <p className="text-xs text-center text-muted-foreground leading-relaxed">
            Visualizacao artistica — resultado depende do seu cabelo e cabeleireiro
          </p>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Idle or generating state — render nothing (parent handles loading overlay)
  return null;
}
