'use client';

import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { StyleRecommendation } from '@/types/index';

interface HeroRecommendationCardProps {
  recommendation: StyleRecommendation;
  /** Optional stagger delay in seconds for parent orchestration */
  delay?: number;
}

const DIFFICULTY_LABELS: Record<StyleRecommendation['difficultyLevel'], string> = {
  low: 'Baixa',
  medium: 'Media',
  high: 'Alta',
};

/**
 * HeroRecommendationCard — Displays the #1 ranked hairstyle recommendation
 * prominently as a hero card on the results page.
 *
 * AC: 1-12 (Story 6.2)
 */
export function HeroRecommendationCard({
  recommendation,
  delay = 0,
}: HeroRecommendationCardProps) {
  const shouldReduceMotion = useReducedMotion();

  const matchPercent = Math.round(recommendation.matchScore * 100);
  const difficultyLabel = DIFFICULTY_LABELS[recommendation.difficultyLevel];

  // Framer Motion variants — respects prefers-reduced-motion (AC: 10)
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

  // Theme-aware classes (AC: 8)
  // The project uses data-theme="male"/"female" on <html> with CSS custom properties.
  // Use semantic tokens (bg-primary, text-primary-foreground, etc.) so that
  // colors automatically adapt to whichever theme is active — no gender prop branching needed.

  const handleVerComoFico = () => {
    toast.info('Em breve — funcionalidade disponível em breve!');
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
    >
      {/*
       * Card uses design-system tokens:
       * - rounded-card (16px), shadow-elevated, border-2 with accent color (AC: 7)
       * The accent border is applied via border-primary/60 using the theme's --primary token.
       */}
      <Card
        className={cn(
          'w-full border-2 border-primary/60 shadow-elevated'
        )}
        role="article"
        aria-label="Recomendacao principal de corte de cabelo"
      >
        <CardContent className="pb-6 pt-2">
          {/* #1 Badge (AC: 1) — uses Badge default variant: bg-primary text-primary-foreground */}
          <div className="mb-4 flex items-center justify-start">
            <Badge
              variant="default"
              aria-label="Recomendacao principal — melhor corte para o seu rosto"
            >
              #1 Recomendacao Principal
            </Badge>
          </div>

          {/* Style Name (AC: 2) — Space Grotesk 600, heading scale */}
          <h2
            className={cn(
              'font-display font-semibold text-foreground mb-3',
              'text-2xl md:text-3xl' // 24px mobile / 32px desktop
            )}
          >
            {recommendation.styleName}
          </h2>

          {/* Justification text (AC: 3) */}
          <p className="text-base leading-relaxed text-muted-foreground mb-4">
            {recommendation.justification}
          </p>

          {/* Match Score (AC: 4) */}
          <div
            className="mb-3"
            aria-label={`Compatibilidade: ${matchPercent}% compativel com o seu rosto`}
          >
            <span className="text-lg font-semibold text-foreground">
              {matchPercent}% compativel com o seu rosto
            </span>
          </div>

          {/* Difficulty Badge (AC: 5) — uses outline variant for secondary status badge */}
          <div className="mb-6">
            <Badge
              variant="outline"
              aria-label={`Dificuldade de manutencao: ${difficultyLabel}`}
            >
              Manutencao: {difficultyLabel}
            </Badge>
          </div>

          {/* "Ver como fico" button (AC: 6) — placeholder for Epic 7 */}
          <Button
            variant="default"
            size="default"
            className="w-full text-base font-semibold"
            onClick={handleVerComoFico}
            aria-label="Ver como fico — visualizar o corte no meu rosto"
          >
            Ver como fico
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
