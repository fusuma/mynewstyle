'use client';

import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { useConsultationStore } from '@/stores/consultation';
import { FaceShapeAnalysisSection } from '@/components/results/FaceShapeAnalysisSection';
import { HeroRecommendationCard } from '@/components/consultation/HeroRecommendationCard';
import { AlternativeRecommendationsSection } from '@/components/consultation/AlternativeRecommendationsSection';
import { StylesToAvoid } from '@/components/consultation/StylesToAvoid';
import { GroomingTips } from '@/components/consultation/GroomingTips';
import { StylingTipsSection } from '@/components/consultation/StylingTipsSection';
import { ResultsActionsFooter } from '@/components/consultation/ResultsActionsFooter';
import type { Consultation } from '@/types/index';

interface ResultsPageAnimatedRevealProps {
  /** Optional override from parent page (e.g., from useReducedMotion() in page.tsx).
   * If not provided, the component reads its own useReducedMotion() hook. */
  shouldReduceMotion?: boolean | null;
}

/**
 * ResultsPageAnimatedReveal
 *
 * Wraps the full results page content with a Framer Motion staggered reveal animation.
 * Each section slides up and fades in with a 150ms stagger (staggerChildren: 0.15).
 *
 * Reveal order (AC #1):
 *   1. FaceShapeAnalysisSection
 *   2. HeroRecommendationCard
 *   3. AlternativeRecommendations
 *   4. StylesToAvoid
 *   5. GroomingTips
 *   6. StylingTips
 *   7. ResultsActionsFooter
 *
 * Respects prefers-reduced-motion (AC #4): when enabled, all animations are skipped entirely.
 */
export function ResultsPageAnimatedReveal({
  shouldReduceMotion: shouldReduceMotionProp,
}: ResultsPageAnimatedRevealProps = {}) {
  const reducedMotionFromHook = useReducedMotion();
  // Prefer the explicitly passed prop; fall back to Framer's hook value
  const shouldReduceMotion =
    shouldReduceMotionProp !== undefined ? shouldReduceMotionProp : reducedMotionFromHook;

  // Read consultation data from the store
  const faceAnalysis = useConsultationStore((state) => state.faceAnalysis);
  const photoPreview = useConsultationStore((state) => state.photoPreview);
  const consultationRaw = useConsultationStore((state) => state.consultation);
  const consultation = consultationRaw as Consultation | null;
  const gender = useConsultationStore((state) => state.gender);
  const consultationId = useConsultationStore((state) => state.consultationId);

  // Container variants: stagger children by 150ms (AC #2)
  const containerVariants: Variants = shouldReduceMotion
    ? {}
    : {
        hidden: {},
        visible: {
          transition: {
            staggerChildren: 0.15,
          },
        },
      };

  // Item variants: slide-up + fade-in (y: 20 -> 0, opacity: 0 -> 1, duration: 400ms) (AC #3)
  const itemVariants: Variants = shouldReduceMotion
    ? {}
    : {
        hidden: { opacity: 0, y: 20 },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.4,
            ease: 'easeOut' as const,
          },
        },
      };

  const containerAnimationProps = shouldReduceMotion
    ? {}
    : {
        initial: 'hidden',
        animate: 'visible',
        variants: containerVariants,
      };

  const itemAnimationProps = shouldReduceMotion
    ? {}
    : {
        variants: itemVariants,
      };

  return (
    <motion.div {...containerAnimationProps}>
      {/* Section A: Face Shape Analysis (Story 6-1) */}
      {faceAnalysis && (
        <motion.div {...itemAnimationProps}>
          <div data-testid="section-face-shape">
            <FaceShapeAnalysisSection
              faceAnalysis={faceAnalysis}
              photoPreview={photoPreview}
            />
          </div>
        </motion.div>
      )}

      {/* Section B: Hero Recommendation Card (Story 6-2) */}
      {consultation && consultation.recommendations && consultation.recommendations.length > 0 && (
        <motion.div className="w-full px-4 py-4" {...itemAnimationProps}>
          <div data-testid="section-hero-recommendation" className="mx-auto max-w-lg">
            <HeroRecommendationCard
              recommendation={consultation.recommendations[0]}
            />
          </div>
        </motion.div>
      )}

      {/* Section C: Alternative Recommendation Cards (Story 6-3) */}
      {consultation && consultation.recommendations && consultation.recommendations.length > 1 && (
        <motion.div className="w-full px-4 py-4" {...itemAnimationProps}>
          <div data-testid="section-alternative-recommendations" className="mx-auto max-w-lg">
            <AlternativeRecommendationsSection
              recommendations={consultation.recommendations.slice(1)}
            />
          </div>
        </motion.div>
      )}

      {/* Section D: Styles to Avoid (Story 6-4) */}
      {consultation && consultation.stylesToAvoid && consultation.stylesToAvoid.length > 0 && (
        <motion.div className="w-full px-4 py-4" {...itemAnimationProps}>
          <div data-testid="section-styles-to-avoid" className="mx-auto max-w-lg">
            <StylesToAvoid stylesToAvoid={consultation.stylesToAvoid} />
          </div>
        </motion.div>
      )}

      {/* Section E: Grooming Tips (Story 6-5) */}
      {consultation && consultation.groomingTips && consultation.groomingTips.length > 0 && (
        <motion.div className="w-full px-4 py-4" {...itemAnimationProps}>
          <div data-testid="section-grooming-tips" className="mx-auto max-w-lg">
            <GroomingTips
              groomingTips={consultation.groomingTips}
              gender={gender ?? 'male'}
            />
          </div>
        </motion.div>
      )}

      {/* Section F: Styling Tips (Story 6-6) */}
      {consultation && consultation.groomingTips && consultation.groomingTips.length > 0 && (
        <motion.div className="w-full px-4 py-4" {...itemAnimationProps}>
          <div data-testid="section-styling-tips" className="mx-auto max-w-lg">
            <StylingTipsSection
              groomingTips={consultation.groomingTips}
              gender={gender ?? 'male'}
            />
          </div>
        </motion.div>
      )}

      {/* Section G: Actions Footer (Story 6-7) */}
      {/* Spacer for mobile sticky footer -- prevents content from being hidden behind it */}
      <div className="h-[200px] md:h-0" aria-hidden="true" />
      <motion.div {...itemAnimationProps}>
        <div data-testid="section-results-actions-footer">
          <ResultsActionsFooter consultationId={consultationId ?? ''} />
        </div>
      </motion.div>
    </motion.div>
  );
}
