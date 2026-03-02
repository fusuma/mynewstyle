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
vi.mock('@/components/consultation/HeroRecommendationCard', () => ({
  HeroRecommendationCard: () => <div data-testid="hero-recommendation-card" />,
}));

// Mock AlternativeRecommendationsSection
vi.mock('@/components/consultation/AlternativeRecommendationsSection', () => ({
  AlternativeRecommendationsSection: () => <div data-testid="alternative-recommendations-section" />,
}));

// Mock StylesToAvoid
vi.mock('@/components/consultation/StylesToAvoid', () => ({
  StylesToAvoid: () => <div data-testid="styles-to-avoid-section" />,
}));

// Mock GroomingTips (Section E — Story 6.5)
vi.mock('@/components/consultation/GroomingTips', () => ({
  GroomingTips: ({ groomingTips }: { groomingTips: unknown[] }) => (
    <div data-testid="grooming-tips-section">
      <span data-testid="grooming-tips-count">{groomingTips?.length ?? 0}</span>
    </div>
  ),
}));

// Mock StylingTipsSection — spy on what props it receives
vi.mock('@/components/consultation/StylingTipsSection', () => ({
  StylingTipsSection: ({ groomingTips }: { groomingTips: unknown[] }) => (
    <div data-testid="styling-tips-section">
      <span data-testid="styling-tips-count">{groomingTips?.length ?? 0}</span>
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

const mockGroomingTipsData = [
  { category: 'products', tipText: 'Use pomada', icon: 'sparkles' },
  { category: 'routine', tipText: 'Lave o cabelo', icon: 'droplets' },
];

const mockConsultationWithTips = {
  recommendations: [
    {
      styleName: 'Corte Degradê',
      justification: 'Este estilo complementa seu rosto oval.',
      matchScore: 0.93,
      difficultyLevel: 'low',
    },
    {
      styleName: 'Topete Texturizado',
      justification: 'Outra boa opcao.',
      matchScore: 0.85,
      difficultyLevel: 'medium',
    },
  ],
  stylesToAvoid: [
    { styleName: 'Corte Raso', reason: 'Não recomendado.' },
  ],
  groomingTips: mockGroomingTipsData,
};

const mockConsultationEmptyTips = {
  ...mockConsultationWithTips,
  groomingTips: [],
};

let mockPaymentStatus: string = 'none';
let mockConsultationId: string | null = validId;
let mockFaceAnalysisState: typeof mockFaceAnalysis | null = mockFaceAnalysis;
let mockPhotoPreview: string | null = 'data:image/jpeg;base64,test123';
let mockConsultationData: typeof mockConsultationWithTips | null = mockConsultationWithTips;
let mockGender: string = 'male';

// Mock html-to-image (used by BarberCard via ResultsActionsFooter)
vi.mock('html-to-image', () => ({
  toPng: vi.fn().mockResolvedValue('data:image/png;base64,mock'),
}));

// Mock face-shape-labels (used by BarberCard)
vi.mock('@/lib/consultation/face-shape-labels', () => ({
  FACE_SHAPE_LABELS: {
    oval: 'Oval', round: 'Redondo', square: 'Quadrado', oblong: 'Oblongo',
    heart: 'Coração', diamond: 'Diamante', triangle: 'Triangular',
  },
}));

vi.mock('@/stores/consultation', () => ({
  useConsultationStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      consultationId: mockConsultationId,
      faceAnalysis: mockFaceAnalysisState,
      paymentStatus: mockPaymentStatus,
      photoPreview: mockPhotoPreview,
      consultation: mockConsultationData,
      gender: mockGender,
      previews: new Map(),
      reset: vi.fn(),
      setPaymentStatus: vi.fn(),
    }),
}));

describe('ResultsPage - StylingTipsSection integration (Section F)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPaymentStatus = 'none';
    mockConsultationId = validId;
    mockFaceAnalysisState = mockFaceAnalysis;
    mockPhotoPreview = 'data:image/jpeg;base64,test123';
    mockConsultationData = mockConsultationWithTips;
    mockGender = 'male';
  });

  it('renders StylingTipsSection when paymentStatus is "paid" and groomingTips has items', async () => {
    mockPaymentStatus = 'paid';
    const ResultsPage = (await import('@/app/consultation/results/[id]/page')).default;
    render(<ResultsPage />);
    expect(screen.getByTestId('styling-tips-section')).toBeInTheDocument();
  });

  it('passes correct groomingTips data to StylingTipsSection component', async () => {
    mockPaymentStatus = 'paid';
    const ResultsPage = (await import('@/app/consultation/results/[id]/page')).default;
    render(<ResultsPage />);
    const countEl = screen.getByTestId('styling-tips-count');
    expect(countEl.textContent).toBe('2');
  });

  it('does NOT render StylingTipsSection when consultation is null', async () => {
    mockPaymentStatus = 'paid';
    mockConsultationData = null;
    const ResultsPage = (await import('@/app/consultation/results/[id]/page')).default;
    render(<ResultsPage />);
    expect(screen.queryByTestId('styling-tips-section')).not.toBeInTheDocument();
  });

  it('does NOT render StylingTipsSection when groomingTips is empty', async () => {
    mockPaymentStatus = 'paid';
    mockConsultationData = mockConsultationEmptyTips;
    const ResultsPage = (await import('@/app/consultation/results/[id]/page')).default;
    render(<ResultsPage />);
    expect(screen.queryByTestId('styling-tips-section')).not.toBeInTheDocument();
  });

  it('does NOT render StylingTipsSection when paymentStatus is not "paid"', async () => {
    mockPaymentStatus = 'none';
    const ResultsPage = (await import('@/app/consultation/results/[id]/page')).default;
    render(<ResultsPage />);
    expect(screen.queryByTestId('styling-tips-section')).not.toBeInTheDocument();
  });

  it('StylingTipsSection renders after GroomingTips (Section F after Section E)', async () => {
    mockPaymentStatus = 'paid';
    const ResultsPage = (await import('@/app/consultation/results/[id]/page')).default;
    render(<ResultsPage />);
    const groomingTips = screen.getByTestId('grooming-tips-section');
    const stylingTips = screen.getByTestId('styling-tips-section');
    expect(groomingTips).toBeInTheDocument();
    expect(stylingTips).toBeInTheDocument();
    // DOM order: grooming-tips (Section E) should appear before styling-tips (Section F)
    const allSections = screen.getAllByTestId(/grooming-tips-section|styling-tips-section/);
    expect(allSections[0]).toBe(groomingTips);
    expect(allSections[1]).toBe(stylingTips);
  });
});
