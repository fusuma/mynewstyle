'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useConsultationStore } from '@/stores/consultation';
import { Paywall } from '@/components/consultation/Paywall';
import { RefundBanner } from '@/components/consultation/RefundBanner';
import { FaceShapeAnalysisSection } from '@/components/results/FaceShapeAnalysisSection';
import { usePayment } from '@/hooks/usePayment';
import { useConsultationStatus } from '@/hooks/useConsultationStatus';

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

  if (!consultationId || !faceAnalysis) {
    return null;
  }

  const handlePaymentSuccess = () => {
    setPaymentStatus('paid');
  };

  // Poll for refund status after payment succeeds
  const { isPolling: _isPolling } = useConsultationStatus(
    consultationId ?? '',
    paymentStatus === 'paid'
  );

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
        </motion.div>
      )}
    </AnimatePresence>
  );
}
