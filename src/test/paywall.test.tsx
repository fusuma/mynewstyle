import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

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
  useReducedMotion: () => false,
}));

// Mock StripeProvider
vi.mock('@/components/payment/StripeProvider', () => ({
  StripeProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="stripe-provider">{children}</div>
  ),
}));

// Mock BlurredRecommendationCard
vi.mock('@/components/consultation/BlurredRecommendationCard', () => ({
  BlurredRecommendationCard: ({ rank }: { rank: number }) => (
    <div data-testid={`blurred-card-${rank}`}>Recomendação #{rank}</div>
  ),
}));

// Mock stripe pricing so the import in Paywall resolves in test environment
vi.mock('@/lib/stripe/pricing', () => ({
  FIRST_CONSULTATION_PRICE: 599,
  RETURNING_CONSULTATION_PRICE: 299,
  CURRENCY: 'eur',
  determinePrice: vi.fn(),
}));

const defaultProps = {
  faceAnalysis: {
    faceShape: 'oval' as const,
    confidence: 0.93,
    proportions: {
      foreheadRatio: 0.33,
      cheekboneRatio: 0.35,
      jawRatio: 0.32,
      faceLength: 0.55,
    },
    hairAssessment: {
      type: 'wavy',
      texture: 'fine',
      density: 'medium',
      currentStyle: 'short',
    },
  },
  consultationId: 'test-uuid-123',
  amount: 599,
  currency: 'eur',
  userType: 'guest',
  clientSecret: null as string | null,
  isLoadingPayment: false,
  paymentError: null as string | null,
  onInitiatePayment: vi.fn(),
};

