'use client';

import { Elements } from '@stripe/react-stripe-js';
import { getStripeClient } from '@/lib/stripe/client';
import type { ReactNode } from 'react';
import type { StripeElementsOptions } from '@stripe/stripe-js';

interface StripeProviderProps {
  clientSecret: string;
  children: ReactNode;
}

export function StripeProvider({ clientSecret, children }: StripeProviderProps) {
  const options: StripeElementsOptions = {
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
  };

  return (
    <Elements stripe={getStripeClient()} options={options}>
      {children}
    </Elements>
  );
}
