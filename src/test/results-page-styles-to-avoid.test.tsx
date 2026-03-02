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

// Mock StylesToAvoid — spy on what props it receives
vi.mock('@/components/consultation/StylesToAvoid', () => ({
  StylesToAvoid: ({ stylesToAvoid }: { stylesToAvoid: unknown[] }) => (
    <div data-testid="styles-to-avoid-section">
      <span data-testid="styles-to-avoid-count">{stylesToAvoid.length}</span>
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

const mockStylesData = [
  {
    styleName: 'Cortes muito rentes nas laterais',
    reason: 'Este estilo acentua a largura do rosto redondo.',
  },
  {
    styleName: 'Franja horizontal reta',
    reason: 'Uma franja reta encurta a testa e reduz a proporcao vertical.',
  },
];

const mockConsultationWithStyles = {
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
  stylesToAvoid: mockStylesData,
  groomingTips: [],
};

const mockConsultationEmptyStyles = {
  ...mockConsultationWithStyles,
  stylesToAvoid: [],
};

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

let mockPaymentStatus: string = 'none';
let mockConsultationId: string | null = validId;
let mockFaceAnalysisState: typeof mockFaceAnalysis | null = mockFaceAnalysis;
let mockPhotoPreview: string | null = 'data:image/jpeg;base64,test123';
let mockConsultationData: typeof mockConsultationWithStyles | null = mockConsultationWithStyles;

vi.mock('@/stores/consultation', () => ({
  useConsultationStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      consultationId: mockConsultationId,
      faceAnalysis: mockFaceAnalysisState,
      paymentStatus: mockPaymentStatus,
      photoPreview: mockPhotoPreview,
      consultation: mockConsultationData,
      gender: null,
      previews: new Map(),
      reset: vi.fn(),
      setPaymentStatus: vi.fn(),
    }),
}));

describe('ResultsPage - StylesToAvoid integration (Section D)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPaymentStatus = 'none';
    mockConsultationId = validId;
    mockFaceAnalysisState = mockFaceAnalysis;
    mockPhotoPreview = 'data:image/jpeg;base64,test123';
    mockConsultationData = mockConsultationWithStyles;
  });

  it('renders StylesToAvoid section when paymentStatus is "paid" and stylesToAvoid has items', async () => {
    mockPaymentStatus = 'paid';
    const ResultsPage = (await import('@/app/consultation/results/[id]/page')).default;
    render(<ResultsPage />);
    expect(screen.getByTestId('styles-to-avoid-section')).toBeInTheDocument();
  });

  it('passes correct stylesToAvoid data to StylesToAvoid component', async () => {
    mockPaymentStatus = 'paid';
    const ResultsPage = (await import('@/app/consultation/results/[id]/page')).default;
    render(<ResultsPage />);
    const countEl = screen.getByTestId('styles-to-avoid-count');
    expect(countEl.textContent).toBe('2');
  });

  it('does NOT render StylesToAvoid when consultation is null', async () => {
    mockPaymentStatus = 'paid';
    mockConsultationData = null;
    const ResultsPage = (await import('@/app/consultation/results/[id]/page')).default;
    render(<ResultsPage />);
    expect(screen.queryByTestId('styles-to-avoid-section')).not.toBeInTheDocument();
  });

  it('does NOT render StylesToAvoid when stylesToAvoid is empty', async () => {
    mockPaymentStatus = 'paid';
    mockConsultationData = mockConsultationEmptyStyles;
    const ResultsPage = (await import('@/app/consultation/results/[id]/page')).default;
    render(<ResultsPage />);
    expect(screen.queryByTestId('styles-to-avoid-section')).not.toBeInTheDocument();
  });

  it('does NOT render StylesToAvoid when paymentStatus is not "paid"', async () => {
    mockPaymentStatus = 'none';
    const ResultsPage = (await import('@/app/consultation/results/[id]/page')).default;
    render(<ResultsPage />);
    expect(screen.queryByTestId('styles-to-avoid-section')).not.toBeInTheDocument();
  });

  it('StylesToAvoid renders after FaceShapeAnalysisSection (Section D after Section A)', async () => {
    mockPaymentStatus = 'paid';
    const ResultsPage = (await import('@/app/consultation/results/[id]/page')).default;
    render(<ResultsPage />);
    const faceShape = screen.getByTestId('face-shape-analysis-section');
    const stylesToAvoid = screen.getByTestId('styles-to-avoid-section');
    // Both should be present; Section A before Section D
    expect(faceShape).toBeInTheDocument();
    expect(stylesToAvoid).toBeInTheDocument();
    // DOM order: face-shape-analysis-section should appear before styles-to-avoid-section
    const allSections = screen.getAllByTestId(/face-shape-analysis-section|styles-to-avoid-section/);
    expect(allSections[0]).toBe(faceShape);
    expect(allSections[1]).toBe(stylesToAvoid);
  });

  it('StylesToAvoid renders after HeroRecommendationCard (Section D after Section B)', async () => {
    mockPaymentStatus = 'paid';
    const ResultsPage = (await import('@/app/consultation/results/[id]/page')).default;
    render(<ResultsPage />);
    const heroCard = screen.getByTestId('hero-recommendation-card');
    const stylesToAvoid = screen.getByTestId('styles-to-avoid-section');
    expect(heroCard).toBeInTheDocument();
    expect(stylesToAvoid).toBeInTheDocument();
  });

  it('StylesToAvoid renders after AlternativeRecommendationsSection (Section D after Section C)', async () => {
    mockPaymentStatus = 'paid';
    const ResultsPage = (await import('@/app/consultation/results/[id]/page')).default;
    render(<ResultsPage />);
    const altSection = screen.getByTestId('alternative-recommendations-section');
    const stylesToAvoid = screen.getByTestId('styles-to-avoid-section');
    expect(altSection).toBeInTheDocument();
    expect(stylesToAvoid).toBeInTheDocument();
    // DOM order: alternative-recommendations-section before styles-to-avoid-section
    const allCards = screen.getAllByTestId(/alternative-recommendations-section|styles-to-avoid-section/);
    expect(allCards[0]).toBe(altSection);
    expect(allCards[1]).toBe(stylesToAvoid);
  });
});
