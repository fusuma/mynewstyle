'use client';

import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { StylingTipCard } from './StylingTipCard';
import { resolveIcon } from './styling-tips/icon-resolver';
import type { GroomingTip } from '@/types/index';

// ---- Category labels (AC: #3) ----

/**
 * Display labels for each tip category.
 * Per story 6.6 spec:
 * - products -> "Produtos"
 * - routine -> "Rotina Diaria"
 * - barber_tips (male) -> "Dicas para o Barbeiro/Cabeleireiro"
 * - barber_tips (female) -> "Dicas para o Cabeleireiro"
 */
const CATEGORY_LABELS: Record<GroomingTip['category'], { male: string; female: string }> = {
  products: { male: 'Produtos', female: 'Produtos' },
  routine: { male: 'Rotina Diaria', female: 'Rotina Diaria' },
  barber_tips: { male: 'Dicas para o Barbeiro/Cabeleireiro', female: 'Dicas para o Cabeleireiro' },
};

/** Canonical category render order (AC: #3) */
const CATEGORY_ORDER: GroomingTip['category'][] = ['products', 'routine', 'barber_tips'];

// ---- Animation variants (AC: #4 via framer-motion) ----

const containerVariants = (shouldReduceMotion: boolean): Variants => ({
  hidden: {},
  visible: {
    transition: { staggerChildren: shouldReduceMotion ? 0 : 0.15 },
  },
});

const itemVariants = (shouldReduceMotion: boolean): Variants =>
  shouldReduceMotion
    ? { hidden: {}, visible: {} }
    : {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
      };

// ---- StylingTipsSection main component ----

interface StylingTipsSectionProps {
  /**
   * Array of grooming tips from consultation data.
   * Reuses existing GroomingTip type (AC: #1 — parsed from AI output).
   */
  groomingTips: GroomingTip[];
  /** Gender for conditional category label (barber vs cabeleireiro) */
  gender: 'male' | 'female';
}

/**
 * StylingTipsSection — Section F of the results page.
 *
 * Displays styling tips grouped by category with staggered animation.
 * Gender-specific label for barber_tips category (female -> Cabeleireiro).
 * 3-column grid on lg+, 2-column on md, single column on mobile.
 *
 * Returns null if groomingTips is empty or undefined (AC: #7).
 *
 * AC: #1, #3, #4, #6, #7 (Story 6.6)
 */
export function StylingTipsSection({ groomingTips, gender }: StylingTipsSectionProps) {
  const shouldReduceMotion = useReducedMotion() ?? false;

  // AC: #7 — empty state: do not render if no tips
  if (!groomingTips || groomingTips.length === 0) {
    return null;
  }

  // Group tips by category (AC: #3)
  const grouped: Partial<Record<GroomingTip['category'], GroomingTip[]>> = {};
  for (const tip of groomingTips) {
    if (!grouped[tip.category]) {
      grouped[tip.category] = [];
    }
    grouped[tip.category]!.push(tip);
  }

  const container = containerVariants(shouldReduceMotion);
  const item = itemVariants(shouldReduceMotion);

  return (
    // AC: region with accessible label — WCAG 2.1 AA
    <section aria-label="Dicas de Estilo" className="w-full">
      {/* Section header */}
      <h2 className="font-semibold text-foreground text-lg mb-4">
        Dicas de Estilo
      </h2>

      {/* Render categories in defined order — only those with tips (AC: #3) */}
      <div className="flex flex-col gap-6">
        {CATEGORY_ORDER.map((category) => {
          const tips = grouped[category];
          if (!tips || tips.length === 0) return null;

          const label = CATEGORY_LABELS[category][gender];

          return (
            <div key={category}>
              {/* Category sub-header (AC: #3) */}
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                {label}
              </h3>

              {/* Card grid: 3-column on lg+, 2-column on md, single on mobile (AC: #4) */}
              {/* role="list" for accessibility (WCAG 2.1 AA) */}
              <motion.div
                role="list"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                variants={container}
                initial="hidden"
                animate="visible"
              >
                {tips.map((tip, index) => {
                  // Resolve icon outside of StylingTipCard render to satisfy lint rule
                  const IconComponent = resolveIcon(tip.icon);
                  return (
                    <motion.div key={`${category}-${index}`} variants={item}>
                      <StylingTipCard
                        tipText={tip.tipText}
                        icon={tip.icon}
                        category={label}
                        IconComponent={IconComponent}
                      />
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
