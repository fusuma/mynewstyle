'use client';

import { useState, useCallback } from 'react';
import { useConsultationStore } from '@/stores/consultation';

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
      const response = await fetch('/api/payment/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  return { ...state, createPaymentIntent };
}
