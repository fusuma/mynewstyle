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
vi.mock('@/hooks/useConsultationStatus', () => ({
  useConsultationStatus: vi.fn(() => ({ isPolling: false, consultationStatus: null })),
}));

// Mock Paywall
vi.mock('@/components/consultation/Paywall', () => ({
  Paywall: ({ faceAnalysis }: { faceAnalysis: unknown }) =>
    faceAnalysis ? <div data-testid="paywall">Paywall</div> : null,
}));

// Mock RefundBanner
vi.mock('@/components/consultation/RefundBanner', () => ({
  RefundBanner: () => <div data-testid="refund-banner">Reembolso</div>,
}));

// Mock FaceShapeAnalysisSection
vi.mock('@/components/results/FaceShapeAnalysisSection', () => ({
  FaceShapeAnalysisSection: () => <div data-testid="face-shape-analysis-section" />,
}));

// Mock HeroRecommendationCard
// Note: gender prop was removed — theme is handled by CSS variables via data-theme on <html>
vi.mock('@/components/consultation/HeroRecommendationCard', () => ({
  HeroRecommendationCard: ({
    recommendation,
  }: {
    recommendation: { styleName: string; matchScore: number; difficultyLevel: string; justification: string };
  }) => (
    <div data-testid="hero-recommendation-card">
      <span data-testid="hero-style-name">{recommendation.styleName}</span>
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

const mockConsultation = {
  recommendations: [
    {
      styleName: 'Corte Degradê',
      justification: 'Este estilo complementa seu rosto oval.',
      matchScore: 0.93,
      difficultyLevel: 'low',
    },
    {
      styleName: 'Topete Texturizado',
      justification: 'Outra boa opcao para rosto oval.',
      matchScore: 0.85,
      difficultyLevel: 'medium',
    },
  ],
  stylesToAvoid: [],
  groomingTips: [],
};

let mockPaymentStatus: string = 'none';
let mockConsultationId: string | null = validId;
let mockFaceAnalysisState: typeof mockFaceAnalysis | null = mockFaceAnalysis;
let mockPhotoPreview: string | null = 'data:image/jpeg;base64,test123';
let mockGender: string | null = 'male';
let mockConsultationData: typeof mockConsultation | null = mockConsultation;

vi.mock('@/hooks/usePreviewGeneration', () => ({
  usePreviewGeneration: () => ({
    isAnyGenerating: false,
    triggerPreview: vi.fn(),
    getPreviewStatus: () => ({ status: 'idle' }),
  }),
}));

vi.mock('@/stores/consultation', () => ({
  useConsultationStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      consultationId: mockConsultationId,
      faceAnalysis: mockFaceAnalysisState,
      paymentStatus: mockPaymentStatus,
      photoPreview: mockPhotoPreview,
      gender: mockGender,
      consultation: mockConsultationData,
      setPaymentStatus: vi.fn(),
      previews: new Map(),
    }),
}));

describe('ResultsPage with HeroRecommendationCard integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPaymentStatus = 'none';
    mockConsultationId = validId;
    mockFaceAnalysisState = mockFaceAnalysis;
    mockPhotoPreview = 'data:image/jpeg;base64,test123';
    mockGender = 'male';
    mockConsultationData = mockConsultation;
  });

  it('renders HeroRecommendationCard when paymentStatus is "paid" and consultation data available', async () => {
    mockPaymentStatus = 'paid';
    const ResultsPage = (await import('@/app/consultation/results/[id]/page')).default;
    render(<ResultsPage />);
    expect(screen.getByTestId('hero-recommendation-card')).toBeInTheDocument();
  });

  it('passes rank-1 recommendation (index 0) to HeroRecommendationCard', async () => {
    mockPaymentStatus = 'paid';
    const ResultsPage = (await import('@/app/consultation/results/[id]/page')).default;
    render(<ResultsPage />);
    const styleNameEl = screen.getByTestId('hero-style-name');
    expect(styleNameEl.textContent).toBe('Corte Degradê');
  });

  it('renders HeroRecommendationCard alongside FaceShapeAnalysisSection when gender is male', async () => {
    mockPaymentStatus = 'paid';
    mockGender = 'male';
    const ResultsPage = (await import('@/app/consultation/results/[id]/page')).default;
    render(<ResultsPage />);
    // Theme is handled by CSS variables (data-theme on <html>), not by gender prop
    expect(screen.getByTestId('hero-recommendation-card')).toBeInTheDocument();
    expect(screen.getByTestId('face-shape-analysis-section')).toBeInTheDocument();
  });

  it('renders HeroRecommendationCard alongside FaceShapeAnalysisSection when gender is female', async () => {
    mockPaymentStatus = 'paid';
    mockGender = 'female';
    const ResultsPage = (await import('@/app/consultation/results/[id]/page')).default;
    render(<ResultsPage />);
    // Theme is handled by CSS variables (data-theme on <html>), not by gender prop
    expect(screen.getByTestId('hero-recommendation-card')).toBeInTheDocument();
    expect(screen.getByTestId('face-shape-analysis-section')).toBeInTheDocument();
  });

  it('does NOT render HeroRecommendationCard when consultation is null', async () => {
    mockPaymentStatus = 'paid';
    mockConsultationData = null;
    const ResultsPage = (await import('@/app/consultation/results/[id]/page')).default;
    render(<ResultsPage />);
    expect(screen.queryByTestId('hero-recommendation-card')).not.toBeInTheDocument();
  });

  it('does NOT render HeroRecommendationCard when paymentStatus is "none"', async () => {
    mockPaymentStatus = 'none';
    const ResultsPage = (await import('@/app/consultation/results/[id]/page')).default;
    render(<ResultsPage />);
    expect(screen.queryByTestId('hero-recommendation-card')).not.toBeInTheDocument();
  });

  it('still renders FaceShapeAnalysisSection alongside HeroRecommendationCard', async () => {
    mockPaymentStatus = 'paid';
    const ResultsPage = (await import('@/app/consultation/results/[id]/page')).default;
    render(<ResultsPage />);
    expect(screen.getByTestId('face-shape-analysis-section')).toBeInTheDocument();
    expect(screen.getByTestId('hero-recommendation-card')).toBeInTheDocument();
  });
});
