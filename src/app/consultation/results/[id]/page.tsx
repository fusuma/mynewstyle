'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'framer-motion';
import { useConsultationStore } from '@/stores/consultation';
import { Paywall } from '@/components/consultation/Paywall';
import { usePayment } from '@/hooks/usePayment';

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

/**
 * Paid results placeholder — shown after payment succeeds.
 * Full results display is Epic 6.
 * Uses staggered animation (150ms per element) consistent with UX spec.
 */
function PaidResultsPlaceholder({ shouldReduceMotion }: { shouldReduceMotion: boolean | null }) {
  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.15,
      },
    },
  };

  const itemVariants: Variants = shouldReduceMotion
    ? {
        hidden: {},
        visible: {},
      }
    : {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
      };

  return (
    <motion.div
      className="flex min-h-screen flex-col items-center justify-center px-4 text-center"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.p
        className="text-lg font-medium text-foreground"
        variants={itemVariants}
      >
        Consultoria completa desbloqueada!
      </motion.p>
      <motion.p
        className="mt-2 text-sm text-muted-foreground"
        variants={itemVariants}
      >
        Resultados completos disponíveis em breve (Epic 6).
      </motion.p>
    </motion.div>
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
      {paymentStatus !== 'paid' ? (
        <motion.div key="paywall" {...paywallExitVariants}>
          <PaywallWrapper
            consultationId={consultationId}
            onPaymentSuccess={handlePaymentSuccess}
          />
        </motion.div>
      ) : (
        <motion.div key="results" {...resultsEntranceVariants}>
          <PaidResultsPlaceholder shouldReduceMotion={shouldReduceMotion} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
