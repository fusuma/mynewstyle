'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useConsultationStore } from '@/stores/consultation';
import { Paywall } from '@/components/consultation/Paywall';
import { RefundBanner } from '@/components/consultation/RefundBanner';
import { FaceShapeAnalysisSection } from '@/components/results/FaceShapeAnalysisSection';
import { HeroRecommendationCard } from '@/components/consultation/HeroRecommendationCard';
import { AlternativeRecommendationsSection } from '@/components/consultation/AlternativeRecommendationsSection';
import { StylesToAvoid } from '@/components/consultation/StylesToAvoid';
import { GroomingTips } from '@/components/consultation/GroomingTips';
import { StylingTipsSection } from '@/components/consultation/StylingTipsSection';
import { usePayment } from '@/hooks/usePayment';
import { useConsultationStatus } from '@/hooks/useConsultationStatus';
import type { Consultation } from '@/types/index';

/**
 * Results page route: /consultation/results/[id]
 *
 * - If paymentStatus !== 'paid': renders Paywall component with dissolve animation
 * - If paymentStatus === 'paid': renders placeholder (full results page is Epic 6)
 * - Guards: redirects to /consultation/questionnaire if no consultationId or faceAnalysis
 */
function PaywallWrapper({
  consultationId,
  onPaymentSuccess,
}: {
  consultationId: string;
  onPaymentSuccess: () => void;
}) {
  const faceAnalysis = useConsultationStore((state) => state.faceAnalysis);
  const { clientSecret, amount, currency, userType, isLoading, error, createPaymentIntent } =
    usePayment(consultationId);

  if (!faceAnalysis) {
    return null;
  }

  return (
    <Paywall
      faceAnalysis={faceAnalysis}
      consultationId={consultationId}
      amount={amount}
      currency={currency}
      userType={userType}
      clientSecret={clientSecret}
      isLoadingPayment={isLoading}
      paymentError={error}
      onInitiatePayment={createPaymentIntent}
      onPaymentSuccess={onPaymentSuccess}
    />
  );
}

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string | undefined;
  const shouldReduceMotion = useReducedMotion();

  const consultationId = useConsultationStore((state) => state.consultationId);
  const faceAnalysis = useConsultationStore((state) => state.faceAnalysis);
  const photoPreview = useConsultationStore((state) => state.photoPreview);
  const paymentStatus = useConsultationStore((state) => state.paymentStatus);
  const setPaymentStatus = useConsultationStore((state) => state.setPaymentStatus);
  const gender = useConsultationStore((state) => state.gender);
  const consultationRaw = useConsultationStore((state) => state.consultation);
  // Cast consultation from unknown to Consultation type (validated by AI output schema)
  const consultation = consultationRaw as Consultation | null;

  // Guard: redirect if no consultationId or no faceAnalysis
  useEffect(() => {
    if (!consultationId || !faceAnalysis) {
      router.replace('/consultation/questionnaire');
    }
  }, [consultationId, faceAnalysis, router]);

  // Guard: redirect if URL id doesn't match stored consultationId
  useEffect(() => {
    if (consultationId && id && id !== consultationId) {
      router.replace('/consultation/questionnaire');
    }
  }, [consultationId, id, router]);

  // Poll for refund status after payment succeeds
  // Must be called before any early returns to satisfy Rules of Hooks
  useConsultationStatus(
    consultationId ?? '',
    paymentStatus === 'paid'
  );

  if (!consultationId || !faceAnalysis) {
    return null;
  }

  const handlePaymentSuccess = () => {
    setPaymentStatus('paid');
  };

  // Paywall exit: blur increases + opacity fades (500ms)
  // Note: transition must be inside the exit object for Framer Motion to apply it to the exit animation.
  // A top-level transition prop controls initial→animate, not exit.
  const paywallExitVariants = shouldReduceMotion
    ? {}
    : {
        exit: { filter: 'blur(20px)', opacity: 0, transition: { duration: 0.5 } },
      };

  // Results entrance: initial state (fades in after paywall dissolves)
  const resultsEntranceVariants = shouldReduceMotion
    ? {}
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: { duration: 0.4, delay: 0.3 },
      };

  return (
    <AnimatePresence mode="wait">
      {paymentStatus === 'refunded' ? (
        <motion.div key="refund" {...resultsEntranceVariants}>
          <RefundBanner />
        </motion.div>
      ) : paymentStatus !== 'paid' ? (
        <motion.div key="paywall" {...paywallExitVariants}>
          <PaywallWrapper
            consultationId={consultationId}
            onPaymentSuccess={handlePaymentSuccess}
          />
        </motion.div>
      ) : (
        <motion.div key="results" {...resultsEntranceVariants}>
          <FaceShapeAnalysisSection
            faceAnalysis={faceAnalysis}
            photoPreview={photoPreview}
          />
          {consultation && consultation.recommendations && consultation.recommendations.length > 0 && (
            <div className="w-full px-4 py-4">
              <div className="mx-auto max-w-lg">
                {/* Section B: Hero Recommendation Card (Story 6.2) */}
                <HeroRecommendationCard
                  recommendation={consultation.recommendations[0]}
                  delay={0.15}
                />
              </div>
            </div>
          )}
          {consultation && consultation.recommendations && consultation.recommendations.length > 1 && (
            <div className="w-full px-4 py-4">
              <div className="mx-auto max-w-lg">
                {/* Section C: Alternative Recommendation Cards (Story 6.3) */}
                <AlternativeRecommendationsSection
                  recommendations={consultation.recommendations.slice(1)}
                  baseDelay={0.3}
                />
              </div>
            </div>
          )}
          {consultation && consultation.stylesToAvoid && consultation.stylesToAvoid.length > 0 && (
            <div className="w-full px-4 py-4">
              <div className="mx-auto max-w-lg">
                {/* Section D: Styles to Avoid (Story 6.4) */}
                <StylesToAvoid stylesToAvoid={consultation.stylesToAvoid} />
              </div>
            </div>
          )}
          {consultation && consultation.groomingTips && consultation.groomingTips.length > 0 && (
            <div className="w-full px-4 py-4">
              <div className="mx-auto max-w-lg">
                {/* Section E: Grooming Tips (Story 6.5) */}
                <GroomingTips
                  groomingTips={consultation.groomingTips}
                  gender={gender ?? 'male'}
                />
              </div>
            </div>
          )}
          {consultation && consultation.groomingTips && consultation.groomingTips.length > 0 && (
            <div className="w-full px-4 py-4">
              <div className="mx-auto max-w-lg">
                {/* Section F: Styling Tips Parsed & Structured (Story 6.6) */}
                <StylingTipsSection
                  groomingTips={consultation.groomingTips}
                  gender={gender ?? 'male'}
                />
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
