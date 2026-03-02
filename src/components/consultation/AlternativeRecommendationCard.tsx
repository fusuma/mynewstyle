'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion, type Variants } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StyleRecommendation } from '@/types/index';

// Difficulty label mapping (PT-BR)
const DIFFICULTY_LABELS: Record<StyleRecommendation['difficultyLevel'], string> = {
  low: 'Baixa',
  medium: 'Media',
  high: 'Alta',
};

// Theme-aware difficulty badge classes
const DIFFICULTY_BADGE_CLASSES: Record<StyleRecommendation['difficultyLevel'], string> = {
  low: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  high: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

// Ordinal label mapping for ranks 2 and 3
const ORDINAL_LABELS: Record<2 | 3, string> = {
  2: '2a Recomendacao',
  3: '3a Recomendacao',
};

interface AlternativeRecommendationCardProps {
  /** Card rank: 2 or 3 */
  rank: 2 | 3;
  styleName: string;
  justification: string;
  matchScore: number;
  difficultyLevel: StyleRecommendation['difficultyLevel'];
  /** Stagger delay in seconds for entrance animation */
  delay?: number;
  /** Optional callback for Epic 7 preview generation */
  onPreviewRequest?: (styleName: string) => void;
}

/**
 * AlternativeRecommendationCard — Displays recommendation #2 or #3
 * with smaller visual weight than the hero card.
 *
 * - Mobile (< 768px): collapsible, default collapsed
 * - Desktop (>= 768px): always expanded, no toggle visible
 *
 * Responsive behavior is handled entirely via Tailwind CSS classes (md:hidden / md:block)
 * — no window.innerWidth or resize listeners used.
 *
 * AC: 2, 3, 4, 6, 7 (Story 6.3)
 */
export function AlternativeRecommendationCard({
  rank,
  styleName,
  justification,
  matchScore,
  difficultyLevel,
  delay = 0,
  onPreviewRequest,
}: AlternativeRecommendationCardProps) {
  const shouldReduceMotion = useReducedMotion();
  const [isExpanded, setIsExpanded] = useState(false);

  const matchPercent = Math.round(matchScore * 100);
  const difficultyLabel = DIFFICULTY_LABELS[difficultyLevel];
  const difficultyBadgeClass = DIFFICULTY_BADGE_CLASSES[difficultyLevel];
  const ordinalLabel = ORDINAL_LABELS[rank];

  // Entrance animation — respects prefers-reduced-motion (AC: 7)
  const cardVariants: Variants = shouldReduceMotion
    ? { hidden: {}, visible: {} }
    : {
        hidden: { opacity: 0, y: 20 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.4, delay },
        },
      };

  // Expand/collapse animation for mobile
  const expandVariants: Variants = shouldReduceMotion
    ? {
        collapsed: {},
        expanded: {},
      }
    : {
        collapsed: { height: 0, opacity: 0 },
        expanded: { height: 'auto', opacity: 1, transition: { duration: 0.25 } },
      };

  const handleToggle = () => {
    setIsExpanded((prev) => !prev);
  };

  const handleVerComoFico = () => {
    if (onPreviewRequest) {
      onPreviewRequest(styleName);
    }
    // Placeholder: Epic 7 will connect this
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
    >
      <div
        className="rounded-xl border border-border bg-card p-4"
        role="article"
        aria-label={`${ordinalLabel}: ${styleName}`}
      >
        {/* Rank badge — muted styling (NOT gold like hero) */}
        <div className="mb-3">
          <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            {ordinalLabel}
          </span>
        </div>

        {/* Always-visible header: style name + match score */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display font-semibold text-foreground text-lg leading-tight flex-1">
            {styleName}
          </h3>
          <span className="text-sm font-medium text-foreground whitespace-nowrap shrink-0">
            {matchPercent}% compativel
          </span>
        </div>

        {/*
         * Collapsible toggle — visible on mobile only (hidden on md+).
         * Tailwind md:hidden ensures this never renders on desktop
         * without needing window.innerWidth or resize listeners. (AC: 4)
         */}
        <button
          onClick={handleToggle}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? 'Recolher detalhes' : 'Expandir detalhes'}
          className="md:hidden mt-3 flex w-full items-center justify-between text-sm text-muted-foreground"
          type="button"
        >
          <span>{isExpanded ? 'Menos detalhes' : 'Ver detalhes'}</span>
          <ChevronDown
            className={cn(
              'h-4 w-4 transition-transform duration-200',
              isExpanded ? 'rotate-180' : 'rotate-0'
            )}
            aria-hidden="true"
          />
        </button>

        {/*
         * Expandable content section:
         * - Mobile: AnimatePresence controls show/hide based on isExpanded state
         * - Desktop (md+): Always shown via the `md:block` override class.
         *   The hidden/show state is managed by CSS, not JS, on desktop.
         */}
        <div
          data-testid="expandable-wrapper"
          className={cn(
            // Mobile: hidden by default, shown when expanded
            isExpanded ? 'block' : 'hidden',
            // Desktop: always visible regardless of isExpanded state
            'md:block'
          )}
        >
          <AnimatePresence initial={false}>
            <motion.div
              key="expandable"
              data-testid="expandable-content"
              variants={expandVariants}
              initial="collapsed"
              animate="expanded"
              exit="collapsed"
              className="overflow-hidden"
            >
              {/* Justification */}
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {justification}
              </p>

              {/* Difficulty badge */}
              <div className="mt-3">
                <span
                  className={cn(
                    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                    difficultyBadgeClass
                  )}
                  aria-label={`Dificuldade de manutencao: ${difficultyLabel}`}
                >
                  Manutencao: {difficultyLabel}
                </span>
              </div>

              {/* Ver como fico button — secondary style (border + text, not filled) */}
              <button
                type="button"
                onClick={handleVerComoFico}
                aria-label="Ver como fico — visualizar este corte no meu rosto"
                className="mt-4 w-full min-h-[48px] rounded-lg border border-border bg-transparent px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
              >
                Ver como fico
              </button>
            </motion.div>
          </AnimatePresence>
        </div>

      </div>
    </motion.div>
  );
}
