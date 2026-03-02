import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Mock confirmPayment function
const mockConfirmPayment = vi.fn();

// Mock useStripe and useElements
const mockUseStripe = vi.fn(() => ({
  confirmPayment: mockConfirmPayment,
}));
const mockUseElements = vi.fn(() => ({}));

vi.mock('@stripe/react-stripe-js', () => ({
  PaymentElement: (props: React.HTMLAttributes<HTMLDivElement>) => (
    <div data-testid="payment-element" {...props} />
  ),
  ExpressCheckoutElement: ({
    onConfirm,
    ...props
  }: {
    onConfirm?: (event: Record<string, unknown>) => void;
    options?: Record<string, unknown>;
  } & React.HTMLAttributes<HTMLDivElement>) => (
    <div
      data-testid="express-checkout-element"
      onClick={() => onConfirm?.({})}
      {...props}
    />
  ),
  useStripe: () => mockUseStripe(),
  useElements: () => mockUseElements(),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => (
      <div {...props}>{children}</div>
    ),
    button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) => (
      <button {...props}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => false,
}));

describe('PaymentForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseStripe.mockReturnValue({ confirmPayment: mockConfirmPayment });
    mockUseElements.mockReturnValue({});
  });

  it('renders PaymentElement for card input', async () => {
    const { PaymentForm } = await import('@/components/payment/PaymentForm');
    render(
      <PaymentForm
        onPaymentSuccess={vi.fn()}
        onPaymentError={vi.fn()}
      />
    );
    expect(screen.getByTestId('payment-element')).toBeDefined();
  });

  it('renders ExpressCheckoutElement for Apple Pay / Google Pay', async () => {
    const { PaymentForm } = await import('@/components/payment/PaymentForm');
    render(
      <PaymentForm
        onPaymentSuccess={vi.fn()}
        onPaymentError={vi.fn()}
      />
    );
    expect(screen.getByTestId('express-checkout-element')).toBeDefined();
  });

  it('renders "Pagar" submit button', async () => {
    const { PaymentForm } = await import('@/components/payment/PaymentForm');
    render(
      <PaymentForm
        onPaymentSuccess={vi.fn()}
        onPaymentError={vi.fn()}
      />
    );
    expect(screen.getByText('Pagar')).toBeDefined();
  });

  it('calls stripe.confirmPayment on card form submit', async () => {
    mockConfirmPayment.mockResolvedValueOnce({ error: null });
    const { PaymentForm } = await import('@/components/payment/PaymentForm');
    const onPaymentSuccess = vi.fn();
    render(
      <PaymentForm
        onPaymentSuccess={onPaymentSuccess}
        onPaymentError={vi.fn()}
      />
    );

    const form = screen.getByRole('button', { name: 'Pagar' }).closest('form');
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(mockConfirmPayment).toHaveBeenCalled();
    });
  });

  it('calls onPaymentSuccess on successful payment', async () => {
    mockConfirmPayment.mockResolvedValueOnce({ error: null });
    const { PaymentForm } = await import('@/components/payment/PaymentForm');
    const onPaymentSuccess = vi.fn();
    render(
      <PaymentForm
        onPaymentSuccess={onPaymentSuccess}
        onPaymentError={vi.fn()}
      />
    );

    const form = screen.getByRole('button', { name: 'Pagar' }).closest('form');
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(onPaymentSuccess).toHaveBeenCalledOnce();
    });
  });

  it('calls onPaymentError with message on payment failure', async () => {
    mockConfirmPayment.mockResolvedValueOnce({
      error: { message: 'Card declined' },
    });
    const { PaymentForm } = await import('@/components/payment/PaymentForm');
    const onPaymentError = vi.fn();
    render(
      <PaymentForm
        onPaymentSuccess={vi.fn()}
        onPaymentError={onPaymentError}
      />
    );

    const form = screen.getByRole('button', { name: 'Pagar' }).closest('form');
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(onPaymentError).toHaveBeenCalledWith('Card declined');
    });
  });

  it('calls onPaymentError with fallback message when error message is undefined', async () => {
    mockConfirmPayment.mockResolvedValueOnce({
      error: { message: undefined },
    });
    const { PaymentForm } = await import('@/components/payment/PaymentForm');
    const onPaymentError = vi.fn();
    render(
      <PaymentForm
        onPaymentSuccess={vi.fn()}
        onPaymentError={onPaymentError}
      />
    );

    const form = screen.getByRole('button', { name: 'Pagar' }).closest('form');
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(onPaymentError).toHaveBeenCalledWith(
        'Pagamento não processado. Tente outro método.'
      );
    });
  });

  it('disables submit button while processing', async () => {
    // Create a promise that doesn't resolve immediately
    let resolvePayment!: (value: { error: null }) => void;
    const pendingPayment = new Promise<{ error: null }>((resolve) => {
      resolvePayment = resolve;
    });
    mockConfirmPayment.mockReturnValueOnce(pendingPayment);

    const { PaymentForm } = await import('@/components/payment/PaymentForm');
    render(
      <PaymentForm
        onPaymentSuccess={vi.fn()}
        onPaymentError={vi.fn()}
      />
    );

    const form = screen.getByRole('button', { name: 'Pagar' }).closest('form');
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(screen.getByText('A processar...')).toBeDefined();
    });

    // Resolve to cleanup
    resolvePayment({ error: null });
  });

  it('shows aria-busy on submit button while processing', async () => {
    let resolvePayment!: (value: { error: null }) => void;
    const pendingPayment = new Promise<{ error: null }>((resolve) => {
      resolvePayment = resolve;
    });
    mockConfirmPayment.mockReturnValueOnce(pendingPayment);

    const { PaymentForm } = await import('@/components/payment/PaymentForm');
    render(
      <PaymentForm
        onPaymentSuccess={vi.fn()}
        onPaymentError={vi.fn()}
      />
    );

    const form = screen.getByRole('button', { name: 'Pagar' }).closest('form');
    fireEvent.submit(form!);

    await waitFor(() => {
      const button = screen.getByText('A processar...').closest('button');
      expect(button?.getAttribute('aria-busy')).toBe('true');
    });

    resolvePayment({ error: null });
  });

  it('disables submit when stripe is not loaded', async () => {
    mockUseStripe.mockReturnValueOnce(null);
    const { PaymentForm } = await import('@/components/payment/PaymentForm');
    render(
      <PaymentForm
        onPaymentSuccess={vi.fn()}
        onPaymentError={vi.fn()}
      />
    );

    const button = screen.getByRole('button', { name: 'Pagar' });
    expect(button.hasAttribute('disabled')).toBe(true);
  });

  it('handles ExpressCheckout confirm by calling confirmPayment', async () => {
    mockConfirmPayment.mockResolvedValueOnce({ error: null });
    const { PaymentForm } = await import('@/components/payment/PaymentForm');
    const onPaymentSuccess = vi.fn();
    render(
      <PaymentForm
        onPaymentSuccess={onPaymentSuccess}
        onPaymentError={vi.fn()}
      />
    );

    const expressElement = screen.getByTestId('express-checkout-element');
    fireEvent.click(expressElement);

    await waitFor(() => {
      expect(mockConfirmPayment).toHaveBeenCalled();
      expect(onPaymentSuccess).toHaveBeenCalledOnce();
    });
  });

  it('handles ExpressCheckout failure by calling onPaymentError', async () => {
    mockConfirmPayment.mockResolvedValueOnce({
      error: { message: 'Express payment failed' },
    });
    const { PaymentForm } = await import('@/components/payment/PaymentForm');
    const onPaymentError = vi.fn();
    render(
      <PaymentForm
        onPaymentSuccess={vi.fn()}
        onPaymentError={onPaymentError}
      />
    );

    const expressElement = screen.getByTestId('express-checkout-element');
    fireEvent.click(expressElement);

    await waitFor(() => {
      expect(onPaymentError).toHaveBeenCalledWith('Express payment failed');
    });
  });

  it('re-enables submit button after payment failure', async () => {
    mockConfirmPayment.mockResolvedValueOnce({
      error: { message: 'Card declined' },
    });
    const { PaymentForm } = await import('@/components/payment/PaymentForm');
    render(
      <PaymentForm
        onPaymentSuccess={vi.fn()}
        onPaymentError={vi.fn()}
      />
    );

    const form = screen.getByRole('button', { name: 'Pagar' }).closest('form');
    fireEvent.submit(form!);

    await waitFor(() => {
      const button = screen.getByRole('button', { name: 'Pagar' });
      expect(button.hasAttribute('disabled')).toBe(false);
    });
  });
});
