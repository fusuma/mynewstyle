'use client';

import { useState } from 'react';
import {
  PaymentElement,
  ExpressCheckoutElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import type { StripeExpressCheckoutElementConfirmEvent } from '@stripe/stripe-js';
import { trackEvent } from '@/lib/analytics/tracker';
import { AnalyticsEventType } from '@/lib/analytics/types';

interface PaymentFormProps {
  onPaymentSuccess: () => void;
  onPaymentError: (message: string) => void;
  /** Called immediately when a payment attempt begins — use to clear stale errors from previous attempts. */
  onPaymentStart?: () => void;
}

export function PaymentForm({ onPaymentSuccess, onPaymentError, onPaymentStart }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirmPayment = async () => {
    if (!stripe || !elements) return;

    onPaymentStart?.();
    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.href,
      },
      redirect: 'if_required',
    });

    if (error) {
      // Track payment_failed (Task 7.10)
      trackEvent(AnalyticsEventType.PAYMENT_FAILED, {
        reason: error.message ?? 'unknown',
      });
      onPaymentError(error.message ?? 'Pagamento não processado. Tente outro método.');
      setIsProcessing(false);
    } else {
      // Track payment_completed (Task 7.9) — amount not available here, use 0 as placeholder
      trackEvent(AnalyticsEventType.PAYMENT_COMPLETED, { amount: 0 });
      setIsProcessing(false);
      onPaymentSuccess();
    }
  };

  const handleExpressCheckoutConfirm = async (
    _event: StripeExpressCheckoutElementConfirmEvent
  ) => {
    await handleConfirmPayment();
  };

  const handleCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleConfirmPayment();
  };

  return (
    <div className="space-y-4">
      {/* Primary: Apple Pay / Google Pay */}
      <ExpressCheckoutElement
        onConfirm={handleExpressCheckoutConfirm}
        options={{
          buttonType: { applePay: 'buy', googlePay: 'buy' },
          buttonTheme: { applePay: 'black', googlePay: 'black' },
          buttonHeight: 48,
        }}
      />

      {/* Divider */}
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">ou</span>
        </div>
      </div>

      {/* Secondary: Card payment */}
      <form onSubmit={handleCardSubmit}>
        <PaymentElement options={{ layout: 'accordion' }} />
        <button
          type="submit"
          disabled={!stripe || isProcessing}
          aria-busy={isProcessing}
          className="mt-4 w-full min-h-[48px] rounded-xl border border-border bg-background px-6 py-4 text-base font-medium text-foreground transition-opacity hover:opacity-80 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isProcessing ? 'A processar...' : 'Pagar'}
        </button>
      </form>
    </div>
  );
}
