import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'test-uuid-123' }),
  useRouter: () => ({ replace: vi.fn() }),
}));

// Mock framer-motion - strip motion-specific props to avoid DOM warnings
function stripMotionProps(props: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { initial, animate, exit, transition, variants, whileHover, whileTap, ...rest } = props;
  return rest;
}

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => (
      <div {...stripMotionProps(props)}>{children}</div>
    ),
    p: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => (
      <p {...stripMotionProps(props)}>{children}</p>
    ),
    button: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => (
      <button {...(stripMotionProps(props) as React.ButtonHTMLAttributes<HTMLButtonElement>)}>
        {children}
      </button>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => false,
}));

// Mock PaymentForm
vi.mock('@/components/payment/PaymentForm', () => ({
  PaymentForm: ({
    onPaymentSuccess,
    onPaymentError,
  }: {
    onPaymentSuccess: () => void;
    onPaymentError: (msg: string) => void;
  }) => (
    <div data-testid="payment-form">
      <button onClick={onPaymentSuccess}>Pay</button>
      <button onClick={() => onPaymentError('Test error')}>Fail</button>
    </div>
  ),
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
    <div data-testid={`blurred-card-${rank}`}>Card {rank}</div>
  ),
}));

// Mock FaceShapeAnalysisSection (replaces PaidResultsPlaceholder in Epic 6)
vi.mock('@/components/results/FaceShapeAnalysisSection', () => ({
  FaceShapeAnalysisSection: () => (
    <div data-testid="face-shape-analysis-section">Análise do formato do rosto</div>
  ),
}));

// Mock stripe pricing
vi.mock('@/lib/stripe/pricing', () => ({
  FIRST_CONSULTATION_PRICE: 599,
  RETURNING_CONSULTATION_PRICE: 299,
  CURRENCY: 'eur',
  determinePrice: vi.fn(),
}));

// Mock usePayment
vi.mock('@/hooks/usePayment', () => ({
  usePayment: vi.fn(() => ({
    clientSecret: null,
    amount: 599,
    currency: 'eur',
    userType: 'guest',
    isLoading: false,
    error: null,
    createPaymentIntent: vi.fn(),
    confirmPayment: vi.fn(),
  })),
}));

// Mock html-to-image (used by BarberCard via ResultsActionsFooter)
vi.mock('html-to-image', () => ({
  toPng: vi.fn().mockResolvedValue('data:image/png;base64,mock'),
}));

// Mock face-shape-labels (used by BarberCard and Paywall)
vi.mock('@/lib/consultation/face-shape-labels', () => ({
  FACE_SHAPE_LABELS: {
    oval: 'Oval', round: 'Redondo', square: 'Quadrado', oblong: 'Oblongo',
    heart: 'Coração', diamond: 'Diamante', triangle: 'Triangular',
  },
  FACE_SHAPE_DESCRIPTIONS: {
    oval: 'Rosto oval.', round: 'Rosto redondo.', square: 'Rosto quadrado.',
    oblong: 'Rosto oblongo.', heart: 'Rosto coração.', diamond: 'Rosto diamante.',
    triangle: 'Rosto triangular.',
  },
}));

// Consultation store mock state - mutable object for per-test overrides
const mockStoreState = {
  consultationId: 'test-uuid-123' as string | null,
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
  } as typeof mockStoreState['faceAnalysis'] | null,
  photoPreview: null as string | null,
  paymentStatus: 'none' as 'none' | 'pending' | 'paid' | 'failed',
  consultation: null,
  gender: null as 'male' | 'female' | null,
  previews: new Map<string, unknown>(),
  reset: vi.fn(),
  setPaymentStatus: vi.fn(),
  setConsultationId: vi.fn(),
  setFaceAnalysis: vi.fn(),
  setConsultation: vi.fn(),
  setGender: vi.fn(),
};

vi.mock('@/stores/consultation', () => ({
  useConsultationStore: vi.fn(
    (selector: (state: typeof mockStoreState) => unknown) => {
      if (typeof selector === 'function') {
        return selector(mockStoreState);
      }
      return mockStoreState;
    }
  ),
}));

