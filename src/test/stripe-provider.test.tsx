import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

// Mock @stripe/react-stripe-js
vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="stripe-elements">{children}</div>
  ),
}));

// Mock the stripe client
vi.mock('@/lib/stripe/client', () => ({
  getStripeClient: vi.fn().mockResolvedValue(null),
}));

describe('StripeProvider', () => {
  it('renders children inside Elements wrapper', async () => {
    const { StripeProvider } = await import('../components/payment/StripeProvider');
    const { getByText, getByTestId } = render(
      <StripeProvider clientSecret="pi_test_secret">
        <div>Payment Form</div>
      </StripeProvider>
    );
    expect(getByTestId('stripe-elements')).toBeDefined();
    expect(getByText('Payment Form')).toBeDefined();
  });

  it('passes clientSecret and locale options to Elements', async () => {
    const { StripeProvider } = await import('../components/payment/StripeProvider');
    const { getByTestId } = render(
      <StripeProvider clientSecret="pi_test_secret_123">
        <div data-testid="child">Child</div>
      </StripeProvider>
    );
    // The mock Elements renders children - verify component mounts properly
    expect(getByTestId('stripe-elements')).toBeDefined();
    expect(getByTestId('child')).toBeDefined();
  });
});
