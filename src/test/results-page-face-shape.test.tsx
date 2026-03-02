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
    section: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => (
      <section {...stripMotionProps(props)}>{children}</section>
    ),
    span: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => (
      <span {...stripMotionProps(props)}>{children}</span>
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

// Mock useConsultationStatus
const mockUseConsultationStatus = vi.fn((_consultationId: string, _enabled: boolean) => ({
  isPolling: false,
  consultationStatus: null,
}));
vi.mock('@/hooks/useConsultationStatus', () => ({
  useConsultationStatus: (consultationId: string, enabled: boolean) =>
    mockUseConsultationStatus(consultationId, enabled),
}));

// Mock Paywall
vi.mock('@/components/consultation/Paywall', () => ({
  Paywall: ({ faceAnalysis }: { faceAnalysis: unknown }) =>
    faceAnalysis ? <div data-testid="paywall">Paywall</div> : null,
}));

// Mock RefundBanner
vi.mock('@/components/consultation/RefundBanner', () => ({
  RefundBanner: () => (
    <div data-testid="refund-banner">Reembolso</div>
  ),
}));

// Mock FaceShapeAnalysisSection
vi.mock('@/components/results/FaceShapeAnalysisSection', () => ({
  FaceShapeAnalysisSection: ({
    faceAnalysis,
    photoPreview,
  }: {
    faceAnalysis: unknown;
    photoPreview: string | null;
  }) => (
    <div data-testid="face-shape-analysis-section">
      <span data-testid="face-shape-face-analysis">{JSON.stringify(faceAnalysis)}</span>
      <span data-testid="face-shape-photo-preview">{photoPreview ?? 'null'}</span>
    </div>
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

let mockPaymentStatus: string = 'none';
let mockConsultationId: string | null = validId;
let mockFaceAnalysisState: typeof mockFaceAnalysis | null = mockFaceAnalysis;
let mockPhotoPreview: string | null = 'data:image/jpeg;base64,test123';

vi.mock('@/stores/consultation', () => ({
  useConsultationStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      consultationId: mockConsultationId,
      faceAnalysis: mockFaceAnalysisState,
      paymentStatus: mockPaymentStatus,
      photoPreview: mockPhotoPreview,
      setPaymentStatus: vi.fn(),
    }),
}));

describe('ResultsPage with FaceShapeAnalysisSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPaymentStatus = 'none';
    mockConsultationId = validId;
    mockFaceAnalysisState = mockFaceAnalysis;
    mockPhotoPreview = 'data:image/jpeg;base64,test123';
    mockUseConsultationStatus.mockReturnValue({ isPolling: false, consultationStatus: null });
  });

  it('renders FaceShapeAnalysisSection (not PaidResultsPlaceholder) when paymentStatus is "paid"', async () => {
    mockPaymentStatus = 'paid';
    const ResultsPage = (await import('@/app/consultation/results/[id]/page')).default;
    render(<ResultsPage />);
    expect(screen.getByTestId('face-shape-analysis-section')).toBeInTheDocument();
  });

  it('does NOT render PaidResultsPlaceholder text when paymentStatus is "paid"', async () => {
    mockPaymentStatus = 'paid';
    const ResultsPage = (await import('@/app/consultation/results/[id]/page')).default;
    render(<ResultsPage />);
    expect(screen.queryByText('Consultoria completa desbloqueada!')).not.toBeInTheDocument();
  });

  it('renders Paywall when paymentStatus is "none"', async () => {
    mockPaymentStatus = 'none';
    const ResultsPage = (await import('@/app/consultation/results/[id]/page')).default;
    render(<ResultsPage />);
    expect(screen.getByTestId('paywall')).toBeInTheDocument();
    expect(screen.queryByTestId('face-shape-analysis-section')).not.toBeInTheDocument();
  });

  it('renders Paywall when paymentStatus is "pending"', async () => {
    mockPaymentStatus = 'pending';
    const ResultsPage = (await import('@/app/consultation/results/[id]/page')).default;
    render(<ResultsPage />);
    expect(screen.getByTestId('paywall')).toBeInTheDocument();
    expect(screen.queryByTestId('face-shape-analysis-section')).not.toBeInTheDocument();
  });

  it('renders RefundBanner when paymentStatus is "refunded"', async () => {
    mockPaymentStatus = 'refunded';
    const ResultsPage = (await import('@/app/consultation/results/[id]/page')).default;
    render(<ResultsPage />);
    expect(screen.getByTestId('refund-banner')).toBeInTheDocument();
    expect(screen.queryByTestId('face-shape-analysis-section')).not.toBeInTheDocument();
  });

  it('passes faceAnalysis from store to FaceShapeAnalysisSection', async () => {
    mockPaymentStatus = 'paid';
    const ResultsPage = (await import('@/app/consultation/results/[id]/page')).default;
    render(<ResultsPage />);
    const faceAnalysisEl = screen.getByTestId('face-shape-face-analysis');
    const parsed = JSON.parse(faceAnalysisEl.textContent ?? '{}');
    expect(parsed.faceShape).toBe('oval');
    expect(parsed.confidence).toBe(0.93);
  });

  it('passes photoPreview from store to FaceShapeAnalysisSection', async () => {
    mockPaymentStatus = 'paid';
    mockPhotoPreview = 'data:image/jpeg;base64,abc';
    const ResultsPage = (await import('@/app/consultation/results/[id]/page')).default;
    render(<ResultsPage />);
    const photoEl = screen.getByTestId('face-shape-photo-preview');
    expect(photoEl.textContent).toBe('data:image/jpeg;base64,abc');
  });

  it('passes null photoPreview correctly', async () => {
    mockPaymentStatus = 'paid';
    mockPhotoPreview = null;
    const ResultsPage = (await import('@/app/consultation/results/[id]/page')).default;
    render(<ResultsPage />);
    const photoEl = screen.getByTestId('face-shape-photo-preview');
    expect(photoEl.textContent).toBe('null');
  });
});
