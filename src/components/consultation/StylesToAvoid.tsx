'use client';

import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import type { StyleToAvoid } from '@/types/index';

// 150ms stagger between cards per UX spec (AC: 6)
const STAGGER_DELAY = 0.15;

interface StylesToAvoidProps {
  stylesToAvoid: StyleToAvoid[];
}

interface StyleToAvoidCardProps {
  styleName: string;
  reason: string;
  delay?: number;
}

/**
 * StyleToAvoidCard — Individual card for a style to avoid.
 *
 * Visual style: muted/warning — distinct from recommendation cards.
 * Uses bg-muted/50 with subtle border; no accent color.
 *
 * AC: 3, 4, 8 (Story 6.4)
 */
function StyleToAvoidCard({
  styleName,
  reason,
  delay = 0,
}: StyleToAvoidCardProps) {
  // Each card reads its own reduced-motion preference (AC: 6)
  const shouldReduceMotion = useReducedMotion() ?? false;

  // Entrance animation with stagger — respects prefers-reduced-motion (AC: 6)
  const cardVariants: Variants = shouldReduceMotion
    ? { hidden: {}, visible: {} }
    : {
        hidden: { opacity: 0, y: 16 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.35, delay },
        },
      };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Semantic article per AC: 8 — labelled by styleName for screen readers */}
      <div
        role="article"
        aria-label={styleName}
        className="rounded-xl bg-muted/50 border border-border p-4"
      >
        {/* Style name — font-semibold per design spec */}
        <p className="font-semibold text-foreground">
          {styleName}
        </p>
        {/* Reason — muted body text per design spec */}
        <p className="text-sm text-muted-foreground mt-1">
          {reason}
        </p>
      </div>
    </motion.div>
  );
}

/**
 * StylesToAvoid — Section D of the results page.
 *
 * Displays 2-3 style-to-avoid cards with muted/warning visual style.
 * Positioned after recommendation sections (B & C) and before grooming tips (E).
 *
 * Returns null when stylesToAvoid is empty (AC: 2, Task: empty state).
 *
 * AC: 1, 2, 3, 4, 6, 7, 8 (Story 6.4)
 */
export function StylesToAvoid({ stylesToAvoid }: StylesToAvoidProps) {
  // Empty state: render nothing (AC: 2, anti-pattern avoidance)
  if (!stylesToAvoid || stylesToAvoid.length === 0) {
    return null;
  }

  return (
    <section aria-label="Estilos a evitar" className="w-full">
      {/* Section header with warning icon (AC: 1) */}
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle
          className="w-5 h-5 text-amber-500"
          aria-hidden="true"
        />
        <h2 className="font-semibold text-foreground text-lg">
          Estilos a evitar
        </h2>
      </div>

      {/* Cards layout: single column on mobile, grid on tablet/desktop (AC: 7) */}
      <div className="flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-4">
        {stylesToAvoid.map((style, index) => (
          <StyleToAvoidCard
            key={index}
            styleName={style.styleName}
            reason={style.reason}
            delay={index * STAGGER_DELAY}
          />
        ))}
      </div>
    </section>
  );
}
