'use client';

import { useMemo } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { getStripeClient } from '@/lib/stripe/client';
import type { ReactNode } from 'react';
import type { StripeElementsOptions } from '@stripe/stripe-js';

interface StripeProviderProps {
  clientSecret: string;
  children: ReactNode;
}

/**
 * Wraps children in the Stripe Elements provider with EUR/pt-BR configuration.
 * Must receive a valid `clientSecret` from a PaymentIntent before rendering
 * any Stripe payment components. The Stripe instance is lazy-loaded and
 * the options object is memoized to prevent unnecessary re-mounts.
 */
export function StripeProvider({ clientSecret, children }: StripeProviderProps) {
  const options: StripeElementsOptions = useMemo(
    () => ({
      clientSecret,
      appearance: {
        theme: 'stripe',
        variables: {
          colorPrimary: 'hsl(var(--primary))',
          colorBackground: 'hsl(var(--background))',
          colorText: 'hsl(var(--foreground))',
          borderRadius: '8px',
          fontFamily: 'inherit',
        },
      },
      locale: 'pt-BR',
    }),
    [clientSecret]
  );

  return (
    <Elements stripe={getStripeClient()} options={options}>
      {children}
    </Elements>
  );
}
