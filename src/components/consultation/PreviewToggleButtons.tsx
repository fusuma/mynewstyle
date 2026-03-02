'use client';

import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PreviewToggleButtonsProps {
  /** The user's original photo URL */
  originalSrc: string;
  /** The AI-generated preview URL */
  previewSrc: string;
  /** Alt text for preview image */
  previewAlt: string;
  /** Alt text for original image */
  originalAlt?: string;
  /** Optional className */
  className?: string;
}

type ActiveTab = 'original' | 'novo-estilo';

/**
 * PreviewToggleButtons — Toggle buttons for before/after comparison on small mobile (<375px).
 *
 * Features:
 * - Two toggle buttons: "Original" and "Novo Estilo" (AC: 3)
 * - Active button: bg-primary text-primary-foreground (AC: 3)
 * - Inactive button: bg-muted text-muted-foreground (AC: 3)
 * - Crossfade between original and preview images using Framer Motion AnimatePresence (AC: 3)
 * - Reduced-motion: instant swap without crossfade (AC: 10)
 * - Min button height 48px for touch accessibility (AC: 3)
 * - Uses design system tokens (AC: 11)
 *
 * Story 7.5, Task 2
 */
export function PreviewToggleButtons({
  originalSrc,
  previewSrc,
  previewAlt,
  originalAlt = 'Foto original',
  className,
}: PreviewToggleButtonsProps) {
  const shouldReduceMotion = useReducedMotion();
  const [activeTab, setActiveTab] = useState<ActiveTab>('original');

  const currentSrc = activeTab === 'original' ? originalSrc : previewSrc;
  const currentAlt = activeTab === 'original' ? originalAlt : previewAlt;

  const imageVariants = shouldReduceMotion
    ? {
        initial: { opacity: 1 },
        animate: { opacity: 1 },
        exit: { opacity: 1 },
      }
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: { duration: 0.3, ease: 'easeOut' as const } },
        exit: { opacity: 0, transition: { duration: 0.2 } },
      };

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Toggle buttons */}
      <div className="flex gap-2" role="group" aria-label="Comparar imagens">
        <button
          type="button"
          onClick={() => setActiveTab('original')}
          className={cn(
            'flex-1 min-h-[48px] rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            activeTab === 'original'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground'
          )}
          aria-pressed={activeTab === 'original'}
        >
          Original
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('novo-estilo')}
          className={cn(
            'flex-1 min-h-[48px] rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            activeTab === 'novo-estilo'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground'
          )}
          aria-pressed={activeTab === 'novo-estilo'}
        >
          Novo Estilo
        </button>
      </div>

      {/* Image with crossfade */}
      <div className="relative w-full overflow-hidden rounded-xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={imageVariants.initial}
            animate={imageVariants.animate}
            exit={imageVariants.exit}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentSrc}
              alt={currentAlt}
              className="w-full rounded-xl object-cover"
            />
          </motion.div>
        </AnimatePresence>

        {/* Watermark — shown on the preview (AI) image (AC: 5) */}
        {activeTab === 'novo-estilo' && (
          <span
            className="absolute bottom-2 right-2 text-xs font-medium text-foreground/30 select-none pointer-events-none z-10"
            aria-hidden="true"
          >
            mynewstyle.com
          </span>
        )}
      </div>
    </div>
  );
}
