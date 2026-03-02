'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useConsultationStore } from '@/stores/consultation';
import { Paywall } from '@/components/consultation/Paywall';
import { usePayment } from '@/hooks/usePayment';

/**
 * Results page route: /consultation/results/[id]
 *
 * - If paymentStatus !== 'paid': renders Paywall component
 * - If paymentStatus === 'paid': renders placeholder (full results page is Epic 6)
 * - Guards: redirects to /consultation/questionnaire if no consultationId or faceAnalysis
 */
function PaywallWrapper({ consultationId }: { consultationId: string }) {
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
    />
  );
}

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string | undefined;

  const consultationId = useConsultationStore((state) => state.consultationId);
  const faceAnalysis = useConsultationStore((state) => state.faceAnalysis);
  const paymentStatus = useConsultationStore((state) => state.paymentStatus);

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

  // Full results placeholder (Epic 6 will implement full results display)
  if (paymentStatus === 'paid') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <p className="text-lg font-medium text-foreground">
          Consultoria completa desbloqueada!
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Resultados completos disponiveis em breve (Epic 6).
        </p>
      </div>
    );
  }

  // Paywall: not yet paid
  return <PaywallWrapper consultationId={consultationId} />;
}