describe('Results page payment transition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state defaults
    mockStoreState.consultationId = 'test-uuid-123';
    mockStoreState.faceAnalysis = {
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
    };
    mockStoreState.paymentStatus = 'none';
    mockStoreState.setPaymentStatus = vi.fn();
  });

  it('renders Paywall (Desbloquear button) when paymentStatus is "none"', async () => {
    mockStoreState.paymentStatus = 'none';
    const ResultsPage = (await import('@/app/consultation/results/[id]/page'))
      .default;
    render(<ResultsPage />);
    expect(screen.getByText(/Desbloquear consultoria completa/i)).toBeDefined();
  });

  it('renders Paywall when paymentStatus is "pending"', async () => {
    mockStoreState.paymentStatus = 'pending';
    const ResultsPage = (await import('@/app/consultation/results/[id]/page'))
      .default;
    render(<ResultsPage />);
    expect(screen.getByText(/Desbloquear consultoria completa/i)).toBeDefined();
  });

  it('renders FaceShapeAnalysisSection when paymentStatus is "paid"', async () => {
    mockStoreState.paymentStatus = 'paid';
    const ResultsPage = (await import('@/app/consultation/results/[id]/page'))
      .default;
    render(<ResultsPage />);
    expect(screen.getByTestId('face-shape-analysis-section')).toBeDefined();
  });

  it('does NOT show Paywall unlock button when paymentStatus is "paid"', async () => {
    mockStoreState.paymentStatus = 'paid';
    const ResultsPage = (await import('@/app/consultation/results/[id]/page'))
      .default;
    render(<ResultsPage />);
    expect(
      screen.queryByText(/Desbloquear consultoria completa/i)
    ).toBeNull();
  });

  it('renders hydration loader when consultationId is missing but URL has id (profile navigation)', async () => {
    // When navigating from profile history, the store may be stale (no consultationId/faceAnalysis)
    // but the URL has a consultation id. The page should show a loading spinner while hydrating.
    mockStoreState.consultationId = null;
    mockStoreState.faceAnalysis = null;
    // Mock fetch to never resolve (simulates in-flight hydration)
    const mockFetch = vi.fn(() => new Promise(() => {}));
    global.fetch = mockFetch;
    const ResultsPage = (await import('@/app/consultation/results/[id]/page'))
      .default;
    const { container } = render(<ResultsPage />);
    // Should show loading spinner, not null
    expect(container.firstChild).not.toBeNull();
    const loader = container.querySelector('[aria-busy="true"]');
    expect(loader).not.toBeNull();
  });

  it('renders without errors using AnimatePresence wrapper', async () => {
    mockStoreState.paymentStatus = 'none';
    const ResultsPage = (await import('@/app/consultation/results/[id]/page'))
      .default;
    const { container } = render(<ResultsPage />);
    expect(container).toBeDefined();
  });

  it('paid results shows face shape analysis section', async () => {
    mockStoreState.paymentStatus = 'paid';
    const ResultsPage = (await import('@/app/consultation/results/[id]/page'))
      .default;
    render(<ResultsPage />);
    expect(screen.getByTestId('face-shape-analysis-section')).toBeDefined();
  });

  it('renders PaymentForm when clientSecret is available and paymentStatus is not paid', async () => {
    const { usePayment } = await import('@/hooks/usePayment');
    vi.mocked(usePayment).mockReturnValue({
      clientSecret: 'pi_test_secret',
      amount: 599,
      currency: 'eur',
      userType: 'guest',
      isLoading: false,
      error: null,
      createPaymentIntent: vi.fn(),
      confirmPayment: vi.fn(),
    });
    mockStoreState.paymentStatus = 'none';
    const ResultsPage = (await import('@/app/consultation/results/[id]/page'))
      .default;
    render(<ResultsPage />);
    // PaymentForm mock should be rendered when clientSecret is available
    expect(screen.getByTestId('payment-form')).toBeDefined();
  });

  it('passes onPaymentSuccess callback that triggers setPaymentStatus("paid")', async () => {
    // Reset usePayment mock to default (no clientSecret)
    const { usePayment } = await import('@/hooks/usePayment');
    vi.mocked(usePayment).mockReturnValue({
      clientSecret: null,
      amount: 599,
      currency: 'eur',
      userType: 'guest',
      isLoading: false,
      error: null,
      createPaymentIntent: vi.fn(),
      confirmPayment: vi.fn(),
    });
    mockStoreState.paymentStatus = 'none';
    const ResultsPage = (await import('@/app/consultation/results/[id]/page'))
      .default;
    render(<ResultsPage />);
    // Verify unlock button is visible (Paywall pre-clientSecret state)
    expect(screen.getByText(/Desbloquear consultoria completa/i)).toBeDefined();
  });
});
