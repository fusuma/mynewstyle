'use client';

import { motion, useReducedMotion, type Variants } from 'framer-motion';
import {
  Scissors,
  Droplets,
  Clock,
  SprayCan,
  Wand2,
  Sparkles,
  Brush,
  ShowerHead,
  Star,
  Palette,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { GroomingTip } from '@/types/index';

// ---- Icon mapping (AC: #3, #5) ----

const ICON_MAP: Record<string, React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false'; 'aria-label'?: string }>> = {
  scissors: Scissors,
  droplets: Droplets,
  clock: Clock,
  'spray-can': SprayCan,
  comb: Wand2,
  brush: Brush,
  'shower-head': ShowerHead,
  star: Star,
  palette: Palette,
};

function getIcon(iconName: string) {
  return ICON_MAP[iconName.toLowerCase()] ?? Sparkles;
}

// ---- Category labels (AC: #5) ----

const CATEGORY_LABELS: Record<GroomingTip['category'], { male: string; female: string }> = {
  products: { male: 'Produtos', female: 'Produtos' },
  routine: { male: 'Rotina Diária', female: 'Rotina Diária' },
  barber_tips: { male: 'Dicas para o Barbeiro', female: 'Dicas para o Cabeleireiro' },
};

// Category render order (AC: #5)
const CATEGORY_ORDER: GroomingTip['category'][] = ['products', 'routine', 'barber_tips'];

// ---- Animation variants (AC: #8) ----

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

// ---- GroomingTipCard sub-component (Task 2) ----

interface GroomingTipCardProps {
  tip: GroomingTip;
  categoryLabel: string;
  // Icon component resolved outside of render to satisfy lint rule
  IconComponent: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false'; 'aria-label'?: string }>;
}

/**
 * GroomingTipCard — Individual card for a single grooming tip.
 *
 * Visual: icon at 24px accent color, category badge (muted), tip body text.
 * Card uses rounded-2xl, 16px border-radius equivalent, standard shadow.
 *
 * AC: #3, #4, #6, #9 (Story 6.5)
 */
function GroomingTipCard({ tip, categoryLabel, IconComponent }: GroomingTipCardProps) {
  return (
    // role="listitem" — AC: #9 accessibility
    <div role="listitem">
      <Card className="rounded-2xl shadow-sm h-full">
        <CardContent className="flex flex-col gap-3 pt-4">
          {/* Category badge (AC: #5) using muted/secondary variant */}
          <Badge variant="secondary" className="w-fit text-xs font-semibold">
            {categoryLabel}
          </Badge>

          {/* Icon row (AC: #3) — icon at 24px with accent color */}
          <div className="flex items-start gap-3">
            <IconComponent
              className="w-6 h-6 text-accent-foreground shrink-0 mt-0.5"
              aria-hidden="true"
            />

            {/* Tip text body (AC: #4) — Inter 400, 16px */}
            <p className="text-base font-normal text-card-foreground leading-snug">
              {tip.tipText}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ---- GroomingTips main component (Task 1) ----

interface GroomingTipsProps {
  groomingTips: GroomingTip[];
  gender: 'male' | 'female';
}

/**
 * GroomingTips — Section E of the results page.
 *
 * Displays grooming tips grouped by category with staggered animation.
 * Gender-specific label for barber_tips category.
 * 2-column grid on md+ breakpoint, single column on mobile.
 *
 * AC: #1–#9 (Story 6.5)
 */
export function GroomingTips({ groomingTips, gender }: GroomingTipsProps) {
  const shouldReduceMotion = useReducedMotion() ?? false;

  if (!groomingTips || groomingTips.length === 0) {
    return null;
  }

  // Group tips by category (AC: #5)
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
    // AC: #9 — section with aria-label; role="region" implicit from <section>
    <section aria-label="Cuidados e Dicas" className="w-full">
      {/* Section header */}
      <h2 className="font-semibold text-foreground text-lg mb-4">
        Cuidados e Dicas
      </h2>

      {/* Render categories in defined order — only those that have tips (AC: #5) */}
      <div className="flex flex-col gap-6">
        {CATEGORY_ORDER.map((category) => {
          const tips = grouped[category];
          if (!tips || tips.length === 0) return null;

          const label = CATEGORY_LABELS[category][gender];

          return (
            <div key={category}>
              {/* Category sub-header (AC: #5) */}
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                {label}
              </h3>

              {/* Card grid: 2-column on md+, single on mobile (AC: #7) */}
              {/* role="list" on container (AC: #9) */}
              <motion.div
                role="list"
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
                variants={container}
                initial="hidden"
                animate="visible"
              >
                {tips.map((tip, index) => (
                  <motion.div key={`${category}-${index}`} variants={item}>
                    <GroomingTipCard
                      tip={tip}
                      categoryLabel={label}
                      IconComponent={getIcon(tip.icon)}
                    />
                  </motion.div>
                ))}
              </motion.div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
