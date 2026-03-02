'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PreviewLoadingOverlayProps {
  /** The user's photo src (data URL or URL) to display with loading animations */
  photoSrc: string;
  /** Optional additional className for the root container */
  className?: string;
}

/** Sparkle particle positions (within hair zone: top ~60% of photo) */
const SPARKLE_PARTICLES = [
  { id: 0, top: '8%',  left: '25%', delay: 0 },
  { id: 1, top: '15%', left: '65%', delay: 0.3 },
  { id: 2, top: '22%', left: '40%', delay: 0.6 },
  { id: 3, top: '30%', left: '75%', delay: 0.9 },
  { id: 4, top: '18%', left: '15%', delay: 1.2 },
  { id: 5, top: '35%', left: '55%', delay: 0.45 },
  { id: 6, top: '10%', left: '82%', delay: 0.75 },
];

/**
 * PreviewLoadingOverlay — Animated overlay shown while AI preview is generating.
 *
 * Features:
 * - User photo displayed with pulsing blur effect (AC: 4)
 * - Gradient sweep animation over hair zone — "curtain of light" effect (AC: 2)
 * - Floating sparkle particles over hair zone (AC: 3)
 * - Reduced-motion fallback: static shimmer (AC: 7)
 * - Theme-aware: uses design system tokens (AC: 9)
 * - User photo shown (AC: 1)
 *
 * Story 7.4, Task 1
 */
export function PreviewLoadingOverlay({ photoSrc, className }: PreviewLoadingOverlayProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return (
      <div
        data-testid="preview-loading-overlay"
        className={cn('relative overflow-hidden rounded-xl', className)}
      >
        {/* Photo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoSrc}
          alt="A gerar preview do seu estilo"
          className="h-full w-full object-cover"
        />

        {/* Reduced-motion: static shimmer overlay */}
        <div
          data-testid="reduced-motion-shimmer"
          className="absolute inset-0 bg-primary/20 rounded-xl flex items-center justify-center"
          aria-hidden="true"
        >
          <div className="h-8 w-8 rounded-full bg-primary/40 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="preview-loading-overlay"
      className={cn('relative overflow-hidden rounded-xl', className)}
    >
      {/* Photo with pulsing blur (AC: 4) */}
      <motion.div
        data-testid="blur-photo-container"
        animate={{
          filter: ['blur(0px)', 'blur(3px)', 'blur(0px)'],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          repeatType: 'loop',
          ease: 'easeInOut',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoSrc}
          alt="A gerar preview do seu estilo"
          className="h-full w-full object-cover"
        />
      </motion.div>

      {/* Hair zone overlay — top 60% of photo (gradient sweep + sparkles) */}
      <div
        className="absolute inset-0"
        style={{ clipPath: 'inset(0 0 40% 0)' }}
        aria-hidden="true"
      >
        {/* Gradient sweep: top-down "curtain of light" (AC: 2) */}
        <motion.div
          data-testid="gradient-sweep"
          className="absolute inset-x-0 h-full"
          style={{
            background:
              'linear-gradient(to bottom, transparent 0%, var(--color-primary, hsl(var(--primary))) 30%, transparent 100%)',
            opacity: 0.25,
          }}
          animate={{ y: ['-100%', '100%'] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Sparkle particles in hair zone (AC: 3) */}
        {SPARKLE_PARTICLES.map((particle) => (
          <motion.div
            key={particle.id}
            data-testid={`sparkle-particle-${particle.id}`}
            className="absolute h-2 w-2 rounded-full bg-primary-foreground"
            style={{
              top: particle.top,
              left: particle.left,
            }}
            animate={{
              y: [0, -10, 0],
              opacity: [0.3, 1, 0.3],
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: particle.delay,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
    </div>
  );
}
