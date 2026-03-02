import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

// Use a plain record to capture options without complex union type constraints
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let capturedOptions: Record<string, any> | undefined;

// Mock @stripe/react-stripe-js
vi.mock('@stripe/react-stripe-js', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Elements: ({ children, options }: { children: React.ReactNode; options?: Record<string, any> }) => {
    capturedOptions = options;
    return <div data-testid="stripe-elements">{children}</div>;
  },
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
    capturedOptions = undefined;
    const { StripeProvider } = await import('../components/payment/StripeProvider');
    render(
      <StripeProvider clientSecret="pi_test_secret_123">
        <div data-testid="child">Child</div>
      </StripeProvider>
    );
    expect(capturedOptions).toBeDefined();
    expect(capturedOptions!.clientSecret).toBe('pi_test_secret_123');
    expect(capturedOptions!.locale).toBe('pt-BR');
  });

  it('uses appearance theme matching the design system', async () => {
    capturedOptions = undefined;
    const { StripeProvider } = await import('../components/payment/StripeProvider');
    render(
      <StripeProvider clientSecret="pi_test_appearance">
        <span />
      </StripeProvider>
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const appearance = (capturedOptions as any)?.appearance;
    expect(appearance?.theme).toBe('stripe');
    expect(appearance?.variables?.colorPrimary).toBe('hsl(var(--primary))');
    expect(appearance?.variables?.colorBackground).toBe('hsl(var(--background))');
  });
});
