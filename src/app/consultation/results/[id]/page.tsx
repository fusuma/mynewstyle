'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useConsultationStore } from '@/stores/consultation';
import { Paywall } from '@/components/consultation/Paywall';
import { RefundBanner } from '@/components/consultation/RefundBanner';
import { ResultsPageAnimatedReveal } from '@/components/consultation/ResultsPageAnimatedReveal';
import { usePayment } from '@/hooks/usePayment';
import { useConsultationStatus } from '@/hooks/useConsultationStatus';
import type { FaceAnalysisOutput } from '@/lib/ai/schemas';
import type { Consultation } from '@/types';

/**
 * Results page route: /consultation/results/[id]
 *
 * - If paymentStatus !== 'paid': renders Paywall component with dissolve animation
 * - If paymentStatus === 'paid': renders ResultsPageAnimatedReveal with staggered section reveal
 * - Guards: redirects to /consultation/questionnaire if no consultationId or faceAnalysis
 * - Hydration: when navigating from the profile history page ("Ver novamente"),
 *   the Zustand store may be stale. In that case, the page fetches consultation data
 *   from GET /api/consultation/[id]/results and populates the store before rendering.
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

  // Track hydration state when navigating from profile history
  const [isHydrating, setIsHydrating] = useState(false);
  const [hydrationFailed, setHydrationFailed] = useState(false);

  const consultationId = useConsultationStore((state) => state.consultationId);
  const faceAnalysis = useConsultationStore((state) => state.faceAnalysis);
  const paymentStatus = useConsultationStore((state) => state.paymentStatus);
  const setPaymentStatus = useConsultationStore((state) => state.setPaymentStatus);
  const setConsultationId = useConsultationStore((state) => state.setConsultationId);
  const setFaceAnalysis = useConsultationStore((state) => state.setFaceAnalysis);
  const setConsultation = useConsultationStore((state) => state.setConsultation);
  const setGender = useConsultationStore((state) => state.setGender);

  // Hydration: when navigating from profile history, the Zustand store may be stale.
  // Detect: URL has an ID but store has no faceAnalysis (or a different consultationId).
  // In that case, fetch from /api/consultation/[id]/results to populate the store.
  const storeIsStaleForThisId =
    id && (!consultationId || consultationId !== id || !faceAnalysis);

  useEffect(() => {
    if (!storeIsStaleForThisId || isHydrating || hydrationFailed) return;

    const controller = new AbortController();
    setIsHydrating(true);

    fetch(`/api/consultation/${id}/results`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          // Not found or unauthorized — redirect to questionnaire
          setHydrationFailed(true);
          return;
        }
        const data = await res.json() as {
          consultation: {
            id: string;
            gender: 'male' | 'female';
            faceAnalysis: FaceAnalysisOutput | null;
            paymentStatus: string;
            recommendations: Consultation['recommendations'];
            stylesToAvoid: Consultation['stylesToAvoid'];
            groomingTips: Consultation['groomingTips'];
          };
        };
        const c = data.consultation;
        if (!c.faceAnalysis) {
          setHydrationFailed(true);
          return;
        }
        // Hydrate the store with fetched data
        setConsultationId(c.id);
        setFaceAnalysis(c.faceAnalysis);
        setGender(c.gender);
        setConsultation({
          recommendations: c.recommendations,
          stylesToAvoid: c.stylesToAvoid,
          groomingTips: c.groomingTips,
        });
        setPaymentStatus(c.paymentStatus as 'paid' | 'none' | 'pending' | 'failed' | 'refunded');
      })
      .catch((err) => {
        if (err instanceof Error && err.name === 'AbortError') return;
        setHydrationFailed(true);
      })
      .finally(() => {
        setIsHydrating(false);
      });

    return () => {
      controller.abort();
    };
  }, [
    id,
    storeIsStaleForThisId,
    isHydrating,
    hydrationFailed,
    setConsultationId,
    setFaceAnalysis,
    setGender,
    setConsultation,
    setPaymentStatus,
  ]);

  // Guard: redirect if hydration failed or store is stale and not hydrating
  useEffect(() => {
    if (hydrationFailed) {
      router.replace('/consultation/questionnaire');
      return;
    }
    // Only redirect after hydration attempt is complete (not hydrating)
    if (!isHydrating && !storeIsStaleForThisId && (!consultationId || !faceAnalysis)) {
      router.replace('/consultation/questionnaire');
    }
  }, [hydrationFailed, isHydrating, storeIsStaleForThisId, consultationId, faceAnalysis, router]);

  // Guard: redirect if URL id doesn't match stored consultationId (non-hydrating case)
  useEffect(() => {
    if (!isHydrating && consultationId && id && id !== consultationId) {
      router.replace('/consultation/questionnaire');
    }
  }, [isHydrating, consultationId, id, router]);

  // Poll for refund status after payment succeeds
  // Must be called before any early returns to satisfy Rules of Hooks
  useConsultationStatus(
    consultationId ?? '',
    paymentStatus === 'paid'
  );

  // While hydrating from profile navigation, show a loading indicator
  if (isHydrating) {
    return (
      <div className="flex items-center justify-center min-h-screen" aria-busy="true" aria-label="A carregar consultoria">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

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