describe('Paywall', () => {
  it('renders face shape badge with correct label for oval', async () => {
    const { Paywall } = await import('@/components/consultation/Paywall');
    render(<Paywall {...defaultProps} />);
    // Use getAllByText since "Rosto" and "Oval" appear in both badge and description
    const matches = screen.getAllByText(/Rosto Oval/i);
    expect(matches.length).toBeGreaterThanOrEqual(1);
    // Verify at least one is the badge span
    const badge = matches.find((el) => el.tagName === 'SPAN');
    expect(badge).toBeDefined();
  });

  it('renders confidence percentage', async () => {
    const { Paywall } = await import('@/components/consultation/Paywall');
    render(<Paywall {...defaultProps} />);
    expect(screen.getByText(/93% de certeza/i)).toBeDefined();
  });

  it('renders 3 blurred recommendation placeholders', async () => {
    const { Paywall } = await import('@/components/consultation/Paywall');
    render(<Paywall {...defaultProps} />);
    expect(screen.getByTestId('blurred-card-1')).toBeDefined();
    expect(screen.getByTestId('blurred-card-2')).toBeDefined();
    expect(screen.getByTestId('blurred-card-3')).toBeDefined();
  });

  it('displays correct pricing for first-time/guest user (€5.99)', async () => {
    const { Paywall } = await import('@/components/consultation/Paywall');
    render(<Paywall {...defaultProps} userType="guest" amount={599} />);
    expect(screen.getByText(/€5\.99/)).toBeDefined();
  });

  it('displays "Consultoria completa" description for guest user', async () => {
    const { Paywall } = await import('@/components/consultation/Paywall');
    render(<Paywall {...defaultProps} userType="guest" />);
    // "Consultoria completa" appears in pricing description span
    const matches = screen.getAllByText(/Consultoria completa/i);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('displays correct pricing for returning user (€2.99)', async () => {
    const { Paywall } = await import('@/components/consultation/Paywall');
    render(<Paywall {...defaultProps} userType="returning" amount={299} />);
    expect(screen.getByText(/€2\.99/)).toBeDefined();
  });

  it('displays "Nova consultoria" description for returning user', async () => {
    const { Paywall } = await import('@/components/consultation/Paywall');
    render(<Paywall {...defaultProps} userType="returning" amount={299} />);
    expect(screen.getByText(/Nova consultoria/i)).toBeDefined();
  });

  it('displays pricing using fallback when amount is null (pre-API-call state)', async () => {
    const { Paywall } = await import('@/components/consultation/Paywall');
    render(<Paywall {...defaultProps} amount={null} userType={null} />);
    // Should display default guest price (€5.99) even before API call
    expect(screen.getByText(/€5\.99/)).toBeDefined();
  });

  it('displays feature list with all 4 features', async () => {
    const { Paywall } = await import('@/components/consultation/Paywall');
    render(<Paywall {...defaultProps} />);
    expect(screen.getByText(/2-3 cortes recomendados/i)).toBeDefined();
    expect(screen.getByText(/Visualização IA/i)).toBeDefined();
    expect(screen.getByText(/Cartão para o barbeiro/i)).toBeDefined();
    expect(screen.getByText(/Dicas de styling/i)).toBeDefined();
  });

  it('displays trust badge with refund guarantee text', async () => {
    const { Paywall } = await import('@/components/consultation/Paywall');
    render(<Paywall {...defaultProps} />);
    expect(screen.getByText(/Reembolso automático se a IA falhar/i)).toBeDefined();
  });

  it('calls onInitiatePayment when unlock button is clicked (no clientSecret)', async () => {
    const onInitiatePayment = vi.fn();
    const { Paywall } = await import('@/components/consultation/Paywall');
    render(<Paywall {...defaultProps} onInitiatePayment={onInitiatePayment} clientSecret={null} />);
    const unlockButton = screen.getByText(/Desbloquear consultoria completa/i);
    fireEvent.click(unlockButton);
    expect(onInitiatePayment).toHaveBeenCalledOnce();
  });

  it('shows loading text and disabled state when isLoadingPayment is true', async () => {
    const { Paywall } = await import('@/components/consultation/Paywall');
    render(<Paywall {...defaultProps} isLoadingPayment={true} />);
    // Button should show loading text
    const button = screen.getByText(/A processar/i);
    expect(button.closest('button')?.getAttribute('disabled')).not.toBeNull();
    expect(button.closest('button')?.getAttribute('aria-busy')).toBe('true');
  });

  it('shows error message when paymentError is set', async () => {
    const { Paywall } = await import('@/components/consultation/Paywall');
    render(<Paywall {...defaultProps} paymentError="Payment setup failed" />);
    expect(screen.getByText(/Payment setup failed/i)).toBeDefined();
  });

  it('renders StripeProvider when clientSecret is available', async () => {
    const { Paywall } = await import('@/components/consultation/Paywall');
    render(<Paywall {...defaultProps} clientSecret="pi_test_secret_xyz" />);
    expect(screen.getByTestId('stripe-provider')).toBeDefined();
  });

  it('does not render StripeProvider when clientSecret is null', async () => {
    const { Paywall } = await import('@/components/consultation/Paywall');
    render(<Paywall {...defaultProps} clientSecret={null} />);
    expect(screen.queryByTestId('stripe-provider')).toBeNull();
  });

  it('renders face shape description for oval', async () => {
    const { Paywall } = await import('@/components/consultation/Paywall');
    render(<Paywall {...defaultProps} />);
    // The oval description should appear
    expect(screen.getByText(/O rosto oval/i)).toBeDefined();
  });

  it('renders face shape label for square', async () => {
    const { Paywall } = await import('@/components/consultation/Paywall');
    render(
      <Paywall
        {...defaultProps}
        faceAnalysis={{ ...defaultProps.faceAnalysis, faceShape: 'square' }}
      />
    );
    // "Rosto Quadrado" appears in badge and description; verify badge span exists
    const matches = screen.getAllByText(/Rosto Quadrado/i);
    expect(matches.length).toBeGreaterThanOrEqual(1);
    const badge = matches.find((el) => el.tagName === 'SPAN');
    expect(badge).toBeDefined();
  });

  it('shows correct secondary button label with proper Portuguese text', async () => {
    const { Paywall } = await import('@/components/consultation/Paywall');
    render(<Paywall {...defaultProps} clientSecret="pi_test_secret_xyz" />);
    expect(screen.getByText(/Cartão de crédito\/débito/i)).toBeDefined();
  });
});
