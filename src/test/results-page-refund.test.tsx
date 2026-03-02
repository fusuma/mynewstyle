import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useParams: () => ({ id: '550e8400-e29b-41d4-a716-446655440000' }),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

// Mock framer-motion
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
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => false,
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
  })),
}));

// Mock useConsultationStatus hook
const mockUseConsultationStatus = vi.fn((_consultationId: string, _enabled: boolean) => ({
  isPolling: false,
  consultationStatus: null,
}));
vi.mock('@/hooks/useConsultationStatus', () => ({
  useConsultationStatus: (consultationId: string, enabled: boolean) =>
    mockUseConsultationStatus(consultationId, enabled),
}));

// Mock Paywall component
vi.mock('@/components/consultation/Paywall', () => ({
  Paywall: ({ faceAnalysis }: { faceAnalysis: unknown }) =>
    faceAnalysis ? <div data-testid="paywall">Paywall</div> : null,
}));

// Mock RefundBanner
vi.mock('@/components/consultation/RefundBanner', () => ({
  RefundBanner: () => (
    <div data-testid="refund-banner">
      Ocorreu um erro. O seu pagamento foi reembolsado.
    </div>
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

const validId = '550e8400-e29b-41d4-a716-446655440000';

const mockFaceAnalysis = {
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

// Store mock state that can be configured per test
let mockPaymentStatus: string = 'none';
let mockConsultationId: string | null = validId;
let mockFaceAnalysisState: typeof mockFaceAnalysis | null = mockFaceAnalysis;

vi.mock('@/stores/consultation', () => ({
  useConsultationStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      consultationId: mockConsultationId,
      faceAnalysis: mockFaceAnalysisState,
      paymentStatus: mockPaymentStatus,
      photoPreview: null,
      setPaymentStatus: vi.fn(),
    }),
}));

describe('ResultsPage refund flow integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPaymentStatus = 'none';
    mockConsultationId = validId;
    mockFaceAnalysisState = mockFaceAnalysis;
    mockUseConsultationStatus.mockReturnValue({ isPolling: false, consultationStatus: null });
  });

  it('renders Paywall when paymentStatus is "none"', async () => {
    mockPaymentStatus = 'none';
    const ResultsPage = (await import('@/app/consultation/results/[id]/page')).default;
    render(<ResultsPage />);
    expect(screen.getByTestId('paywall')).toBeInTheDocument();
  });

  it('renders Paywall when paymentStatus is "pending"', async () => {
    mockPaymentStatus = 'pending';
    const ResultsPage = (await import('@/app/consultation/results/[id]/page')).default;
    render(<ResultsPage />);
    expect(screen.getByTestId('paywall')).toBeInTheDocument();
  });

  it('renders FaceShapeAnalysisSection when paymentStatus is "paid"', async () => {
    mockPaymentStatus = 'paid';
    const ResultsPage = (await import('@/app/consultation/results/[id]/page')).default;
    render(<ResultsPage />);
    expect(screen.getByTestId('face-shape-analysis-section')).toBeInTheDocument();
  });

  it('renders RefundBanner when paymentStatus is "refunded"', async () => {
    mockPaymentStatus = 'refunded';
    const ResultsPage = (await import('@/app/consultation/results/[id]/page')).default;
    render(<ResultsPage />);
    expect(screen.getByTestId('refund-banner')).toBeInTheDocument();
  });

  it('does NOT render Paywall when paymentStatus is "refunded"', async () => {
    mockPaymentStatus = 'refunded';
    const ResultsPage = (await import('@/app/consultation/results/[id]/page')).default;
    render(<ResultsPage />);
    expect(screen.queryByTestId('paywall')).not.toBeInTheDocument();
  });

  it('enables polling hook when paymentStatus is "paid"', async () => {
    mockPaymentStatus = 'paid';
    const ResultsPage = (await import('@/app/consultation/results/[id]/page')).default;
    render(<ResultsPage />);
    expect(mockUseConsultationStatus).toHaveBeenCalledWith(validId, true);
  });

  it('disables polling when paymentStatus is not "paid"', async () => {
    mockPaymentStatus = 'none';
    const ResultsPage = (await import('@/app/consultation/results/[id]/page')).default;
    render(<ResultsPage />);
    expect(mockUseConsultationStatus).toHaveBeenCalledWith(validId, false);
  });

  it('disables polling when paymentStatus is "refunded"', async () => {
    mockPaymentStatus = 'refunded';
    const ResultsPage = (await import('@/app/consultation/results/[id]/page')).default;
    render(<ResultsPage />);
    expect(mockUseConsultationStatus).toHaveBeenCalledWith(validId, false);
  });
});
