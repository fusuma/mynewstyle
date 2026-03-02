'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import type { FaceAnalysisOutput } from '@/lib/ai/schemas';
import { BlurredRecommendationCard } from './BlurredRecommendationCard';
import { StripeProvider } from '@/components/payment/StripeProvider';
import { PaymentForm } from '@/components/payment/PaymentForm';
import {
  FACE_SHAPE_LABELS,
  FACE_SHAPE_DESCRIPTIONS,
} from '@/lib/consultation/face-shape-labels';
import { FIRST_CONSULTATION_PRICE } from '@/lib/stripe/pricing';

interface PaywallProps {
  faceAnalysis: FaceAnalysisOutput;
  consultationId: string;
  amount: number | null;
  currency: string | null;
  userType: string | null;
  clientSecret: string | null;
  isLoadingPayment: boolean;
  paymentError: string | null;
  onInitiatePayment: () => void;
  onPaymentSuccess: () => void;
}

/**
 * Formats an amount in cents to a display string.
 * e.g. 599, 'eur' → '€5.99'
 */
function formatPrice(amountCents: number): string {
  return `€${(amountCents / 100).toFixed(2)}`;
}

const FEATURES = [
  '2-3 cortes recomendados',
  'Visualização IA',
  'Cartão para o barbeiro',
  'Dicas de styling',
];

export function Paywall({
  faceAnalysis,
  consultationId: _consultationId,
  amount,
  currency: _currency,
  userType,
  clientSecret,
  isLoadingPayment,
  paymentError: externalPaymentError,
  onInitiatePayment,
  onPaymentSuccess,
}: PaywallProps) {
  const [internalPaymentError, setInternalPaymentError] = React.useState<string | null>(null);
  const paymentError = internalPaymentError ?? externalPaymentError;
  const shouldReduceMotion = useReducedMotion();
  const label = FACE_SHAPE_LABELS[faceAnalysis.faceShape];
  const description = FACE_SHAPE_DESCRIPTIONS[faceAnalysis.faceShape];
  const confidencePercent = Math.round(faceAnalysis.confidence * 100);

  const isReturning = userType === 'returning';
  // Use the confirmed amount from the API response; fall back to the default guest price
  // so pricing is always visible upfront (AC 4 requires pricing displayed correctly).
  // The fallback is the canonical guest price from the pricing constants — NOT a hardcoded literal.
  const displayAmount = amount ?? FIRST_CONSULTATION_PRICE;
  const priceDisplay = formatPrice(displayAmount);
  const pricingDescription = isReturning ? 'Nova consultoria' : 'Consultoria completa';

  const fadeIn = shouldReduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 16 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.4, ease: 'easeOut' as const },
      };

  const fadeInDelayed = shouldReduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 16 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.4, ease: 'easeOut' as const, delay: 0.15 },
      };

  return (
    <div className="flex min-h-screen flex-col items-center px-4 py-8">
      <div className="w-full max-w-lg space-y-6">

        {/* FREE SECTION: Face shape result (unblurred) */}
        <motion.div className="text-center" {...fadeIn}>
          <div className="mb-2 inline-flex items-center rounded-lg bg-primary px-6 py-3">
            <span className="font-display text-3xl font-bold text-primary-foreground">
              Rosto {label}
            </span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {confidencePercent}% de certeza
          </p>
          <p className="mt-4 text-base text-foreground leading-relaxed">
            {description}
          </p>
        </motion.div>

        {/* BLURRED PLACEHOLDERS: Tease paid content with static placeholders */}
        <motion.div className="space-y-3" {...fadeInDelayed}>
          {[1, 2, 3].map((rank) => (
            <BlurredRecommendationCard key={rank} rank={rank} />
          ))}
        </motion.div>

        {/* PRICING SECTION — always visible upfront per AC 4 */}
        <motion.div
          className="rounded-xl border border-border bg-card p-6 space-y-4"
          {...fadeInDelayed}
        >
          {/* Price display — always shown (uses confirmed API amount or default guest price) */}
          <div>
            <p className="text-2xl font-bold text-foreground">
              {priceDisplay}{' '}
              <span className="text-base font-normal text-muted-foreground">
                — {pricingDescription}
              </span>
            </p>
          </div>

          {/* Feature list */}
          <div>
            <p className="text-sm font-semibold text-foreground mb-2">Inclui:</p>
            <ul className="space-y-1">
              {FEATURES.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm text-foreground">
                  <span className="text-primary">•</span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Trust badge */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <span>Reembolso automático se a IA falhar</span>
          </div>
        </motion.div>

        {/* PAYMENT SECTION */}
        <motion.div className="space-y-3" {...fadeInDelayed}>
          {/* Error message */}
          {paymentError && (
            <p className="text-sm text-destructive text-center" role="alert">
              {paymentError}
            </p>
          )}

          {clientSecret ? (
            /* Stripe payment form with PaymentElement and ExpressCheckoutElement */
            <StripeProvider clientSecret={clientSecret}>
              <PaymentForm
                onPaymentSuccess={onPaymentSuccess}
                onPaymentError={(message) => {
                  setInternalPaymentError(message);
                }}
              />
            </StripeProvider>
          ) : (
            /* Pre-intent state: single unlock button */
            <button
              onClick={onInitiatePayment}
              disabled={isLoadingPayment}
              aria-busy={isLoadingPayment}
              aria-label={isLoadingPayment ? 'A processar...' : 'Desbloquear consultoria completa'}
              className="w-full min-h-[48px] rounded-xl bg-primary px-6 py-4 text-lg font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
              type="button"
            >
              {isLoadingPayment ? 'A processar...' : 'Desbloquear consultoria completa'}
            </button>
          )}
        </motion.div>

      </div>
    </div>
  );
}
