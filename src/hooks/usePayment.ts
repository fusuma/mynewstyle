'use client';

import { useState, useCallback } from 'react';
import type { Stripe, StripeElements } from '@stripe/stripe-js';
import { useConsultationStore } from '@/stores/consultation';
import { getGuestRequestHeaders } from '@/lib/api/headers';

interface PaymentState {
  clientSecret: string | null;
  amount: number | null;
  currency: string | null;
  userType: string | null;
  isLoading: boolean;
  error: string | null;
}

interface UsePaymentReturn extends PaymentState {
  createPaymentIntent: () => Promise<void>;
  confirmPayment: (
    stripe: Stripe | null,
    elements: StripeElements | null
  ) => Promise<{ success: boolean; error: string | null }>;
}

export function usePayment(consultationId: string): UsePaymentReturn {
  const setPaymentStatus = useConsultationStore((s) => s.setPaymentStatus);

  const [state, setState] = useState<PaymentState>({
    clientSecret: null,
    amount: null,
    currency: null,
    userType: null,
    isLoading: false,
    error: null,
  });

  const createPaymentIntent = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Include x-guest-session-id header when unauthenticated (Story 8.4, AC #2)
      const response = await fetch('/api/payment/create-intent', {
        method: 'POST',
        headers: getGuestRequestHeaders({ isAuthenticated: false }),
        body: JSON.stringify({ consultationId }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          (data as { error?: string }).error || `Payment setup failed: ${response.status}`
        );
      }

      const data = (await response.json()) as {
        clientSecret: string;
        amount: number;
        currency: string;
        userType: string;
      };

      setState({
        clientSecret: data.clientSecret,
        amount: data.amount,
        currency: data.currency,
        userType: data.userType,
        isLoading: false,
        error: null,
      });

      setPaymentStatus('pending');
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Payment setup failed',
      }));
    }
  }, [consultationId, setPaymentStatus]);

  /**
   * Wraps stripe.confirmPayment() and handles success/failure state transitions.
   * On success: sets paymentStatus to 'paid' in store.
   * On failure: sets error message, keeps paymentStatus as 'pending'.
   * Edge cases: null stripe/elements instances, network errors.
   */
  const confirmPayment = useCallback(
    async (
      stripe: Stripe | null,
      elements: StripeElements | null
    ): Promise<{ success: boolean; error: string | null }> => {
      // Edge case: null stripe or elements
      if (!stripe || !elements) {
        const errorMessage = 'Pagamento não processado. Tente outro método.';
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
        return { success: false, error: errorMessage };
      }

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const { error } = await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: typeof window !== 'undefined' ? window.location.href : '',
          },
          redirect: 'if_required',
        });

        if (error) {
          const errorMessage =
            error.message ?? 'Pagamento não processado. Tente outro método.';
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: errorMessage,
          }));
          // Keep paymentStatus as 'pending' on failure so user can retry
          return { success: false, error: errorMessage };
        }

        // Success: update store to 'paid'
        setState((prev) => ({ ...prev, isLoading: false, error: null }));
        setPaymentStatus('paid');
        return { success: true, error: null };
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Pagamento não processado. Tente outro método.';
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
        return { success: false, error: errorMessage };
      }
    },
    [setPaymentStatus]
  );

  return { ...state, createPaymentIntent, confirmPayment };
}
