'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useConsultationStore } from '@/stores/consultation';
import { Paywall } from '@/components/consultation/Paywall';
import { RefundBanner } from '@/components/consultation/RefundBanner';
import { ResultsPageAnimatedReveal } from '@/components/consultation/ResultsPageAnimatedReveal';
import { usePayment } from '@/hooks/usePayment';
import { useConsultationStatus } from '@/hooks/useConsultationStatus';

/**
 * Results page route: /consultation/results/[id]
 *
 * - If paymentStatus !== 'paid': renders Paywall component with dissolve animation
 * - If paymentStatus === 'paid': renders ResultsPageAnimatedReveal with staggered section reveal
 * - Guards: redirects to /consultation/questionnaire if no consultationId or faceAnalysis
 *
 * Animation flow (AC #5, #6):
 *   1. Paywall exits: blur increases + opacity fades (500ms)
 *   2. Results entrance: opacity 0 -> 1 (400ms, 0.3s delay) — syncs with paywall exit
 *   3. ResultsPageAnimatedReveal: staggered section reveal (150ms per section) begins inside
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
  const paymentStatus = useConsultationStore((state) => state.paymentStatus);
  const setPaymentStatus = useConsultationStore((state) => state.setPaymentStatus);

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

  // Paywall exit: blur increases + opacity fades (500ms) (AC #5)
  // Note: transition must be inside the exit object for Framer Motion to apply it to the exit animation.
  // A top-level transition prop controls initial→animate, not exit.
  const paywallExitVariants = shouldReduceMotion
    ? {}
    : {
        exit: { filter: 'blur(20px)', opacity: 0, transition: { duration: 0.5 } },
      };

  // Results entrance: initial state (fades in after paywall dissolves) (AC #6)
  // The 0.3s delay ensures staggered reveal begins AFTER the paywall exit animation (0.5s)
  // is well underway, creating a seamless paywall-to-results transition.
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
          {/* ResultsPageAnimatedReveal handles staggered section reveal (AC #1, #2, #3, #4) */}
          <ResultsPageAnimatedReveal shouldReduceMotion={shouldReduceMotion} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
